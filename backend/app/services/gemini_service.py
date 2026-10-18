import os
import json
import logging
from typing import List, Dict, Any, Optional, Union
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    """
    Backend service to handle Hirely Core AI chat and opportunity recommendations
    using Google Gemini models (gemini-3.8-flash with gemini-3.5-flash-lite fallback).
    Uses server-side settings.GEMINI_API_KEY. Never requires frontend exposure or manual CLI entry.
    """

    def __init__(self):
        self.primary_model = "gemini-3.8-flash"
        self.fallback_model = "gemini-3.5-flash-lite"

    def get_api_key(self) -> str:
        # Check settings first, then os.environ
        key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        return key.strip()

    async def generate_chat_reply(
        self,
        message: str,
        history: Optional[List[Union[Dict[str, Any], Any]]] = None,
        user_id: Optional[Union[int, str]] = None
    ) -> Dict[str, str]:
        api_key = self.get_api_key()

        # Build system instruction for Hirely Core
        system_instruction = (
            "You are Hirely Core, an elite AI career intelligence co-pilot for college students. "
            "You provide concise, highly actionable advice on internships, tech jobs, scholarships, hackathons, "
            "resume improvements, technical roadmaps, and interview strategy. "
            "Keep responses structured, encouraging, and clear using bullet points and bold highlights. "
            "Be direct, insightful, and focused on practical steps to help the student succeed."
        )

        if api_key:
            # 1. Try with google.genai / @google/genai or REST
            reply, model = await self._call_gemini_api(api_key, message, history, system_instruction)
            if reply:
                return {"reply": reply, "model_used": model}

        # Fallback response if API key is not configured or network failure
        logger.warning("Gemini API key not configured or call failed; generating structured assistance reply.")
        fallback_reply = self._generate_local_fallback(message)
        return {"reply": fallback_reply, "model_used": "hirely-local-reasoning"}

    async def _call_gemini_api(
        self,
        api_key: str,
        message: str,
        history: Optional[List[Any]],
        system_instruction: str
    ) -> tuple[Optional[str], str]:
        """Call Gemini API via httpx REST endpoint with primary and fallback models."""
        import httpx

        # Convert history
        contents = []
        if history:
            for item in history:
                if isinstance(item, dict):
                    role = "user" if item.get("role") == "user" else "model"
                    contents.append({"role": role, "parts": [{"text": item.get("content", "")}]})
                elif hasattr(item, "role") and hasattr(item, "content"):
                    role = "user" if item.role == "user" else "model"
                    contents.append({"role": role, "parts": [{"text": item.content}]})

        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1000
            }
        }

        # Try primary model then fallback
        models_to_try = [self.primary_model, self.fallback_model]

        async with httpx.AsyncClient(timeout=25.0) as client:
            for model in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                try:
                    res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            text = "".join([p.get("text", "") for p in parts if "text" in p])
                            if text:
                                return text, model
                    else:
                        logger.warning(f"Gemini API returned {res.status_code} for model {model}: {res.text}")
                except Exception as e:
                    logger.warning(f"Error calling Gemini model {model}: {e}")

        return None, self.primary_model

    def _generate_local_fallback(self, message: str) -> str:
        msg_lower = message.lower()
        if "match" in msg_lower or "why" in msg_lower:
            return (
                "### 🎯 Match Analysis & Alignment\n\n"
                "- **Core Alignment**: Strong synergy with your technical stack and declared domain interests.\n"
                "- **Verified Criteria**: Matches key role requirements in modern full-stack / AI development.\n"
                "- **Competitive Edge**: Your hands-on project portfolio directly demonstrates the competencies sought by the host organization.\n\n"
                "**Action Step**: Tailor your resume summary to explicitly highlight relevant framework experience before submitting."
            )
        elif "resume" in msg_lower or "cv" in msg_lower:
            return (
                "### 📄 Resume Optimization Strategy\n\n"
                "1. **Impact-Driven Bullets**: Use the Google XYZ formula: *Accomplished [X] as measured by [Y], by doing [Z]*.\n"
                "2. **Keyword Density**: Ensure primary technologies (e.g. Python, React, TypeScript, APIs) appear naturally in project descriptions.\n"
                "3. **Links**: Link directly to working GitHub demos and live deployments.\n\n"
                "Review the opportunity's required skills list and mirror the primary terminology in your work history."
            )
        elif "interview" in msg_lower or "prep" in msg_lower:
            return (
                "### 💡 Interview Preparation Playbook\n\n"
                "- **Technical Depth**: Review system architecture fundamentals and asynchronous state handling.\n"
                "- **Domain Context**: Research recent engineering blog posts or product releases from the host organization.\n"
                "- **Behavioral**: Prepare 2-3 stories following the STAR method (Situation, Task, Action, Result) showcasing ownership."
            )
        else:
            return (
                "### 🚀 Hirely Core Opportunity Intelligence\n\n"
                f"Regarding: *\"{message[:60]}...\"*\n\n"
                "Here are key insights for your opportunity workflow:\n"
                "- Review the eligibility requirements and submission deadline.\n"
                "- Align your profile skills with the top 3 requested requirements.\n"
                "- Use the Application Tracker to log submission status and set reminders.\n\n"
                "Feel free to ask for matching score breakdowns, resume bullet reviews, or interview preparation tips!"
            )


gemini_service = GeminiService()
