"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaRegThumbsUp, FaRegThumbsDown, FaMicrophone, FaPaperPlane, FaUserCircle, FaRobot, FaCog, FaRegCommentDots, FaVolumeUp, FaRegSmile, FaStop } from 'react-icons/fa';
import { useTheme } from '../providers/ThemeProvider';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import TypewriterEffect from 'react-typewriter-effect';
import { useLanguage } from '../../lib/LanguageContext';
import { useTranslation } from '../../lib/i18n';
import dynamic from 'next/dynamic';
import Loading from './loading';

// Add this near the top of the file, after the imports
const EmojiPicker = dynamic(() => import('@emoji-mart/react'), {
  ssr: false,
  loading: () => <div className="w-[350px] h-[400px] bg-white dark:bg-[#23234a] rounded-xl" />
});

// Message type
interface Message {
  id: string;
  content: string;
  user: 'me' | 'bot';
  created_at: string;
}

// Modal for adding a comment
function CommentModal({ open, onClose, message, onSubmit }: { open: boolean, onClose: () => void, message: { id: string, content: string }, onSubmit: (comment: string) => void }) {
  const [comment, setComment] = useState('');
  React.useEffect(() => { if (!open) setComment(''); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="rounded-2xl shadow-2xl p-6 w-[95vw] max-w-md bg-gradient-to-br from-pink-300 via-blue-200 to-blue-100 dark:bg-gradient-to-br dark:from-[#9133e7] dark:via-[#541d85] dark:to-[#1c2458] relative">
        <button className="absolute top-4 right-4 text-white/70 hover:text-gray-400 text-xl" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold text-white dark:text-white mb-4">Add Comment</h2>
        <div className="mb-4 p-3 rounded-lg bg-white/10 dark:bg-white/10 text-white dark:text-white text-sm">{message.content}</div>
        <textarea
          className="w-full min-h-[80px] rounded-lg p-3 bg-white/20 dark:bg-white/10 text-white dark:text-white placeholder-white/60 outline-none border border-white/30 mb-4 resize-none"
          placeholder="Write your comment..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 rounded text-white/80 hover:text-gray-300" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded bg-white/30 dark:bg-white/10 text-white/80 font-semibold disabled:opacity-40"
            disabled={!comment.trim()}
            onClick={() => { onSubmit(comment); onClose(); }}
          >Submit</button>
        </div>
      </div>
    </div>
  );
}

// Voice modal component
function VoiceModal({ open, mode, onClose, onToggleRecord }: {
  open: boolean,
  mode: 'ai-speaking' | 'ready-to-record' | 'recording',
  onClose: () => void,
  onToggleRecord: () => void,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      <div className="rounded-2xl shadow-2xl p-6 w-[95vw] max-w-md bg-auth-gradient bg-opacity-90 border border-white/30 backdrop-blur-md relative">
        <button className="absolute top-4 right-4 text-white/70 hover:text-gray-400 text-xl z-10" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold text-white mb-4">Chat por Voz</h2>
        <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
          <div className="bg-white/20 rounded-full p-2">
            <FaUserCircle className="text-3xl text-white" />
          </div>
          <div>
            <div className="text-white font-semibold">
              {mode === 'ai-speaking' ? 'Assistente' : 'Você'}
            </div>
            <div className="text-white/80 text-sm">
              {mode === 'ai-speaking' ? 'Falando' : mode === 'ready-to-record' ? 'Pronto para gravar' : 'A Gravar'}
            </div>
          </div>
          <div className="ml-auto">
            {mode === 'ai-speaking' && (
              <span className="text-white/80 text-2xl">🔊</span>
            )}
            {(mode === 'ready-to-record' || mode === 'recording') && (
              <button
                className={`text-white/80 text-2xl rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white ${mode === 'ready-to-record' ? 'bg-green-600 hover:bg-green-800' : 'bg-red-600 hover:bg-red-800'}`}
                onClick={onToggleRecord}
                type="button"
              >
                {mode === 'ready-to-record' ? <FaMicrophone /> : <FaStop />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to map language code to language name
const languageNames: Record<string, string> = {
  en: 'English',
  pt: 'Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

const ChatPage = dynamic(() => import('./ChatComponent'), {
  ssr: false,
  loading: () => <Loading />
});

export default function Page() {
  return <ChatPage />;
} 