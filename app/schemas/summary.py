from typing import List, Optional
from pydantic import BaseModel, Field


class SummarizeUrlRequest(BaseModel):
    url: str = Field(..., examples=["https://devpost.com/hackathons/tinyfish-agent-hackathon"])
    opportunity_type: Optional[str] = Field(default="auto", examples=["hackathon"]) # job, internship, hackathon, auto
    user_skills: Optional[List[str]] = Field(default=None, examples=[["Python", "FastAPI", "React"]])


class SummarizeTextRequest(BaseModel):
    title: Optional[str] = Field(default="Opportunity Details", examples=["Full Stack Engineer"])
    text: str = Field(..., examples=["We are looking for a backend engineer proficient in Python, FastAPI, and Docker..."])
    opportunity_type: Optional[str] = Field(default="job", examples=["job"])
    user_skills: Optional[List[str]] = Field(default=None, examples=[["Python", "FastAPI"]])


class SummaryResponse(BaseModel):
    title: str
    organization: Optional[str] = None
    opportunity_type: str
    url: Optional[str] = None
    executive_summary: str
    key_responsibilities: List[str]
    required_skills: List[str]
    nice_to_have_skills: List[str]
    eligibility_and_requirements: List[str]
    compensation_or_prizes: Optional[str] = None
    deadlines_or_dates: Optional[str] = None
    why_it_matters: str
    application_tips: List[str]
    source: str = "TinyFish AI"
