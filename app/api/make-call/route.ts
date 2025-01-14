import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: process.env.RETELL_API_KEY!,
});

const AGENT_PROMPT = `You are a friendly assistant calling about car service.
Your goals:
1. Get the oil change price
2. Get earliest available appointment
3. Get service hours

Keep responses brief and natural. End the call once you have all information.
Do not mention that you are an AI.`;

export async function POST(request: Request) {
  try {
    const { phoneNumber, carModel } = await request.json();
    
    if (!process.env.RETELL_API_KEY) {
      throw new Error('Retell API key is not configured');
    }

    if (!process.env.RETELL_PHONE_NUMBER) {
      throw new Error('Retell phone number is not configured');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Format phone number to E.164 format if needed
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
    
    console.log('Creating call with:', {
      from: process.env.RETELL_PHONE_NUMBER,
      to: formattedPhone
    });

    const call = await client.call.createPhoneCall({
      from_number: process.env.RETELL_PHONE_NUMBER,
      to_number: formattedPhone,
      llm: {
        model: "gpt-4",
        prompt: AGENT_PROMPT
      },
      voice: {
        provider: "11labs",
        voice_id: "nova"
      },
      metadata: {
        carModel: carModel
      }
    });

    console.log('Call created successfully:', call);

    return NextResponse.json({
      success: true,
      callId: call.call_id,
      message: 'Call initiated successfully',
      debug: {
        phoneNumber: formattedPhone,
        callDetails: call
      }
    });

  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response?.data
    });

    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to initiate call',
      details: {
        code: error.code,
        response: error.response?.data
      }
    }, { 
      status: 500 
    });
  }
}