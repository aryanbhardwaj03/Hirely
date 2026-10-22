from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON, Boolean
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(String(100), primary_key=True, index=True)  # slug or unique hash
    type = Column(String(50), nullable=False, index=True)    # "job", "internship", "hackathon"
    title = Column(String(255), nullable=False, index=True)
    organization = Column(String(255), nullable=False, index=True)  # company or organizer name
    location = Column(String(255), nullable=False, default="Remote")
    is_remote = Column(Boolean, default=True)
    url = Column(String(500), nullable=False)
    
    description = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)  # AI-generated summary
    
    # Required or relevant skills: ["Python", "FastAPI", "React"]
    key_skills = Column(JSON, default=list)
    
    experience_level = Column(String(50), nullable=False, default="Any")  # Student, Entry-Level, Junior, etc.
    compensation = Column(String(150), nullable=True)  # e.g., "$90,000 - $120,000", "$10,000 Prize Pool", "$35/hr"
    deadline = Column(String(100), nullable=True)      # e.g. "Nov 15, 2026", "Rolling"
    source = Column(String(100), default="AI search")   # "AI Search", "Curated", "Web Agent"
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
