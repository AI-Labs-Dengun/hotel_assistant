'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getBrowserLanguage } from './i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState<Language>('en'); // Start with English as default

  useEffect(() => {
    console.log('🚀 LanguageProvider useEffect triggered');
    
    const detectAndSetLanguage = () => {
      console.log('🌍 Starting language detection...');
      
      // First, clear any invalid localStorage
      const savedLanguage = localStorage.getItem('language') as Language;
      console.log('💾 Current localStorage language:', savedLanguage);
      
      if (savedLanguage && !['pt', 'en', 'es', 'fr', 'de'].includes(savedLanguage)) {
        console.log('🗑️ Clearing invalid saved language:', savedLanguage);
        localStorage.removeItem('language');
      }
      
      // Detect browser language
      const browserLanguage = getBrowserLanguage();
      console.log('🌐 Browser language detected:', browserLanguage);
      console.log('🌐 Navigator.language:', navigator.language);
      console.log('🌐 Navigator.languages:', navigator.languages);
      
      // Use browser language if no valid saved language
      const finalLanguage = (savedLanguage && ['pt', 'en', 'es', 'fr', 'de'].includes(savedLanguage)) 
        ? savedLanguage 
        : browserLanguage;
      
      console.log('🎯 Final language selected:', finalLanguage);
      
      // Save to localStorage and set state
      localStorage.setItem('language', finalLanguage);
      document.documentElement.lang = finalLanguage;
      setLanguage(finalLanguage);
      
      console.log('✅ Language set to:', finalLanguage);
    };
    
    detectAndSetLanguage();
    setMounted(true);
  }, []);

  const handleSetLanguage = (newLang: Language) => {
    console.log('🔄 Changing language from', language, 'to', newLang);
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    document.documentElement.lang = newLang;
  };

  console.log('🎭 LanguageProvider render - mounted:', mounted, 'language:', language);

  // Don't render anything until we've mounted
  if (!mounted) {
    return <div>Loading language...</div>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}; 