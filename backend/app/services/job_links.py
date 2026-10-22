"""Helpers for distinguishing individual job descriptions from careers directories."""

import re
from urllib.parse import urlparse, parse_qs


_GENERIC_PATH_NAMES = {
    "career", "careers", "job", "jobs", "search", "results", "students",
    "intern", "interns", "internship", "internships", "early-careers",
    "campus", "university", "engineering", "teams", "departments", "locations",
    "openings", "positions", "roles", "opportunities", "all", "view-all",
}


def is_direct_posting_url(url: str) -> bool:
    """Return true only when a job or internship URL appears to identify one posting."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False
        if any(key.lower() in {"gh_jid", "job_id", "jobid", "jid", "reqid", "jobpostingid", "jk", "vjk"}
               for key in parse_qs(parsed.query)):
            return True
        path = parsed.path.rstrip("/").lower()
        if re.search(r"/jobs?/(?:view|details)/[^/]+", path):
            return True
        if re.search(r"/(?:job|jobs|careers|career|openings|positions|roles)/[^/]+(?:/[^/]+)*$", path):
            parts = [part for part in path.split("/") if part]
            marker = next((i for i, part in enumerate(parts) if part in {
                "job", "jobs", "career", "careers", "opening", "openings", "position", "positions", "role", "roles"
            }), -1)
            if marker >= 0:
                detail_parts = parts[marker + 1:]
                if detail_parts and detail_parts[0] not in _GENERIC_PATH_NAMES:
                    return True
        host = parsed.hostname.lower()
        if host.endswith("jobs.lever.co") or host.endswith("jobs.ashbyhq.com"):
            return len([part for part in path.split("/") if part]) >= 2
        return False
    except (TypeError, ValueError):
        return False
