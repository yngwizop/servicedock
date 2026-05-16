"""Validation for appearance background image URLs (CSS injection mitigation)."""
import re
from typing import Optional

# Characters/patterns that break out of CSS url() or enable dangerous schemes
_BLOCKED_PATTERN = re.compile(
    r'javascript:|data:|file:|vbscript:|blob:|[\)"\';\\]',
    re.IGNORECASE,
)

_WALLPAPER_API_PATH = re.compile(r'^/api/wallpapers/[a-zA-Z0-9._-]+$')
_WALLPAPERS_PRESET = re.compile(r'^/wallpapers/[a-zA-Z0-9._/-]+$')
_HTTPS_URL = re.compile(r'^https://[^\s<>"\']+$', re.IGNORECASE)


def validate_bg_image_url(value: Optional[str]) -> Optional[str]:
    """
    Allow empty, preset paths under /wallpapers/, uploaded wallpapers under
    /api/wallpapers/, or https:// URLs only.
    """
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None
    if _BLOCKED_PATTERN.search(v):
        raise ValueError(
            'Invalid bg_image_url: blocked characters or scheme '
            '(allowed: empty, /wallpapers/, /api/wallpapers/, https://)'
        )
    if v.startswith('https://'):
        if not _HTTPS_URL.match(v):
            raise ValueError('Invalid https bg_image_url')
        return v
    if v.startswith('/wallpapers/'):
        if not _WALLPAPERS_PRESET.match(v):
            raise ValueError('Invalid preset wallpaper path')
        return v
    if v.startswith('/api/wallpapers/'):
        if not _WALLPAPER_API_PATH.match(v):
            raise ValueError('Invalid uploaded wallpaper path')
        return v
    raise ValueError(
        'bg_image_url must be empty, start with /wallpapers/, '
        '/api/wallpapers/, or https://'
    )
