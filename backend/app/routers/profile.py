import re
from io import BytesIO
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.user_profile import UserProfile
from app.schemas.user_profile import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    ResumeParseRequest,
    ResumeParseResponse
)
from app.services.email_service import email_service

router = APIRouter(prefix="/profile", tags=["User Profiles"])


@router.post("", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: UserProfileCreate,
    background_tasks: BackgroundTasks,
    send_welcome: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new user profile with skills, experience, and target preferences."""
    existing = await db.execute(select(UserProfile).where(UserProfile.email == profile_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user profile with this email already exists."
        )

    profile = UserProfile(**profile_in.model_dump())
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    # Automatically dispatch welcome email via SMTP in background task
    if send_welcome and settings.SEND_WELCOME_EMAIL_ON_SIGNUP:
        background_tasks.add_task(email_service.send_welcome_email, profile)

    return profile


@router.get("", response_model=List[UserProfileResponse])
async def list_profiles(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Lists all user profiles in the database."""
    res = await db.execute(select(UserProfile).offset(skip).limit(limit))
    return res.scalars().all()


@router.get("/{profile_id}", response_model=UserProfileResponse)
async def get_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves a single user profile by ID."""
    res = await db.execute(select(UserProfile).where(UserProfile.id == profile_id))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile with ID {profile_id} not found."
        )
    return profile


@router.put("/{profile_id}", response_model=UserProfileResponse)
async def update_profile(
    profile_id: int,
    profile_in: UserProfileUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing user profile."""
    res = await db.execute(select(UserProfile).where(UserProfile.id == profile_id))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile with ID {profile_id} not found."
        )

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/parse-resume", response_model=ResumeParseResponse)
async def parse_resume_or_bio(data: ResumeParseRequest):
    """
    Auto-extracts skills, suggested target roles, experience level,
    and interests from raw resume text or candidate bio.
    """
    return _parse_resume_text(data.text)


def _parse_resume_text(text: str):
    text_lower = text.lower()

    # Skill dictionary
    SKILL_CATALOG = [
        "Python", "FastAPI", "Flask", "Django", "React", "Next.js", "Vue",
        "Node.js", "TypeScript", "JavaScript", "Docker", "Kubernetes", "AWS",
        "GCP", "Azure", "PostgreSQL", "MongoDB", "Redis", "SQL", "Git",
        "GraphQL", "TailwindCSS", "PyTorch", "TensorFlow", "Scikit-Learn",
        "AI Agents", "LLMs", "LangChain", "AI search", "C++", "Java", "Go",
        "Rust", "Solidity", "Linux", "CI/CD", "WebSockets"
    ]
    found_skills = [s for s in SKILL_CATALOG if s.lower() in text_lower]

    # Target Role detection
    role = "Software Engineer"
    if "ai" in text_lower or "machine learning" in text_lower or "ml" in text_lower:
        role = "AI / ML Engineer"
    elif "backend" in text_lower:
        role = "Backend Engineer"
    elif "full stack" in text_lower or "fullstack" in text_lower:
        role = "Full Stack Developer"
    elif "frontend" in text_lower or "react" in text_lower:
        role = "Frontend Engineer"

    # Experience level
    experience = "Student"
    if "senior" in text_lower or "lead" in text_lower:
        experience = "Senior"
    elif "mid-level" in text_lower or "3+ years" in text_lower:
        experience = "Mid-Level"
    elif "junior" in text_lower or "1-2 years" in text_lower:
        experience = "Junior"
    elif "entry" in text_lower or "graduate" in text_lower:
        experience = "Entry-Level"

    # Suggested interests
    interests = []
    if "agent" in text_lower or "ai" in text_lower:
        interests.append("AI Agents")
    if "open source" in text_lower:
        interests.append("Open Source")
    if "cloud" in text_lower or "docker" in text_lower:
        interests.append("Cloud Architecture")
    if "web3" in text_lower or "crypto" in text_lower:
        interests.append("Web3 & Blockchain")
    if not interests:
        interests = ["AI Productivity", "Cloud Systems"]

    return ResumeParseResponse(
        extracted_name=None,
        suggested_target_role=role,
        suggested_experience_level=experience,
        extracted_skills=found_skills,
        suggested_interests=interests,
        extracted_summary=f"Profile identified as {experience} specializing in {role} with technical background in {', '.join(found_skills[:4]) if found_skills else 'software development'}."
    )


@router.post("/upload-resume", response_model=ResumeParseResponse)
async def upload_resume(file: UploadFile = File(...)):
    """Extract text from a PDF or DOCX resume and return the same profile suggestions."""
    filename = (file.filename or "").lower()
    content = await file.read(8 * 1024 * 1024 + 1)
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume must be smaller than 8 MB.")
    try:
        if filename.endswith(".pdf"):
            from pypdf import PdfReader
            text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)
        elif filename.endswith(".docx"):
            from docx import Document
            text = "\n".join(paragraph.text for paragraph in Document(BytesIO(content)).paragraphs)
        else:
            raise HTTPException(status_code=415, detail="Upload a PDF or DOCX resume.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not read this resume. Try another PDF or DOCX file.") from exc
    if not text.strip():
        raise HTTPException(status_code=400, detail="No selectable text found. Please use a text-based PDF or DOCX.")
    return _parse_resume_text(text)
