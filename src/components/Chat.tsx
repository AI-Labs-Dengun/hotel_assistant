import React, { useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  language?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSpeak = async (text: string, language: string = 'en') => {
    try {
      setIsSpeaking(true);
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
      };
      
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleStartRecording = async () => {
    console.log('handleStartRecording called');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Open popup and start recording
      console.log('Opening popup and starting recording');
      setShowVoicePopup(true);
      setIsRecording(true);
      setIsProcessing(false);
      setIsSpeaking(false);
      setCurrentResponse('');

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder.onstop called');
        // Transition to processing state - keep popup open
        setIsRecording(false);
        setIsProcessing(true);
        console.log('Set to processing state, popup should stay open');
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          console.log('Starting transcription');
          // Transcribe audio
          const transcribeResponse = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!transcribeResponse.ok) {
            throw new Error('Failed to transcribe audio');
          }

          const transcribeData = await transcribeResponse.json();
          const userMessage = transcribeData.text;
          console.log('Transcription successful:', userMessage);
          
          // Add user message to chat
          setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
          setInput(userMessage);
          
          console.log('Getting AI response');
          // Get AI response
          setIsLoading(true);
          const chatResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
          });

          if (!chatResponse.ok) {
            throw new Error('Failed to get AI response');
          }

          const chatData = await chatResponse.json();
          console.log('AI response received:', chatData.message);
          setMessages((prev) => [...prev, { role: 'assistant', content: chatData.message }]);
          setCurrentResponse(chatData.message);
          setIsProcessing(false);
          
          console.log('Starting to speak AI response');
          // Play the AI's response in the popup
          await handleSpeak(chatData.message);

        } catch (error) {
          console.error('Error in voice interaction:', error);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again.',
            },
          ]);
          setIsProcessing(false);
          setIsSpeaking(false);
        } finally {
          setIsLoading(false);
          console.log('Voice interaction complete');
        }
      };

      mediaRecorder.start();
      console.log('MediaRecorder started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      // Keep popup open even on error
    }
  };

  const handleStopRecording = () => {
    console.log('handleStopRecording called');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping media recorder');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      // Make sure popup stays open
      console.log('Popup should stay open, showVoicePopup:', showVoicePopup);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(message.content)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Copy message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500 dark:text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
          <button
            onClick={handleStartRecording}
            disabled={showVoicePopup}
            className="p-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Voice Recording Popup */}
      {showVoicePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {isRecording ? 'Recording...' : isSpeaking ? 'AI is speaking...' : isProcessing ? 'Processing...' : 'Ready'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {isRecording
                    ? 'Speak your message, then click Stop'
                    : isSpeaking
                    ? 'Listening to the response...'
                    : isProcessing
                    ? 'Converting speech to text...'
                    : 'Voice interaction complete'}
                </p>
                {currentResponse && !isRecording && (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {currentResponse}
                  </p>
                )}
              </div>
              <div className="relative w-24 h-24">
                <div
                  className={`absolute inset-0 rounded-full ${
                    isRecording
                      ? 'bg-red-500 animate-pulse'
                      : isSpeaking
                      ? 'bg-green-500 animate-pulse'
                      : isProcessing
                      ? 'bg-blue-500 animate-spin'
                      : 'bg-gray-500'
                  }`}
                />
                <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-600 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        isRecording
                          ? 'M6 18L18 6M6 6l12 12'
                          : isSpeaking
                          ? 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'
                          : 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                      }
                    />
                  </svg>
                </div>
              </div>
              <div className="flex gap-2">
                {isRecording && (
                  <button
                    onClick={handleStopRecording}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Stop Recording
                  </button>
                )}
                {!isRecording && !isSpeaking && !isProcessing && (
                  <button
                    onClick={() => setShowVoicePopup(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 