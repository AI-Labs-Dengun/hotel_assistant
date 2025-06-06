import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { useLanguage } from '../lib/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { useTheme } from '../lib/theme';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  message?: { id: string; content: string };
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  message,
}) => {
  const [comment, setComment] = React.useState('');
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const { dark } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(comment);
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-auth-gradient bg-opacity-90 border border-white/30 rounded-2xl p-6 w-full max-w-md backdrop-blur-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          aria-label={t('common.cancel')}
        >
          <FaTimes className="text-xl text-white" />
        </button>
        <h2 className={`text-xl font-semibold mb-4 ${dark ? 'text-white' : 'text-black'}`}>{t('chat.addComment')}</h2>
        {message && (
          <div className={`mb-4 p-3 rounded ${dark ? 'bg-white/10 text-white border border-white/20' : 'bg-gray-100 text-black border border-gray-300'} text-sm`}>
            {message.content}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <textarea
            className={`w-full p-2 border rounded bg-transparent ${dark ? 'text-white border-white/30 placeholder-white/80' : 'text-black border-gray-300 placeholder-gray-400'} focus:border-blue-500 focus:ring-0`}
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('chat.writeComment')}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${dark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-black'}`}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors duration-200"
            >
              {t('chat.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentModal; 