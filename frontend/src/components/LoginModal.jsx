import React from 'react';
import { LockKey } from 'phosphor-react';

function LoginModal({ onSubmit, password, setPassword, error, onClose }) {
  return (
    // Hintergrund-Overlay
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="loginmodal-title">
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-blue-500 dark:border-blue-600"
      >
        {/* Header mit Icon */}
        <div className="flex items-center gap-3 mb-4">
          <LockKey size={32} className="text-blue-500 dark:text-blue-400" weight="fill" />
          <h3 id="loginmodal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Admin-Login
          </h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Bitte gib dein Admin-Passwort ein, um fortzufahren.
        </p>

        {/* Password Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Passwort:
          </label>
          <input
            type="password"
            placeholder="Passwort eingeben"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

export default LoginModal;