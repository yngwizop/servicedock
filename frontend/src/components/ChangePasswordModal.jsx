import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockKey, ShieldCheck } from 'phosphor-react';
import { BACKEND_URL } from '../utils/backendUrl';
import { cssBackgroundImageValue } from '../utils/sanitize';

function ChangePasswordModal({ onComplete, appearance = {} }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validierung
    if (newPassword.length < 8) {
      setError(t('passwordChange.too_short'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordChange.mismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('passwordChange.same_password'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.detail === 'string' ? data.detail : t('passwordChange.error'));
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError(t('passwordChange.error'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-white placeholder-gray-400 dark:placeholder-gray-500";
  const labelClass = "block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Background */}
      {appearance.bg_image_url && cssBackgroundImageValue(appearance.bg_image_url) && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: cssBackgroundImageValue(appearance.bg_image_url),
            opacity: appearance.bg_opacity || 0.6,
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm -z-5" />

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-2xl rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/12 dark:border-white/8"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={32} className="text-amber-400 dark:text-amber-300" weight="fill" />
          <h3 className="text-xl font-bold text-gray-100">
            {t('passwordChange.title')}
          </h3>
        </div>
        <p className="text-gray-400 dark:text-gray-500 mb-5 text-sm">
          {t('passwordChange.instruction')}
        </p>

        {success ? (
          <div className="flex items-center gap-3 p-4 bg-green-100/80 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
            <ShieldCheck size={24} className="text-green-600 dark:text-green-400" weight="fill" />
            <span className="text-green-800 dark:text-green-300 font-medium">
              {t('passwordChange.success')}
            </span>
          </div>
        ) : (
          <>
            {/* Current Password */}
            <div className="mb-4">
              <label className={labelClass}>{t('passwordChange.current_password')}</label>
              <input
                type="password"
                placeholder={t('passwordChange.current_placeholder')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoFocus
                required
                className={inputClass}
              />
            </div>

            {/* New Password */}
            <div className="mb-4">
              <label className={labelClass}>{t('passwordChange.new_password')}</label>
              <input
                type="password"
                placeholder={t('passwordChange.new_placeholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label className={labelClass}>{t('passwordChange.confirm_password')}</label>
              <input
                type="password"
                placeholder={t('passwordChange.confirm_placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-2.5 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] font-medium ${
                loading
                  ? 'bg-gray-600 dark:bg-gray-700 text-gray-300 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {loading ? '...' : t('passwordChange.submit')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default ChangePasswordModal;
