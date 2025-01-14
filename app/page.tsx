'use client'
import Image from "next/image";
import { useState, useEffect } from "react";
import CallStatus from './components/CallStatus';

export default function Home() {  
  const [number, setNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<{[key: string]: string}>({});
  const [pollingCalls, setPollingCalls] = useState<Set<string>>(new Set());
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const pollForTranscript = async (callSid: string) => {
    if (!callSid || !pollingCalls.has(callSid)) return;

    try {
      const response = await fetch(`/api/get-transcript?callSid=${callSid}`);
      const data = await response.json();
      
      console.log('Polling response:', data);

      if (data.status === 'completed' && data.transcriptionText) {
        setTranscripts(prev => ({
          ...prev,
          [callSid]: data.transcriptionText
        }));
        setPollingCalls(prev => {
          const next = new Set(prev);
          next.delete(callSid);
          return next;
        });
      } else if (data.status === 'processing' || data.status === 'recording' || data.status === 'in_progress') {
        setTimeout(() => pollForTranscript(callSid), 5000);
      }
    } catch (error) {
      console.error('Error polling for transcript:', error);
      setTimeout(() => pollForTranscript(callSid), 10000);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: number,
          carModel,
          timezone
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setCurrentCallId(data.callId);
      setCallStatus(`Call initiated successfully!`);

    } catch (error: any) {
      console.error('Error:', error);
      setCallStatus(`Failed to initiate call: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumber(e.target.value);
  }  
  const handleCarModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCarModel(e.target.value);
  }
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimezone(e.target.value);
  }

  useEffect(() => {
    pollingCalls.forEach(callSid => {
      pollForTranscript(callSid);
    });
  }, [pollingCalls]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1>Mystery Caller</h1>
      <p>
        This is a mystery caller app. It will call and rate the services.
      </p>
      <form onSubmit={handleSubmit} className="flex text-black flex-col items-center justify-center">
        <input type="text" value={number} onChange={handleNumberChange} placeholder="Enter the phone number" className="w-full bg-gray-200 p-2 rounded-md" />
        <input type="text" value={carModel} onChange={handleCarModelChange} placeholder="Enter the Car model" className="w-full bg-gray-200 p-2 rounded-md" />
        <input type="text" value={timezone} onChange={handleTimezoneChange} placeholder="timezone" className="w-full bg-gray-200 p-2 rounded-md" />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">Call</button>
      </form>
      
      <div className="w-full max-w-md mt-8">
        <h2 className="text-xl font-bold mb-4">Call History</h2>
        {Array.from(pollingCalls).map((callSid) => (
          <div key={callSid} className="border p-4 rounded-md mb-4">
            <p>Call SID: {callSid}</p>
            {transcripts[callSid] ? (
              <div className="mt-2">
                <h3 className="font-semibold">Transcript:</h3>
                <p className="text-sm whitespace-pre-wrap">{transcripts[callSid]}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Waiting for transcript... This may take a few minutes.
              </p>
            )}
          </div>
        ))}
      </div>
      
      {currentCallId && <CallStatus callId={currentCallId} />}
    </div>  
  );
}
