import { NextResponse } from 'next/server';
import twilio from 'twilio';
import OpenAI from 'openai';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define the conversation context
const SYSTEM_PROMPT = `You are an AI assistant analyzing a response from a car dealership.
Your task is to:
1. Extract the oil change price if mentioned
2. Extract any appointment times or availability mentioned
3. Extract service hours if mentioned

Respond in this JSON format:
{
  "price": "extracted price or null if not found",
  "appointment": "extracted time/availability or null if not found",
  "hours": "extracted hours or null if not found",
  "missingInfo": ["list of missing information"],
  "nextQuestion": "question to ask if information is missing, or 'done' if all info collected"
}`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const speechResult = formData.get('SpeechResult');
    const callSid = formData.get('CallSid');
    
    console.log('Received webhook:', {
      speechResult,
      callSid,
      allFields: Object.fromEntries(formData.entries())
    });

    const twiml = new twilio.twiml.VoiceResponse();

    if (!speechResult) {
      console.log('No speech result, sending initial prompt');
      twiml.gather({
        input: ['speech'],
        timeout: 5,
        speechTimeout: 'auto',
        action: '/api/handle-response'
      }).say({ voice: 'alice' }, 
        "Hello, I'm calling about an oil change. Could you tell me the price, your earliest available appointment, and your service hours?"
      );
    } else {
      console.log('Processing speech result:', speechResult);
      
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Extract information from this response: "${speechResult}"` }
          ],
          response_format: { type: "json_object" },
          max_tokens: 150,
          temperature: 0.3
        });

        const analysis = JSON.parse(completion.choices[0].message.content || '{}');
        console.log('Analysis:', analysis);

        if (analysis.missingInfo.length === 0 || analysis.nextQuestion === 'done') {
          // All information collected, end the call
          twiml.say({ voice: 'alice' }, 
            "Thank you for the information. Have a great day!"
          );
          twiml.hangup();
        } else {
          // Still missing information, ask next question
          twiml.gather({
            input: ['speech'],
            timeout: 5,
            speechTimeout: 'auto',
            action: '/api/handle-response'
          }).say({ voice: 'alice' }, analysis.nextQuestion);
        }
      } catch (openaiError) {
        console.error('OpenAI Error:', openaiError);
        // Fallback response if OpenAI fails
        twiml.gather({
          input: ['speech'],
          timeout: 5,
          speechTimeout: 'auto',
          action: '/api/handle-response'
        }).say({ voice: 'alice' }, 
          "I apologize, could you repeat the price, available appointment time, and service hours?"
        );
      }
    }

    const response = new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'application/xml',
      },
    });

    console.log('Sending TwiML response:', twiml.toString());
    return response;

  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'alice' }, "I'm sorry, but I'm having technical difficulties. Goodbye.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
} 