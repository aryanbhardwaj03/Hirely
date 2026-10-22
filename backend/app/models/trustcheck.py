from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class TrustAssessment(Base):
    __tablename__ = "trust_assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    opportunity_id = Column(String(100), unique=True, index=True, nullable=False)
    
    # "verified", "suspicious", "unverified"
    status = Column(String(50), nullable=False, default="unverified", index=True)
    status_label = Column(String(100), nullable=False, default="Unverified")
    score = Column(Integer, nullable=False, default=50)  # 0 to 100
    
    # Structured evidence breakdown
    verified_facts = Column(JSON, default=list)
    risk_indicators = Column(JSON, default=list)
    missing_information = Column(JSON, default=list)
    evidence_urls = Column(JSON, default=list)
    
    explanation = Column(Text, nullable=False, default="")
    
    # Deep metadata
    organizer_details = Column(JSON, default=dict)
    financial_details = Column(JSON, default=dict)
    eligibility_details = Column(JSON, default=dict)
    
    source_domain = Column(String(255), nullable=True)
    is_official_domain = Column(Boolean, default=False)
    disclaimer = Column(
        Text, 
        default="TrustCheck evaluations are synthesized from public web evidence. A verified status reflects supporting source alignment, not an absolute guarantee. Suspicious flags indicate items requiring independent scrutiny."
    )
    
    rechecked_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ScamReport(Base):
    __tablename__ = "scam_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    opportunity_id = Column(String(100), index=True, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)
    
    # Reason: e.g. "Upfront payment requested", "Impersonating organization", "Phishing domain", "Unrealistic promises"
    reason = Column(String(150), nullable=False)
    details = Column(Text, nullable=False)
    contact_email = Column(String(255), nullable=True)
    
    # "pending", "reviewed", "confirmed_scam", "dismissed"
    status = Column(String(50), default="pending", index=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
