"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaRobot, FaUserCircle, FaRegThumbsUp, FaRegThumbsDown, FaRegCommentDots, FaVolumeUp, FaPaperPlane, FaRegSmile, FaMicrophone, FaPause, FaPlay } from 'react-icons/fa';
import { useTheme } from '../providers/ThemeProvider';
import { useLanguage } from '../../lib/LanguageContext';
import { useTranslation, Language, languageNames, translations } from '../../lib/i18n';
import TypewriterEffect from '../../components/TypewriterEffect';
import CommentModal from '../../components/CommentModal';
import VoiceModal from '../../components/VoiceModal';
import { detectContactInfo } from '../../lib/contactDetector';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { Toaster } from 'react-hot-toast';
import showToast from '../../lib/toast';

const EmojiPicker = dynamic(() => import('@emoji-mart/react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-[350px] h-[400px] bg-white dark:bg-[#23234a] rounded-xl" />
});

interface Message {
  id: string;
  content: string;
  user: 'me' | 'bot';
  created_at: string;
}

const ChatComponent = () => {
  const { dark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation(language as Language);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | undefined>>({});
  const [commentModal, setCommentModal] = useState<{ open: boolean, message?: { id: string, content: string } }>({ open: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEmojiButtonActive, setIsEmojiButtonActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceMode, setVoiceMode] = useState<'idle' | 'recording' | 'ai-speaking'>('idle');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [voiceModalMode, setVoiceModalMode] = useState<'ai-speaking' | 'ready-to-record' | 'recording' | 'thinking' | 'loading'>('ai-speaking');
  const [greetingLoading, setGreetingLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [ttsLoadingMsgId, setTtsLoadingMsgId] = useState<string | null>(null);
  const [tooltips, setTooltips] = useState<string[]>([]);
  const [showTooltips, setShowTooltips] = useState(true);
  const [showTooltipsModal, setShowTooltipsModal] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<string | null>(null);
  const voiceModalRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(atBottom);
  };

  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  React.useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

  // Load welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setGreetingLoading(true);
      (async () => {
        try {
          const [instructionsRes, knowledgeRes] = await Promise.all([
            fetch('/AI_INSTRUCTIONS.md'),
            fetch('/AI_KNOWLEDGE.md'),
          ]);
          const instructionsText = await instructionsRes.text();
          const knowledgeText = await knowledgeRes.text();
          const greetingPrompt = `Generate a creative, warm, and original greeting for a new user in ${language}. Use the INSTRUCTIONS to define the tone and style of the message, and the KNOWLEDGE BASE to incorporate specific information about our luxury hotel and its services. Be original and do not copy any examples from the instructions. The greeting should reflect our professional and welcoming personality, mentioning some of the main services and inviting the user to explore how we can help. Keep your answer very short (1-2 sentences).`;
          const res = await fetch('/api/chatgpt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: greetingPrompt }),
          });
          const data = await res.json();
          setMessages([
            {
              id: 'welcome',
              content: data.reply && data.reply.trim() ? data.reply : t('chat.greeting'),
              user: 'bot',
              created_at: new Date().toISOString(),
            },
          ]);
          
          // Reset user interaction state when showing new welcome message
          setHasUserInteracted(false);
        } catch (err) {
          console.error('Error loading welcome message:', err);
          setMessages([
            {
              id: 'welcome',
              content: t('chat.greeting'),
              user: 'bot',
              created_at: new Date().toISOString(),
            },
          ]);
          
          // Reset user interaction state when showing new welcome message
          setHasUserInteracted(false);
        } finally {
          setGreetingLoading(false);
        }
      })();
    }
  }, [language, t]);

  // Load suggestions
  useEffect(() => {
    try {
      // Access suggestions array directly from translations object
      const tooltipsArray = translations[language as Language]?.chat?.tooltips;
      
      if (Array.isArray(tooltipsArray) && tooltipsArray.length > 0) {
        const shuffled = [...tooltipsArray].sort(() => 0.5 - Math.random());
        setTooltips(shuffled.slice(0, 4));
      } else {
        console.error('Could not load suggestions for language:', language);
        setTooltips([]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setTooltips([]);
    }
  }, [language]);

  // Show modal when suggestions are loaded and welcome message is displayed
  useEffect(() => {
    // We only check if we should show the modal when there are tooltips, messages,
    // and the user hasn't interacted yet
    if (tooltips.length > 0 && messages.length > 0 && !hasUserInteracted && !greetingLoading) {
      
      // Automatically show the modal on mobile devices
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const timer = setTimeout(() => {
          if (!hasUserInteracted) { // Check again before showing
            setShowTooltipsModal(false);
          }
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [tooltips, messages, hasUserInteracted, greetingLoading]);

  // Detect screen resize to adjust suggestions display
  useEffect(() => {
    const handleResize = () => {
      if (tooltips.length > 0 && messages.length > 0 && !hasUserInteracted) {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setShowTooltipsModal(true);
        } else {
          setShowTooltipsModal(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tooltips, messages, hasUserInteracted]);

  const handleFirstInteraction = () => {
    setHasUserInteracted(true);
    setShowTooltipsModal(false);
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    console.log('Toggle Audio - Current state:', { isAudioPlaying, isAudioPaused });
    
    if (isAudioPaused) {
      console.log('Resuming audio playback');
      audioRef.current.play().catch(err => {
        console.error('Error resuming audio:', err);
      });
    } else {
      console.log('Pausing audio playback');
      audioRef.current.pause();
    }
  };

  const playTTS = async (text: string, messageId: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') return;
    
    const loadingToast = showToast.loading(t('voice.loading'));
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          language: language
        }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsAudioPlaying(false);
        setIsAudioPaused(false);
        setCurrentPlayingMessageId(null);
        if (onEnd) onEnd();
      };
      
      audio.onplay = () => {
        setIsAudioPlaying(true);
        setIsAudioPaused(false);
        setCurrentPlayingMessageId(messageId);
      };
      
      audio.onpause = () => {
        setIsAudioPlaying(false);
        setIsAudioPaused(true);
      };
      
      await audio.play();
      showToast.dismiss(loadingToast);
    } catch (err) {
      console.error('TTS error:', err);
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setCurrentPlayingMessageId(null);
      showToast.error(t('voice.error'));
      if (onEnd) onEnd();
    }
  };

  const speakBotMessage = async (text: string) => {
    if (typeof window === 'undefined') return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const sendEmailWithConversation = async (email: string | null, phone: string | null) => {
    try {
      const conversation = messages.map(msg => 
        `${msg.user === 'me' ? 'Cliente' : 'Assistente'}: ${msg.content}`
      ).join('\n\n');

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone,
          conversation,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar email');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    handleFirstInteraction();
    if (!newMessage.trim()) return;

    // Detect contact information in message
    const { email, phone } = detectContactInfo(newMessage);
    
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      content: newMessage,
      user: 'me',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage('');
    setLoading(true);

    // If email or phone detected, send email
    if (email || phone) {
      await sendEmailWithConversation(email, phone);
    }

    // Prepare conversation history for sending to ChatGPT
    const conversationHistory = messages.map(msg => ({
      user: msg.user,
      content: msg.content
    }));

    const prompt = `${newMessage}\n\nPlease answer ONLY in ${languageNames[language as Language] || 'English'}, regardless of the language of the question. Do not mention language or your ability to assist in other languages. Keep your answer short and concise.`;
    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          conversationHistory 
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || t('chat.greeting'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: t('common.error'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, type: 'like' | 'dislike', content: string) => {
    setFeedback((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === type ? undefined : type,
    }));
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, type, content }),
      });
    } catch (e) {}
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = 'pt-PT';
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang?.toLowerCase().startsWith('pt') &&
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('microsoft'))
      );
      const fallback = voices.find(v => v.lang?.toLowerCase().startsWith('pt'));
      utter.voice = preferred || fallback || null;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleComment = async (messageId: string, content: string, comment: string) => {
    try {
      await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content, comment }),
      });
      await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment }),
      });
    } catch (e) {}
  };

  const handleEmojiButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !showEmojiPicker;
    setShowEmojiPicker(newState);
    setIsEmojiButtonActive(newState);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setIsEmojiButtonActive(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newValue = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(newValue);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleToggleRecord = () => {
    console.log('handleToggleRecord called, current mode:', voiceModalMode);
    handleFirstInteraction();
    if (voiceModalMode === 'ready-to-record') {
      startRecording();
    } else if (voiceModalMode === 'recording') {
      stopRecording();
    }
  };

  const startRecording = async () => {
    console.log('startRecording called');
    if (typeof window === 'undefined') return;
    try {
      setVoiceModalMode('recording');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        handleAudioSubmit(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Recording error:', err);
      setVoiceModalMode('ready-to-record');
    }
  };

  const stopRecording = () => {
    console.log('stopRecording called');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setVoiceModalMode('thinking');
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceModalClose = () => {
    setVoiceModalOpen(false);
    setVoiceModalMode('ai-speaking');
    setVoiceMode('idle');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot') {
      const typeSpeed = 50;
      const startDelay = 100;
      const msg = messages[messages.length - 1].content || '';
      setIsTypewriterActive(true);
      const timeout = setTimeout(() => {
        setIsTypewriterActive(false);
      }, startDelay + msg.length * typeSpeed);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  useEffect(() => {
    if (isTypewriterActive && isNearBottom) {
      const interval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isTypewriterActive, isNearBottom]);

  const handleTooltipClick = async (tooltip: string) => {
    handleFirstInteraction();
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      content: tooltip,
      user: 'me',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    const prompt = `${tooltip}\n\nPlease answer ONLY in ${languageNames[language as Language] || 'English'}, regardless of the language of the question. Do not mention language or your ability to assist in other languages. Keep your answer short and concise.`;
    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || t('chat.greeting'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: t('common.error'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setVoiceModalMode('thinking');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      console.log('Transcription result:', data);
      if (data.text) {
        const userMsg = {
          id: 'user-' + Date.now(),
          content: data.text,
          user: 'me' as 'me',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);
        try {
          const conversationHistory = messages.map(msg => ({
            user: msg.user,
            content: msg.content
          }));

          const res = await fetch('/api/chatgpt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: data.text,
              conversationHistory 
            }),
          });
          const aiData = await res.json();
          const botResponse = aiData.reply || 'Desculpe, não consegui responder agora.';
          
          // Add bot response to chat
          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              content: botResponse,
              user: 'bot',
              created_at: new Date().toISOString(),
            },
          ]);

          // Play bot response
          setVoiceModalMode('ai-speaking');
          await playTTS(botResponse, 'bot-' + Date.now(), () => {
            setVoiceModalMode('ready-to-record');
          });
        } catch (err) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-error-' + Date.now(),
              content: 'Erro ao conectar ao ChatGPT.',
              user: 'bot',
              created_at: new Date().toISOString(),
            },
          ]);
          setVoiceModalMode('ready-to-record');
        } finally {
          setLoading(false);
        }
      } else {
        setVoiceModalMode('ready-to-record');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setVoiceModalMode('ready-to-record');
    }
  };

  return (
    <div className="bg-auth-gradient min-h-screen flex items-center justify-center">
      <Toaster position="bottom-right" />
      <div className="w-full h-screen md:h-[90vh] md:max-w-2xl flex flex-col rounded-none md:rounded-3xl shadow-2xl border border-white/30">
        <header className="p-4 md:p-4 flex justify-between items-center relative border-b border-white/20">
          <h1 className="text-2xl font-bold text-white drop-shadow">{t('chat.assistantTitle') || 'AI Assistant'}</h1>
          <div className="flex items-center gap-4">
            <a
              href="tel:304502776"
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none"
              aria-label="Call support"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </a>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none"
              aria-label={dark ? t('settings.lightMode') : t('settings.darkMode')}
            >
              {dark ? (
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 text-yellow-400'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0l-1.414-1.414M6.05 6.05L4.636 4.636' />
                  <circle cx='12' cy='12' r='5' fill='currentColor' />
                </svg>
              ) : (
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 text-gray-700 dark:text-white'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z' />
                </svg>
              )}
            </button>
          </div>
        </header>
        <main
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
          {greetingLoading ? (
            <div className="flex justify-center items-center py-8">
              <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></span>
              <span className="ml-3 text-white/80">{t('chat.greetingLoading')}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.user === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.user === 'bot' && (
                    <div className="flex flex-col items-end mr-2 justify-center">
                      <FaRobot className="text-3xl text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-4 border-[0.5px] border-white text-white bg-transparent max-w-[90%] md:max-w-[90%] min-w-[100px] text-base relative ${msg.user === 'me' ? 'ml-2' : 'mr-2'}`}
                  >

                    {/* typing effect for bot messages */}
                    <div className="flex items-center gap-2 mb-4">
                      {msg.user === 'bot' ? (
                        <TypewriterEffect
                          text={msg.content}
                          speed={50}
                          delay={100}
                        />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-5 pb-1 relative justify-between">
                      <div className="flex items-center gap-2">
                        {msg.user === 'bot' && (
                          <>
                            <button
                              className={`transition-colors ${feedback[msg.id] === 'like' ? 'text-green-400' : 'text-white'} hover:text-green-400`}
                              onClick={() => handleFeedback(msg.id, 'like', msg.content)}
                            >
                              <FaRegThumbsUp className="text-lg" />
                            </button>
                            <button
                              className={`transition-colors ${feedback[msg.id] === 'dislike' ? 'text-red-400' : 'text-white'} hover:text-red-400`}
                              onClick={() => handleFeedback(msg.id, 'dislike', msg.content)}
                            >
                              <FaRegThumbsDown className="text-lg" />
                            </button>

                            {/* Audio button for bot messages */}
                            <button
                              className={`hover:text-blue-300 transition-colors`}
                              onClick={async () => {
                                if (currentPlayingMessageId === msg.id) {
                                  toggleAudioPlayback();
                                } else {
                                  setTtsLoadingMsgId(msg.id);
                                  await playTTS(msg.content, msg.id, () => setTtsLoadingMsgId(null));
                                  setTtsLoadingMsgId(null);
                                }
                              }}
                              disabled={ttsLoadingMsgId === msg.id}
                            >
                              {ttsLoadingMsgId === msg.id ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 inline-block"></span>
                              ) : currentPlayingMessageId === msg.id && isAudioPaused ? (
                                <FaPlay className="text-lg text-white" />
                              ) : currentPlayingMessageId === msg.id && isAudioPlaying ? (
                                <FaPause className="text-lg text-white" />
                              ) : (
                                <FaVolumeUp className="text-lg text-white" />
                              )}
                            </button>
                            <button className="hover:text-blue-300 transition-colors" onClick={() => setCommentModal({ open: true, message: { id: msg.id, content: msg.content } })}><FaRegCommentDots className="text-lg text-white" /></button>
                          </>
                        )}
                      </div>
                      <span className="text-xs opacity-60 whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {msg.user === 'me' && (
                    <div className="flex flex-col items-end ml-2 justify-center">
                      <FaUserCircle className="text-3xl text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Suggestions */}
        {tooltips.length > 0 && !hasUserInteracted && (
          <div className="w-full px-6">
            <div className="w-full border-t border-white/30 mb-4" />
            <div className="flex flex-col gap-2 mb-4 items-center w-full md:hidden">
              <button
                className="w-full flex-1 px-4 py-2 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors text-center"
                onClick={() => {
                  console.log('Botão de sugestões clicado');
                  setShowTooltipsModal(true);
                }}
              >
                {t('chat.suggestions')}
              </button>
            </div>
            <div className="hidden md:flex flex-col gap-2 mb-4 items-center w-full">
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                {tooltips.slice(0, 2).map((tip, idx) => (
                  <button
                    key={idx}
                    className="flex-1 text-sm px-4 py-2 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors"
                    onClick={() => handleTooltipClick(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                {tooltips.slice(2, 4).map((tip, idx) => (
                  <button
                    key={idx+2}
                    className="flex-1 text-sm px-4 py-2 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors"
                    onClick={() => handleTooltipClick(tip)}
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>
            {showTooltipsModal && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    console.log('Modal clicado fora');
                    setShowTooltipsModal(false);
                  }
                }}
              >
                <div className="bg-auth-gradient bg-opacity-90 rounded-2xl shadow-2xl p-6 max-w-xs w-full flex flex-col items-center border border-white/30 backdrop-blur-md relative">
                  <button
                    className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
                    onClick={() => {
                      console.log('Botão de fechar modal clicado');
                      setShowTooltipsModal(false);
                    }}
                    aria-label="Close"
                    type="button"
                  >
                    &times;
                  </button>
                  <h2 className="text-lg font-bold text-white mb-4 drop-shadow">{t('chat.suggestions')}</h2>
                  <div className="flex flex-col gap-3 w-full">
                    {tooltips.map((tip, idx) => (
                      <button
                        key={idx}
                        className="w-full px-4 py-2 rounded-lg bg-white/20 text-white/90 hover:bg-blue-400/80 transition-colors text-center"
                        onClick={() => { 
                          console.log('Sugestão clicada:', tip);
                          handleTooltipClick(tip); 
                        }}
                      >
                        {tip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <footer className="w-full p-3">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 bg-transparent rounded-2xl px-4 py-2 shadow-md border border-white/30 relative"
          >
            <div className="flex items-center w-full">
              <button
                ref={emojiButtonRef}
                type="button"
                className={`hidden md:inline-flex text-xl text-white hover:text-gray-200 mr-2 ${isEmojiButtonActive ? 'text-blue-400' : ''}`}
                onClick={handleEmojiButtonClick}
                tabIndex={-1}
              >
                <FaRegSmile />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('chat.typeMessage')}
                className="flex-1 bg-transparent outline-none px-2 py-2 text-white dark:text-white placeholder-gray-200 dark:placeholder-gray-300"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={loading}
                style={{ background: 'transparent' }}
              />
              <button
                type="submit"
                className="text-xl text-white hover:text-gray-200 disabled:opacity-50 ml-2"
                disabled={!newMessage.trim() || loading}
              >
                <FaPaperPlane />
              </button>
              <button
                type="button"
                className="text-xl text-white hover:text-gray-200 ml-2"
                onClick={() => {
                  setVoiceModalOpen(true);
                  setVoiceModalMode('ready-to-record');
                }}
              >
                <FaMicrophone className="text-xl" />
              </button>
            </div>
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-12 left-0 z-50 emoji-picker-container"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-[#23234a] rounded-xl shadow-lg">
                  <EmojiPicker
                    data={data}
                    theme={dark ? 'dark' : 'light'}
                    onEmojiSelect={(e: any) => {
                      insertEmoji(e.native);
                    }}
                    previewPosition="none"
                    skinTonePosition="none"
                    searchPosition="none"
                  />
                </div>
              </div>
            )}
          </form>
        </footer>
        <div className="w-full px-6 pb-2">
          <p className="text-xs text-white/60 text-center">{t('chat.disclaimer')}</p>
        </div>
      </div>
      <CommentModal
        isOpen={commentModal.open}
        onClose={() => setCommentModal({ open: false })}
        onSubmit={(comment) => {
          if (commentModal.message) {
            handleComment(commentModal.message.id, commentModal.message.content, comment);
          }
        }}
      />
      <VoiceModal
        isOpen={voiceModalOpen}
        onClose={handleVoiceModalClose}
        onSubmit={handleAudioSubmit}
        mode={voiceModalMode}
        onToggleRecord={handleToggleRecord}
        modalRef={voiceModalRef}
      />
    </div>
  );
};

export default ChatComponent; 