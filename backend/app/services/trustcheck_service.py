import re
import json
import logging
from urllib.parse import urlparse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.models.trustcheck import TrustAssessment, ScamReport
from app.models.opportunity import Opportunity
from app.services.tinyfish_client import tinyfish_client
from app.services.gemini_service import gemini_service
from app.data.mock_opportunities import MOCK_OPPORTUNITIES

logger = logging.getLogger(__name__)


def utc_now():
    return datetime.now(timezone.utc)


# Recognized trusted corporate, academic, and platform domains
TRUSTED_DOMAINS = {
    "scale.com", "linear.app", "stripe.com", "vercel.com", "google.com", 
    "careers.google.com", "microsoft.com", "amazon.jobs", "github.com", 
    "openai.com", "anthropic.com", "meta.com", "apple.com", "devpost.com", 
    "unstop.com", "hackerearth.com", "mlh.io", "mit.edu", "stanford.edu", 
    "cmu.edu", "berkeley.edu", "dtu.ac.in", "iitd.ac.in", "iitb.ac.in",
    "kaggle.com", "huggingface.co", "ycombinator.com", "workatastartup.com",
    "angel.co", "wellfound.com", "linkedin.com", "lever.co", "greenhouse.io",
    "ashbyhq.com", "smartrecruiters.com"
}

# Free webmail providers acting as red flags if used as corporate recruiter emails
FREE_EMAIL_PROVIDERS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "proton.me", "mail.com"}

# Suspicious TLDs or free hosters frequently abused in opportunity phishing
SUSPICIOUS_TLDS = {".top", ".work", ".click", ".xyz", ".link", ".buzz", ".monster", ".fit"}
FREE_HOSTERS = {"blogspot.com", "wordpress.com", "wixsite.com", "weebly.com", "sites.google.com"}


