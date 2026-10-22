"""Fetch public opportunity pages for summaries and verification."""

import html
import ipaddress
import re
import socket
from typing import Optional
from urllib.parse import urlparse

import httpx


def _is_public_host(host: str) -> bool:
    if host.lower() in {"localhost", "localhost.localdomain"}:
        return False
    try:
        addresses = {ipaddress.ip_address(host)}
    except ValueError:
        try:
            addresses = {ipaddress.ip_address(entry[4][0]) for entry in socket.getaddrinfo(host, None)}
        except OSError:
            return False
    return bool(addresses) and all(address.is_global for address in addresses)


async def fetch_public_page_text(url: str, limit: int = 40000) -> Optional[str]:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or not _is_public_host(parsed.hostname):
        return None
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, max_redirects=5) as client:
            response = await client.get(url, headers={"User-Agent": "HirelyOpportunityReader/1.0"})
        final_host = urlparse(str(response.url)).hostname
        if not final_host or not _is_public_host(final_host) or response.status_code >= 400:
            return None
        content_type = response.headers.get("content-type", "").lower()
        if "html" not in content_type and "text" not in content_type:
            return None
        page = response.text[:limit * 3]
        page = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", page)
        page = re.sub(r"(?s)<[^>]+>", " ", page)
        page = html.unescape(page)
        return re.sub(r"\s+", " ", page).strip()[:limit]
    except Exception:
        return None
