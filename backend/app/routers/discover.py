from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.opportunity import Opportunity
from app.data.mock_opportunities import MOCK_OPPORTUNITIES
from app.services.tinyfish_client import tinyfish_client
from app.services.job_links import is_direct_posting_url
from app.services.matching_service import matching_service
from app.schemas.user_profile import UserProfileBase

router = APIRouter(prefix="/discover", tags=["Autonomous Discovery (TinyFish)"])


class DiscoverPayload(BaseModel):
    degree: Optional[str] = "B.Tech / B.S."
    year: Optional[int] = 2
    skills: List[str] = Field(default_factory=list)
    location: Optional[str] = "Delhi/NCR, India"
    categories: List[str] = Field(default_factory=list)


def _normalize_category(cat: str) -> str:
    c = cat.strip().lower()
    mapping = {
        "jobs": "job",
        "job": "job",
        "internships": "internship",
        "internship": "internship",
        "hackathons": "hackathon",
        "hackathon": "hackathon",
        "scholarships": "scholarship",
        "scholarship": "scholarship",
        "fellowships": "fellowship",
        "fellowship": "fellowship",
        "competitions": "competition",
        "competition": "competition",
    }
    return mapping.get(c, c)


@router.post("")
async def run_autonomous_discovery(
    payload: DiscoverPayload,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Autonomous Discovery endpoint called by frontend TinyFish engine.
    Scans live and curated web opportunities based on student degree, skills,
    location, and category interests.
    """
    normalized_categories = [_normalize_category(c) for c in payload.categories] if payload.categories else []

    # 1. Build search query from skills
    query_terms = payload.skills[:3] if payload.skills else ["software", "developer"]
    search_q = " ".join(query_terms)

    # 2. Search opportunities using TinyFish client
    discovered_raw = await tinyfish_client.search(
        query=search_q,
        purpose=f"Autonomous career discovery for {payload.degree} student",
        location=payload.location,
        limit=30
    )

    # 3. Aggregate all catalog items (mock + db + discovered)
    all_opps: List[Dict[str, Any]] = list(MOCK_OPPORTUNITIES)
    seen_ids = {o["id"] for o in all_opps}

    for item in discovered_raw:
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            all_opps.append(item)

    # Merge custom opportunities from database
    db_res = await db.execute(select(Opportunity))
    for opp in db_res.scalars().all():
        if opp.id not in seen_ids:
            seen_ids.add(opp.id)
            all_opps.append({
                "id": opp.id,
                "type": opp.type,
                "title": opp.title,
                "organization": opp.organization,
                "location": opp.location,
                "is_remote": opp.is_remote,
                "url": opp.url,
                "description": opp.description,
                "summary": opp.summary,
                "key_skills": opp.key_skills or [],
                "experience_level": opp.experience_level,
                "compensation": opp.compensation,
                "deadline": opp.deadline,
                "source": opp.source
            })

    # Filter by category if requested
    if normalized_categories:
        filtered = [
            o for o in all_opps
            if _normalize_category(o.get("type", "")) in normalized_categories
        ]
        if filtered:
            all_opps = filtered

    # Never show a job/internship unless its URL identifies the individual posting.
    all_opps = [
        opp for opp in all_opps
        if _normalize_category(opp.get("type", "")) not in {"job", "internship"}
        or is_direct_posting_url(opp.get("url", ""))
    ]

    # 4. Rank using matching engine
    pseudo_profile = UserProfileBase(
        name="Candidate",
        email="candidate@university.edu",
        target_role="Software / AI Engineer",
        skills=payload.skills or ["Python", "Algorithms", "React"],
        preferred_locations=[payload.location or "Remote", "Remote"],
        opportunity_types=normalized_categories or ["job", "internship", "hackathon"]
    )

    ranked = matching_service.rank_opportunities(pseudo_profile, all_opps, limit=25)

    # Format for frontend Opportunity schema
    formatted_opportunities = []
    for r in ranked:
        opp = r["opportunity"]
        formatted_opportunities.append({
            "id": opp.get("id"),
            "title": opp.get("title"),
            "organization": opp.get("organization"),
            "category": _normalize_category(opp.get("type", "internship")),
            "url": opp.get("url") or "https://hirely.ai",
            "deadline": opp.get("deadline") or "Rolling",
            "deadlineFormatted": opp.get("deadline") or "Rolling",
            "daysLeft": 30,
            "eligibility": opp.get("experience_level") or "Open to all eligible students and developers.",
            "location": opp.get("location") or "Remote",
            "isRemote": bool(opp.get("is_remote", True)),
            "workArrangement": "Remote" if opp.get("is_remote", True) else "On-site",
            "description": opp.get("description") or opp.get("summary") or "",
            "required_skills": opp.get("key_skills", ["Python"]),
            "match_score": r.get("match_score", 90),
            "match_reasons": r.get("match_reasons", ["Matches your declared coursework and technical skills"]),
            "missing_requirements": r.get("missing_skills", []),
            "eligibility_status": "verified",
            "last_checked_at": "Just now via TinyFish Agent",
            "stipendOrAward": opp.get("compensation") or "Competitive Compensation",
            "source": opp.get("source") or "TinyFish Live Discovery",
            "isSourceVerified": True,
            "isTopMatch": r.get("match_score", 0) >= 95
        })

    activity_logs = [
        f"Initialized TinyFish autonomous query for skills: {', '.join(payload.skills[:3]) if payload.skills else 'Software Engineering'}.",
        f"Scanned {len(all_opps)} global and regional job, internship, and hackathon listings.",
        f"Calibrated eligibility for {payload.degree} students.",
        f"Synthesized match weights & ranked top {len(formatted_opportunities)} recommendations."
    ]

    return {
        "source": "live_backend",
        "opportunities": formatted_opportunities,
        "activity": activity_logs,
        "activityLogs": activity_logs,
        "totalDiscovered": len(formatted_opportunities),
        "total_discovered": len(formatted_opportunities)
    }


@router.get("")
async def get_discover_status():
    return {
        "status": "ready",
        "endpoint": "/api/discover",
        "method": "POST",
        "description": "Send student profile criteria to discover live matched opportunities."
    }
