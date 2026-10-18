import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # the backend/ folder

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hirely AI Backend"
    PROJECT_DESCRIPTION: str = "AI-powered Job, Internship, and Hackathon discovery & summarization platform using TinyFish AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{(BASE_DIR / 'hirely.db').as_posix()}"

    # TinyFish AI Credentials
    TINYFISH_API_KEY: str = ""
    
    # Optional Gemini / OpenAI API key for enhanced secondary LLM summarization
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

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

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
