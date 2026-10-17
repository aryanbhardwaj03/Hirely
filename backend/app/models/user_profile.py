from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    bio = Column(Text, nullable=True, default="")
    target_role = Column(String(150), nullable=False, default="Software Engineer")
    experience_level = Column(String(50), nullable=False, default="Student")  # Student, Entry-Level, Junior, Mid-Level, Senior
    
    # JSON list of skills, e.g. ["Python", "FastAPI", "React", "Docker", "Machine Learning"]
    skills = Column(JSON, default=list)
    
    # Preferred locations, e.g. ["Remote", "Bengaluru", "San Francisco"]
    preferred_locations = Column(JSON, default=lambda: ["Remote"])
    
    # Types interested in: ["job", "internship", "hackathon"]
    opportunity_types = Column(JSON, default=lambda: ["job", "internship", "hackathon"])
    
    # Interests / domains: ["AI/ML", "Web3", "Cloud", "Fintech", "Cybersecurity"]
    interests = Column(JSON, default=list)
    
    # Links
    github_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
