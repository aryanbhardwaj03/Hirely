from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ApplicationTracker(Base):
    __tablename__ = "application_tracker"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    opportunity_id = Column(String(100), nullable=False)
    opportunity_title = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=False)
    opportunity_type = Column(String(50), nullable=False)  # job, internship, hackathon
    url = Column(String(500), nullable=False)
    
    # Status: "saved", "applied", "interviewing", "accepted", "rejected"
    status = Column(String(50), default="saved", index=True)
    notes = Column(Text, nullable=True, default="")
    
    applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
