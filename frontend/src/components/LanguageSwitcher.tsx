import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        gap: '0.4rem',
        alignItems: 'center',
        fontSize: '0.85rem',
        color: '#fff',
      }}
    >
      <span>{t('language.label')}</span>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setAppLanguage(code)}
          style={{
            border: code === i18n.language ? '1px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(0,0,0,0.35)',
            color: '#fff',
            padding: '0.3rem 0.7rem',
            borderRadius: '999px',
            cursor: 'pointer',
            opacity: code === i18n.language ? 1 : 0.7,
          }}
          aria-pressed={code === i18n.language}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
