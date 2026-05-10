import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretLeft,
  DownloadSimple,
  UploadSimple,
  SquaresFour,
  Package,
  LinkSimple,
  Warning,
  Lightbulb,
  CircleNotch,
  XCircle,
  CheckCircle,
} from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';

function ConfigAddon({ 
  BACKEND_URL,
  importMode, setImportMode,
  importFile, setImportFile,
  importPreview, setImportPreview,
  isImporting, setIsImporting,
  importSuccess, setImportSuccess,
  importError, setImportError,
  onBack,
  onClose,
  isModal = false
}) {
  const { t } = useTranslation();

  const handleClose = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    setImportSuccess(false);
    if (onClose) onClose();
    else if (onBack) onBack();
  };

  return (
    <>
      {/* Zurück-Button - nur wenn nicht Modal */}
      {!isModal && (
        <button
          onClick={handleClose}
          className="flex items-center gap-2 px-4 py-2 mb-4 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-300 font-medium shadow-lg"
        >
          <CaretLeft size={20} weight="bold" className="shrink-0" aria-hidden />
          {t('configAddon.back')}
        </button>
      )}

      <div className="space-y-6">
        {/* Export Section */}
        <div className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-blue-500/50 dark:border-blue-500/40">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 dark:bg-blue-400/20 ring-1 ring-blue-500/25 dark:ring-blue-400/15">
              <DownloadSimple size={20} weight="duotone" className="text-blue-600 dark:text-blue-300" aria-hidden />
            </span>
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
            className="w-full py-2.5 text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-2"
          >
            <DownloadSimple size={20} weight="bold" className="shrink-0" aria-hidden />
            {t('configAddon.export_button')}
          </button>
        </div>

        {/* Import Section */}
        <div className="p-6 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-blue-500/50 dark:border-blue-500/40">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 dark:bg-blue-400/20 ring-1 ring-blue-500/25 dark:ring-blue-400/15">
              <UploadSimple size={20} weight="duotone" className="text-blue-600 dark:text-blue-300" aria-hidden />
            </span>
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
                  <div className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package size={18} weight="duotone" className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
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
                  <div className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Warning size={18} weight="fill" className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
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
            <div className="relative flex items-center gap-3">
              <button
                type="button"
                onClick={() => document.getElementById('config-file-input').click()}
                className="px-4 py-2 text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                {t('configAddon.choose_file')}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {importFile ? importFile.name : t('configAddon.no_file_selected')}
              </span>
              <input
                id="config-file-input"
                type="file"
                accept=".json,application/json"
                className="hidden"
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
              />
            </div>
          </div>

          {/* Preview */}
          {importPreview && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                <CheckCircle size={20} weight="fill" className="shrink-0 text-green-600 dark:text-green-400" aria-hidden />
                {t('configAddon.file_valid')}
              </h4>
              <div className="text-sm text-green-800 dark:text-green-400 space-y-2">
                <p className="flex items-center gap-2">
                  <SquaresFour size={18} weight="duotone" className="shrink-0 text-green-700 dark:text-green-400" aria-hidden />
                  <span><strong>{importPreview.statistics.dashboards}</strong> Dashboard(s)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Package size={18} weight="duotone" className="shrink-0 text-green-700 dark:text-green-400" aria-hidden />
                  <span><strong>{importPreview.statistics.services}</strong> Service(s)</span>
                </p>
                <p className="flex items-center gap-2">
                  <LinkSimple size={18} weight="duotone" className="shrink-0 text-green-700 dark:text-green-400" aria-hidden />
                  <span><strong>{importPreview.statistics.shortcuts}</strong> Shortcut(s)</span>
                </p>
                <p className="mt-2 text-xs">
                  Dashboards: {importPreview.preview.dashboard_names.join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {importError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl">
              <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                <XCircle size={20} weight="fill" className="shrink-0 text-red-600 dark:text-red-400" aria-hidden />
                {t('configAddon.file_error')}
              </h4>
              <p className="text-sm text-red-800 dark:text-red-400">{importError}</p>
            </div>
          )}

          {/* Success Message */}
          {importSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                <CheckCircle size={20} weight="fill" className="shrink-0 text-green-600 dark:text-green-400" aria-hidden />
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
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-2 ${
              !importFile || !importPreview || isImporting
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                : importMode === 'replace'
                ? 'bg-red-500/90 hover:bg-red-600 text-white'
                : 'bg-blue-500/90 hover:bg-blue-600 text-white'
            }`}
          >
            {isImporting ? (
              <>
                <CircleNotch size={20} weight="bold" className="animate-spin shrink-0" aria-hidden />
                {t('configAddon.importing')}
              </>
            ) : importMode === 'replace' ? (
              <>
                <Warning size={20} weight="fill" className="shrink-0" aria-hidden />
                {t('configAddon.replace_import')}
              </>
            ) : (
              <>
                <UploadSimple size={20} weight="bold" className="shrink-0" aria-hidden />
                {t('configAddon.append_import')}
              </>
            )}
          </button>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-blue-500/50 dark:border-blue-500/40 rounded-2xl shadow-lg">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Lightbulb size={20} weight="duotone" className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
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
