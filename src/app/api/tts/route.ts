import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map of language codes to voice IDs
const languageToVoice: { [key: string]: string } = {
  'en': 'nova',    // English
  'pt': 'nova',    // Portuguese
  'es': 'nova',    // Spanish
  'fr': 'nova',    // French
  'de': 'nova',    // German
  'it': 'nova',    // Italian
  'ja': 'nova',    // Japanese
  'ko': 'nova',    // Korean
  'zh': 'nova',    // Chinese
};

export async function POST(req: Request) {
  try {
    const { text, language = 'en' } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Get the appropriate voice for the language
    const voice = languageToVoice[language] || 'nova';

    // Call OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      input: text,
      voice: voice,
      response_format: 'mp3',
    });

    // Convert to a buffer and return as audio/mpeg
    const buffer = Buffer.from(await response.arrayBuffer());
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to generate TTS audio' }, { status: 500 });
  }
} 