import React from 'react';
import { useTranslation } from 'react-i18next';
import { LockKey, User } from 'phosphor-react';

function LoginModal({ onSubmit, password, setPassword, username, setUsername, error, onClose, disabled = false, appearance = {}, adEnabled = false, adDomain = null }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="loginmodal-title">
      {/* Background Image Layer (wenn vorhanden) */}
      {appearance.bg_image_url && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: `url(${appearance.bg_image_url})`,
            opacity: appearance.bg_opacity || 0.6,
          }}
        ></div>
      )}
      
      {/* Blur Overlay für Datenschutz */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm -z-5"></div>
      <form
        onSubmit={onSubmit}
        className="bg-white/55 dark:bg-gray-900/60 backdrop-blur-2xl rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-300/50 dark:border-white/20"
      >
        {/* Servicedock Überschrift */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 tracking-tight mb-1">Servicedock</h1>
          <p className="text-base text-gray-600 dark:text-gray-300">{t('login.subtitle')}</p>
        </div>
        {/* Header mit Icon */}
        <div className="flex items-center gap-3 mb-4">
          <LockKey size={32} className="text-blue-500 dark:text-blue-400" weight="fill" />
          <h3 id="loginmodal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {t('login.title')}
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {adEnabled ? t('login.instruction_ad') : t('login.instruction')}
        </p>

        {/* Username Input (nur wenn AD aktiv) */}
        {adEnabled && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('login.username_label')}
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={adDomain ? `${t('login.username_placeholder')}@${adDomain}` : t('login.username_placeholder')}
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('login.username_hint')}
            </p>
          </div>
        )}

        {/* Password Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('login.password_label')}
          </label>
          <input
            type="password"
            placeholder={t('login.password_placeholder')}
            autoFocus={!adEnabled}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 text-gray-800 dark:text-white rounded-lg hover:bg-white/90 dark:hover:bg-white/15 transition-all shadow-lg hover:shadow-xl"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`flex-1 px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] ${
              disabled 
                ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

export default LoginModal;