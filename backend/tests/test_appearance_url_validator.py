"""Appearance bg_image_url validation tests."""
import pytest

from core.appearance_url import validate_bg_image_url


def test_allows_empty_and_none():
    assert validate_bg_image_url(None) is None
    assert validate_bg_image_url("") is None
    assert validate_bg_image_url("   ") is None


def test_allows_preset_and_api_paths():
    assert validate_bg_image_url("/wallpapers/mesh.jpg") == "/wallpapers/mesh.jpg"
    assert validate_bg_image_url("/api/wallpapers/custom-abc123.jpg") == (
        "/api/wallpapers/custom-abc123.jpg"
    )


def test_allows_https():
    url = "https://example.com/bg.png"
    assert validate_bg_image_url(url) == url


@pytest.mark.parametrize(
    "bad",
    [
        '"); background:red; /*',
        "javascript:alert(1)",
        "data:image/png;base64,abc",
        "file:///etc/passwd",
        "/evil/path",
        "http://insecure.example/bg.png",
    ],
)
def test_rejects_css_injection_and_bad_schemes(bad):
    with pytest.raises(ValueError):
        validate_bg_image_url(bad)
