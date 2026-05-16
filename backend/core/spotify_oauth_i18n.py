"""Localized strings for Spotify OAuth popup HTML (de/en)."""

from html import escape
from typing import Optional

SUPPORTED_LOCALES = frozenset({"de", "en"})


def normalize_locale(locale: Optional[str]) -> str:
    if not locale:
        return "en"
    # Accept-Language header may contain "de-DE,en;q=0.9"
    first = locale.strip().split(",")[0].split(";")[0].strip()
    base = first.split("-")[0].lower()
    return base if base in SUPPORTED_LOCALES else "en"


_MESSAGES = {
    "de": {
        "page_title": "Spotify Verbindung erfolgreich",
        "success_title": "Spotify erfolgreich verbunden!",
        "success_body": "Du kannst dieses Fenster jetzt schließen.",
    },
    "en": {
        "page_title": "Spotify connected successfully",
        "success_title": "Spotify connected successfully!",
        "success_body": "You can close this window now.",
    },
}


def render_spotify_callback_success_html(locale: Optional[str]) -> str:
    lang = normalize_locale(locale)
    m = _MESSAGES[lang]
    title = escape(m["page_title"])
    heading = escape(m["success_title"])
    body = escape(m["success_body"])
    script = (
        "if (window.opener) {"
        "try { window.opener.postMessage({ type: 'spotify-connected' }, window.location.origin); }"
        "catch (e) { console.log('postMessage failed:', e); }"
        "}"
    )
    return (
        f'<!DOCTYPE html><html lang="{lang}"><head><meta charset="UTF-8">'
        f"<title>{title}</title>"
        "<style>"
        "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
        "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;"
        "background:linear-gradient(135deg,#1DB954 0%,#191414 100%);color:white;}"
        ".container{text-align:center;padding:2rem;}"
        ".success-icon{font-size:4rem;margin-bottom:1rem;animation:scaleIn .5s ease-out;}"
        "@keyframes scaleIn{from{transform:scale(0)}to{transform:scale(1)}}"
        "h1{margin:0 0 .5rem 0;font-size:2rem;}"
        "p{margin:.5rem 0;opacity:.9;font-size:1.1rem;}"
        "</style></head><body>"
        '<div class="container"><div class="success-icon">&#10003;</div>'
        f"<h1>{heading}</h1><p>{body}</p></div>"
        f"<script>{script}</script></body></html>"
    )
