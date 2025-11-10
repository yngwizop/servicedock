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
from routers.admin import router as admin_router
from routers.spotify import router as spotify_router  # NEW: Spotify AddOn

# Disable SSL warnings for Proxmox connections
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Initialize FastAPI app
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
    # Development mode - allow common dev ports
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
    ]
    if FRONTEND_URL:
        allowed_origins.append(FRONTEND_URL)
    
    logger.info(f"⚠️ CORS Development mode: {len(allowed_origins)} origins allowed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# ===== Startup Event =====
@app.on_event("startup")
async def startup_event():
    """Initialize database connection pool and other resources on startup"""
    initialize_connection_pool()
    logger.info("✅ Application startup complete")

# ===== Include ALL Routers =====
# These handle all API endpoints via modular router files
app.include_router(shortcuts_router)      # /api/shortcuts/*
app.include_router(services_router)       # /api/services/*
app.include_router(appearance_router)     # /api/appearance/*
app.include_router(auth_router)           # /api/login
app.include_router(proxmox_router)        # /api/proxmox/*
app.include_router(admin_router)          # /api/admin/*
app.include_router(spotify_router)        # /api/spotify/* (AddOn)

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
        "status": "running",
        "architecture": "modular"
    }

# ===== Application Info =====
@app.get("/api/info", tags=["meta"])
def get_api_info():
    """Returns API metadata and available endpoints"""
    return {
        "version": "2.0",
        "architecture": "modular",
        "routers": [
            "shortcuts",
            "services", 
            "appearance",
            "auth",
            "proxmox",
            "admin",
            "spotify"
        ],
        "features": [
            "JWT Authentication",
            "Rate Limiting",
            "Audit Logging",
            "Proxmox VM Management",
            "Token Rotation"
        ]
    }
