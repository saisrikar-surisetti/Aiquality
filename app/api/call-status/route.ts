import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received webhook:', data);

    // Handle different webhook events
    switch (data.type) {
      case 'call.started':
        console.log('Call started:', {
          callId: data.call_id,
          phoneNumber: data.phone_number,
          startTime: data.start_time
        });
        break;

      case 'call.completed':
        console.log('Call completed:', {
          callId: data.call_id,
          duration: data.duration,
          transcript: data.transcript,
          summary: data.summary
        });
        // Here you could store the transcript in your database
        break;

      case 'call.failed':
        console.error('Call failed:', {
          callId: data.call_id,
          error: data.error,
          errorCode: data.error_code
        });
        break;

      case 'transcription.in_progress':
        console.log('Transcription update:', {
          callId: data.call_id,
          transcript: data.transcript
        });
        break;

      default:
        console.log('Unknown webhook type:', data.type);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { 
      status: 500 
    });
  }
} 