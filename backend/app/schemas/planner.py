from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class CommitmentItem(BaseModel):
    day: str = Field(..., description="Day of week (lowercase: monday, tuesday, etc.)")
    title: str = Field(..., description="Title of commitment (e.g. OS Midterm Exam, Algorithms Lab)")
    hours: float = Field(..., ge=0.25, le=24.0, description="Hours occupied")
    time_range: Optional[str] = Field(None, description="e.g. '14:00 - 17:00'")


class GeneratePlanRequest(BaseModel):
    user_id: Optional[int] = Field(None, description="User ID if logged in")
    planning_period_days: int = Field(default=7, ge=1, le=14, description="Planning horizon in days")
    # Available daily hours map: {"monday": 3.0, "tuesday": 2.5, ...}
    available_hours_per_day: Optional[Dict[str, float]] = Field(
        default=None, 
        description="Hours student can dedicate per day of the week"
    )
    commitments: Optional[List[CommitmentItem]] = Field(
        default=None, 
        description="Existing commitments or blocked time slots"
    )
    preferred_categories: Optional[List[str]] = Field(
        default=None, 
        description="Preferred categories to prioritize: job, internship, hackathon, scholarship"
    )
    target_skills: Optional[List[str]] = Field(
        default=None, 
        description="Specific skills to focus on during planning"
    )


class ActionPlanTaskResponse(BaseModel):
    id: int
    plan_id: int
    user_id: int
    opportunity_id: str
    opportunity_title: str
    organization: str
    opportunity_type: str
    opportunity_url: str
    trust_status: str
    deadline: Optional[str] = None
    task_title: str
    task_type: str
    scheduled_day: str
    scheduled_date: str
    time_slot: str
    estimated_hours: float
    is_estimate: bool = True
    priority_rank: int
    status: str
    match_reason: Optional[str] = ""
    eligibility_summary: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RankedOpportunityItem(BaseModel):
    opportunity_id: str
    title: str
    organization: str
    type: str
    url: str
    trust_status: str
    trust_score: int
    match_score: int
    composite_rank_score: float
    deadline: Optional[str] = None
    estimated_hours: float
    ranking_rationale: str
    is_scheduled: bool


class ExcludedOpportunityItem(BaseModel):
    opportunity_id: str
    title: str
    organization: str
    type: str
    trust_status: str
    exclusion_reason: str


class ActionPlanResponse(BaseModel):
    id: int
    user_id: int
    planning_period_start: str
    planning_period_end: str
    available_hours_per_day: Dict[str, float]
    used_hours_per_day: Dict[str, float]
    commitments: List[Dict[str, Any]]
    tasks: List[ActionPlanTaskResponse]
    shortlist_ranked: List[RankedOpportunityItem]
    excluded_opportunities: List[ExcludedOpportunityItem]
    summary_explanation: str
    total_hours_allocated: float
    total_hours_available: float
    has_capacity_limits: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TaskStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="'pending', 'completed', 'rescheduled', or 'removed'")
    scheduled_day: Optional[str] = None
    time_slot: Optional[str] = None
    estimated_hours: Optional[float] = None
    notes: Optional[str] = None
    sync_to_tracker: bool = Field(default=False, description="Whether to also update Hirely Application Tracker")
