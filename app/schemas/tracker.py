from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TrackerItemCreate(BaseModel):
    user_id: int = Field(..., examples=[1])
    opportunity_id: str = Field(..., examples=["job-scale-ai-01"])
    opportunity_title: str = Field(..., examples=["AI Engineer"])
    organization: str = Field(..., examples=["Scale AI"])
    opportunity_type: str = Field(..., examples=["job"])  # job, internship, hackathon
    url: str = Field(..., examples=["https://scale.com/careers/ai-engineer"])
    status: str = Field(default="saved", examples=["saved"]) # saved, applied, interviewing, accepted, rejected
    notes: Optional[str] = Field(default="", examples=["Need to highlight my TinyFish agent project in the cover letter."])


class TrackerStatusUpdate(BaseModel):
    status: str = Field(..., examples=["applied"])  # saved, applied, interviewing, accepted, rejected
    notes: Optional[str] = None


class TrackerItemResponse(BaseModel):
    id: int
    user_id: int
    opportunity_id: str
    opportunity_title: str
    organization: str
    opportunity_type: str
    url: str
    status: str
    notes: Optional[str]
    applied_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
