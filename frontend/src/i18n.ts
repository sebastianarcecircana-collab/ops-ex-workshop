import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import frCommon from './locales/fr/common.json';
import itCommon from './locales/it/common.json';
import deCommon from './locales/de/common.json';
import esCommon from './locales/es/common.json';

const LANGUAGE_STORAGE_KEY = 'opsExLanguage';
const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const browserLanguage = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
const defaultLanguage = savedLanguage || browserLanguage || 'en';

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      fr: { common: frCommon },
      it: { common: itCommon },
      de: { common: deCommon },
      es: { common: esCommon },
    },
    lng: defaultLanguage,
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export function setAppLanguage(language: string) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  void i18n.changeLanguage(language);
}

export default i18n;
