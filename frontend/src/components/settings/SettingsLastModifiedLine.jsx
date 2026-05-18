import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { ClockCounterClockwise } from 'phosphor-react';
import { formatSettingsDateTime } from '../../utils/formatSettingsDateTime';

function SettingsLastModifiedLine({ iso, className = '' }) {
  const { t, i18n } = useTranslation();
  const formatted = formatSettingsDateTime(iso, i18n.language);
  if (!formatted) return null;

  return (
    <p
      className={`mt-3 flex items-center gap-1.5 text-xs text-gray-500 night:text-gray-400 ${className}`.trim()}
    >
      <ClockCounterClockwise size={15} weight="duotone" className="shrink-0 opacity-90" aria-hidden />
      <span>{t('settings.last_modified', { datetime: formatted })}</span>
    </p>
  );
}

SettingsLastModifiedLine.propTypes = {
  iso: PropTypes.string,
  className: PropTypes.string,
};

export default SettingsLastModifiedLine;
