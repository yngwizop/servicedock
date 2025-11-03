import React from 'react';

function LoginModal({ onSubmit, password, setPassword, error, onClose }) {
  return (
    // Hintergrund-Overlay bleibt gleich
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="loginmodal-title">
      <form
        onSubmit={onSubmit}
        // NEU: Dark-Mode Hintergrund und Schatten
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl dark:shadow-blue-900/30 flex flex-col gap-4 w-80 relative"
      >
        <button
          type="button"
          onClick={onClose}
          // NEU: Dark-Mode Textfarben
          className="absolute top-2 right-2 text-3xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label="Modal schließen"
        >
          &times;
        </button>
        {/* NEU: Dark-Mode Textfarbe */}
        <h3 id="loginmodal-title" className="text-xl font-semibold text-center text-gray-800 dark:text-gray-100">Admin-Login</h3>
        <input
          type="password"
          placeholder="Admin-Passwort"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          // NEU: Dark-Mode für Input (Hintergrund, Text, Border, Placeholder)
          className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          // Button-Farben bleiben (oder anpassen, falls gewünscht)
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-md font-medium transition-colors"
        >
          Login
        </button>
        {error && (
          // Fehlertext bleibt rot
          <p className="text-red-500 text-sm text-center -mt-2">{error}</p>
        )}
      </form>
    </div>
  );
}

export default LoginModal;