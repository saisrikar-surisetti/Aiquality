import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callSid = searchParams.get('callSid');

  if (!callSid) {
    return NextResponse.json({ error: 'CallSid is required' }, { status: 400 });
  }

  try {
    // Get the call details
    const call = await client.calls(callSid).fetch();
    console.log('Call status:', call.status);

    // Get recordings for this call
    const recordings = await client.recordings.list({ 
      callSid: callSid 
    });

    console.log(`Found ${recordings.length} recordings for call ${callSid}`);

    if (recordings.length === 0) {
      return NextResponse.json({ 
        message: 'Call in progress, waiting for recordings',
        status: 'in_progress',
        callStatus: call.status
      });
    }

    // Get the latest recording
    const latestRecording = recordings[0];
    console.log('Latest recording status:', latestRecording.status);

    // If the recording is still in progress, return appropriate status
    if (latestRecording.status !== 'completed') {
      return NextResponse.json({
        message: 'Recording in progress',
        status: 'recording',
        recordingSid: latestRecording.sid
      });
    }

    // Try to get transcriptions
    try {
      // Wait a moment before checking for transcriptions
      await new Promise(resolve => setTimeout(resolve, 2000));

      const transcriptions = await client.transcriptions.list();
      const matchingTranscriptions = transcriptions.filter(
        t => recordings.some(r => r.sid === t.sid)
      );

      console.log(`Found ${matchingTranscriptions.length} matching transcriptions`);

      if (matchingTranscriptions.length === 0) {
        // Return a "processing" status instead of an error
        return NextResponse.json({
          message: 'Transcription processing',
          status: 'processing',
          recordingSid: latestRecording.sid
        });
      }

      // Get all completed transcriptions
      const completedTranscriptions = await Promise.all(
        matchingTranscriptions
          .filter(t => t.status === 'completed')
          .map(async t => {
            const full = await client.transcriptions(t.sid).fetch();
            return {
              text: full.transcriptionText,
              dateCreated: t.dateCreated
            };
          })
      );

      // Sort transcriptions by date and combine them
      const sortedTranscriptions = completedTranscriptions
        .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
        .map(t => t.text);

      if (sortedTranscriptions.length > 0) {
        return NextResponse.json({
          status: 'completed',
          transcriptionText: sortedTranscriptions.join('\n\n'),
          recordingSid: latestRecording.sid,
          transcriptionCount: sortedTranscriptions.length
        });
      } else {
        return NextResponse.json({
          message: 'Transcriptions still processing',
          status: 'processing',
          recordingSid: latestRecording.sid
        });
      }

    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      return NextResponse.json({
        message: 'Error processing transcriptions',
        status: 'error',
        error: transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'
      });
    }

  } catch (error: any) {
    console.error('Error in get-transcript:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transcript',
      details: error.message,
      code: error.code
    }, { 
      status: 500 
    });
  }
} 