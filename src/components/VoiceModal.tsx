import React, { RefObject } from 'react';
import { FaMicrophone, FaStop, FaTimes, FaVolumeUp, FaSpinner } from 'react-icons/fa';
import { useLanguage } from '../lib/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { useTheme } from '../app/providers/ThemeProvider';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (audioBlob: Blob) => void;
  mode: 'ai-speaking' | 'ready-to-record' | 'recording' | 'thinking' | 'loading';
  onToggleRecord: () => void;
  modalRef: RefObject<HTMLDivElement>;
}

const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  onToggleRecord,
  modalRef,
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const { dark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div 
        ref={modalRef}
        className="bg-auth-gradient bg-opacity-95 border border-white/30 rounded-3xl p-8 w-full max-w-md backdrop-blur-md relative shadow-2xl animate-scaleIn"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors p-2 hover:bg-white/10 rounded-full"
        >
          <FaTimes className={`text-xl ${dark ? '!text-white' : '!text-black'}`} />
        </button>

        <div className="flex flex-col items-center gap-8">
          <h2 className={`text-2xl font-bold text-center drop-shadow ${dark ? '!text-white' : '!text-black'}`}>
            {(mode === 'ready-to-record' || mode === 'recording') ? t('voice.user') : t('voice.aiAssistant')}
          </h2>

          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center relative overflow-visible backdrop-blur-sm">
              {mode === 'ai-speaking' && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-voice-wave1 opacity-50" />
                  <span className="absolute inset-0 rounded-full border-2 border-blue-300 animate-voice-wave2 opacity-30" />
                  <span className="absolute inset-0 rounded-full border-2 border-blue-200 animate-voice-wave3 opacity-20" />
                </>
              )}
              {mode === 'ai-speaking' ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center z-10 shadow-lg">
                  <FaVolumeUp className="text-white text-3xl" />
                </div>
              ) : mode === 'thinking' ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FaSpinner className="text-white text-3xl animate-spin" />
                </div>
              ) : mode === 'loading' ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FaSpinner className="text-white text-3xl animate-spin" />
                </div>
              ) : mode === 'recording' ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg animate-pulse">
                  <FaStop className="text-white text-3xl" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <FaMicrophone className="text-white text-3xl" />
                </div>
              )}
            </div>
          </div>

          {(mode === 'ready-to-record' || mode === 'recording') && (
            <button
              onClick={onToggleRecord}
              className={`px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 w-auto shadow-lg hover:shadow-xl hover:scale-105`}
            >
              {mode === 'recording' ? t('voice.stop') : t('voice.start')}
            </button>
          )}

          {(mode === 'ai-speaking' || mode === 'thinking' || mode === 'loading') && (
            <div className={`text-center text-lg font-medium ${dark ? '!text-white' : '!text-black'}`}>
              {mode === 'ai-speaking' ? t('voice.aiSpeaking') :
               mode === 'thinking' ? t('voice.aiThinking') :
               t('voice.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceModal; 