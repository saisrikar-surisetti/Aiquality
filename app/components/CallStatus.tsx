import { useState, useEffect } from 'react';

interface CallStatusProps {
  callId: string;
}

export default function CallStatus({ callId }: CallStatusProps) {
  const [status, setStatus] = useState<string>('initializing');
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/check-call?callId=${callId}`);
        const data = await response.json();
        
        setStatus(data.status);
        if (data.transcript) {
          setTranscript(data.transcript);
        }
      } catch (error) {
        console.error('Error checking call status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [callId]);

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Call Status: {status}</h3>
      
      {isLoading ? (
        <div className="mt-4 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2 text-gray-600">Loading transcript...</span>
        </div>
      ) : transcript ? (
        <div className="mt-4">
          <h4 className="font-semibold">Transcript:</h4>
          <pre className="whitespace-pre-wrap text-sm mt-1 p-2 bg-gray-50 rounded">
            {transcript}
          </pre>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">Waiting for transcript...</p>
      )}
    </div>
  );
} 