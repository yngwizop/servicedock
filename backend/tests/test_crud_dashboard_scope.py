"""CRUD operations must respect dashboard_id scope (static contract)."""
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def test_services_delete_scoped_by_dashboard_id():
    source = (BACKEND / "routers" / "services.py").read_text(encoding="utf-8")
    assert "DELETE FROM services WHERE id = %s AND dashboard_id = %s" in source


def test_services_update_scoped_by_dashboard_id():
    source = (BACKEND / "routers" / "services.py").read_text(encoding="utf-8")
    assert "WHERE id=%s AND dashboard_id=%s" in source


def test_shortcuts_delete_scoped_by_dashboard_id():
    source = (BACKEND / "routers" / "shortcuts.py").read_text(encoding="utf-8")
    assert "DELETE FROM shortcuts WHERE id = %s AND dashboard_id = %s" in source


def test_proxmox_rotate_scoped_by_dashboard_id():
    source = (BACKEND / "routers" / "admin.py").read_text(encoding="utf-8")
    assert "WHERE dashboard_id = %s" in source
    assert "rotate_token" in source
