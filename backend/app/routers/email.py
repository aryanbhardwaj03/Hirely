import logging
from typing import List, Optional, Dict, Any
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
    Sends a test verification email using the teammate's branded Hirely design.
    Never exposes internal hostnames, credentials, or server mode details in customer email.
    """
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hirely AI Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#131b2e;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="background:linear-gradient(135deg, #10b981 0%, #6366f1 50%, #8b5cf6 100%);height:6px;"></td>
          </tr>
          <tr>
            <td style="padding:32px 36px 20px 36px;text-align:center;">
              <div style="display:inline-block;background-color:#1e293b;border:1px solid #334155;border-radius:12px;padding:8px 16px;margin-bottom:12px;">
                <span style="font-size:18px;vertical-align:middle;">⚡</span>
                <span style="font-size:15px;font-weight:700;color:#f8fafc;margin-left:6px;vertical-align:middle;">Hirely AI</span>
              </div>
              <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 10px 0;">Email Notification Verified</h1>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
                {data.message}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;text-align:center;">
                <p style="color:#cbd5e1;font-size:13px;line-height:1.5;margin:0;">
                  Your automated opportunity digest and deadline reminder pipeline is active and ready to deliver real-time career alerts.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a;border-top:1px solid #1e293b;padding:20px 36px;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0;">
                Hirely AI &bull; Spatial Opportunity Intelligence Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
    and an overview of Hirely's autonomous AI search matching features.
    """
    res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        logger.warning(f"Welcome email requested for non-existent profile ID {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please verify the account registration."
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
    use_live_search: bool = Query(True, description="Query live AI search for real-time matches"),
    opportunity_type: Optional[str] = Query(None, description="Optional type filter: job, internship, hackathon"),
    background_tasks: BackgroundTasks = None,
    async_mode: bool = Query(False, description="If True, dispatches in background"),
    db: AsyncSession = Depends(get_db)
):
    """
    Discovers, ranks, and emails personalized job, internship, and hackathon
    opportunities tailored specifically to the user's profile and target role.
    """
    res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        logger.warning(f"Opportunities email requested for non-existent profile ID {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please ensure your profile is saved."
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

    if async_mode and background_tasks:
        background_tasks.add_task(
            email_service.send_opportunity_recommendations_email,
            user,
            opportunities=None,
            use_live_search=use_live_search,
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
        use_live_search=use_live_search,
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
    Sends personalized opportunity recommendation digest.
    Robust profile resolution:
      1. Looks up database UserProfile by numeric user_id (if supplied).
      2. If not found or user_id is omitted, looks up by email.
      3. If profile row is not yet committed, gracefully uses the payload's
         profile attributes (name, target_role, skills, email) without failing with 404.
    """
    target_email = data.email or data.recipient
    user_record: Optional[UserProfile] = None

    # Step 1: Look up by integer user_id if valid
    if data.user_id and data.user_id > 0:
        res = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
        user_record = res.scalar_one_or_none()

    # Step 2: If no record by ID, attempt lookup by unique email
    if not user_record and target_email:
        res = await db.execute(select(UserProfile).where(UserProfile.email == target_email))
        user_record = res.scalar_one_or_none()

    # Step 3: Resolve candidate object
    if user_record:
        user_obj: Any = user_record
    elif target_email:
        # Graceful fallback: construct profile context directly from the authenticated request
        user_obj = {
            "id": data.user_id or 0,
            "name": data.name or data.recipient_name or "Student Candidate",
            "email": target_email,
            "target_role": data.target_role or "Software / AI Engineer",
            "experience_level": "Student",
            "skills": data.skills or [],
            "preferred_locations": [data.location or "Remote"],
            "interests": data.interests or []
        }
    else:
        logger.error("send_recommendations failed: no recipient email or valid user ID provided in payload.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A delivery email address or active user profile is required to send opportunity recommendations."
        )

    # Normalize incoming opportunities if provided directly from frontend preview
    normalized_opps: Optional[List[Dict[str, Any]]] = None
    if data.opportunities and len(data.opportunities) > 0:
        normalized_opps = []
        for opp in data.opportunities:
            opp_item = opp.get("opportunity") if isinstance(opp, dict) and "opportunity" in opp else opp
            normalized_opps.append({
                "opportunity": {
                    "id": opp_item.get("id", "opp-live"),
                    "title": opp_item.get("title", "Opportunity"),
                    "organization": opp_item.get("organization", "Host Organization"),
                    "type": opp_item.get("type") or opp_item.get("category", "job"),
                    "location": opp_item.get("location", "Remote"),
                    "is_remote": opp_item.get("is_remote", opp_item.get("isRemote", True)),
                    "url": opp_item.get("url", "https://hirely.ai"),
                    "compensation": opp_item.get("compensation") or opp_item.get("stipend") or opp_item.get("stipendOrAward") or "Competitive",
                    "deadline": opp_item.get("deadline") or opp_item.get("deadlineFormatted") or "Open / Rolling",
                    "summary": opp_item.get("summary") or opp_item.get("description", ""),
                    "description": opp_item.get("description", ""),
                    "key_skills": opp_item.get("key_skills", opp_item.get("required_skills", []))
                },
                "match_score": opp.get("match_score", 92),
                "match_tier": opp.get("match_tier", "Exceptional Match" if opp.get("match_score", 92) >= 88 else "Strong Match"),
                "match_reasons": opp.get("match_reasons", [
                    f"Direct alignment with {data.target_role or 'your engineering profile'}"
                ]),
                "matched_skills": opp.get("matched_skills", data.skills[:3] if data.skills else [])
            })

    # Fetch database opportunities for fallback ranking if no explicit opportunities were supplied
    db_opps = None
    if normalized_opps is None:
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
        user=user_obj,
        opportunities=normalized_opps,
        use_live_search=data.use_live_search,
        opportunity_type=data.opportunity_type,
        limit=data.limit,
        db_opportunities=db_opps,
        is_test=data.is_test
    )


@router.post("/digest-all", response_model=EmailBatchResponse)
async def send_digest_to_all_users(
    limit_per_user: int = Query(5, ge=1, le=10),
    use_live_search: bool = Query(True),
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
                use_live_search=use_live_search,
                limit=limit_per_user,
                db_opportunities=db_opps,
                is_test=False
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
                message="Digest delivery failed due to transport error."
            ))

    return EmailBatchResponse(
        total=len(users),
        successful=successful,
        failed=failed,
        results=results
    )
