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

// Cache busting function
const clearAllCaches = async () => {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear service worker caches if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  } catch (error) {
    // Silently handle errors
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      // Clear caches on every page load to ensure fresh language detection
      if (!cacheCleared) {
        await clearAllCaches();
        setCacheCleared(true);
      }
      
      const detectAndSetLanguage = () => {
        // Force fresh browser language detection
        const browserLanguage = getBrowserLanguage();
        
        // Always use browser language for fresh detection
        const finalLanguage = browserLanguage;
        
        // Save to localStorage and set state
        localStorage.setItem('language', finalLanguage);
        localStorage.setItem('languageDetectedAt', Date.now().toString());
        document.documentElement.lang = finalLanguage;
        setLanguage(finalLanguage);
      };
      
      detectAndSetLanguage();
      setMounted(true);
    };
    
    initializeLanguage();
  }, [cacheCleared]);

  // Add listener for manual refresh
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+R or Cmd+Shift+R for hard refresh with cache clear
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        clearAllCaches().then(() => {
          window.location.reload();
        });
      }
      // Ctrl+F5 for cache clear and reload
      if (event.ctrlKey && event.key === 'F5') {
        clearAllCaches().then(() => {
          window.location.reload();
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSetLanguage = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    localStorage.setItem('languageChangedAt', Date.now().toString());
    document.documentElement.lang = newLang;
    
    // Force a small cache clear for translations
    setTimeout(() => {
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('translation') || cacheName.includes('i18n')) {
              caches.delete(cacheName);
            }
          });
        });
      }
    }, 100);
  };

  // Show loading until cache is cleared and language is detected
  if (!mounted || !cacheCleared) {
    // Detect if user prefers dark mode
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: prefersDark ? '#23232b' : '#ffffff',
        color: prefersDark ? '#ffffff' : '#000000',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: `3px solid ${prefersDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
            borderTop: `3px solid ${prefersDark ? '#ffffff' : '#000000'}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <div>Loading...</div>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `
          }} />
        </div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}; 