import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setAuthSession, clearAuthSession, isAuthenticated, authenticatedFetch } from '../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

export function useAuth() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loginError, setLoginError] = useState("");
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [loginDisabledUntil, setLoginDisabledUntil] = useState(null);
  
  // AD-Modus
  const [adEnabled, setAdEnabled] = useState(false);
  const [adDomain, setAdDomain] = useState(null);
  /** Mehrere lokale Benutzer → Login benötigt Benutzername */
  const [localUsernameRequired, setLocalUsernameRequired] = useState(false);
  
  // Rollen-Info
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem('servicedock_user_role') || 'admin'
  );
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('servicedock_display_name') || null
  );
  const [authMethod, setAuthMethod] = useState(
    () => localStorage.getItem('servicedock_auth_method') || 'local'
  );
  /** Eingeloggter Benutzername (nicht das Login-Formularfeld `username`) */
  const [sessionUsername, setSessionUsername] = useState(
    () => localStorage.getItem('servicedock_session_username') || null
  );

  // Force Password Change
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  
  const isAdmin = userRole === 'admin';
  const isViewer = userRole === 'viewer';

  // Frage Auth-Modus beim Mount ab
  useEffect(() => {
    const fetchAuthMode = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/mode`);
        if (res.ok) {
          const data = await res.json();
          setAdEnabled(data.ad_enabled);
          setAdDomain(data.domain);
          setLocalUsernameRequired(Boolean(data.local_username_required));
        }
      } catch (err) {
        // Silently fail — Local-only Mode
      }
    };
    fetchAuthMode();
  }, []);

  useEffect(() => {
    const onMode = (e) => {
      const d = e.detail;
      if (!d) return;
      if (d.local_username_required != null) setLocalUsernameRequired(Boolean(d.local_username_required));
      if (d.ad_enabled != null) setAdEnabled(Boolean(d.ad_enabled));
      if (d.domain !== undefined) setAdDomain(d.domain);
    };
    window.addEventListener('servicedock-auth-mode', onMode);
    return () => window.removeEventListener('servicedock-auth-mode', onMode);
  }, []);

  const syncSessionFromMe = useCallback((data) => {
    const uname = data.username ?? null;
    setSessionUsername(uname);
    if (uname) localStorage.setItem('servicedock_session_username', uname);
    else localStorage.removeItem('servicedock_session_username');

    const name = data.display_name || null;
    setDisplayName(name);
    if (name) localStorage.setItem('servicedock_display_name', name);
    else localStorage.removeItem('servicedock_display_name');

    const role = data.role || 'admin';
    setUserRole(role);
    localStorage.setItem('servicedock_user_role', role);

    const method = data.auth_method || 'local';
    setAuthMethod(method);
    localStorage.setItem('servicedock_auth_method', method);
  }, []);

  /** Session mit Server abgleichen (JWT), z. B. nach Reload */
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/auth/me`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          syncSessionFromMe(data);
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setIsLoggedIn(false);
          setSessionUsername(null);
          setDisplayName(null);
          setUserRole('admin');
          setAuthMethod('local');
          localStorage.removeItem('servicedock_session_username');
          localStorage.removeItem('servicedock_display_name');
          localStorage.removeItem('servicedock_user_role');
          localStorage.removeItem('servicedock_auth_method');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, syncSessionFromMe]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (loginDisabled) {
      const remainingTime = Math.ceil((loginDisabledUntil - Date.now()) / 1000);
      setLoginError(t('login.too_many_attempts', { seconds: remainingTime }));
      return;
    }

    try {
      const body = { password };
      if (username.trim()) {
        body.username = username.trim();
      }
      
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setAuthSession();
        setIsLoggedIn(true);
        setPassword("");
        setUsername("");
        setLoginError("");
        setFailedLoginAttempts(0);
        
        // Rolle + Auth-Info speichern
        const role = data.role || 'admin';
        const method = data.auth_method || 'local';
        const name = data.display_name || null;
        
        setUserRole(role);
        setAuthMethod(method);
        setDisplayName(name);

        const loggedInUser = data.username ?? null;
        setSessionUsername(loggedInUser);
        if (loggedInUser) localStorage.setItem('servicedock_session_username', loggedInUser);
        else localStorage.removeItem('servicedock_session_username');

        localStorage.setItem('servicedock_user_role', role);
        localStorage.setItem('servicedock_auth_method', method);
        if (name) localStorage.setItem('servicedock_display_name', name);
        else localStorage.removeItem('servicedock_display_name');

        // Force Password Change bei Default-Passwort
        if (data.force_password_change) {
          setForcePasswordChange(true);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        const newAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(newAttempts);

        if (newAttempts >= 3) {
          const disabledUntil = Date.now() + 30000;
          setLoginDisabled(true);
          setLoginDisabledUntil(disabledUntil);
          setLoginError(t('login.login_locked'));

          setTimeout(() => {
            setLoginDisabled(false);
            setLoginDisabledUntil(null);
            setFailedLoginAttempts(0);
          }, 30000);
        } else {
          // detail kann ein String ("Invalid credentials") oder ein Pydantic Array sein
          let errorMsg = t('login.wrong_password', { attempts: newAttempts });
          if (typeof errorData.detail === 'string') {
            errorMsg = errorData.detail;
          }
          setLoginError(errorMsg);
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError(t('login.backend_error'));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    clearAuthSession();
    setIsLoggedIn(false);
    setUserRole('admin');
    setAuthMethod('local');
    setDisplayName(null);
    setSessionUsername(null);
    localStorage.removeItem('servicedock_user_role');
    localStorage.removeItem('servicedock_auth_method');
    localStorage.removeItem('servicedock_display_name');
    localStorage.removeItem('servicedock_session_username');
  };

  // Helper: call this when an authenticated request fails with session expired
  const onSessionExpired = () => setIsLoggedIn(false);

  return {
    isLoggedIn,
    password,
    setPassword,
    username,
    setUsername,
    loginError,
    setLoginError,
    loginDisabled,
    handleLogin,
    handleLogout,
    onSessionExpired,
    // AD
    adEnabled,
    adDomain,
    localUsernameRequired,
    // Rollen
    userRole,
    isAdmin,
    isViewer,
    displayName,
    authMethod,
    sessionUsername,
    // Force Password Change
    forcePasswordChange,
    setForcePasswordChange,
  };
}
