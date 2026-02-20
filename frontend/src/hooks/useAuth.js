import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setAuthSession, clearAuthSession, isAuthenticated } from '../utils/auth';

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
        }
      } catch (err) {
        // Silently fail — Local-only Mode
      }
    };
    fetchAuthMode();
  }, []);

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
        
        localStorage.setItem('servicedock_user_role', role);
        localStorage.setItem('servicedock_auth_method', method);
        if (name) localStorage.setItem('servicedock_display_name', name);
        else localStorage.removeItem('servicedock_display_name');
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
    localStorage.removeItem('servicedock_user_role');
    localStorage.removeItem('servicedock_auth_method');
    localStorage.removeItem('servicedock_display_name');
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
    // Rollen
    userRole,
    isAdmin,
    isViewer,
    displayName,
    authMethod,
  };
}
