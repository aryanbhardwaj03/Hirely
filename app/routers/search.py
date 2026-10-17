from typing import List, Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.opportunity import Opportunity
from app.schemas.opportunity import OpportunityResponse
from app.services.tinyfish_client import tinyfish_client

router = APIRouter(prefix="/search", tags=["Opportunity Search"])


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
    search_q = query or ""
    if opportunity_type and opportunity_type != "all":
        search_q = f"{search_q} {opportunity_type}".strip()

    # Query TinyFish AI
    results = await tinyfish_client.search(
        query=search_q if search_q else "software engineer",
        purpose="Job and hackathon discovery for student and software developers",
        location=location,
        limit=limit
    )

    # Filter by opportunity_type if specified
    if opportunity_type and opportunity_type != "all":
        results = [r for r in results if r.get("type") == opportunity_type]

    # Filter remote
    if remote_only:
        results = [r for r in results if r.get("is_remote")]

    # Optional: also merge in opportunities from local database if available
    db_query = select(Opportunity)
    if opportunity_type and opportunity_type != "all":
        db_query = db_query.where(Opportunity.type == opportunity_type)
    if remote_only:
        db_query = db_query.where(Opportunity.is_remote == True)

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
                type=item.type,
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
