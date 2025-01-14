'use client'
import Image from "next/image";
import { useState, useEffect } from "react";
import CallStatus from './components/CallStatus';

interface CallMetrics {
  pickupSuccess: boolean;
  holdTime: number; // in seconds
  informationCollected: {
    oilChangePrice: boolean;
    earliestAppointment: boolean;
    serviceHours: boolean;
  };
}

interface CallResponse {
  id: string;
  timestamp: string;
  status: string;
  phoneNumber: string;
  carModel: string;
  dealership: string;
  timezone: string;
  metrics?: CallMetrics;
  transcript?: string;
  summary?: string;
  goals?: {
    oilChangePrice: { completed: boolean; value: string | null };
    earliestAppointment: { completed: boolean; value: string | null };
    serviceHours: { completed: boolean; value: string | null };
  };
}

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [dealership, setDealership] = useState('');
  const [timezone, setTimezone] = useState('America/New_York'); // Default timezone
  const [loading, setLoading] = useState(false);
  const [calls, setCalls] = useState<CallResponse[]>([]);

  const makeCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, carModel, dealership, timezone }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newCall: CallResponse = {
          id: data.callId,
          timestamp: new Date().toISOString(),
          status: 'initiated',
          phoneNumber,
          carModel,
          dealership,
          timezone,
        };
        
        setCalls(prev => [...prev, newCall]);
        pollCallStatus(data.callId);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollCallStatus = async (callId: string) => {
    try {
      const response = await fetch(`/api/check-call?callId=${callId}`);
      const data = await response.json();

      // Update only this specific call's status
      setCalls(prev => prev.map(call => 
        call.id === callId 
          ? {
              ...call,
              status: data.status,
              transcript: data.transcript,
              summary: data.summary,
              goals: data.goals,
            }
          : call
      ));

      // Continue polling if call is not completed
      if (data.status !== 'completed' && data.status !== 'failed') {
        setTimeout(() => pollCallStatus(callId), 5000);
      }
    } catch (error) {
      console.error('Error polling call status:', error);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <form onSubmit={makeCall} className="max-w-md mx-auto space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full text-black p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Car Model</label>
          <input
            type="text"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            className="w-full text-black p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dealership Name</label>
          <input
            type="text"
            value={dealership}
            onChange={(e) => setDealership(e.target.value)}
            className="w-full text-black p-2 border rounded"
            required
            placeholder="e.g., ABC Motors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full text-black p-2 border rounded"
            required
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Anchorage">Alaska Time (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Making Call...' : 'Make Call'}
        </button>
      </form>

      <div className="max-w-2xl mx-auto space-y-6">
        {calls.slice().reverse().map((call) => (
          <div 
            key={call.id} 
            className="border rounded-lg p-4 shadow-sm bg-white"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-black">Call to: {call.dealership}</h3>
                <p className="text-sm text-gray-500">Phone: {call.phoneNumber}</p>
                <p className="text-sm text-gray-500">Car Model: {call.carModel}</p>
                <p className="text-sm text-gray-500">Timezone: {call.timezone}</p>
                <p>{call.metrics && call.goals.oilChangePrice.completed ? '✅' : '⬜'} Oil Change Price</p>
                <p>{call.goals && call.goals.earliestAppointment.completed ? '✅' : '⬜'} Earliest Appointment</p>
                <p>{call.goals && call.goals.serviceHours.completed ? '✅' : '⬜'} Service Hours</p>
                <p className="text-sm text-gray-500">
                  {new Date(call.timestamp).toLocaleString()}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                call.status === 'completed' ? 'bg-green-100 text-green-800' :
                call.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {call.status}
              </span>
            </div>

            {/* Call Metrics Section */}
            {call.metrics && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Call Metrics:</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Pickup Status</p>
                    <p className="text-sm">
                      {call.metrics.pickupSuccess ? 
                        '✅ Call Answered' : 
                        '❌ No Answer'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hold Time</p>
                    <p className="text-sm">
                      {call.metrics.holdTime > 0 ? 
                        `⏱️ ${call.metrics.holdTime}s` : 
                        '✅ No Hold'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Information Collected</p>
                    <div className="text-sm">
                      <p>{call.metrics.informationCollected.oilChangePrice ? '✅' : '❌'} Price</p>
                      <p>{call.metrics.informationCollected.earliestAppointment ? '✅' : '❌'} Appointment</p>
                      <p>{call.metrics.informationCollected.serviceHours ? '✅' : '❌'} Hours</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {call.goals && (
              <div className="mb-4 space-y-2">
                <h4 className="font-medium">Goals:</h4>
                <div className="pl-4">
                  <div className="flex items-center gap-2">
                    {call.goals.oilChangePrice.completed ? '✅' : '⬜'} 
                    Oil Change Price
                    {call.goals.oilChangePrice.value && 
                      <span className="text-sm text-gray-600">: {call.goals.oilChangePrice.value}</span>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    {call.goals.earliestAppointment.completed ? '✅' : '⬜'} 
                    Earliest Appointment
                    {call.goals.earliestAppointment.value && 
                      <span className="text-sm text-gray-600">: {call.goals.earliestAppointment.value}</span>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    {call.goals.serviceHours.completed ? '✅' : '⬜'} 
                    Service Hours
                    {call.goals.serviceHours.value && 
                      <span className="text-sm text-gray-600">: {call.goals.serviceHours.value}</span>
                    }
                  </div>
                </div>
              </div>
            )}

            {call.transcript && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-black">Transcript:</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {call.transcript}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
