"""LDAP filter escaping unit tests."""
from ldap3.utils.conv import escape_filter_chars


def test_escape_filter_chars_metacharacters():
    raw = "admin)(|(password=*"
    escaped = escape_filter_chars(raw)
    assert escaped != raw
    assert ")(|" not in escaped


def test_escape_filter_chars_normal_username():
    assert escape_filter_chars("jdoe") == "jdoe"


def test_escape_filter_chars_group_dn():
    dn = "CN=Admins,DC=corp,DC=local)(|(uid=*"
    escaped = escape_filter_chars(dn)
    assert escaped != dn
