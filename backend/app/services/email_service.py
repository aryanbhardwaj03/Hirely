import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional, Tuple

import httpx

from app.core.config import settings
from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileBase
from app.schemas.email import EmailSendResponse
from app.services.tinyfish_client import tinyfish_client
from app.services.matching_service import matching_service
from app.data.mock_opportunities import MOCK_OPPORTUNITIES

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email Service for Hirely AI:
    - Sends beautiful, responsive welcome emails on user onboarding.
    - Autonomously discovers and sends personalized job, internship, and hackathon
      recommendations according to user skills, target role, and TinyFish live search.
    - Resend API as the primary transport when configured.
    - SMTP as an optional fallback transport.
    - Seamless simulation mode when no provider is configured.
    """

    def __init__(self):
        self.resend_api_key = settings.RESEND_API_KEY.strip() if settings.RESEND_API_KEY else ""
        self.resend_from_email = settings.RESEND_FROM_EMAIL.strip() if settings.RESEND_FROM_EMAIL else ""
        self.resend_enabled = settings.RESEND_ENABLED

        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER.strip() if settings.SMTP_USER else ""
        self.password = settings.SMTP_PASSWORD.strip() if settings.SMTP_PASSWORD else ""
        self.tls = settings.SMTP_TLS
        self.ssl = settings.SMTP_SSL
        self.from_email = settings.EMAILS_FROM_EMAIL or (self.user if self.user else "notifications@hirely.ai")
        self.from_name = settings.EMAILS_FROM_NAME or "Hirely AI"
        self.enabled = settings.SMTP_ENABLED

    @property
    def is_resend_configured(self) -> bool:
        """Checks whether Resend is configured for live API delivery."""
        return bool(self.resend_enabled and self.resend_api_key and self.resend_from_email)

    @property
    def is_smtp_configured(self) -> bool:
        """Checks if real SMTP credentials are provided for fallback delivery."""
        return bool(self.enabled and self.host and self.user and self.password)

    @property
    def is_configured(self) -> bool:
        """Checks whether any live email provider is configured."""
        return self.is_resend_configured or self.is_smtp_configured

    @property
    def provider_mode(self) -> str:
        """Returns the active provider and fallback state."""
        if self.is_resend_configured:
            return "resend"
        if self.is_smtp_configured:
            return "smtp"
        return "simulated"

    async def _send_resend(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str
    ) -> Dict[str, Any]:
        """Send an email through the Resend HTTP API."""
        response_payload = {
            "from": self.resend_from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        headers = {
            "Authorization": f"Bearer {self.resend_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers=headers,
                json=response_payload,
            )

        if response.is_error:
            detail = response.text[:500]
            raise RuntimeError(f"Resend API returned HTTP {response.status_code}: {detail}")

        result = response.json()
        return {
            "success": True,
            "message": "Email transmitted successfully via Resend",
            "provider_id": result.get("id"),
        }

    def _send_smtp_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str
    ) -> Dict[str, Any]:
        """Synchronous SMTP transport logic executed in a separate worker thread."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email

        # Attach text then HTML alternative
        part_text = MIMEText(text_content, "plain", "utf-8")
        part_html = MIMEText(html_content, "html", "utf-8")
        msg.attach(part_text)
        msg.attach(part_html)

        if self.ssl:
            with smtplib.SMTP_SSL(self.host, self.port) as server:
                server.login(self.user, self.password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(self.host, self.port) as server:
                server.ehlo()
                if self.tls:
                    server.starttls()
                    server.ehlo()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.send_message(msg)

        return {"success": True, "message": f"Email delivered to {to_email} via SMTP"}

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> EmailSendResponse:
        """
        Dispatches an email to the recipient.
        Uses Resend first, falls back to SMTP, and simulates when neither is configured.
        Never leaks hostnames or passwords in client-visible responses.
        """
        if not text_content:
            text_content = "Please view this email in an HTML-compatible email client."

        # Resend is the primary transport
        if self.is_resend_configured:
            try:
                result = await self._send_resend(
                    to_email,
                    subject,
                    html_content,
                    text_content,
                )
                logger.info(f"[RESEND LIVE] Sent email to {to_email} with subject '{subject}'")
                return EmailSendResponse(
                    success=True,
                    recipient=to_email,
                    subject=subject,
                    mode="resend",
                    message="Email transmitted successfully via Resend delivery.",
                    details={
                        "provider": "resend",
                        "provider_id": result.get("provider_id"),
                        "from_email": self.resend_from_email,
                    }
                )
            except Exception as resend_error:
                logger.error(f"[RESEND ERROR] Failed sending to {to_email}: {resend_error}")
                if not self.is_smtp_configured:
                    return EmailSendResponse(
                        success=False,
                        recipient=to_email,
                        subject=subject,
                        mode="resend",
                        message="Email delivery service encountered an issue. Please verify Resend credentials.",
                        details={"provider": "resend"}
                    )
                logger.warning("[RESEND FALLBACK] Falling back to SMTP delivery")

        # SMTP fallback or simulation mode
        if not self.is_smtp_configured:
            logger.info(f"[EMAIL SIMULATION] To: {to_email} | Subject: '{subject}' | Mode: Simulated")
            return EmailSendResponse(
                success=True,
                recipient=to_email,
                subject=subject,
                mode="simulated",
                message="Email queued and simulated successfully (no live mail provider configured).",
                details={
                    "provider": "simulated",
                    "from_email": self.from_email,
                    "simulated": True
                }
            )

        # Live SMTP Mode
        try:
            res = await asyncio.to_thread(
                self._send_smtp_sync,
                to_email,
                subject,
                html_content,
                text_content
            )
            logger.info(f"[SMTP LIVE] Sent email to {to_email} with subject '{subject}'")
            return EmailSendResponse(
                success=True,
                recipient=to_email,
                subject=subject,
                mode="live",
                message=res.get("message", "Email delivered successfully via SMTP."),
                details={"provider": "smtp", "from_email": self.from_email}
            )
        except smtplib.SMTPAuthenticationError as auth_err:
            logger.error(f"[SMTP AUTH ERROR] Failed sending to {to_email}: {auth_err}")
            return EmailSendResponse(
                success=False,
                recipient=to_email,
                subject=subject,
                mode="live",
                message="SMTP authentication failed. Please verify mailbox username and password."
            )
        except Exception as exc:
            logger.error(f"[SMTP ERROR] Failed sending to {to_email}: {exc}")
            return EmailSendResponse(
                success=False,
                recipient=to_email,
                subject=subject,
                mode="live",
                message="SMTP transmission failed. Please verify mail server configuration."
            )

    # -------------------------------------------------------------------------
    # Template Builders (Teammate's Intended Design)
    # -------------------------------------------------------------------------

    def build_welcome_email(
        self,
        user: UserProfile | UserProfileBase | Dict[str, Any]
    ) -> Tuple[str, str, str]:
        """
        Builds a welcome email with Hirely dark spatial branding.
        Returns: (subject, html_content, text_content)
        """
        name = getattr(user, "name", None) or (user.get("name") if isinstance(user, dict) else "Developer")
        target_role = getattr(user, "target_role", None) or (user.get("target_role") if isinstance(user, dict) else "Software Engineer")
        experience = getattr(user, "experience_level", None) or (user.get("experience_level") if isinstance(user, dict) else "Student")
        locations = getattr(user, "preferred_locations", None) or (user.get("preferred_locations") if isinstance(user, dict) else ["Remote"]) or ["Remote"]
        locations_str = ", ".join(locations) if isinstance(locations, list) else str(locations)
        skills = getattr(user, "skills", None) or (user.get("skills") if isinstance(user, dict) else []) or []

        subject = f"🚀 Welcome to Hirely AI, {name}! Your Career Co-Pilot is Ready"

        skills_pills_html = "".join([
            f'<span style="display:inline-block;background-color:#1e293b;border:1px solid #334155;color:#e2e8f0;font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px;margin:3px 4px 3px 0;">{s}</span>'
            for s in skills[:8]
        ]) if skills else '<span style="color:#94a3b8;font-size:13px;">No skills added yet</span>'

        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hirely AI</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#131b2e;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <!-- Top Accent Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #10b981 0%, #6366f1 50%, #8b5cf6 100%);height:6px;"></td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px 40px;text-align:center;">
              <div style="display:inline-block;background-color:#1e293b;border:1px solid #334155;border-radius:12px;padding:10px 18px;margin-bottom:16px;">
                <span style="font-size:22px;vertical-align:middle;">🚀</span>
                <span style="font-size:18px;font-weight:700;color:#f8fafc;letter-spacing:-0.5px;margin-left:6px;vertical-align:middle;">Hirely AI</span>
              </div>
              <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 10px 0;line-height:1.3;">Welcome aboard, {name}!</h1>
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0;">
                Your career & hackathon co-pilot is officially active. We use <strong>TinyFish AI Web Agents</strong> to autonomously scan, match, and curate the best opportunities tailored specifically for you.
              </p>
            </td>
          </tr>
          <!-- Profile Snapshot Card -->
          <tr>
            <td style="padding:0 40px 28px 40px;">
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:22px;">
                <div style="font-size:12px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">
                  ⚡ Your Active AI Matching Profile
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#cbd5e1;">
                  <tr>
                    <td style="padding:6px 0;width:35%;color:#64748b;font-weight:600;">Target Role:</td>
                    <td style="padding:6px 0;color:#f1f5f9;font-weight:600;">{target_role}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-weight:600;">Experience Level:</td>
                    <td style="padding:6px 0;color:#f1f5f9;">{experience}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-weight:600;">Preferred Location:</td>
                    <td style="padding:6px 0;color:#f1f5f9;">{locations_str}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 4px 0;color:#64748b;font-weight:600;vertical-align:top;">Skills Indexed:</td>
                    <td style="padding:10px 0 4px 0;">{skills_pills_html}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <!-- Features -->
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <h3 style="color:#f8fafc;font-size:16px;font-weight:700;margin:0 0 16px 0;">How Hirely AI works for you:</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <div style="display:flex;align-items:flex-start;">
                      <div style="background-color:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 12px;font-size:16px;margin-right:14px;">🌐</div>
                      <div>
                        <strong style="color:#e2e8f0;font-size:14px;display:block;">Autonomous TinyFish Discovery</strong>
                        <span style="color:#94a3b8;font-size:13px;line-height:1.5;">Our agents search real-time career pages, job boards, and hackathon platforms for newly published listings.</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <div style="display:flex;align-items:flex-start;">
                      <div style="background-color:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 12px;font-size:16px;margin-right:14px;">🎯</div>
                      <div>
                        <strong style="color:#e2e8f0;font-size:14px;display:block;">Weighted Matching Engine</strong>
                        <span style="color:#94a3b8;font-size:13px;line-height:1.5;">Every role is scored based on your skills, experience, and domain interests so you only see high-affinity matches.</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="display:flex;align-items:flex-start;">
                      <div style="background-color:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 12px;font-size:16px;margin-right:14px;">📬</div>
                      <div>
                        <strong style="color:#e2e8f0;font-size:14px;display:block;">Intelligent Morning Briefings</strong>
                        <span style="color:#94a3b8;font-size:13px;line-height:1.5;">Receive actionable email alerts when a match is detected with high acceptance probability.</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 36px 40px;text-align:center;">
              <a href="{settings.FRONTEND_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #10b981 0%, #6366f1 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;box-shadow:0 10px 25px rgba(99,102,241,0.4);">
                Explore Your Opportunities &rarr;
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a;border-top:1px solid #1e293b;padding:24px 40px;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0 0 6px 0;">
                Hirely AI &bull; Autonomous Career & Hackathon Discovery Platform
              </p>
              <p style="color:#475569;font-size:11px;margin:0;">
                You received this email because you created an account on Hirely AI.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text = f"""Welcome to Hirely AI, {name}!
Target Role: {target_role} | Experience: {experience} | Location: {locations_str}
Skills: {", ".join(skills) if skills else "None listed"}

Your AI Career Co-Pilot is active. We autonomously discover and match relevant jobs, internships, and hackathons using TinyFish AI Agents.

Explore your matched opportunities: {settings.FRONTEND_URL}
"""
        return subject, html, text

    def build_opportunity_email(
        self,
        user: UserProfile | UserProfileBase | Dict[str, Any],
        opportunities: List[Dict[str, Any]],
        is_test: bool = False
    ) -> Tuple[str, str, str]:
        """
        Builds a personalized opportunity alert email showcasing matched jobs,
        internships, and hackathons tailored to the user's profile.
        Follows the teammate's exact dark spatial design.
        Returns: (subject, html_content, text_content)
        """
        name = getattr(user, "name", None) or (user.get("name") if isinstance(user, dict) else "Developer")
        target_role = getattr(user, "target_role", None) or (user.get("target_role") if isinstance(user, dict) else "Software Engineer")
        skills = getattr(user, "skills", None) or (user.get("skills") if isinstance(user, dict) else []) or []
        count = len(opportunities)

        if is_test:
            subject = f"🧪 [Test Digest Preview] {count} Opportunities Matched for {name} ({target_role}) - Hirely AI"
        else:
            subject = f"🎯 {count} Top Career Opportunities Handpicked for Your Profile ({target_role}) - Hirely AI"

        cards_html = ""
        cards_text = ""

        TYPE_COLORS = {
            "job": {"bg": "#064e3b", "color": "#34d399", "label": "Job"},
            "internship": {"bg": "#1e3a8a", "color": "#60a5fa", "label": "Internship"},
            "hackathon": {"bg": "#581c87", "color": "#c084fc", "label": "Hackathon"},
            "scholarship": {"bg": "#1e3a8a", "color": "#60a5fa", "label": "Scholarship"},
            "fellowship": {"bg": "#312e81", "color": "#a5b4fc", "label": "Fellowship"}
        }

        for idx, item in enumerate(opportunities):
            opp = item.get("opportunity") if "opportunity" in item else item
            match_score = item.get("match_score", 85)
            match_tier = item.get("match_tier", "Strong Match")
            match_reasons = item.get("match_reasons", [])
            matched_skills = item.get("matched_skills", [])

            raw_type = (opp.get("type") or opp.get("category", "job")).lower()
            type_meta = TYPE_COLORS.get(raw_type, {"bg": "#334155", "color": "#cbd5e1", "label": raw_type.capitalize()})

            title = opp.get("title", "Opportunity")
            org = opp.get("organization", "Company")
            loc = opp.get("location", "Remote")
            is_remote = opp.get("is_remote", opp.get("isRemote", True))
            remote_tag = '<span style="background-color:#1e293b;color:#a5b4fc;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;margin-left:6px;">🌐 Remote</span>' if is_remote else ''

            compensation = opp.get("compensation") or opp.get("stipend") or opp.get("stipendOrAward") or "Competitive / Disclosed on site"
            url = opp.get("url", "https://hirely.ai")
            deadline = opp.get("deadline") or opp.get("deadlineFormatted") or "Open / Rolling"
            summary_snippet = opp.get("summary") or opp.get("description", "")[:180] + "..."

            # Score color
            score_color = "#10b981" if match_score >= 85 else ("#3b82f6" if match_score >= 70 else "#f59e0b")

            matched_skills_html = "".join([
                f'<span style="display:inline-block;background-color:#1e293b;border:1px solid #334155;color:#e2e8f0;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;margin:2px 4px 2px 0;">{s}</span>'
                for s in (matched_skills[:5] if matched_skills else (opp.get("key_skills") or opp.get("required_skills") or [])[:5])
            ])

            reasons_html = "".join([
                f'<li style="color:#94a3b8;font-size:12px;margin-bottom:3px;">✓ {r}</li>'
                for r in match_reasons[:2]
            ]) if match_reasons else ""

            cards_html += f"""
            <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:16px;">
              <!-- Header Row -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td align="left">
                    <span style="background-color:{type_meta['bg']};color:{type_meta['color']};font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;">
                      {type_meta['label']}
                    </span>
                    {remote_tag}
                  </td>
                  <td align="right">
                    <span style="background-color:#1e293b;border:1px solid {score_color};color:{score_color};font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;">
                      🔥 {match_score}% Match • {match_tier}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Title & Org -->
              <h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 4px 0;line-height:1.3;">
                {title}
              </h2>
              <div style="color:#818cf8;font-size:13px;font-weight:600;margin-bottom:10px;">
                {org} &bull; <span style="color:#94a3b8;font-weight:400;">{loc}</span>
              </div>

              <!-- Compensation & Deadline -->
              <div style="background-color:#131c31;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#cbd5e1;">
                <strong>Compensation/Prizes:</strong> {compensation} &nbsp;|&nbsp; <strong>Deadline:</strong> {deadline}
              </div>

              <!-- Brief summary -->
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 12px 0;">
                {summary_snippet}
              </p>

              <!-- Matched Skills -->
              <div style="margin-bottom:10px;">
                <span style="color:#64748b;font-size:11px;font-weight:600;display:block;margin-bottom:4px;text-transform:uppercase;">Matched Skills:</span>
                {matched_skills_html}
              </div>

              <!-- Match Reasons -->
              {f'<ul style="margin:0 0 14px 0;padding-left:16px;">{reasons_html}</ul>' if reasons_html else ''}

              <!-- Apply CTA Button -->
              <div style="text-align:right;">
                <a href="{url}" target="_blank" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 18px;border-radius:8px;">
                  View Official Listing & Apply &rarr;
                </a>
              </div>
            </div>
            """

            cards_text += f"""
[{type_meta['label']}] {title} at {org}
Match Score: {match_score}% ({match_tier})
Location: {loc} (Remote: {is_remote})
Compensation: {compensation} | Deadline: {deadline}
URL: {url}
----------------------------------------"""

        test_banner_html = """
          <!-- Test Digest Indicator -->
          <tr>
            <td style="padding:16px 40px 0 40px;">
              <div style="background-color:#1e1b4b;border:1px solid #4338ca;border-radius:10px;padding:12px 16px;text-align:center;">
                <span style="color:#c7d2fe;font-size:12px;font-weight:600;">
                  🧪 Verified Test Digest Preview &bull; Sent on-demand from your Settings workspace
                </span>
              </div>
            </td>
          </tr>
        """ if is_test else ""

        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hirely AI Opportunities</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#131b2e;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <!-- Top Accent Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #10b981 0%, #6366f1 50%, #8b5cf6 100%);height:6px;"></td>
          </tr>
          {test_banner_html}
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 20px 40px;text-align:center;">
              <div style="display:inline-block;background-color:#1e293b;border:1px solid #334155;border-radius:12px;padding:8px 16px;margin-bottom:12px;">
                <span style="font-size:20px;vertical-align:middle;">🎯</span>
                <span style="font-size:16px;font-weight:700;color:#f8fafc;margin-left:6px;vertical-align:middle;">
                  {'Hirely AI · Test Digest Preview' if is_test else 'Hirely AI Opportunity Digest'}
                </span>
              </div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px 0;line-height:1.3;">
                Fresh Matches for {name}
              </h1>
              <p style="color:#94a3b8;font-size:14px;line-height:1.5;margin:0;">
                Our <strong>TinyFish AI crawler</strong> identified <strong>{count}</strong> high-affinity opportunities matching your target role of <strong>{target_role}</strong> and core skills ({", ".join(skills[:3]) if skills else "software engineering"}).
              </p>
            </td>
          </tr>
          <!-- Opportunities List -->
          <tr>
            <td style="padding:0 30px 24px 30px;">
              {cards_html}
            </td>
          </tr>
          <!-- Bottom CTA -->
          <tr>
            <td style="padding:0 40px 36px 40px;text-align:center;">
              <div style="background-color:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:18px;margin-bottom:20px;">
                <span style="color:#cbd5e1;font-size:13px;display:block;margin-bottom:10px;">
                  Looking for more custom opportunities or want AI to summarize job descriptions?
                </span>
                <a href="{settings.FRONTEND_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;">
                  Open Hirely AI Dashboard &rarr;
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a;border-top:1px solid #1e293b;padding:24px 40px;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0 0 6px 0;">
                Hirely AI &bull; Autonomous Career & Hackathon Discovery Platform
              </p>
              <p style="color:#475569;font-size:11px;margin:0;">
                Personalized digest sent to {getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else "your email")} based on your active skills profile.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text = f"""🎯 Fresh Opportunities for {name} ({target_role})
Our TinyFish AI crawler discovered {count} high-scoring opportunities matching your skills:
{cards_text}

Visit your Hirely AI dashboard to view all active opportunities: {settings.FRONTEND_URL}"""

        return subject, html, text

    async def send_welcome_email(
        self,
        user: UserProfile | UserProfileBase | Dict[str, Any]
    ) -> EmailSendResponse:
        """Sends a welcome email to the user upon signup/onboarding."""
        to_email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
        if not to_email:
            return EmailSendResponse(
                success=False,
                recipient="unknown",
                subject="Welcome to Hirely AI",
                mode="simulated" if not self.is_configured else "live",
                message="Cannot send welcome email: user has no valid email address."
            )

        subject, html, text = self.build_welcome_email(user)
        return await self.send_email(to_email=to_email, subject=subject, html_content=html, text_content=text)

    async def send_opportunity_recommendations_email(
        self,
        user: UserProfile | UserProfileBase | Dict[str, Any],
        opportunities: Optional[List[Dict[str, Any]]] = None,
        use_tinyfish: bool = True,
        opportunity_type: Optional[str] = None,
        limit: int = 5,
        db_opportunities: Optional[List[Dict[str, Any]]] = None,
        is_test: bool = False
    ) -> EmailSendResponse:
        """
        Discovers, matches, and sends an opportunity recommendation digest email
        tailored to the user's profile using TinyFish and the matching engine.
        """
        to_email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
        if not to_email:
            return EmailSendResponse(
                success=False,
                recipient="unknown",
                subject="Opportunity Alert",
                mode="simulated" if not self.is_configured else "live",
                message="Cannot send opportunity email: user has no valid email address."
            )

        target_role = getattr(user, "target_role", "Software Engineer") or "Software Engineer"
        skills = getattr(user, "skills", []) or []

        # If specific opportunities were not passed in, discover them autonomously
        if opportunities is None:
            all_candidate_opps = list(MOCK_OPPORTUNITIES)
            seen_ids = {o["id"] for o in all_candidate_opps}

            # 1. Use TinyFish AI live search tailored to user profile
            if use_tinyfish:
                query_skills = " ".join(skills[:3]) if skills else "developer"
                search_query = f"{target_role} {query_skills}".strip()
                try:
                    tf_results = await tinyfish_client.search(
                        query=search_query,
                        purpose=f"Matching career and hackathon opportunities for a {target_role} specializing in {query_skills}",
                        limit=20
                    )
                    for item in tf_results:
                        if item["id"] not in seen_ids:
                            seen_ids.add(item["id"])
                            all_candidate_opps.append(item)
                except Exception as e:
                    logger.warning(f"TinyFish search failed during email recommendation generation: {e}")

            # 2. Add any additional database opportunities passed in
            if db_opportunities:
                for opp in db_opportunities:
                    if opp["id"] not in seen_ids:
                        seen_ids.add(opp["id"])
                        all_candidate_opps.append(opp)

            # 3. Filter by opportunity_type if requested
            if opportunity_type:
                all_candidate_opps = [o for o in all_candidate_opps if o.get("type", "").lower() == opportunity_type.lower()]

            # 4. Rank candidates using matching_service
            ranked = matching_service.rank_opportunities(user, all_candidate_opps, limit=limit)
            opportunities = ranked[:limit]

        if not opportunities:
            # Fallback to top curated opportunities if none matched
            opportunities = [
                {
                    "opportunity": opp,
                    "match_score": 80,
                    "match_tier": "Good Match",
                    "match_reasons": ["Relevant opportunity in catalog"],
                    "matched_skills": skills[:2]
                }
                for opp in MOCK_OPPORTUNITIES[:limit]
            ]

        subject, html, text = self.build_opportunity_email(user, opportunities, is_test=is_test)
        res = await self.send_email(to_email=to_email, subject=subject, html_content=html, text_content=text)
        res.items_count = len(opportunities)
        return res


email_service = EmailService()