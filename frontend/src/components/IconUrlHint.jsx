import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'phosphor-react';

function IconUrlHint() {
  const { t } = useTranslation();

  return (
    <div className="p-3.5 bg-blue-500/8 dark:bg-blue-500/10 border border-blue-500/15 rounded-xl">
      <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed flex items-start gap-2">
        <Lightbulb size={18} weight="duotone" className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" aria-hidden />
        <span>
          {t('serviceIcon.hint_prefix')}{' '}
          <a
            href="https://selfh.st/icons/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-100 transition-colors"
          >
            selfh.st/icons
          </a>
        </span>
      </p>
    </div>
  );
}

export default IconUrlHint;
