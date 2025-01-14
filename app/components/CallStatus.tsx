import { useState, useEffect } from 'react';

interface CallStatusProps {
  callId: string;
}

export default function CallStatus({ callId }: CallStatusProps) {
  const [status, setStatus] = useState<string>('initializing');
  const [transcript, setTranscript] = useState<string>('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/check-call?callId=${callId}`);
        const data = await response.json();
        
        setStatus(data.status);
        if (data.transcript) {
          setTranscript(data.transcript);
        }
      } catch (error) {
        console.error('Error checking call status:', error);
      }
    };

    // Check immediately and then every 5 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [callId]);

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Call Status: {status}</h3>
      {transcript && (
        <div className="mt-2">
          <h4 className="font-semibold ">Transcript:</h4>
          <pre className="whitespace-pre-wrap text-sm mt-1 p-2 bg-gray-50 rounded text-black">
            {transcript}
          </pre>
        </div>
      )}
    </div>
  );
} 