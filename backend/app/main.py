from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.models.opportunity import Opportunity
from app.data.mock_opportunities import MOCK_OPPORTUNITIES
from app.routers import (
    profile_router,
    search_router,
    recommendations_router,
    summary_router,
    tracker_router,
    chat_router,
    email_router,
    discover_router,
    trustcheck_router,
    planner_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler: runs database migrations and seeds initial catalog."""
    # 1. Initialize SQLite schema
    await init_db()

    # 2. Seed initial opportunities catalog if empty
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Opportunity).limit(1))
        if not result.scalar_one_or_none():
            for item in MOCK_OPPORTUNITIES:
                opp = Opportunity(
                    id=item["id"],
                    type=item["type"],
                    title=item["title"],
                    organization=item["organization"],
                    location=item["location"],
                    is_remote=item.get("is_remote", True),
                    url=item["url"],
                    description=item["description"],
                    summary=item.get("summary", ""),
                    key_skills=item.get("key_skills", []),
                    experience_level=item.get("experience_level", "Any"),
                    compensation=item.get("compensation", ""),
                    deadline=item.get("deadline", ""),
                    source=item.get("source", "Curated")
                )
                session.add(opp)
            await session.commit()

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable CORS for all frontend clients (Vite, Next.js, Create React App, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if "*" not in settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(profile_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)
app.include_router(summary_router, prefix=settings.API_V1_STR)
app.include_router(tracker_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(email_router, prefix=settings.API_V1_STR)
app.include_router(discover_router, prefix=settings.API_V1_STR)
app.include_router(trustcheck_router, prefix=settings.API_V1_STR)
app.include_router(planner_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "groq_configured": bool(settings.GROQ_API_KEY),
        "smtp_configured": bool(settings.SMTP_USER and settings.SMTP_PASSWORD),
        "docs_url": "/docs",
        "endpoints": {
            "profiles": f"{settings.API_V1_STR}/profile",
            "search": f"{settings.API_V1_STR}/search",
            "discover": f"{settings.API_V1_STR}/discover",
            "recommendations": f"{settings.API_V1_STR}/recommendations",
            "summary": f"{settings.API_V1_STR}/summary",
            "tracker": f"{settings.API_V1_STR}/tracker",
            "chat": f"{settings.API_V1_STR}/chat",
            "email": f"{settings.API_V1_STR}/email",
            "trustcheck": f"{settings.API_V1_STR}/trustcheck",
            "planner": f"{settings.API_V1_STR}/planner"
        }
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "search_provider": "Gemini Search with Groq fallback" if (settings.GEMINI_API_KEY or settings.GROQ_API_KEY) else "Curated fallback",
        "smtp_mode": "Live SMTP" if (settings.SMTP_USER and settings.SMTP_PASSWORD) else "Smart Mock & Fallback"
    }
