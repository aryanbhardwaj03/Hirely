import asyncio
from typing import List, Optional
from fastapi import APIRouter, Query, Depends
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.opportunity import Opportunity
from app.schemas.opportunity import OpportunityResponse
from app.services.tinyfish_client import tinyfish_client
from app.services.job_links import is_direct_posting_url

router = APIRouter(prefix="/search", tags=["Opportunity Search"])


async def _drop_dead_live_links(items: List[dict]) -> List[dict]:
    """Remove placeholder and confirmed 404/410 links from live search results."""
    original_by_id = {item.id: item for item in items}
    live = [item.model_dump() if hasattr(item, "model_dump") else item for item in items]
    timeout = httpx.Timeout(4.0, connect=2.0)
    semaphore = asyncio.Semaphore(8)

    async def check(item: dict) -> bool:
        url = item.get("url", "")
        if not url.startswith(("https://", "http://")) or "example.com" in url.lower():
            return False
        if str(item.get("type", "")).lower() in {"job", "jobs", "intern", "internship", "internships"} and not is_direct_posting_url(url):
            return False
        async with semaphore:
            try:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    response = await client.head(url)
                if response.status_code in (404, 410):
                    return False
                if response.history and str(item.get("type", "")).lower() in {"job", "jobs", "intern", "internship", "internships"}:
                    return is_direct_posting_url(str(response.url))
                return True
            except httpx.HTTPStatusError as exc:
                return exc.response.status_code not in (404, 410)
            except Exception:
                # Some legitimate job boards block HEAD requests; retain unverified links.
                return True

    valid = await asyncio.gather(*(check(item) for item in live))
    valid_ids = {item.get("id") for item, keep in zip(live, valid) if keep}
    return [item for item in items if item.id in valid_ids]


def normalize_opportunity_type(t: Optional[str]) -> str:
    """Normalizes type strings and plurals (e.g. 'jobs' -> 'job', 'internships' -> 'internship')."""
    if not t:
        return "all"
    t_clean = t.strip().lower()
    mapping = {
        "job": "job",
        "jobs": "job",
        "internship": "internship",
        "internships": "internship",
        "intern": "internship",
        "hackathon": "hackathon",
        "hackathons": "hackathon",
        "scholarship": "scholarship",
        "scholarships": "scholarship",
        "fellowship": "fellowship",
        "fellowships": "fellowship",
        "competition": "competition",
        "competitions": "competition",
        "all": "all",
    }
    return mapping.get(t_clean, t_clean)


