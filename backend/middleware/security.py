"""Security headers middleware"""
from starlette.middleware.base import BaseHTTPMiddleware

from config.settings import ENVIRONMENT, FRONTEND_URL

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Fügt Security-Headers zu allen Responses hinzu"""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Basic Security Headers (immer aktiv)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Production-only: HSTS
        if ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # CSP - Adaptive basierend auf Environment
        if ENVIRONMENT == "production" and FRONTEND_URL:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                f"connect-src 'self' {FRONTEND_URL};"
            )
        else:
            # Development: Relaxed CSP
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' http://localhost:* http://127.0.0.1:*;"
            )
        
        return response
