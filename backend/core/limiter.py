"""Shared rate limiter instance for all routers"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Create global limiter instance
limiter = Limiter(key_func=get_remote_address)
