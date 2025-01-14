import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const recordingSid = formData.get('RecordingSid');
    const recordingStatus = formData.get('RecordingStatus');
    const recordingDuration = formData.get('RecordingDuration');
    
    console.log('Recording status update:', {
      recordingSid,
      status: recordingStatus,
      duration: recordingDuration
    });

    // Here you could store the recording status in your database

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recording status webhook error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}