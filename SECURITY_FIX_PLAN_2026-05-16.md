# Security Fix Plan — 16 May 2026

Checklist of audit remediation vs. deferrals.

## Fixed (High)

| ID | Item | Change |
|----|------|--------|
| SEC-2026-001 | LDAP filter injection | `escape_filter_chars` on username and group DN in `ldap_auth.py` |
| SEC-2026-002 | `bg_image_url` CSS injection | `core/appearance_url.py` + model validator; config import; frontend `sanitizeCssBackgroundUrl` / `cssBackgroundImageValue` |
| SEC-2026-003 | Refresh token rotation/revocation | `core/refresh_token_store.py` (Redis + memory); jti in refresh JWT; refresh/logout/password revoke |

## Fixed (Medium)

| ID | Item | Change |
|----|------|--------|
| SEC-2026-004 | Admin UI flash | `useAuth.js`: `sessionReady`, role default `null`, `/api/auth/me` before privileged UI |
| SEC-2026-005 | Wallpaper magic bytes | Pillow verify on upload |
| SEC-2026-006 | Help markdown links | `sanitizeUrl` on `href` in HelpTab |
| SEC-2026-007 | Reorder `dashboard_id` | `ReorderRequest.dashboard_id` + scoped SQL; frontend passes `dashboard_id` |
| SEC-2026-008 | Audit filter SQL | **failed_logins** filter uses `LOGIN_FAILED` / `LOGIN_BLOCKED` |
| SEC-2026-009 | DOMPurify scope | Help/CSS hardened; `ProxmoxCard` labels sanitized |
| SEC-2026-011 | LDAP TLS | `LDAP_TLS_INSECURE`, `LDAP_CA_FILE`; default `CERT_REQUIRED` |
| SEC-2026-015 | Config import appearance | `validate_bg_image_url` on import; `file://` in scheme blocklist |
| — | TRUST_FORWARDED_HEADERS | Empty `TRUSTED_PROXIES` → warning + ignore XFF |
| — | Rate limiter IP | `limiter.py` uses `get_client_ip` |
| — | Proxmox `verify_ssl` | Model default `True`; comment on global urllib3 warning disable |
| — | `isAdmin` defaults | Sidebar, SettingsPage, ProxmoxGrid default `false` |
| — | Dashboard fetch race | `useServices.js` request-id guard |
| — | `auth/mode` disclosure | Removed `local_users_count`; domain only when AD enabled |

## Fixed (Low) — second pass (16 May 2026, remainder)

| ID | Item | Change |
|----|------|--------|
| SEC-2026-010 | localStorage session hint | Bootstrap via `/api/auth/me` only; no `isAuthenticated()` on init |
| SEC-2026-012 | Spotify OAuth | `postMessage` listener in AddOnsCard; named popup; `.env.template` Redis note |
| SEC-2026-013 | Proxmox rotate `dashboard_id` | `rotate-token` uses `WHERE dashboard_id = %s` |
| SEC-2026-014 | CRUD dashboard scope | Update/delete services & shortcuts scoped by `dashboard_id` |
| LOGIC-001 | Theme text color | `getTextColor()` uses light/dark by `theme` |
| LOGIC-003 | Login fetch order | `await fetchDashboards()` before `fetchData()` |
| LOGIC-005 | Appearance save rollback | `fetchAppearance()` only on error |
| LOGIC-004 | `html.dark` always | Documented in `useAppearance.js` (design choice) |
| — | Spotify popup | Named window + `postMessage` handler |

## Fixed (Low) — first pass

| ID | Item | Change |
|----|------|--------|
| — | Spotify OAuth popup | `noopener,noreferrer` on `window.open` |
| LOGIC-006 | failed_logins filter | `LOGIN_FAILED` / `LOGIN_BLOCKED` |
| — | nginx login limit | Dedicated `/api/login` location + commented `limit_req` template |

## Fixed (Ops / production hardening — pass 3)

| ID | Item | Change |
|----|------|--------|
| SEC-2026-016 | Production CSP / OpenAPI | `ENVIRONMENT=production` enforced in `docker-compose.production.yml`; startup warns if not production; `settings.py` rejects localhost `FRONTEND_URL` in production |
| SEC-2026-017 | Redis required in production | `settings.py` + `main.py` fail fast without `REDIS_URL`; compose production defaults `redis://redis:6379/0`; `setup-servicedock.sh` writes `REDIS_URL` |
| — | Proxy client IP | Production compose: `TRUST_FORWARDED_HEADERS=true` + Docker CIDR in `TRUSTED_PROXIES`; CIDR parsing in `get_client_ip` |

## Deferred (non-security)

| ID | Reason |
|----|--------|
| LOGIC-002 | Default appearance mesh/tint — cosmetic; design decision |
| LOGIC-004 | `html.dark` always on — design decision |

## Tests added

- `backend/tests/test_ldap_filter_escape.py`
- `backend/tests/test_appearance_url_validator.py`
- `backend/tests/test_refresh_token_rotation.py`
- `backend/tests/test_crud_dashboard_scope.py`
