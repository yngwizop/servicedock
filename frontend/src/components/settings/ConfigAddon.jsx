import React from 'react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';

function ConfigAddon({ 
  BACKEND_URL,
  importMode, setImportMode,
  importFile, setImportFile,
  importPreview, setImportPreview,
  isImporting, setIsImporting,
  importSuccess, setImportSuccess,
  importError, setImportError,
  onBack 
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Zurück-Button */}
      <button
        onClick={() => {
          onBack();
          setImportFile(null);
          setImportPreview(null);
          setImportError(null);
          setImportSuccess(false);
        }}
        className="flex items-center gap-2 px-4 py-2 mb-4 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-300 font-medium shadow-lg"
      >
        <span className="text-xl">←</span>
        {t('configAddon.back')}
      </button>

      <div className="space-y-6">
        {/* Export Section */}
        <div className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-blue-500/50 dark:border-blue-500/40">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📥</span>
            {t('configAddon.export_title')}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {t('configAddon.export_description')}
          </p>
          <button
            onClick={async () => {
              try {
                const res = await authenticatedFetch(`${BACKEND_URL}/api/config/export`);
                const data = await res.json();
                
                // Download as JSON file
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `servicedock-config-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Export failed:', err);
                alert(t('configAddon.export_failed') + err.message);
              }
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {t('configAddon.export_button')}
          </button>
        </div>

        {/* Import Section */}
        <div className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-blue-500/50 dark:border-blue-500/40">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📤</span>
            {t('configAddon.import_title')}
          </h3>

          {/* Import Mode Selection */}
          <div className="mb-6">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('configAddon.import_mode')}
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('configAddon.mode_append')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('configAddon.mode_append_desc')}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50 dark:has-[:checked]:bg-red-900/20 border-gray-300 dark:border-gray-600">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mt-1 w-4 h-4 text-red-600 focus:ring-2 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('configAddon.mode_replace')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <strong>{t('configAddon.mode_replace_desc')}</strong>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('configAddon.select_file')}
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setImportFile(file);
                  setImportError(null);
                  setImportPreview(null);
                  
                  // Validate file
                  try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    
                    // Validate with backend
                    const res = await authenticatedFetch(`${BACKEND_URL}/api/config/validate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: text
                    });
                    const validation = await res.json();
                    
                    if (validation.valid) {
                      setImportPreview(validation);
                    } else {
                      setImportError(validation.error || t('configAddon.invalid_file'));
                    }
                  } catch (err) {
                    setImportError(t('configAddon.file_read_error') + err.message);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white/70 dark:bg-white/5 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          {importPreview && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                {t('configAddon.file_valid')}
              </h4>
              <div className="text-sm text-green-800 dark:text-green-400 space-y-1">
                <p>📊 <strong>{importPreview.statistics.dashboards}</strong> Dashboard(s)</p>
                <p>📦 <strong>{importPreview.statistics.services}</strong> Service(s)</p>
                <p>🔗 <strong>{importPreview.statistics.shortcuts}</strong> Shortcut(s)</p>
                <p className="mt-2 text-xs">
                  Dashboards: {importPreview.preview.dashboard_names.join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {importError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl">
              <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                {t('configAddon.file_error')}
              </h4>
              <p className="text-sm text-red-800 dark:text-red-400">{importError}</p>
            </div>
          )}

          {/* Success Message */}
          {importSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                {t('configAddon.import_success')}
              </h4>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('configAddon.import_success_detail')}
              </p>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={async () => {
              if (!importFile || !importPreview) {
                alert(t('configAddon.select_file_first'));
                return;
              }

              if (importMode === 'replace' && !confirm(t('configAddon.replace_confirm'))) {
                return;
              }

              // Password re-confirmation for replace mode
              let confirmPassword = null;
              if (importMode === 'replace') {
                confirmPassword = prompt(t('configAddon.password_prompt'));
                if (!confirmPassword) return;
              }

              setIsImporting(true);
              setImportError(null);
              setImportSuccess(false);

              try {
                const text = await importFile.text();
                const headers = { 'Content-Type': 'application/json' };
                if (confirmPassword) {
                  headers['X-Confirm-Password'] = confirmPassword;
                }
                const res = await authenticatedFetch(
                  `${BACKEND_URL}/api/config/import?mode=${importMode}`,
                  {
                    method: 'POST',
                    headers,
                    body: text
                  }
                );

                if (!res.ok) {
                  throw new Error(t('configAddon.import_failed'));
                }

                const result = await res.json();
                setImportSuccess(true);
                setImportFile(null);
                setImportPreview(null);

                // Reload after 2 seconds
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              } catch (err) {
                setImportError(t('configAddon.import_failed') + ': ' + err.message);
              } finally {
                setIsImporting(false);
              }
            }}
            disabled={!importFile || !importPreview || isImporting}
            className={`w-full py-3 font-semibold rounded-xl transition-all duration-300 shadow-lg ${
              !importFile || !importPreview || isImporting
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                : importMode === 'replace'
                ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-xl'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl'
            }`}
          >
            {isImporting ? t('configAddon.importing') : importMode === 'replace' ? t('configAddon.replace_import') : t('configAddon.append_import')}
          </button>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-blue-500/50 dark:border-blue-500/40 rounded-2xl shadow-lg">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('configAddon.notes_title')}
            </h5>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
              <li>{t('configAddon.note_no_credentials')}</li>
              <li>{t('configAddon.note_appearance')}</li>
              <li>{t('configAddon.note_append')}</li>
              <li>{t('configAddon.note_replace')}</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfigAddon;
