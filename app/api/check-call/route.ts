import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: process.env.RETELL_API_KEY!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get('callId');

  if (!callId) {
    return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
  }

  try {
    const call = await client.call.retrieve(callId);
    
    return NextResponse.json({
      status: call.status,
      transcript: call.transcript,
      summary: call.summary
    });
  } catch (error: any) {
    console.error('Error checking call:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { 
      status: 500 
    });
  }
} 