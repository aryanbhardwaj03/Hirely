from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.trustcheck import TrustAssessment, ScamReport
from app.models.opportunity import Opportunity
from app.schemas.trustcheck import (
    TrustAssessmentResponse,
    TrustRecheckRequest,
    ScamReportCreate,
    ScamReportResponse
)
from app.services.trustcheck_service import trustcheck_service
from app.data.mock_opportunities import MOCK_OPPORTUNITIES

router = APIRouter(prefix="/trustcheck", tags=["Hirely TrustCheck"])


@router.get("/{opportunity_id}", response_model=TrustAssessmentResponse)
async def get_or_assess_trust(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves or dynamically computes the TrustCheck assessment for an opportunity.
    Cross-checks web domains, verifies organizers, detects fee scams, and analyzes risk signs.
    """
    # 1. Check if opportunity exists in database
    opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = opp_res.scalar_one_or_none()

    opp_data = None
    if opp:
        opp_data = {
            "id": opp.id,
            "title": opp.title,
            "organization": opp.organization,
            "type": opp.type,
            "url": opp.url,
            "description": opp.description,
            "compensation": opp.compensation,
            "deadline": opp.deadline
        }
    else:
        # Check mock opportunities catalog
        for item in MOCK_OPPORTUNITIES:
            if item["id"] == opportunity_id:
                opp_data = item
                break

    if not opp_data:
        # Construct dynamic fallback lookup
        opp_data = {
            "id": opportunity_id,
            "title": opportunity_id.replace("-", " ").title(),
            "organization": "Independent Host",
            "type": "opportunity",
            "url": "https://example.com",
            "description": "Public listing",
            "compensation": "Stated in posting",
            "deadline": "Rolling"
        }

    assessment = await trustcheck_service.assess_opportunity(
        opportunity_data=opp_data,
        force_fresh=False,
        db=db
    )
    return assessment


@router.post("/recheck", response_model=TrustAssessmentResponse)
async def recheck_opportunity_trust(
    recheck_in: TrustRecheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Forces a fresh TrustCheck re-evaluation by fetching latest webpage content,
    re-running domain authentication, and updating database records.
    """
    opp_id = recheck_in.opportunity_id

    # Find opportunity
    opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = opp_res.scalar_one_or_none()

    opp_data = None
    if opp:
        opp_data = {
            "id": opp.id,
            "title": opp.title,
            "organization": opp.organization,
            "type": opp.type,
            "url": opp.url,
            "description": opp.description,
            "compensation": opp.compensation,
            "deadline": opp.deadline
        }
    else:
        for item in MOCK_OPPORTUNITIES:
            if item["id"] == opp_id:
                opp_data = item
                break

    if not opp_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity '{opp_id}' not found for recheck."
        )

    assessment = await trustcheck_service.assess_opportunity(
        opportunity_data=opp_data,
        force_fresh=True,
        db=db
    )
    return assessment


@router.post("/report", response_model=ScamReportResponse, status_code=status.HTTP_201_CREATED)
async def report_suspicious_opportunity(
    report_in: ScamReportCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Allows students to report suspicious listings, phishing domains, or unauthorized fee requests.
    Updates risk indicators on subsequent TrustCheck evaluations.
    """
    new_report = ScamReport(
        opportunity_id=report_in.opportunity_id,
        user_id=report_in.user_id,
        reason=report_in.reason,
        details=report_in.details,
        contact_email=report_in.contact_email,
        status="pending"
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    # Immediately trigger re-assessment of the opportunity so the report is reflected
    opp_res = await db.execute(select(Opportunity).where(Opportunity.id == report_in.opportunity_id))
    opp = opp_res.scalar_one_or_none()
    if opp:
        await trustcheck_service.assess_opportunity(opp, force_fresh=True, db=db)
    else:
        for item in MOCK_OPPORTUNITIES:
            if item["id"] == report_in.opportunity_id:
                await trustcheck_service.assess_opportunity(item, force_fresh=True, db=db)
                break

    return new_report


@router.get("/reports/{opportunity_id}", response_model=List[ScamReportResponse])
async def list_opportunity_reports(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Lists community scam reports filed for a specific opportunity."""
    res = await db.execute(
        select(ScamReport)
        .where(ScamReport.opportunity_id == opportunity_id)
        .order_by(ScamReport.created_at.desc())
    )
    return res.scalars().all()
