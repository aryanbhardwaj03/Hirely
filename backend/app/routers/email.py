import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.user_profile import UserProfile
from app.models.opportunity import Opportunity
from app.schemas.email import (
    EmailSendResponse,
    TestEmailRequest,
    SendWelcomeEmailRequest,
    SendOpportunityEmailRequest,
    EmailBatchResponse
)
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["Email Notifications"])


@router.get("/status")
async def get_email_status():
    """
    Returns the current email service status and active provider.
    """
    return {
        "status": "online",
        "resend_enabled": settings.RESEND_ENABLED,
        "resend_configured": email_service.is_resend_configured,
        "smtp_enabled": settings.SMTP_ENABLED,
        "smtp_configured": email_service.is_smtp_configured,
        "is_configured": email_service.is_configured,
        "mode": email_service.provider_mode,
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "tls": settings.SMTP_TLS,
        "ssl": settings.SMTP_SSL,
        "from_email": email_service.from_email,
        "from_name": settings.EMAILS_FROM_NAME,
        "auto_welcome_on_signup": settings.SEND_WELCOME_EMAIL_ON_SIGNUP
    }


@router.post("/test", response_model=EmailSendResponse)
async def send_test_email(data: TestEmailRequest):
    """
    Sends a test email to verify the configured email provider.
    """
    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background-color:#0f172a;color:#e2e8f0;padding:30px;">
  <div style="max-width:500px;margin:auto;background-color:#1e293b;border-radius:12px;padding:24px;border:1px solid #334155;">
    <h2 style="color:#6366f1;margin-top:0;">🚀 Hirely AI - Email Test Verification</h2>
    <p style="font-size:14px;color:#cbd5e1;line-height:1.5;">{data.message}</p>
    <div style="background-color:#0f172a;border-radius:8px;padding:12px;margin:16px 0;font-size:12px;color:#94a3b8;">
      <strong>Provider:</strong> {email_service.provider_mode}<br>
      <strong>SMTP Host:</strong> {settings.SMTP_HOST}:{settings.SMTP_PORT}<br>
      <strong>Sender:</strong> {email_service.from_name} &lt;{email_service.from_email}&gt;<br>
      <strong>Mode:</strong> {email_service.provider_mode}
    </div>
    <p style="font-size:12px;color:#64748b;margin-bottom:0;">Hirely AI Automated Verification Service</p>
  </div>
