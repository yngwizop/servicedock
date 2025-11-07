"""Security headers middleware"""
from starlette.middleware.base import BaseHTTPMiddleware

from config.settings import ENVIRONMENT, FRONTEND_URL

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Fügt Security-Headers hinzu (nur in Production)"""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Security Headers nur in Production
        if ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            # CSP - Basic Policy (bei Bedarf anpassen)
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' " + FRONTEND_URL + ";"
            )
        
        return response
