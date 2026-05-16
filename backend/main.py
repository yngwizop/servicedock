"""
FastAPI Web Dashboard Backend - Fully Modularized
Main application file with clean router-based architecture
"""
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Local imports
from config import (
    initialize_connection_pool,
    ENVIRONMENT, FRONTEND_URL
)
from core import logger
from core.limiter import limiter  # Shared limiter instance
from middleware import SecurityHeadersMiddleware

# Import ALL routers
from routers.shortcuts import router as shortcuts_router
from routers.services import router as services_router
from routers.appearance import router as appearance_router
from routers.auth import router as auth_router
from routers.proxmox import router as proxmox_router
from routers.proxmox_stats import router as proxmox_stats_router  # NEW: Proxmox Stats
from routers.admin import router as admin_router
from routers.spotify import router as spotify_router  # NEW: Spotify AddOn
from routers.dashboards import router as dashboards_router  # NEW: Multi-Dashboard Support
from routers.config import router as config_router  # NEW: Config Import/Export
from routers.ldap import router as ldap_router  # NEW: LDAP/AD Authentication AddOn
from routers.wallpapers import router as wallpapers_router  # NEW: Wallpaper Upload/Serving
from routers.docs import router as docs_router  # Help / Markdown from repo root
from routers.users import router as users_router  # Local user accounts
from routers.integrations import router as integrations_router  # Integration health summary

# Homelab only: suppress urllib3 warnings when Proxmox verify_ssl=false in dashboard config.
# Prefer verify_ssl=true (default) in production; do not disable warnings globally without reason.
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Initialize FastAPI app
if ENVIRONMENT == "production":
    app = FastAPI(
        title="Web Dashboard API",
        version="2.0",
        description="Modular dashboard backend with Proxmox integration",
        docs_url=None,
        redoc_url=None,
        openapi_url=None
    )
else:
    app = FastAPI(
        title="Web Dashboard API",
        version="2.0",
        description="Modular dashboard backend with Proxmox integration"
    )

# ===== Rate Limiter Setup =====
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ===== CORS Configuration =====
if ENVIRONMENT == "production":
    if not FRONTEND_URL:
        raise ValueError("FRONTEND_URL required in production!")
    allowed_origins = [FRONTEND_URL]
    logger.info(f"🔒 CORS Production mode: Only {FRONTEND_URL} allowed")
else:
    # Development mode - minimal necessary origins
    allowed_origins = [
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173",
    ]
    if FRONTEND_URL:
        allowed_origins.append(FRONTEND_URL)
    
    logger.warning(f"⚠️ CORS Development mode: {len(allowed_origins)} origins allowed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit methods only
    allow_headers=["Content-Type", "Authorization"],  # Explicit headers only
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# ===== Startup Event =====
@app.on_event("startup")
async def startup_event():
    """Initialize database connection pool and validate environment on startup"""
    # Validate critical environment variables
    from config.settings import (
        SECRET_KEY, ENCRYPTION_KEY, DATABASE_URL,
        FRONTEND_URL, ENVIRONMENT, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS,
        REDIS_URL,
    )
    
    missing_vars = []
    warnings = []
    
    # Check critical variables (already validated in settings.py, but log for visibility)
    critical_vars = {
        "JWT_SECRET_KEY": SECRET_KEY,
        "ENCRYPTION_KEY": ENCRYPTION_KEY,
        "DATABASE_URL": DATABASE_URL,
    }
    
    for var_name, var_value in critical_vars.items():
        if not var_value:
            missing_vars.append(var_name)
    
    if missing_vars:
        logger.error(f"❌ Missing critical environment variables: {', '.join(missing_vars)}")
        raise ValueError(f"Missing required environment variables: {missing_vars}")
    
    # Log configuration (without secrets)
    logger.info("🔧 Configuration loaded:")
    logger.info(f"  - Environment: {ENVIRONMENT}")
    logger.info(f"  - Frontend URL: {FRONTEND_URL}")
    logger.info(f"  - Access Token Expiry: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    logger.info(f"  - Refresh Token Expiry: {REFRESH_TOKEN_EXPIRE_DAYS} days")
    logger.info(f"  - Redis: {'enabled' if REDIS_URL else 'disabled (in-memory fallback)'}")
    
    # Security warnings
    if ENVIRONMENT == "production" and not REDIS_URL:
        raise ValueError("REDIS_URL is required in production")
    if ENVIRONMENT != "production":
        warnings.append("ENVIRONMENT is not production — relaxed CSP and OpenAPI may be enabled")
    if REFRESH_TOKEN_EXPIRE_DAYS > 7:
        warnings.append(f"REFRESH_TOKEN_EXPIRE_DAYS is {REFRESH_TOKEN_EXPIRE_DAYS} days (recommended: ≤7)")
    
    if ACCESS_TOKEN_EXPIRE_MINUTES > 120:
        warnings.append(f"ACCESS_TOKEN_EXPIRE_MINUTES is {ACCESS_TOKEN_EXPIRE_MINUTES} min (recommended: ≤120)")
    
    if warnings:
        for warning in warnings:
            logger.warning(f"⚠️  {warning}")
    
    # Initialize database
    initialize_connection_pool()
    
    # Lokale Benutzer-Tabelle + Migration admin_auth → local_users
    from core.local_users import ensure_local_users_schema_and_bootstrap
    ensure_local_users_schema_and_bootstrap()
    
    logger.info("✅ Application startup complete")

# ===== Include ALL Routers =====
# These handle all API endpoints via modular router files
app.include_router(shortcuts_router)      # /api/shortcuts/*
app.include_router(services_router)       # /api/services/*
app.include_router(appearance_router)     # /api/appearance/*
app.include_router(auth_router)           # /api/login
app.include_router(config_router)         # /api/config/* (Import/Export) - BEFORE generic routes!
app.include_router(proxmox_router)        # /api/proxmox/*
app.include_router(proxmox_stats_router)  # /api/proxmox/cluster-stats (Stats)
app.include_router(admin_router)          # /api/admin/*
app.include_router(spotify_router)        # /api/spotify/* (AddOn)
app.include_router(dashboards_router)     # /api/dashboards/* (Multi-Dashboard)
app.include_router(ldap_router)           # /api/ldap/* (AD Authentication AddOn)
app.include_router(wallpapers_router)     # /api/wallpapers/* (Wallpaper Upload/Serving)
app.include_router(docs_router)           # /api/docs/help* (Markdown from repo)
app.include_router(users_router)          # /api/users (local accounts)
app.include_router(integrations_router)   # /api/integrations/health

# Note: Reorder endpoints are in their respective routers:
# - PUT /api/admin/services/reorder (in services router)
# - PUT /api/admin/shortcuts/reorder (in shortcuts router)

# ===== Root Health Check =====
@app.get("/", tags=["health"])
def root():
    """
    API health check endpoint.
    Returns current API version and status.
    """
    return {
        "message": "Web Dashboard Backend v2.0",
        "status": "running"
    }

# ===== Application Info (disabled in production) =====
if ENVIRONMENT != "production":
    @app.get("/api/info", tags=["meta"])
    def get_api_info():
        """Returns API metadata - only available in development"""
        return {
            "version": "2.0",
            "environment": ENVIRONMENT
        }