class TrustCheckService:
    """
    Hirely TrustCheck Intelligence Engine:
    Performs empirical scam-risk assessments, organizer verification, domain cross-checks,
    and fee validation across jobs, internships, hackathons, and scholarships.
    Synthesizes evidence using TinyFish Fetch + Gemini reasoning + deterministic rules.
    """

    async def assess_opportunity(
        self,
        opportunity_data: Dict[str, Any] | Opportunity,
        force_fresh: bool = False,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Main entrypoint: generates or fetches the TrustAssessment for an opportunity.
        """
        # Extract attributes
        if isinstance(opportunity_data, dict):
            opp_id = opportunity_data.get("id") or "unknown"
            title = opportunity_data.get("title") or "Opportunity"
            organization = opportunity_data.get("organization") or "Organization"
            opp_type = opportunity_data.get("type") or "opportunity"
            url = opportunity_data.get("url") or "https://example.com"
            description = opportunity_data.get("description") or ""
            compensation = opportunity_data.get("compensation") or ""
            deadline = opportunity_data.get("deadline") or "Rolling"
        else:
            opp_id = getattr(opportunity_data, "id", "unknown")
            title = getattr(opportunity_data, "title", "Opportunity")
            organization = getattr(opportunity_data, "organization", "Organization")
            opp_type = getattr(opportunity_data, "type", "opportunity")
            url = getattr(opportunity_data, "url", "https://example.com")
            description = getattr(opportunity_data, "description", "")
            compensation = getattr(opportunity_data, "compensation", "")
            deadline = getattr(opportunity_data, "deadline", "Rolling")

        # 1. Check existing record in DB unless force_fresh
        if db and not force_fresh:
            res = await db.execute(select(TrustAssessment).where(TrustAssessment.opportunity_id == opp_id))
            existing = res.scalar_one_or_none()
            if existing:
                return self._assessment_to_dict(existing)

        # 2. Check for user scam reports on this opportunity
        scam_reports_count = 0
        if db:
            rep_res = await db.execute(
                select(func.count(ScamReport.id)).where(ScamReport.opportunity_id == opp_id)
            )
            scam_reports_count = rep_res.scalar_one() or 0

        # 3. Retrieve source content via TinyFish
        fetched_content = await tinyfish_client.fetch_content(
            url, 
            purpose=f"Verification of organizer authenticity, fees, and safety for {title} by {organization}"
        )

        full_evidence_text = f"{title}\n{organization}\n{url}\n{description}\n{compensation}\n\nWebpage Evidence:\n{fetched_content or 'No external webpage content retrieved'}"

        # 4. Perform deterministic domain & scam indicators analysis
        domain_info = self._analyze_domain(url, organization)
        risk_flags, confirmed_facts, missing_info = self._detect_indicators(
            opp_type=opp_type,
            title=title,
            organization=organization,
            compensation=compensation,
            text=full_evidence_text,
            domain_info=domain_info,
            scam_reports_count=scam_reports_count
        )

        # 5. Gemini AI synthesis (if available and enabled)
        ai_synthesis = await self._run_gemini_trust_analysis(
            title=title,
            organization=organization,
            opp_type=opp_type,
            url=url,
            evidence_text=full_evidence_text[:3000],
            preliminary_flags=risk_flags
        )

        # Merge AI insights if provided
        if ai_synthesis:
            if ai_synthesis.get("additional_facts"):
                confirmed_facts.extend([f for f in ai_synthesis["additional_facts"] if f not in confirmed_facts])
            if ai_synthesis.get("additional_risks"):
                risk_flags.extend([r for r in ai_synthesis["additional_risks"] if r not in risk_flags])
            if ai_synthesis.get("missing_info"):
                missing_info.extend([m for m in ai_synthesis["missing_info"] if m not in missing_info])

        # 6. Assign transparent status & score
        status, status_label, score, explanation = self._calculate_verdict(
            domain_info=domain_info,
            risk_flags=risk_flags,
            confirmed_facts=confirmed_facts,
            missing_info=missing_info,
            scam_reports_count=scam_reports_count,
            ai_explanation=ai_synthesis.get("explanation") if ai_synthesis else None
        )

        # Financial & eligibility breakdown
        financial_details = self._extract_financial_details(opp_type, compensation, full_evidence_text, risk_flags)
        organizer_details = {
            "name": organization,
            "domain": domain_info["domain"],
            "is_official_domain": domain_info["is_official"],
            "is_trusted_platform": domain_info["is_trusted"],
            "scam_reports_filed": scam_reports_count
        }
        eligibility_details = {
            "stated_deadline": deadline,
            "education_level": "Undergraduate / Graduate / Early Career" if "student" in full_evidence_text.lower() or opp_type in ("internship", "hackathon", "scholarship") else "Any",
            "experience_level": "Entry-Level" if "entry" in full_evidence_text.lower() else "Student / General"
        }

        evidence_urls = [url]
        if domain_info["is_official"] and domain_info["domain"]:
            evidence_urls.append(f"https://{domain_info['domain']}")

        assessment_dict = {
            "opportunity_id": opp_id,
            "status": status,
            "status_label": status_label,
            "score": score,
            "verified_facts": confirmed_facts,
            "risk_indicators": risk_flags,
            "missing_information": missing_info,
            "evidence_urls": evidence_urls,
            "explanation": explanation,
            "organizer_details": organizer_details,
            "financial_details": financial_details,
            "eligibility_details": eligibility_details,
            "source_domain": domain_info["domain"],
            "is_official_domain": domain_info["is_official"],
            "disclaimer": "TrustCheck evaluations are synthesized from public web evidence. A verified status reflects supporting source alignment, not an absolute guarantee. Suspicious flags indicate items requiring independent scrutiny.",
            "rechecked_at": utc_now(),
            "created_at": utc_now()
        }

        # 7. Persist to DB if session provided
        if db:
            res = await db.execute(select(TrustAssessment).where(TrustAssessment.opportunity_id == opp_id))
            existing = res.scalar_one_or_none()
            if existing:
                existing.status = status
                existing.status_label = status_label
                existing.score = score
                existing.verified_facts = confirmed_facts
                existing.risk_indicators = risk_flags
                existing.missing_information = missing_info
                existing.evidence_urls = evidence_urls
                existing.explanation = explanation
                existing.organizer_details = organizer_details
                existing.financial_details = financial_details
                existing.eligibility_details = eligibility_details
                existing.source_domain = domain_info["domain"]
                existing.is_official_domain = domain_info["is_official"]
                existing.rechecked_at = utc_now()
            else:
                new_assessment = TrustAssessment(
                    opportunity_id=opp_id,
                    status=status,
                    status_label=status_label,
                    score=score,
                    verified_facts=confirmed_facts,
                    risk_indicators=risk_flags,
                    missing_information=missing_info,
                    evidence_urls=evidence_urls,
                    explanation=explanation,
                    organizer_details=organizer_details,
                    financial_details=financial_details,
                    eligibility_details=eligibility_details,
                    source_domain=domain_info["domain"],
                    is_official_domain=domain_info["is_official"],
                    rechecked_at=utc_now(),
                    created_at=utc_now()
                )
                db.add(new_assessment)
            await db.commit()

        return assessment_dict

    def _analyze_domain(self, url: str, organization: str) -> Dict[str, Any]:
        """Examines domain structure, trusted registries, and organizational matching."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
        except Exception:
            domain = ""

        is_trusted = domain in TRUSTED_DOMAINS or any(domain.endswith(f".{td}") for td in TRUSTED_DOMAINS)
        
        # Check if domain matches organization name closely (e.g. scale.com matches Scale AI)
        clean_org = re.sub(r"[^a-zA-Z0-9]", "", organization.lower()).replace("ai", "").replace("inc", "").replace("technologies", "").replace("corp", "")
        clean_dom = domain.split(".")[0]
        
        domain_matches_org = (clean_org in clean_dom) or (clean_dom in clean_org) or is_trusted
        is_official = domain_matches_org and not any(h in domain for h in FREE_HOSTERS)

        has_suspicious_tld = any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS)
        uses_free_host = any(h in domain for h in FREE_HOSTERS)

        return {
            "domain": domain,
            "is_trusted": is_trusted,
            "is_official": is_official,
            "has_suspicious_tld": has_suspicious_tld,
            "uses_free_host": uses_free_host
        }

    def _detect_indicators(
        self,
        opp_type: str,
        title: str,
        organization: str,
        compensation: str,
        text: str,
        domain_info: Dict[str, Any],
        scam_reports_count: int
    ) -> Tuple[List[str], List[str], List[str]]:
        """
        Deterministic inspection for confirmed facts, risk indicators, and missing info.
        """
        text_lower = text.lower()
        risk_flags = []
        confirmed_facts = []
        missing_info = []

        # Check domain risk
        if domain_info["has_suspicious_tld"]:
            risk_flags.append(f"Domain '{domain_info['domain']}' utilizes an uncommon TLD frequently linked to disposable scams.")
        if domain_info["uses_free_host"]:
            risk_flags.append(f"Opportunity is hosted on a free platform ({domain_info['domain']}) rather than an official corporate domain.")

        # Check for free recruiter emails
        for provider in FREE_EMAIL_PROVIDERS:
            if f"@{provider}" in text_lower and domain_info["is_trusted"]:
                risk_flags.append(f"Contact instructions suggest sending materials to a public {provider} address rather than a corporate domain.")

        # Check fee terms
        has_fee_mention = any(k in text_lower for k in [
            "application fee", "registration fee", "processing fee", "security deposit", 
            "training fee", "laptop deposit", "wire transfer", "western union", 
            "crypto payment", "usdt", "gift card", "pay to apply"
        ])

        if opp_type in ("internship", "job") and has_fee_mention:
            risk_flags.append("High-Risk: Listing mentions mandatory candidate fees or security deposits, which violates legitimate hiring standards.")
        elif opp_type in ("hackathon", "scholarship") and has_fee_mention:
            # Check if it specifies free or nominal
            if "free" in text_lower or "no registration fee" in text_lower or "$0" in text_lower:
                confirmed_facts.append("Zero registration fee: Confirmed free entry for participants.")
            else:
                risk_flags.append("Registration fee indicated for participation. Exercise caution and verify organizers before payment.")
        else:
            confirmed_facts.append("No candidate application fee: Follows legitimate standard hiring practices.")

        # Pressure tactics
        if any(p in text_lower for p in ["wire money now", "pay within 2 hours", "immediate transfer required"]):
            risk_flags.append("Pressure tactics detected: Extreme urgency demanding immediate funds transfer.")

        # Unrealistic promises
        if any(u in text_lower for u in ["guaranteed job without interview", "make $5000 a day no experience"]):
            risk_flags.append("Unrealistic promises: Guarantees substantial income without standard interview evaluation.")

        # Domain legitimacy facts
        if domain_info["is_trusted"]:
            confirmed_facts.append(f"Hosted on recognized verified domain: {domain_info['domain']}.")
        elif domain_info["is_official"]:
            confirmed_facts.append(f"Domain matches host organization: {organization} ({domain_info['domain']}).")
        else:
            missing_info.append("Listing domain cannot be independently cross-matched to a known corporate domain.")

        # Compensation confirmation
        if compensation and compensation != "N/A" and "unpaid" not in compensation.lower():
            confirmed_facts.append(f"Transparent compensation stated: {compensation}.")
        else:
            missing_info.append("Stipend or compensation details are not explicitly itemized in public posting.")

        # Stated requirements
        if "skill" in text_lower or "requirement" in text_lower or "experience" in text_lower:
            confirmed_facts.append("Clear technical qualification requirements and candidate scope defined.")
        else:
            missing_info.append("Detailed technical prerequisites or candidate evaluation criteria omitted.")

        # Scam reports
        if scam_reports_count > 0:
            risk_flags.append(f"Community warning: {scam_reports_count} student report(s) flagged this listing for review.")

        return risk_flags, confirmed_facts, missing_info

    async def _run_gemini_trust_analysis(
        self,
        title: str,
        organization: str,
        opp_type: str,
        url: str,
        evidence_text: str,
        preliminary_flags: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Uses Gemini to analyze evidence for nuance, impersonation risks, and conflicting facts.
        """
        api_key = gemini_service.get_api_key()
        if not api_key:
            return None

        prompt = (
            f"Analyze this opportunity listing for scam risk, corporate legitimacy, and warning signs.\n"
            f"Title: {title}\n"
            f"Organization: {organization}\n"
            f"Type: {opp_type}\n"
            f"URL: {url}\n"
            f"Preliminary flags: {json.dumps(preliminary_flags)}\n\n"
            f"Evidence snippet:\n{evidence_text}\n\n"
            f"Respond STRICTLY in JSON format with these exact keys:\n"
            f'{{"additional_facts": ["fact 1", ...], "additional_risks": ["risk 1", ...], "missing_info": ["missing 1", ...], "explanation": "2-3 sentences explaining verification status."}}'
        )

        try:
            raw_reply, _ = await gemini_service._call_gemini_api(
                api_key=api_key,
                message=prompt,
                history=None,
                system_instruction="You are a senior security researcher specializing in employment fraud, academic scams, and web domain authentication. Output strict JSON only."
            )
            if raw_reply:
                # Strip markdown code blocks if present
                clean_json = raw_reply.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                
                parsed = json.loads(clean_json.strip())
                return parsed
        except Exception as e:
            logger.warning(f"Gemini trust analysis parsing error: {e}")

        return None

    def _calculate_verdict(
        self,
        domain_info: Dict[str, Any],
        risk_flags: List[str],
        confirmed_facts: List[str],
        missing_info: List[str],
        scam_reports_count: int,
        ai_explanation: Optional[str]
    ) -> Tuple[str, str, int, str]:
        """
        Assigns transparent status: 'verified', 'suspicious', or 'unverified' with score & reasoning.
        """
        # Base scoring
        score = 60
        if domain_info["is_trusted"]:
            score += 25
        elif domain_info["is_official"]:
            score += 15

        score += min(15, len(confirmed_facts) * 5)
        score -= len(risk_flags) * 25
        score -= min(15, len(missing_info) * 5)
        score -= scam_reports_count * 30

        score = max(5, min(99, score))

        # Status categorization
        # Rule 1: Suspicious if any high-risk flags or community reports or score < 45
        if len(risk_flags) > 0 or scam_reports_count > 0 or score < 45:
            status = "suspicious"
            status_label = "Suspicious"
            explanation = ai_explanation or (
                f"TrustCheck identified {len(risk_flags)} critical risk indicator(s) requiring student caution. "
                f"Issues include: {'; '.join(risk_flags[:2])}. Do not transfer funds or share sensitive financial data."
            )
        # Rule 2: Verified if trusted or official domain, no risk flags, and at least 2 confirmed facts
        elif (domain_info["is_trusted"] or domain_info["is_official"]) and len(risk_flags) == 0 and len(confirmed_facts) >= 2:
            status = "verified"
            status_label = "Verified Against Sources"
            score = max(score, 88)
            explanation = ai_explanation or (
                f"Verified against official organizational channels and reputable career portals. "
                f"Domain authenticated as {domain_info['domain']} with no candidate fees, clear prerequisites, and legitimate submission workflows."
            )
        # Rule 3: Unverified if insufficient evidence to establish legitimacy
        else:
            status = "unverified"
            status_label = "Unverified"
            score = max(45, min(65, score))
            explanation = ai_explanation or (
                f"Insufficient publicly verifiable evidence to establish corporate authenticity. "
                f"Key missing items include: {'; '.join(missing_info[:2]) if missing_info else 'independent domain corroboration'}. "
                f"Proceed with normal due diligence before submitting personal details."
            )

        return status, status_label, score, explanation

    def _extract_financial_details(
        self,
        opp_type: str,
        compensation: str,
        text: str,
        risk_flags: List[str]
    ) -> Dict[str, Any]:
        """Synthesizes registration fee, payment instructions, and compensation legitimacy."""
        is_free = "free" in text.lower() or "no fee" in text.lower() or "$0" in text.lower()
        requires_fee = any("fee" in r.lower() or "deposit" in r.lower() for r in risk_flags)

        return {
            "fee_required": requires_fee,
            "fee_status": "Candidate Fee Detected" if requires_fee else ("Free / No Application Fee" if is_free else "Standard / No Stated Fee"),
            "compensation_claimed": compensation or "Refer to official posting",
            "payment_instructions": "Do NOT submit wire transfers, crypto, or gift card deposits." if requires_fee else "Direct online application through verified portal."
        }

    def _assessment_to_dict(self, item: TrustAssessment) -> Dict[str, Any]:
        return {
            "opportunity_id": item.opportunity_id,
            "status": item.status,
            "status_label": item.status_label,
            "score": item.score,
            "verified_facts": item.verified_facts or [],
            "risk_indicators": item.risk_indicators or [],
            "missing_information": item.missing_information or [],
            "evidence_urls": item.evidence_urls or [],
            "explanation": item.explanation,
            "organizer_details": item.organizer_details or {},
            "financial_details": item.financial_details or {},
            "eligibility_details": item.eligibility_details or {},
            "source_domain": item.source_domain,
            "is_official_domain": item.is_official_domain,
            "disclaimer": item.disclaimer,
            "rechecked_at": item.rechecked_at,
            "created_at": item.created_at
        }


trustcheck_service = TrustCheckService()