</body>
</html>"""

    return await email_service.send_email(
        to_email=data.recipient,
        subject=data.subject or "Hirely AI - Email Service Verification",
        html_content=html_content,
        text_content=data.message
    )


@router.post("/welcome/{user_id}", response_model=EmailSendResponse)
async def send_welcome_email(
    user_id: int,
    background_tasks: BackgroundTasks,
    async_mode: bool = Query(False, description="If True, dispatches in background"),
    db: AsyncSession = Depends(get_db)
):
    """
    Sends a personalized welcome email to the user with their profile summary
    and an overview of Hirely's autonomous TinyFish matching features.
    """
    res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User profile with ID {user_id} not found."
        )

    if async_mode:
        background_tasks.add_task(email_service.send_welcome_email, user)
        return EmailSendResponse(
            success=True,
            recipient=user.email,
            subject=f"Welcome to Hirely AI, {user.name}!",
            mode=email_service.provider_mode,
            message="Welcome email queued for delivery in background task."
        )

    return await email_service.send_welcome_email(user)


@router.post("/opportunities/{user_id}", response_model=EmailSendResponse)
async def send_opportunities_email(
    user_id: int,
    limit: int = Query(5, ge=1, le=20, description="Max opportunities to include in digest"),
    use_tinyfish: bool = Query(True, description="Query TinyFish AI live search for real-time matches"),
    opportunity_type: Optional[str] = Query(None, description="Optional type filter: job, internship, hackathon"),
    background_tasks: BackgroundTasks = None,
    async_mode: bool = Query(False, description="If True, dispatches in background"),
    db: AsyncSession = Depends(get_db)
):
    """
    Discovers, ranks, and emails personalized job, internship, and hackathon
    opportunities tailored specifically to the user's profile and target role.
    Uses TinyFish AI live search + profile matching engine.
    """
    res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User profile with ID {user_id} not found."
        )

    # Fetch custom opportunities from database
    db_res = await db.execute(select(Opportunity))
    db_opps = [
        {
            "id": o.id,
            "type": o.type,
            "title": o.title,
            "organization": o.organization,
            "location": o.location,
            "is_remote": o.is_remote,
            "url": o.url,
            "description": o.description,
            "summary": o.summary,
            "key_skills": o.key_skills or [],
            "experience_level": o.experience_level,
            "compensation": o.compensation,
            "deadline": o.deadline,
            "source": o.source
        }
        for o in db_res.scalars().all()
    ]

    if async_mode and background_tasks:
        background_tasks.add_task(
            email_service.send_opportunity_recommendations_email,
            user,
            opportunities=None,
            use_tinyfish=use_tinyfish,
            opportunity_type=opportunity_type,
            limit=limit,
            db_opportunities=db_opps
        )
        return EmailSendResponse(
            success=True,
            recipient=user.email,
            subject=f"Opportunity Digest for {user.name}",
            mode=email_service.provider_mode,
            message="Opportunity recommendation email queued for delivery in background task.",
            items_count=limit
        )

    return await email_service.send_opportunity_recommendations_email(
        user=user,
        opportunities=None,
        use_tinyfish=use_tinyfish,
        opportunity_type=opportunity_type,
        limit=limit,
        db_opportunities=db_opps
    )


@router.post("/send-recommendations", response_model=EmailSendResponse)
async def send_recommendations_by_request(
    data: SendOpportunityEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Sends personalized opportunity recommendation email by request payload.
    """
    if not data.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id is required to send profile-matched opportunity email."
        )

    res = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User profile with ID {data.user_id} not found."
        )

    db_res = await db.execute(select(Opportunity))
    db_opps = [
        {
            "id": o.id,
            "type": o.type,
            "title": o.title,
            "organization": o.organization,
            "location": o.location,
            "is_remote": o.is_remote,
            "url": o.url,
            "description": o.description,
            "summary": o.summary,
            "key_skills": o.key_skills or [],
            "experience_level": o.experience_level,
            "compensation": o.compensation,
            "deadline": o.deadline,
            "source": o.source
        }
        for o in db_res.scalars().all()
    ]

    return await email_service.send_opportunity_recommendations_email(
        user=user,
        opportunities=None,
        use_tinyfish=data.use_tinyfish_live,
        opportunity_type=data.opportunity_type,
        limit=data.limit,
        db_opportunities=db_opps
    )


@router.post("/digest-all", response_model=EmailBatchResponse)
async def send_digest_to_all_users(
    limit_per_user: int = Query(5, ge=1, le=10),
    use_tinyfish: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """
    Sends personalized opportunity emails to all registered users according to their profile.
    """
    users_res = await db.execute(select(UserProfile))
    users = users_res.scalars().all()

    db_res = await db.execute(select(Opportunity))
    db_opps = [
        {
            "id": o.id,
            "type": o.type,
            "title": o.title,
            "organization": o.organization,
            "location": o.location,
            "is_remote": o.is_remote,
            "url": o.url,
            "description": o.description,
            "summary": o.summary,
            "key_skills": o.key_skills or [],
            "experience_level": o.experience_level,
            "compensation": o.compensation,
            "deadline": o.deadline,
            "source": o.source
        }
        for o in db_res.scalars().all()
    ]

    results: List[EmailSendResponse] = []
    successful = 0
    failed = 0

    for user in users:
        try:
            res = await email_service.send_opportunity_recommendations_email(
                user=user,
                use_tinyfish=use_tinyfish,
                limit=limit_per_user,
                db_opportunities=db_opps
            )
            results.append(res)
            if res.success:
                successful += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Failed sending opportunity digest to user {user.email}: {e}")
            failed += 1
            results.append(EmailSendResponse(
                success=False,
                recipient=user.email,
                subject="Opportunity Digest",
                mode=email_service.provider_mode,
                message=str(e)
            ))

    return EmailBatchResponse(
        total=len(users),
        successful=successful,
        failed=failed,
        results=results
    )
