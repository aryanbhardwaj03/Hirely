from fastapi import APIRouter, HTTPException, status
from app.schemas.summary import (
    SummarizeUrlRequest,
    SummarizeTextRequest,
    SummaryResponse
)
from app.services.summarizer_service import summarizer_service

router = APIRouter(prefix="/summary", tags=["AI Summarization (AI search)"])


@router.post("/url", response_model=SummaryResponse)
async def summarize_opportunity_url(payload: SummarizeUrlRequest):
    """
    Fetches the live job, internship, or hackathon page using Public page fetch API
    and generates an AI-powered structured summary.
    
    Includes:
    - Executive summary
    - Key responsibilities / hackathon tracks
    - Extracted required & nice-to-have skills
    - Eligibility criteria & deadlines
    - Compensation / prize amounts
    - Tailored application tips to help candidates stand out
    """
    if not payload.url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid HTTP or HTTPS URL is required."
        )

    try:
        summary = await summarizer_service.summarize_from_url(
            url=payload.url,
            opportunity_type=payload.opportunity_type or "auto",
            user_skills=payload.user_skills
        )
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary with AI-powered search: {str(e)}"
        )


@router.post("/text", response_model=SummaryResponse)
async def summarize_opportunity_text(payload: SummarizeTextRequest):
    """
    Summarizes raw job or hackathon text description using AI search extraction engine.
    """
    if not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text content cannot be empty."
        )

    summary = summarizer_service.summarize_text(
        text=payload.text,
        title=payload.title,
        opportunity_type=payload.opportunity_type or "job",
        user_skills=payload.user_skills
    )
    return summary
