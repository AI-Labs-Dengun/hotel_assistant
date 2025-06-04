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
    console.log('⚠️ getBrowserLanguage: Window not available, returning English');
    return 'en';
  }
  
  console.log('🔍 getBrowserLanguage: Starting detection...');
  
  // Try to get the main browser language
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  console.log('🌐 Primary browser language:', browserLang);
  
  // Check if the language is supported
  if (['pt', 'en', 'es', 'fr', 'de'].includes(browserLang)) {
    console.log('✅ Primary language is supported:', browserLang);
    return browserLang as Language;
  }

  // Try to get the first preferred language
  const preferredLang = navigator.languages[0]?.split('-')[0].toLowerCase();
  console.log('🌐 Preferred language:', preferredLang);
  
  if (preferredLang && ['pt', 'en', 'es', 'fr', 'de'].includes(preferredLang)) {
    console.log('✅ Preferred language is supported:', preferredLang);
    return preferredLang as Language;
  }

  // Fallback to English
  console.log('⚠️ No supported language found, falling back to English');
  return 'en';
};

export const useTranslation = (language: Language) => {
  console.log('🗣️ useTranslation called with language:', language);
  
  const t = (key: string) => {
    console.log('🔑 Translating key:', key, 'for language:', language);
    
    const keys = key.split('.');
    let value: any = translations[language];
    
    // Try to get translation in current language
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.log('⚠️ Key not found in', language, ', trying English fallback');
        // If not found in current language, try English
        value = translations['en'];
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            // If still not found, return the key
            console.log('❌ Key not found in English either:', key);
            return key;
          }
        }
        console.log('🔄 Using English fallback for:', key, '=', value);
        return typeof value === 'string' ? value : key;
      }
    }
    
    const result = typeof value === 'string' ? value : key;
    console.log('✅ Translation result for', key, ':', result);
    return result;
  };

  return { t };
}; 