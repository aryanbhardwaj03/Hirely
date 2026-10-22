from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean, Float
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    planning_period_start = Column(String(50), nullable=False)
    planning_period_end = Column(String(50), nullable=False)
    
    # Map of weekday -> available hours (e.g. {"monday": 3.0, "tuesday": 2.5, ...})
    available_hours_per_day = Column(JSON, default=dict)
    
    # List of commitments/blocked periods: [{"day": "wednesday", "title": "Midterm Exam", "hours": 3.0, "time_range": "14:00 - 17:00"}]
    commitments = Column(JSON, default=list)
    
    # Category priorities: ["internship", "hackathon"]
    priorities = Column(JSON, default=list)
    
    # Transparent reasoning on how the plan was generated
    summary_explanation = Column(Text, nullable=False, default="")
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ActionPlanTask(Base):
    __tablename__ = "action_plan_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("action_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    
    opportunity_id = Column(String(100), nullable=False, index=True)
    opportunity_title = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=False)
    opportunity_type = Column(String(50), nullable=False)
    opportunity_url = Column(String(500), nullable=False)
    
    # Trust status snapshot at plan creation: "verified", "unverified", "suspicious"
    trust_status = Column(String(50), default="unverified")
    deadline = Column(String(100), nullable=True)
    
    task_title = Column(String(255), nullable=False)
    task_type = Column(String(50), default="application")  # application, preparation, team_setup, essay
    
    scheduled_day = Column(String(20), nullable=False)  # monday, tuesday, etc.
    scheduled_date = Column(String(50), nullable=False)
    time_slot = Column(String(50), nullable=False)  # e.g. "18:00 - 20:00"
    
    estimated_hours = Column(Float, nullable=False, default=2.0)
    is_estimate = Column(Boolean, default=True)
    
    priority_rank = Column(Integer, default=1)
    # Status: "pending", "completed", "rescheduled", "removed"
    status = Column(String(50), default="pending", index=True)
    
    match_reason = Column(Text, nullable=True, default="")
    eligibility_summary = Column(Text, nullable=True, default="")
    notes = Column(Text, nullable=True, default="")
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
