"""Spotify OAuth callback HTML localization."""
from core.spotify_oauth_i18n import (
    normalize_locale,
    render_spotify_callback_success_html,
)


def test_normalize_locale_de_en():
    assert normalize_locale("de") == "de"
    assert normalize_locale("en-US") == "en"
    assert normalize_locale("fr") == "en"
    assert normalize_locale("de-DE,en;q=0.9") == "de"


def test_callback_html_english():
    html = render_spotify_callback_success_html("en")
    assert 'lang="en"' in html
    assert "Spotify connected successfully!" in html
    assert "You can close this window now." in html
    assert "Du kannst dieses Fenster" not in html


def test_callback_html_german():
    html = render_spotify_callback_success_html("de")
    assert 'lang="de"' in html
    assert "Spotify erfolgreich verbunden!" in html
    assert "Du kannst dieses Fenster jetzt schließen." in html
