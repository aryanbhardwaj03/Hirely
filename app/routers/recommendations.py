from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user_profile import UserProfile
from app.models.opportunity import Opportunity
from app.schemas.opportunity import (
    RecommendationsResponse,
    OpportunityMatchResult,
    OpportunityResponse
)
from app.schemas.user_profile import UserProfileBase
from app.services.tinyfish_client import tinyfish_client
from app.services.matching_service import matching_service
from app.data.mock_opportunities import MOCK_OPPORTUNITIES

router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])


@router.get("/{user_id}", response_model=RecommendationsResponse)
async def get_personalized_recommendations(
    user_id: int,
    limit_per_category: int = Query(5, ge=1, le=20, description="Max results per category"),
    db: AsyncSession = Depends(get_db)
):
    """
    Personalized opportunity recommendations tailored to the user profile.
    Calculates match scores (0-100), match tiers, and rationale for Jobs,
    Internships, and Hackathons.
    """
    # 1. Fetch user profile
    res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User profile with ID {user_id} not found."
        )

    return await _generate_recommendations_for_user(user, limit_per_category, db)


@router.post("/match", response_model=RecommendationsResponse)
async def match_on_the_fly(
    profile_data: UserProfileBase,
    limit_per_category: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """
    Instant match on the fly without saving to the database.
    Ideal for guest users, onboarding flows, and interactive UI testing.
    """
    return await _generate_recommendations_for_user(profile_data, limit_per_category, db)


async def _generate_recommendations_for_user(
    user: UserProfile | UserProfileBase,
    limit_per_category: int,
    db: AsyncSession
) -> RecommendationsResponse:
    # Build search query from user skills and target role
    target_role = getattr(user, "target_role", "Software Engineer") or "Software Engineer"
    skills = getattr(user, "skills", []) or []
    top_skills_query = " ".join(skills[:3]) if skills else "developer"
    search_query = f"{target_role} {top_skills_query}".strip()

    # Retrieve opportunities via TinyFish search
    tinyfish_opps = await tinyfish_client.search(
        query=search_query,
        purpose=f"Matching career and hackathon opportunities for a {target_role}",
        limit=30
    )

    # Also include mock / seeded catalog
    all_opps = list(MOCK_OPPORTUNITIES)
    seen_ids = {o["id"] for o in all_opps}

    for item in tinyfish_opps:
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            all_opps.append(item)

    # Also fetch any custom opportunities stored in the database
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

    # Rank all opportunities using matching engine
    ranked = matching_service.rank_opportunities(user, all_opps, limit=100)

    # Separate into categories
    jobs_ranked = []
    internships_ranked = []
    hackathons_ranked = []

    for item in ranked:
        opp_type = item["opportunity"].get("type", "job")
        match_result = OpportunityMatchResult(
            opportunity=OpportunityResponse(**item["opportunity"]),
            match_score=item["match_score"],
            match_tier=item["match_tier"],
            match_reasons=item["match_reasons"],
            matched_skills=item["matched_skills"],
            missing_skills=item["missing_skills"]
        )
        if opp_type == "job":
            jobs_ranked.append(match_result)
        elif opp_type == "internship":
            internships_ranked.append(match_result)
        elif opp_type == "hackathon":
            hackathons_ranked.append(match_result)

    user_id = getattr(user, "id", None)
    user_name = getattr(user, "name", "User")

    return RecommendationsResponse(
        user_id=user_id,
        user_name=user_name,
        target_role=target_role,
        total_matches=len(jobs_ranked) + len(internships_ranked) + len(hackathons_ranked),
        top_jobs=jobs_ranked[:limit_per_category],
        top_internships=internships_ranked[:limit_per_category],
        top_hackathons=hackathons_ranked[:limit_per_category]
    )
