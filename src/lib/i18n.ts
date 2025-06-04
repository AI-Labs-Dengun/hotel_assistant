import pt from './translations/pt.json';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

export type Language = 'pt' | 'en' | 'es' | 'fr' | 'de';

export const translations = {
  pt,
  en,
  es,
  fr,
  de,
};

export const languageNames: Record<Language, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export const getBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') {
    return 'en';
  }
  
  // Try to get the main browser language
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  
  // Check if the language is supported
  if (['pt', 'en', 'es', 'fr', 'de'].includes(browserLang)) {
    return browserLang as Language;
  }

  // Try to get the first preferred language
  const preferredLang = navigator.languages[0]?.split('-')[0].toLowerCase();
  
  if (preferredLang && ['pt', 'en', 'es', 'fr', 'de'].includes(preferredLang)) {
    return preferredLang as Language;
  }

  // Fallback to English
  return 'en';
};

export const useTranslation = (language: Language) => {
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    // Try to get translation in current language
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // If not found in current language, try English
        value = translations['en'];
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            // If still not found, return the key
            return key;
          }
        }
        return typeof value === 'string' ? value : key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
}; 