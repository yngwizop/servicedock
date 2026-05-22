"""Network safety checks for outbound connections (Proxmox SSRF mitigation)."""

from __future__ import annotations

import ipaddress
import os
import socket
from typing import List, Optional, Tuple


def _parse_allowlist() -> List[ipaddress._BaseNetwork]:
    raw = os.getenv("PROXMOX_HOST_ALLOWLIST", "").strip()
    if not raw:
        return []
    nets: List[ipaddress._BaseNetwork] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            nets.append(ipaddress.ip_network(part, strict=False))
        except ValueError:
            continue
    return nets


def _addr_blocked(addr: ipaddress.IPv4Address | ipaddress.IPv6Address) -> Optional[str]:
    if addr.is_loopback:
        return "loopback"
    if addr.is_link_local:
        return "link_local"
    if addr.is_multicast:
        return "multicast"
    if addr.is_reserved:
        return "reserved"
    if str(addr) == "169.254.169.254":
        return "metadata"
    return None


def _host_in_allowlist(addr: ipaddress.IPv4Address | ipaddress.IPv6Address, allowlist: List) -> bool:
    if not allowlist:
        return True
    return any(addr in net for net in allowlist)


def is_safe_proxmox_host(host: str) -> Tuple[bool, str]:
    """
    Validate Proxmox target host before outbound API calls.
    Private RFC1918 addresses are allowed (homelab default).
    Blocks loopback, link-local, multicast, reserved, cloud metadata.
    Optional PROXMOX_HOST_ALLOWLIST (comma-separated CIDRs) restricts all targets.
    """
    host = (host or "").strip()
    if not host:
        return False, "empty_host"

    if host.startswith("[") and "]" in host:
        host = host[1 : host.index("]")]
    elif ":" in host and host.count(":") == 1:
        host = host.split(":")[0]

    allowlist = _parse_allowlist()

    try:
        addr = ipaddress.ip_address(host)
        blocked = _addr_blocked(addr)
        if blocked:
            return False, blocked
        if not _host_in_allowlist(addr, allowlist):
            return False, "not_in_allowlist"
        return True, "ok"
    except ValueError:
        pass

    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False, "dns_resolution_failed"

    resolved: set = set()
    for info in infos:
        ip = info[4][0]
        try:
            resolved.add(ipaddress.ip_address(ip))
        except ValueError:
            continue

    if not resolved:
        return False, "no_addresses"

    for addr in resolved:
        blocked = _addr_blocked(addr)
        if blocked:
            return False, f"resolved_{blocked}"
        if not _host_in_allowlist(addr, allowlist):
            return False, "not_in_allowlist"

    return True, "ok"
