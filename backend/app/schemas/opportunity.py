from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class OpportunityBase(BaseModel):
    id: str
    type: str = Field(..., examples=["job"])  # "job", "internship", "hackathon"
    title: str = Field(..., examples=["AI Engineer"])
    organization: str = Field(..., examples=["Scale AI"])
    location: str = Field(default="Remote", examples=["Remote / San Francisco"])
    is_remote: bool = True
    url: str = Field(..., examples=["https://scale.com/careers/ai-engineer"])
    description: str
    summary: Optional[str] = None
    key_skills: List[str] = Field(default_factory=list, examples=[["Python", "PyTorch", "LLMs", "FastAPI"]])
    experience_level: str = Field(default="Any", examples=["Junior"])
    compensation: Optional[str] = Field(default=None, examples=["$110,000 - $145,000"])
    deadline: Optional[str] = Field(default=None, examples=["Rolling"])
    source: str = Field(default="AI search", examples=["AI Search"])
    trust_status: Optional[str] = Field(default="unverified", examples=["verified", "suspicious", "unverified"])
    trust_score: Optional[int] = Field(default=50, examples=[85])


class OpportunityResponse(OpportunityBase):
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SearchFilters(BaseModel):
    query: Optional[str] = Field(default=None, examples=["AI Agent"])
    opportunity_type: Optional[str] = Field(default="all", examples=["job"]) # "job", "internship", "hackathon", "all"
    location: Optional[str] = Field(default=None, examples=["Remote"])
    is_remote_only: Optional[bool] = False
    skills: Optional[List[str]] = Field(default=None, examples=[["Python", "React"]])
    experience_level: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)


class OpportunityMatchResult(BaseModel):
    opportunity: OpportunityResponse
    match_score: int = Field(..., ge=0, le=100, examples=[92])
    match_tier: str = Field(..., examples=["Exceptional Match"])  # Exceptional Match, Strong Match, Good Match, Relevant
    match_reasons: List[str] = Field(default_factory=list, examples=[["Matches 4 of your top skills: Python, FastAPI, Docker, LLMs", "Aligns with your desired role: AI Engineer", "Remote friendly"]])
    matched_skills: List[str] = Field(default_factory=list, examples=[["Python", "FastAPI", "Docker"]])
    missing_skills: List[str] = Field(default_factory=list, examples=[["PyTorch"]])


class RecommendationsResponse(BaseModel):
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    target_role: Optional[str] = None
    total_matches: int
    top_jobs: List[OpportunityMatchResult]
    top_internships: List[OpportunityMatchResult]
    top_hackathons: List[OpportunityMatchResult]
