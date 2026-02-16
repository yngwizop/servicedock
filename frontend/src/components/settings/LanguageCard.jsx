import React from 'react';
import { useTranslation } from 'react-i18next';
import { Translate, Check } from 'phosphor-react';

const languages = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', description: 'German' },
  { code: 'en', label: 'English', flag: '🇬🇧', description: 'Englisch' },
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
              <span className="text-4xl">{lang.flag}</span>
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
