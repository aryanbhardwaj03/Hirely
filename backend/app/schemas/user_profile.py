from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserProfileBase(BaseModel):
    name: str = Field(..., examples=["Aryan Sharma"])
    email: EmailStr = Field(..., examples=["aryan@example.com"])
    bio: Optional[str] = Field(default="", examples=["Passionate Full-Stack & AI developer building agents and modern web apps."])
    target_role: str = Field(default="Software Engineer", examples=["Full Stack / AI Engineer"])
    experience_level: str = Field(default="Student", examples=["Student"]) # Student, Entry-Level, Junior, Mid-Level, Senior
    skills: List[str] = Field(default_factory=list, examples=[["Python", "FastAPI", "React", "Docker", "TypeScript", "SQL"]])
    preferred_locations: List[str] = Field(default_factory=lambda: ["Remote"], examples=[["Remote", "Bengaluru", "San Francisco"]])
    opportunity_types: List[str] = Field(default_factory=lambda: ["job", "internship", "hackathon"], examples=[["job", "internship", "hackathon"]])
    interests: List[str] = Field(default_factory=list, examples=[["AI Agents", "Cloud Architecture", "Open Source", "FinTech"]])
    github_url: Optional[str] = Field(default=None, examples=["https://github.com/aryan"])
    linkedin_url: Optional[str] = Field(default=None, examples=["https://linkedin.com/in/aryan"])
    portfolio_url: Optional[str] = Field(default=None, examples=["https://aryan.dev"])


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    target_role: Optional[str] = None
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    opportunity_types: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None


class UserProfileResponse(UserProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeParseRequest(BaseModel):
    text: str = Field(..., examples=["Aryan Sharma - Full Stack Developer experienced with Python, FastAPI, React, Node.js, and building AI agent workflows."])


class ResumeParseResponse(BaseModel):
    extracted_name: Optional[str] = None
    suggested_target_role: str
    suggested_experience_level: str
    extracted_skills: List[str]
    suggested_interests: List[str]
    extracted_summary: str
