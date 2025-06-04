import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function POST(req: Request) {
  try {
    const { message, conversationHistory } = await req.json();

    // Read instructions and knowledge from public directory
    const instructions = await fs.readFile(path.join(process.cwd(), 'public', 'AI_INSTRUCTIONS.md'), 'utf-8');
    const knowledge = await fs.readFile(path.join(process.cwd(), 'public', 'AI_KNOWLEDGE.md'), 'utf-8');

    // Create a single, comprehensive system message
    const systemMessage = `You are an AI assistant for a luxury hotel. Your role is to provide a warm, welcoming, and professional experience for each guest.

[INSTRUCTIONS]
${instructions}

[KNOWLEDGE BASE]
${knowledge}

IMPORTANT:
- Be creative and original in your responses
- Use the tone and style defined in the instructions
- Incorporate relevant information from the knowledge base
- Never copy examples directly from the instructions
- Avoid starting responses with greetings or affirmations
- Respond directly and naturally, as in a real conversation
- Keep responses concise and objective
- Use friendly but professional language
- Consider conversation context for more precise and relevant responses`;

    // Prepara o array de mensagens incluindo o histórico
    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage }
    ];

    // Adiciona o histórico da conversa se existir
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { user: string; content: string }) => {
        messages.push({
          role: msg.user === 'me' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Adiciona a mensagem atual
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.8,
      max_tokens: 1000,
    });

    return NextResponse.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Error in ChatGPT API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from ChatGPT' },
      { status: 500 }
    );
  }
} 