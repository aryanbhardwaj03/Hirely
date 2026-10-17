import logging
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings
from app.data.mock_opportunities import MOCK_OPPORTUNITIES

logger = logging.getLogger(__name__)


class TinyFishClient:
    """
    Unified client for TinyFish AI services:
    - Search API (structured web search optimized for AI agents)
    - Fetch API (clean web scraping and DOM extraction to markdown)
    - Agent API (autonomous web browser agent execution)
    
    Includes seamless smart fallback to curated datasets when API key
    is missing or during hackathon offline demo mode.
    """

    SEARCH_API_URL = "https://api.search.tinyfish.ai"
    FETCH_API_URL = "https://api.fetch.tinyfish.ai"
    AGENT_API_URL = "https://agent.tinyfish.ai/run"

    def __init__(self):
        self.api_key = settings.TINYFISH_API_KEY.strip() if settings.TINYFISH_API_KEY else None
        self.headers = {
            "X-API-Key": self.api_key or "",
            "Content-Type": "application/json"
        }
        self.has_key = bool(self.api_key)
        if not self.has_key:
            logger.info("TinyFish API key not detected. Smart Mock & Fallback mode is ACTIVE.")

    async def search(
        self,
        query: str,
        purpose: Optional[str] = None,
        location: Optional[str] = None,
        recency_minutes: Optional[int] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Executes a web search via TinyFish Search API.
        Falls back to local mock search if key is not configured or on network error.
        """
        if self.has_key:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    params: Dict[str, Any] = {"query": query}
                    if purpose:
                        params["purpose"] = purpose
                    if location:
                        params["location"] = location
                    if recency_minutes:
                        params["recency_minutes"] = recency_minutes

                    resp = await client.get(
                        self.SEARCH_API_URL,
                        headers=self.headers,
                        params=params
                    )
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        results = data.get("results", [])
                        return self._format_tinyfish_results(results, query)
                    else:
                        logger.warning(
                            f"TinyFish Search API returned HTTP {resp.status_code}: {resp.text}. Falling back to curated dataset."
                        )
            except Exception as e:
                logger.error(f"TinyFish Search error: {e}. Falling back to curated dataset.")

        # Fallback / Demo mode
        return self._filter_mock_data(query=query, location=location, limit=limit)

    async def fetch_content(self, url: str, purpose: Optional[str] = None) -> Optional[str]:
        """
        Extracts clean, agent-ready markdown text from any web page using TinyFish Fetch API.
        """
        if self.has_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    payload: Dict[str, Any] = {
                        "urls": [url],
                        "format": "markdown",
                        "links": False,
                        "image_links": False
                    }
                    if purpose:
                        payload["purpose"] = purpose

                    resp = await client.post(
                        self.FETCH_API_URL,
                        headers=self.headers,
                        json=payload
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        results = data.get("results", [])
                        if results and len(results) > 0:
                            return results[0].get("content") or results[0].get("markdown")
            except Exception as e:
                logger.error(f"TinyFish Fetch error for {url}: {e}")

        # Fallback: check if URL matches any mock opportunity
        for item in MOCK_OPPORTUNITIES:
            if item["url"] == url or item["id"] in url:
                return f"# {item['title']} at {item['organization']}\n\n**Location:** {item['location']}\n**Type:** {item['type']}\n**Compensation:** {item.get('compensation', 'N/A')}\n\n## Description\n{item['description']}\n\n## Required Skills\n" + ", ".join(item.get("key_skills", []))

        return None

    async def agent_run(
        self,
        goal: str,
        url: str,
        output_schema: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Runs an autonomous web agent task using TinyFish Agent API.
        """
        if self.has_key:
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    payload: Dict[str, Any] = {
                        "goal": goal,
                        "url": url
                    }
                    if output_schema:
                        payload["output_schema"] = output_schema

                    resp = await client.post(
                        self.AGENT_API_URL,
                        headers=self.headers,
                        json=payload
                    )
                    if resp.status_code in (200, 201):
                        return resp.json().get("result")
            except Exception as e:
                logger.error(f"TinyFish Agent run error: {e}")

        return None

    def _format_tinyfish_results(self, raw_results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Formats TinyFish raw search results into standard Opportunity objects."""
        formatted = []
        q_lower = query.lower()
        default_type = "hackathon" if "hackathon" in q_lower else ("internship" if "intern" in q_lower else "job")

        for idx, res in enumerate(raw_results):
            title = res.get("title") or "Opportunity"
            url = res.get("url") or "https://example.com"
            snippet = res.get("snippet") or ""
            site_name = res.get("site_name") or "Web Discovery"

            # Determine type
            item_type = default_type
            title_lower = title.lower()
            if "hackathon" in title_lower or "challenge" in title_lower:
                item_type = "hackathon"
            elif "intern" in title_lower or "fellow" in title_lower:
                item_type = "internship"

            # Extract basic skills mentioned in snippet
            skills = self._extract_skills_from_text(f"{title} {snippet}")

            formatted.append({
                "id": f"tinyfish-{idx}-{abs(hash(url)) % 100000}",
                "type": item_type,
                "title": title,
                "organization": site_name,
                "location": "Remote / Listed on Site",
                "is_remote": "remote" in snippet.lower() or "remote" in title_lower,
                "url": url,
                "description": snippet,
                "summary": snippet[:200] + ("..." if len(snippet) > 200 else ""),
                "key_skills": skills,
                "experience_level": "Student" if item_type != "job" else "Entry-Level",
                "compensation": "Refer to official posting",
                "deadline": "See official site",
                "source": "TinyFish Live Search"
            })
        return formatted

    def _filter_mock_data(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """Filters curated opportunities based on search criteria."""
        results = list(MOCK_OPPORTUNITIES)
        if query:
            q_terms = [t.lower() for t in query.split() if len(t) > 2]
            scored = []
            for item in results:
                searchable_text = f"{item['title']} {item['organization']} {item['type']} {item['description']} {' '.join(item.get('key_skills', []))}".lower()
                matches = sum(1 for term in q_terms if term in searchable_text)
                if matches > 0:
                    scored.append((matches, item))
            if scored:
                scored.sort(key=lambda x: x[0], reverse=True)
                results = [item for _, item in scored]

        if location and location.lower() != "remote":
            loc_term = location.lower()
            results = [r for r in results if loc_term in r.get("location", "").lower() or r.get("is_remote")]

        return results[:limit]

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Simple skill scanner for search snippets."""
        COMMON_SKILLS = [
            "Python", "FastAPI", "React", "TypeScript", "JavaScript", "Docker",
            "Kubernetes", "PyTorch", "TensorFlow", "Node.js", "Next.js", "Go",
            "Rust", "SQL", "PostgreSQL", "MongoDB", "AWS", "Git", "C++", "Java",
            "GraphQL", "TailwindCSS", "AI Agents", "LLMs", "Solidity"
        ]
        text_lower = text.lower()
        found = []
        for s in COMMON_SKILLS:
            if s.lower() in text_lower:
                found.append(s)
        return found if found else ["Software Engineering", "Problem Solving"]


tinyfish_client = TinyFishClient()
