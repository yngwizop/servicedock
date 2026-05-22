"""Proxmox host SSRF safety checks."""
import os
from unittest.mock import patch

from core.network_safety import is_safe_proxmox_host


def test_blocks_loopback():
    ok, reason = is_safe_proxmox_host("127.0.0.1")
    assert not ok
    assert reason == "loopback"


def test_blocks_metadata_ip():
    ok, reason = is_safe_proxmox_host("169.254.169.254")
    assert not ok
    # Classified as link-local (169.254.0.0/16) before explicit metadata check
    assert reason in ("metadata", "link_local")


def test_allows_private_rfc1918():
    ok, reason = is_safe_proxmox_host("192.168.1.50")
    assert ok
    assert reason == "ok"


def test_allowlist_restricts_public_ip():
    with patch.dict(os.environ, {"PROXMOX_HOST_ALLOWLIST": "192.168.0.0/16"}):
        ok, reason = is_safe_proxmox_host("8.8.8.8")
    assert not ok
    assert reason == "not_in_allowlist"


def test_allowlist_permits_matching_private():
    with patch.dict(os.environ, {"PROXMOX_HOST_ALLOWLIST": "192.168.0.0/16"}):
        ok, reason = is_safe_proxmox_host("192.168.10.5")
    assert ok
    assert reason == "ok"
