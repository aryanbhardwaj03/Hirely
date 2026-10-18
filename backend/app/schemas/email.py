from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class EmailSendResponse(BaseModel):
    success: bool = Field(..., description="Whether the email was dispatched or simulated successfully")
    recipient: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject line")
    mode: str = Field(..., description="'resend', 'smtp', or 'simulated'")
    message: str = Field(..., description="Status summary or diagnostic message")
    items_count: Optional[int] = Field(default=None, description="Number of job/opportunity items included in the email")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata or diagnostics")


class TestEmailRequest(BaseModel):
    recipient: EmailStr = Field(..., examples=["candidate@example.com"])
    subject: Optional[str] = Field(
        default="Hirely AI - Email Service Verification",
        examples=["Hirely AI - Email Service Verification"]
    )
    message: Optional[str] = Field(
        default="This is a test email confirming that your Hirely AI SMTP configuration is active and working properly.",
        examples=["This is a test email confirming that your Hirely AI SMTP configuration is active."]
    )


class SendWelcomeEmailRequest(BaseModel):
    user_id: Optional[int] = Field(default=None, description="Database ID of the user profile")
    email: Optional[EmailStr] = Field(default=None, description="Explicit recipient email if sending ad-hoc")
    name: Optional[str] = Field(default=None, description="Recipient name if sending ad-hoc")


class SendOpportunityEmailRequest(BaseModel):
    user_id: Optional[int] = Field(default=None, description="Database ID of the user profile")
    limit: int = Field(default=5, ge=1, le=20, description="Max opportunity recommendations to include")
    use_tinyfish_live: bool = Field(default=True, description="Whether to query TinyFish live search for fresh opportunities")
    opportunity_type: Optional[str] = Field(default=None, description="Optional filter: 'job', 'internship', or 'hackathon'")


class EmailBatchResponse(BaseModel):
    total: int = Field(..., description="Total emails attempted")
    successful: int = Field(..., description="Number of successful dispatches")
    failed: int = Field(..., description="Number of failed dispatches")
    results: List[EmailSendResponse] = Field(default_factory=list)
