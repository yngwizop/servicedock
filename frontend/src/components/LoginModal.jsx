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
        className="bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-2xl rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/12 dark:border-white/8"
      >
        {/* Servicedock Überschrift */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-blue-400 dark:text-blue-300 tracking-tight mb-1">Servicedock</h1>
          <p className="text-base text-gray-300 dark:text-gray-400">{t('login.subtitle')}</p>
        </div>
        {/* Header mit Icon */}
        <div className="flex items-center gap-3 mb-4">
          <LockKey size={32} className="text-blue-400 dark:text-blue-300" weight="fill" />
          <h3 id="loginmodal-title" className="text-xl font-bold text-gray-100">
            {t('login.title')}
          </h3>
        </div>
        <p className="text-gray-400 dark:text-gray-500 mb-4">
          {adEnabled ? t('login.instruction_ad') : t('login.instruction')}
        </p>

        {/* Username Input (nur wenn AD aktiv) */}
        {adEnabled && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
              {t('login.username_label')}
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('login.username_placeholder')}
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {/* Password Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
            {t('login.password_label')}
          </label>
          <input
            type="password"
            placeholder={t('login.password_placeholder')}
            autoFocus={!adEnabled}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-white placeholder-gray-400 dark:placeholder-gray-500"
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
            className="flex-1 px-4 py-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-100 rounded-lg hover:bg-white/15 dark:hover:bg-white/10 transition-all shadow-lg hover:shadow-xl"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`flex-1 px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] ${
              disabled 
                ? 'bg-gray-600 dark:bg-gray-700 text-gray-300 cursor-not-allowed'
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