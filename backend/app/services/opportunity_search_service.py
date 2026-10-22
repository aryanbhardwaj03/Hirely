"""Live opportunity discovery using Gemini Search grounding and Groq Browser Search."""

import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional, Set

import httpx

from app.core.config import settings
from app.data.mock_opportunities import MOCK_OPPORTUNITIES
from app.services.job_links import is_direct_posting_url

logger = logging.getLogger(__name__)


class OpportunitySearchService:
    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    async def search(
        self,
        query: str,
        purpose: Optional[str] = None,
        location: Optional[str] = None,
        recency_minutes: Optional[int] = None,
        limit: int = 15,
    ) -> List[Dict[str, Any]]:
        prompt = self._search_prompt(query, purpose, location)
        if settings.GEMINI_API_KEY:
            results = await self._search_gemini(prompt, query)
            if results:
                return results[:limit]
        if settings.GROQ_API_KEY:
            results = await self._search_groq(prompt, "Groq Browser Search")
            if results:
                return results[:limit]
        return self._search_curated(query, location, limit)

    @staticmethod
    def _search_prompt(query: str, purpose: Optional[str], location: Optional[str]) -> str:
        return (
            "Search the web for currently open jobs and internships that match this candidate query. "
            "Prefer employer career pages and reputable job boards. Only include an individual job or internship "
            "detail page, never a careers homepage or search-results page. Do not invent companies, openings, "
            "dates, or URLs. Return only a JSON array (no markdown) with objects having keys: title, organization, "
            "url, location, type (job or internship), description (brief factual search snippet), key_skills "
            "(array of skills), experience_level, compensation, deadline, is_remote. Include the exact source URL "
            "for each result. If the source does not confirm a specific opening, omit it.\n"
            f"Search query: {query}\nCandidate intent: {purpose or 'Relevant career opportunities'}\n"
            f"Preferred location: {location or 'Any location'}"
        )

    async def _search_gemini(self, prompt: str, query: str) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                response = await client.post(
                    self.GEMINI_URL,
                    headers={"x-goog-api-key": settings.GEMINI_API_KEY, "Content-Type": "application/json"},
                    json={"model": "gemini-3.8-flash", "input": prompt, "tools": [{"type": "google_search"}]},
                )
            response.raise_for_status()
            payload = response.json()
            text_parts: List[str] = []
            cited_urls: Set[str] = set()
            for step in payload.get("steps", []):
                if step.get("type") != "model_output":
                    continue
                for block in step.get("content", []):
                    if block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                        for annotation in block.get("annotations", []):
                            if annotation.get("type") == "url_citation" and annotation.get("url"):
                                cited_urls.add(self._canonical_url(annotation["url"]))
            return self._parse_results("\n".join(text_parts), "Gemini Search", cited_urls)
        except Exception as exc:
            logger.warning("Gemini grounded job search failed: %s", exc)
            return []

    async def _search_groq(self, prompt: str, source: str) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    self.GROQ_URL,
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "openai/gpt-oss-20b",
                        "messages": [{"role": "user", "content": prompt}],
                        "tools": [{"type": "browser_search"}],
                        "tool_choice": "required",
                        "temperature": 0.1,
                        "max_completion_tokens": 5000,
                    },
                )
            response.raise_for_status()
            content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return self._parse_results(content, source)
        except Exception as exc:
            logger.warning("Groq browser job search failed: %s", exc)
            return []

    def _parse_results(self, content: str, source: str, cited_urls: Optional[Set[str]] = None) -> List[Dict[str, Any]]:
        match = re.search(r"\[\s*\{[\s\S]*\}\s*\]", content)
        if not match:
            return []
        try:
            rows = json.loads(match.group(0))
        except json.JSONDecodeError:
            return []
        if not isinstance(rows, list):
            return []

        results = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            url = str(row.get("url", "")).strip()
            if not is_direct_posting_url(url):
                continue
            if cited_urls is not None and self._canonical_url(url) not in cited_urls:
                continue
            title = str(row.get("title", "")).strip()
            organization = str(row.get("organization", "")).strip()
            if not title or not organization:
                continue
            kind = "internship" if "intern" in f"{row.get('type', '')} {title}".lower() else "job"
            skills = row.get("key_skills", [])
            if isinstance(skills, str):
                skills = [skill.strip() for skill in re.split(r"[,;|]", skills) if skill.strip()]
            digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
            description = str(row.get("description") or "Details are available on the linked job posting.")
            results.append({
                "id": f"search-{digest}",
                "type": kind,
                "title": title,
                "organization": organization,
                "location": str(row.get("location") or "Location listed on posting"),
                "is_remote": bool(row.get("is_remote", False)),
                "url": url,
                "description": description,
                "summary": description[:200],
                "key_skills": [str(skill) for skill in skills if str(skill).strip()][:12] if isinstance(skills, list) else [],
                "experience_level": str(row.get("experience_level") or "Not specified"),
                "compensation": str(row.get("compensation") or "Refer to official posting"),
                "deadline": str(row.get("deadline") or "See official posting"),
                "source": source,
            })
        return results

    @staticmethod
    def _canonical_url(url: str) -> str:
        return url.strip().rstrip("/").split("#", 1)[0]

    @staticmethod
    def _search_curated(query: str, location: Optional[str], limit: int) -> List[Dict[str, Any]]:
        terms = [term.lower() for term in query.split() if len(term) > 2]
        rows = []
        for item in MOCK_OPPORTUNITIES:
            if item.get("type") not in {"job", "internship"} or not is_direct_posting_url(item.get("url", "")):
                continue
            searchable = " ".join([item.get("title", ""), item.get("organization", ""), item.get("description", ""), *item.get("key_skills", [])]).lower()
            if terms and not any(term in searchable for term in terms):
                continue
            if location and location.lower() not in {"all", "remote"} and location.lower() not in item.get("location", "").lower() and not item.get("is_remote"):
                continue
            rows.append(item)
        return rows[:limit]


opportunity_search_service = OpportunitySearchService()
