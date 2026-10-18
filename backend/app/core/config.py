import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine base directory of the backend project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Discover and load .env from multiple possible root directories to ensure reliable loading
env_candidates = [
    Path.cwd() / ".env",
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
]

for env_path in env_candidates:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)
        break


class Settings(BaseSettings):
    PROJECT_NAME: str = "Hirely AI Backend"
    PROJECT_DESCRIPTION: str = "AI-powered Job, Internship, and Hackathon discovery & summarization platform using TinyFish AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./hirely.db"

    # TinyFish AI Credentials
    TINYFISH_API_KEY: str = ""

    # Resend email API
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""
    RESEND_ENABLED: bool = True

    # Gemini / OpenAI API key for Hirely Core AI chat and secondary summarization
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")

    # CORS configuration for frontend clients (Next.js, Vite, React, etc.)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    # Smart mock fallback when TINYFISH_API_KEY is not set or network fails
    ENABLE_MOCK_FALLBACK: bool = True

    # SMTP Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_ENABLED: bool = True
    EMAILS_FROM_EMAIL: str = "notifications@hirely.ai"
    EMAILS_FROM_NAME: str = "Hirely AI"
    SEND_WELCOME_EMAIL_ON_SIGNUP: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=[str(p) for p in env_candidates],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
