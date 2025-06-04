import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Convert Blob to File for OpenAI
    const audioFile = new File([file], 'audio.wav', { type: 'audio/wav' });

    // Call OpenAI Whisper API with automatic language detection
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'json',
      temperature: 0.2, // Lower temperature for more accurate transcription
      prompt: "This is a conversation with a hotel assistant. The audio may contain questions about hotel services, bookings, or general inquiries.", // Add context to improve accuracy
    });

    return NextResponse.json({ 
      text: transcription.text
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
} 