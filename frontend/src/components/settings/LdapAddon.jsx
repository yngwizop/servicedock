import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FloppyDisk, Plugs, TestTube, Trash, Eye, EyeSlash } from 'phosphor-react';

function LdapAddon({
  BACKEND_URL,
  ldapConfig,
  setLdapConfig,
  ldapStatus,
  isSavingLdap,
  ldapSaved,
  handleSaveLdap,
  handleTestLdap,
  handleUninstallLdap,
  testResult,
  isTesting,
}) {
  const { t } = useTranslation();
  const [showBindPassword, setShowBindPassword] = useState(false);

  const inputClass = "w-full px-3 py-2 text-sm bg-white/70 dark:bg-white/10 backdrop-blur-md border border-gray-400/60 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-blue-500/50 dark:border-blue-500/40 shadow-xl">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-400/5 dark:from-blue-400/20 dark:to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-500/80 to-blue-600/80 dark:from-blue-600/90 dark:to-blue-700/90 backdrop-blur-sm p-6 flex items-center justify-between border-b border-blue-400/30 dark:border-blue-500/30">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-white/90 dark:bg-white/95 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck size={32} weight="duotone" className="text-blue-600" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-lg mb-1">{t('ldapAddon.title')}</h4>
            <p className="text-blue-100 dark:text-blue-200 text-sm">{t('ldapAddon.subtitle')}</p>
          </div>
        </div>
        <div>
          {ldapStatus.enabled ? (
            <span className="px-4 py-2 bg-white/90 dark:bg-white/95 text-blue-600 dark:text-blue-700 text-sm font-semibold rounded-full shadow-md">
              {t('ldapAddon.status_active')}
            </span>
          ) : ldapStatus.configured ? (
            <span className="px-4 py-2 bg-yellow-100/90 dark:bg-yellow-100/95 text-yellow-700 dark:text-yellow-800 text-sm font-semibold rounded-full shadow-md">
              {t('ldapAddon.status_configured')}
            </span>
          ) : (
            <span className="px-4 py-2 bg-white/60 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-full shadow-md">
              {t('ldapAddon.status_not_configured')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative p-6 space-y-6">
        {/* Info Box */}
        {!ldapStatus.configured && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
              {t('ldapAddon.setup_info_title')}
            </h5>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {t('ldapAddon.setup_info_text')}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveLdap} className="space-y-5">
          {/* Server Section */}
          <div className="space-y-4">
            <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Plugs size={16} weight="bold" className="text-blue-500" />
              {t('ldapAddon.section_server')}
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>{t('ldapAddon.host')}</label>
                <input
                  type="text"
                  value={ldapConfig.host || ''}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="ldap.example.com"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('ldapAddon.port')}</label>
                <input
                  type="number"
                  value={ldapConfig.port || 389}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 389 }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('ldapAddon.base_dn')}</label>
                <input
                  type="text"
                  value={ldapConfig.base_dn || ''}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, base_dn: e.target.value }))}
                  placeholder="DC=domain,DC=local"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('ldapAddon.domain')}</label>
                <input
                  type="text"
                  value={ldapConfig.domain || ''}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="domain.local"
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ldapAddon.domain_hint')}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ldapConfig.use_ssl || false}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, use_ssl: e.target.checked, port: e.target.checked ? 636 : 389 }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">LDAPS (SSL)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ldapConfig.use_starttls || false}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, use_starttls: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">STARTTLS</span>
              </label>
            </div>
          </div>

          {/* Bind Account Section */}
          <div className="space-y-4">
            <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} weight="bold" className="text-blue-500" />
              {t('ldapAddon.section_bind')}
            </h5>
            
            <div>
              <label className={labelClass}>{t('ldapAddon.bind_dn')}</label>
              <input
                type="text"
                value={ldapConfig.bind_dn || ''}
                onChange={(e) => setLdapConfig(prev => ({ ...prev, bind_dn: e.target.value }))}
                placeholder="CN=Administrator,CN=Users,DC=domain,DC=local"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('ldapAddon.bind_password')}</label>
              <div className="relative">
                <input
                  type={showBindPassword ? "text" : "password"}
                  value={ldapConfig.bind_password || ''}
                  onChange={(e) => setLdapConfig(prev => ({ ...prev, bind_password: e.target.value }))}
                  placeholder={ldapStatus.has_bind_password ? t('ldapAddon.password_unchanged') : t('ldapAddon.password_placeholder')}
                  className={inputClass + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowBindPassword(!showBindPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {showBindPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>{t('ldapAddon.user_search_base')}</label>
              <input
                type="text"
                value={ldapConfig.user_search_base || ''}
                onChange={(e) => setLdapConfig(prev => ({ ...prev, user_search_base: e.target.value }))}
                placeholder="CN=Users,DC=domain,DC=local"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ldapAddon.user_search_base_hint')}</p>
            </div>

            <div>
              <label className={labelClass}>{t('ldapAddon.user_attribute')}</label>
              <input
                type="text"
                value={ldapConfig.user_attribute || 'sAMAccountName'}
                onChange={(e) => setLdapConfig(prev => ({ ...prev, user_attribute: e.target.value }))}
                placeholder="sAMAccountName"
                className={inputClass}
              />
            </div>
          </div>

          {/* Group Mapping Section */}
          <div className="space-y-4">
            <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} weight="bold" className="text-blue-500" />
              {t('ldapAddon.section_groups')}
            </h5>
            
            <div>
              <label className={labelClass}>{t('ldapAddon.admin_group_dn')}</label>
              <input
                type="text"
                value={ldapConfig.admin_group_dn || ''}
                onChange={(e) => setLdapConfig(prev => ({ ...prev, admin_group_dn: e.target.value }))}
                placeholder="CN=ServiceDock-Admins,CN=Users,DC=domain,DC=local"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ldapAddon.admin_group_hint')}</p>
            </div>

            <div>
              <label className={labelClass}>{t('ldapAddon.viewer_group_dn')}</label>
              <input
                type="text"
                value={ldapConfig.viewer_group_dn || ''}
                onChange={(e) => setLdapConfig(prev => ({ ...prev, viewer_group_dn: e.target.value }))}
                placeholder="CN=ServiceDock-Viewers,CN=Users,DC=domain,DC=local"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ldapAddon.viewer_group_hint')}</p>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-white/10">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('ldapAddon.enable_label')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('ldapAddon.enable_hint')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ldapConfig.enabled ?? false}
                onChange={(e) => setLdapConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <p className={`text-sm font-semibold mb-1 ${
                testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
              }`}>
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </p>
              {testResult.server && (
                <p className="text-xs text-green-700 dark:text-green-400">
                  Server: {testResult.server} | {t('ldapAddon.users_found')}: {testResult.users_found}
                </p>
              )}
              {testResult.groups && testResult.groups.length > 0 && (
                <div className="mt-2 space-y-1">
                  {testResult.groups.map((g, i) => (
                    <p key={i} className="text-xs text-green-700 dark:text-green-400">
                      {t('ldapAddon.group')}: {g.name} ({g.members} {t('ldapAddon.members')})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTestLdap}
              disabled={isTesting || !ldapConfig.host || !ldapConfig.base_dn}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube size={18} weight="bold" />
              {isTesting ? t('ldapAddon.testing') : t('ldapAddon.test_button')}
            </button>

            <button
              type="submit"
              disabled={isSavingLdap || !ldapConfig.host || !ldapConfig.base_dn}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FloppyDisk size={18} weight="bold" />
              {ldapSaved ? '✓ ' + t('ldapAddon.saved') : isSavingLdap ? t('ldapAddon.saving') : t('ldapAddon.save_button')}
            </button>

            {ldapStatus.configured && (
              <button
                type="button"
                onClick={handleUninstallLdap}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg hover:shadow-xl ml-auto"
              >
                <Trash size={18} weight="bold" />
                {t('ldapAddon.uninstall_button')}
              </button>
            )}
          </div>
        </form>

        {/* Security Note */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200/50 dark:border-white/10">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{t('ldapAddon.security_note_title')}</span>{' '}
            {t('ldapAddon.security_note_text')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LdapAddon;