@router.get("", response_model=List[OpportunityResponse])
async def search_all(
    query: Optional[str] = Query(None, description="Keywords to search for (e.g., 'Python', 'AI Agent', 'FastAPI')"),
    opportunity_type: Optional[str] = Query("all", description="Type: 'job', 'internship', 'hackathon', or 'all'"),
    location: Optional[str] = Query(None, description="Location filter (e.g. 'Remote', 'Bengaluru', 'San Francisco')"),
    remote_only: bool = Query(False, description="Filter for 100% remote opportunities"),
    limit: int = Query(20, ge=1, le=100, description="Max results to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Primary search endpoint powered by TinyFish Search API.
    Searches live jobs, internships, and hackathons with seamless mock fallback.
    """
    norm_type = normalize_opportunity_type(opportunity_type)

    search_q = (query or "").strip()
    if norm_type != "all":
        search_q = f"{search_q} {norm_type}".strip()

    # Query TinyFish AI
    results = await tinyfish_client.search(
        query=search_q if search_q else "software engineer",
        purpose="Job and hackathon discovery for student and software developers",
        location=location,
        limit=limit
    )

    # Filter by opportunity_type if specified
    if norm_type != "all":
        type_filtered = [r for r in results if normalize_opportunity_type(r.get("type")) == norm_type]
        if type_filtered:
            results = type_filtered
        elif results:
            # If type filter removed all results, fetch mock data specifically for this type
            results = tinyfish_client._filter_mock_data(query=norm_type, limit=limit)
            results = [r for r in results if normalize_opportunity_type(r.get("type")) == norm_type]

    # Filter remote
    if remote_only:
        results = [r for r in results if r.get("is_remote")]

    # Also merge in opportunities from local database if available
    db_query = select(Opportunity)
    if norm_type != "all":
        db_query = db_query.where(Opportunity.type == norm_type)
    if remote_only:
        db_query = db_query.where(Opportunity.is_remote == True)
    if query and query.strip():
        q_term = f"%{query.strip().lower()}%"
        db_query = db_query.where(
            (Opportunity.title.ilike(q_term)) |
            (Opportunity.organization.ilike(q_term)) |
            (Opportunity.description.ilike(q_term)) |
            (Opportunity.summary.ilike(q_term))
        )

    db_res = await db.execute(db_query.limit(limit))
    db_items = db_res.scalars().all()

    # Map to schema
    combined = []
    seen_ids = set()

    for item in results:
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            combined.append(OpportunityResponse(**item))

    for item in db_items:
        if item.id not in seen_ids:
            seen_ids.add(item.id)
            combined.append(OpportunityResponse(
                id=item.id,
                type=normalize_opportunity_type(item.type),
                title=item.title,
                organization=item.organization,
                location=item.location,
                is_remote=item.is_remote,
                url=item.url,
                description=item.description,
                summary=item.summary,
                key_skills=item.key_skills or [],
                experience_level=item.experience_level,
                compensation=item.compensation,
                deadline=item.deadline,
                source=item.source,
                created_at=item.created_at
            ))

    # If strict query returned zero results but opportunity_type is specified,
    # fallback to top opportunities of that type so the user always has high-signal results
    if not combined and norm_type != "all":
        fallback_query = select(Opportunity).where(Opportunity.type == norm_type)
        if remote_only:
            fallback_query = fallback_query.where(Opportunity.is_remote == True)
        fallback_res = await db.execute(fallback_query.limit(limit))
        for item in fallback_res.scalars().all():
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                combined.append(OpportunityResponse(
                    id=item.id,
                    type=normalize_opportunity_type(item.type),
                    title=item.title,
                    organization=item.organization,
                    location=item.location,
                    is_remote=item.is_remote,
                    url=item.url,
                    description=item.description,
                    summary=item.summary,
                    key_skills=item.key_skills or [],
                    experience_level=item.experience_level,
                    compensation=item.compensation,
                    deadline=item.deadline,
                    source=item.source,
                    created_at=item.created_at
                ))

    combined = await _drop_dead_live_links(combined)

    # Rank skill and title matches ahead of broad snippets for more useful results.
    query_terms = {term.lower() for term in (query or "").split() if len(term) > 2}
    if query_terms:
        def relevance(item):
            text = " ".join([item.title, item.organization, item.description or "", *item.key_skills]).lower()
            return sum(3 if term in item.title.lower() else 1 for term in query_terms if term in text)
        combined.sort(key=relevance, reverse=True)

    return combined[:limit]


@router.get("/jobs", response_model=List[OpportunityResponse])
async def search_jobs(
    query: Optional[str] = Query(None, description="Job keywords (e.g. 'Backend Engineer', 'AI')"),
    location: Optional[str] = Query(None, description="Location filter"),
    remote_only: bool = Query(False, description="Remote jobs only"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Specialized search for Full-time and Part-time Jobs."""
    return await search_all(
        query=query,
        opportunity_type="job",
        location=location,
        remote_only=remote_only,
        limit=limit,
        db=db
    )


@router.get("/internships", response_model=List[OpportunityResponse])
async def search_internships(
    query: Optional[str] = Query(None, description="Internship keywords (e.g. 'Software Engineering Intern')"),
    location: Optional[str] = Query(None, description="Location filter"),
    remote_only: bool = Query(False, description="Remote internships only"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Specialized search for Student and Graduate Internships."""
    return await search_all(
        query=query,
        opportunity_type="internship",
        location=location,
        remote_only=remote_only,
        limit=limit,
        db=db
    )


@router.get("/hackathons", response_model=List[OpportunityResponse])
async def search_hackathons(
    query: Optional[str] = Query(None, description="Hackathon keywords (e.g. 'Agentic AI', 'CalHacks')"),
    location: Optional[str] = Query(None, description="Location filter"),
    remote_only: bool = Query(False, description="Online/virtual hackathons only"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Specialized search for Hackathons and Developer Competitions."""
    return await search_all(
        query=query,
        opportunity_type="hackathon",
        location=location,
        remote_only=remote_only,
        limit=limit,
        db=db
    )


@router.get("/scholarships", response_model=List[OpportunityResponse])
async def search_scholarships(
    query: Optional[str] = Query(None, description="Scholarship keywords"),
    location: Optional[str] = Query(None, description="Location filter"),
    remote_only: bool = Query(False, description="Remote only"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Specialized search for Student Scholarships and Grants."""
    return await search_all(
        query=query,
        opportunity_type="scholarship",
        location=location,
        remote_only=remote_only,
        limit=limit,
        db=db
    )


@router.get("/fellowships", response_model=List[OpportunityResponse])
async def search_fellowships(
    query: Optional[str] = Query(None, description="Fellowship keywords"),
    location: Optional[str] = Query(None, description="Location filter"),
    remote_only: bool = Query(False, description="Remote only"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Specialized search for Academic & Engineering Fellowships."""
    return await search_all(
        query=query,
        opportunity_type="fellowship",
        location=location,
        remote_only=remote_only,
        limit=limit,
        db=db
    )
