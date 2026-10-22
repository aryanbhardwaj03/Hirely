from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class TrustAssessmentResponse(BaseModel):
    opportunity_id: str
    status: str = Field(..., description="'verified', 'suspicious', or 'unverified'")
    status_label: str = Field(..., description="e.g. 'Verified Against Sources', 'Suspicious', 'Unverified'")
    score: int = Field(..., ge=0, le=100, description="Trust confidence score from 0 to 100")
    
    verified_facts: List[str] = Field(default_factory=list, description="List of empirically confirmed facts")
    risk_indicators: List[str] = Field(default_factory=list, description="Warning signs or risk flags identified")
    missing_information: List[str] = Field(default_factory=list, description="Key details absent or unverified")
    evidence_urls: List[str] = Field(default_factory=list, description="Web source URLs examined")
    
    explanation: str = Field(..., description="Detailed, transparent rationale of assessment")
    organizer_details: Dict[str, Any] = Field(default_factory=dict)
    financial_details: Dict[str, Any] = Field(default_factory=dict)
    eligibility_details: Dict[str, Any] = Field(default_factory=dict)
    
    source_domain: Optional[str] = None
    is_official_domain: bool = False
    disclaimer: str = Field(
        default="TrustCheck evaluations are synthesized from public web evidence. A verified status reflects supporting source alignment, not an absolute guarantee. Suspicious flags indicate items requiring independent scrutiny."
    )
    rechecked_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TrustRecheckRequest(BaseModel):
    opportunity_id: str
    force_fresh_fetch: bool = True


class ScamReportCreate(BaseModel):
    opportunity_id: str
    user_id: Optional[int] = None
    reason: str = Field(..., description="E.g. Upfront payment requested, Impersonation, Phishing, Fake deadline")
    details: str = Field(..., min_length=5, description="Specific details of observed suspicious behavior")
    contact_email: Optional[str] = None


class ScamReportResponse(BaseModel):
    id: int
    opportunity_id: str
    user_id: Optional[int] = None
    reason: str
    details: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
