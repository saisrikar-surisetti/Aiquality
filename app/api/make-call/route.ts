import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';

const client = new Retell({
  apiKey: process.env.RETELL_API_KEY!,
});

function generatePrompt(carModel: string, dealership: string, timezone: string) {
  return `You are a friendly assistant calling about car service for a toyota 2019.


Your goals:
1. Get the oil change price for the the car
2. Get earliest available appointment (make sure to confirm the timezone)
3. Get service hours (make sure to confirm the timezone)

Important tracking requirements:
- Note if someone picks up the call
- Track how long you're put on hold (if at all)
- Track which pieces of information you successfully collect

Keep responses brief and natural. End the call once you have all information.
Do not mention that you are an AI.

At the end of the call, you must provide a JSON summary in this format:
{
  "goals": {
    "oilChangePrice": { "completed": true/false, "value": "price if obtained" },
    "earliestAppointment": { "completed": true/false, "value": "date/time if obtained" },
    "serviceHours": { "completed": true/false, "value": "hours if obtained" }
  },
  "metrics": {
    "pickupSuccess": true/false,
    "holdTime": number_of_seconds,
    "informationCollected": {
      "oilChangePrice": true/false,
      "earliestAppointment": true/false,
      "serviceHours": true/false
    }
  }
}`;
}

export async function POST(request: Request) {
  try {
    const { phoneNumber, carModel, dealership, timezone } = await request.json();
    
    if (!process.env.RETELL_API_KEY) {
      throw new Error('Retell API key is not configured');
    }

    if (!process.env.RETELL_PHONE_NUMBER) {
      throw new Error('Retell phone number is not configured');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    if (!carModel) {
      throw new Error('Car model is required');
    }

    // Format phone number to E.164 format if needed
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
    
    console.log('Creating call with:', {
      from: process.env.RETELL_PHONE_NUMBER,
      to: formattedPhone,
      carModel: carModel
    });

    const call = await client.call.createPhoneCall({
      from_number: process.env.RETELL_PHONE_NUMBER,
      to_number: formattedPhone,
      llm: {
        model: "gpt-4",
        prompt: generatePrompt(carModel, dealership, timezone)
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