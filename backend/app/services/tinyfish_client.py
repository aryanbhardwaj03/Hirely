import logging
from typing import List, Dict, Any, Optional
import httpx
from tinyfish import AsyncTinyFish
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
        self.has_key = bool(self.api_key)
        self.sdk_client: Optional[AsyncTinyFish] = None

        if self.has_key:
            try:
                self.sdk_client = AsyncTinyFish(api_key=self.api_key)
                logger.info("TinyFish SDK initialized with live API key.")
            except Exception as e:
                logger.error(f"Failed to initialize TinyFish SDK client: {e}")

        self.headers = {
            "X-API-Key": self.api_key or "",
            "Content-Type": "application/json"
        }

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
        if self.has_key and self.sdk_client:
            try:
                search_res = await self.sdk_client.search.query(
                    query=query,
                    purpose=purpose,
                    location=location,
                    recency_minutes=recency_minutes
                )
                if search_res and search_res.results:
                    return self._format_sdk_results(search_res.results, query)
            except Exception as e:
                logger.error(f"TinyFish SDK Search error: {e}. Falling back to curated dataset.")

        # HTTP Fallback
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
                        return self._format_raw_results(results, query)
            except Exception as e:
                logger.error(f"TinyFish HTTP Search fallback error: {e}")

        # Smart Curated Fallback
        return self._filter_mock_data(query=query, location=location, limit=limit)

    async def fetch_content(self, url: str, purpose: Optional[str] = None) -> Optional[str]:
        """
        Extracts clean, agent-ready markdown text from any web page using TinyFish Fetch API.
        """
        if self.has_key and self.sdk_client:
            try:
                fetch_res = await self.sdk_client.fetch.get_contents(
                    urls=[url],
                    purpose=purpose,
                    format="markdown"
                )
                if fetch_res and fetch_res.results:
                    return fetch_res.results[0].text
            except Exception as e:
                logger.error(f"TinyFish SDK Fetch error for {url}: {e}")

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
                            return results[0].get("text") or results[0].get("content") or results[0].get("markdown")
            except Exception as e:
                logger.error(f"TinyFish HTTP Fetch error for {url}: {e}")

        # Mock fallback: check if URL matches any mock opportunity
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
        if self.has_key and self.sdk_client:
            try:
                run_res = await self.sdk_client.agent.run(
                    goal=goal,
                    url=url,
                    output_schema=output_schema
                )
                if run_res:
                    return run_res.result
            except Exception as e:
                logger.error(f"TinyFish SDK Agent run error: {e}")

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
                logger.error(f"TinyFish HTTP Agent run error: {e}")

        return None

    def _format_sdk_results(self, sdk_results: List[Any], query: str) -> List[Dict[str, Any]]:
        """Formats TinyFish SDK SearchResult objects into standard Opportunity dictionaries."""
        formatted = []
        q_lower = query.lower()
        default_type = "hackathon" if "hackathon" in q_lower else ("internship" if "intern" in q_lower else "job")

        for idx, res in enumerate(sdk_results):
            title = getattr(res, "title", None) or "Opportunity"
            url = getattr(res, "url", None) or "https://example.com"
            snippet = getattr(res, "snippet", None) or ""
            site_name = getattr(res, "site_name", None) or "Web Discovery"

            item_type = default_type
            title_lower = title.lower()
            if "hackathon" in title_lower or "challenge" in title_lower:
                item_type = "hackathon"
            elif "intern" in title_lower or "fellow" in title_lower:
                item_type = "internship"

            skills = self._extract_skills_from_text(f"{title} {snippet}")

            formatted.append({
                "id": f"tinyfish-live-{idx}-{abs(hash(url)) % 100000}",
                "type": item_type,
                "title": title,
                "organization": site_name,
                "location": "Remote / Listed on Site",
                "is_remote": "remote" in snippet.lower() or "remote" in title_lower,
                "url": url,
                "description": snippet if snippet else f"Live {item_type} opportunity found on {site_name}.",
                "summary": snippet[:200] + ("..." if len(snippet) > 200 else "") if snippet else f"{title} on {site_name}",
                "key_skills": skills,
                "experience_level": "Student" if item_type != "job" else "Entry-Level",
                "compensation": "Refer to official posting",
                "deadline": "See official site",
                "source": "TinyFish Live Search"
            })
        return formatted

    def _format_raw_results(self, raw_results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Formats raw dict search results."""
        formatted = []
        q_lower = query.lower()
        default_type = "hackathon" if "hackathon" in q_lower else ("internship" if "intern" in q_lower else "job")

        for idx, res in enumerate(raw_results):
            title = res.get("title") or "Opportunity"
            url = res.get("url") or "https://example.com"
            snippet = res.get("snippet") or ""
            site_name = res.get("site_name") or "Web Discovery"

            item_type = default_type
            title_lower = title.lower()
            if "hackathon" in title_lower or "challenge" in title_lower:
                item_type = "hackathon"
            elif "intern" in title_lower or "fellow" in title_lower:
                item_type = "internship"

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
        """Filters curated opportunities based on search criteria. Always returns results."""
        results = list(MOCK_OPPORTUNITIES)

        # Determine the primary type requested from query keywords
        query_lower = (query or "").lower()
        primary_type = None
        if "internship" in query_lower or "intern" in query_lower:
            primary_type = "internship"
        elif "hackathon" in query_lower or "hack" in query_lower:
            primary_type = "hackathon"
        elif "scholarship" in query_lower or "fellowship" in query_lower:
            primary_type = "scholarship" if "scholarship" in query_lower else "fellowship"
        elif "job" in query_lower:
            primary_type = "job"

        if query and query.strip():
            raw_terms = [t.lower().strip() for t in query.split() if len(t.strip()) >= 2]
            # Include singular stems for plural query words (e.g. jobs -> job, internships -> internship)
            expanded_terms = set(raw_terms)
            for t in raw_terms:
                if t.endswith("s") and len(t) > 3:
                    expanded_terms.add(t[:-1])
                elif t.endswith("es") and len(t) > 4:
                    expanded_terms.add(t[:-2])
            # Also add expanded tech/type synonyms
            synonym_map = {
                "intern": "internship",
                "hack": "hackathon",
                "job": "jobs",
                "fellow": "fellowship",
            }
            for t in list(expanded_terms):
                if t in synonym_map:
                    expanded_terms.add(synonym_map[t])

            scored = []
            for item in results:
                searchable_text = f"{item['title']} {item['organization']} {item['type']} {item['description']} {' '.join(item.get('key_skills', []))}".lower()
                matches = sum(1 for term in expanded_terms if term in searchable_text)
                if matches > 0:
                    scored.append((matches, item))

            if scored:
                scored.sort(key=lambda x: x[0], reverse=True)
                results = [item for _, item in scored]
            else:
                # No direct text matches: if we can identify the type, return all of that type
                # Otherwise return all items (better to show something than nothing)
                if primary_type:
                    type_filtered = [r for r in results if r.get("type") == primary_type]
                    results = type_filtered if type_filtered else results

        if location and location.lower() not in ["remote", "all", ""]:
            loc_term = location.lower()
            filtered = [r for r in results if loc_term in r.get("location", "").lower() or r.get("is_remote")]
            if filtered:
                results = filtered
            # If no location matches, keep all results (don't return empty)

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
        return found


tinyfish_client = TinyFishClient()
