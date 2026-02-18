import React from 'react';
import { useTranslation } from 'react-i18next';
import { Translate, Check } from 'phosphor-react';

// SVG Flaggen statt Emojis (Alpine/Docker hat keine Emoji-Font für Flaggen)
const FlagDE = () => (
  <svg viewBox="0 0 640 480" className="w-10 h-7 rounded shadow-sm">
    <path fill="#000" d="M0 0h640v160H0z"/>
    <path fill="#D00" d="M0 160h640v160H0z"/>
    <path fill="#FFCE00" d="M0 320h640v160H0z"/>
  </svg>
);

const FlagGB = () => (
  <svg viewBox="0 0 640 480" className="w-10 h-7 rounded shadow-sm">
    <path fill="#012169" d="M0 0h640v480H0z"/>
    <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"/>
    <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"/>
    <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z"/>
    <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z"/>
  </svg>
);

const languages = [
  { code: 'de', label: 'Deutsch', Flag: FlagDE, description: 'German' },
  { code: 'en', label: 'English', Flag: FlagGB, description: 'Englisch' },
];

function LanguageCard() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'de';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-violet-500/20 dark:bg-violet-500/10">
          <Translate size={24} weight="duotone" className="text-violet-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            🌐 {t('language.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {t('language.description')}
          </p>
        </div>
      </div>

      {/* Language Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {languages.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/10 shadow-lg shadow-violet-500/10'
                  : 'border-gray-300/50 dark:border-white/10 bg-white/30 dark:bg-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 hover:bg-violet-50/50 dark:hover:bg-violet-500/5'
              }`}
            >
              <lang.Flag />
              <div className="text-left">
                <p className={`text-lg font-bold ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-white'}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {lang.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                  {lang.description}
                </p>
              </div>
              {isActive && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check size={14} weight="bold" className="text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info */}
      <p className="mt-5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
        💡 {t('language.persistence_info')}
      </p>
    </div>
  );
}

export default LanguageCard;
