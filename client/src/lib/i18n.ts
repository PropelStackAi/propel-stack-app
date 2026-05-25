/**
 * Internationalization (i18n) — Propel Stack AI, LLC
 *
 * Scaffold for multi-language support. Currently ships English (default),
 * Spanish, and French translations. Extend by adding keys to each locale file
 * and calling `t('key')` via the `useTranslation` hook.
 *
 * Language detection order: localStorage → browser navigator → fallback 'en'
 * New languages: add a JSON file under src/locales/ and register in `resources`.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',  nativeLabel: 'English'   },
  { code: 'es', label: 'Spanish',  nativeLabel: 'Español'   },
  { code: 'fr', label: 'French',   nativeLabel: 'Français'  },
] as const;

export type SupportedLang = typeof SUPPORTED_LANGUAGES[number]['code'];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // HARD RULE: no localStorage/sessionStorage — use i18n-specific key only
      order: ['querystring', 'navigator'],
      caches: [], // Do not cache to any browser storage
    },
  });

export default i18n;
