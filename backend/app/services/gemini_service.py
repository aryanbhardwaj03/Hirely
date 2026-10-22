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
        # Valid Google Gemini models supported by Google AI v1beta
        self.primary_model = "gemini-3.8-flash"
        self.fallback_models = ["gemini-3.5-flash-lite"]

    def get_api_key(self) -> str:
        # Check settings first, then os.environ
        key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        return key.strip()

    async def generate_chat_reply(
        self,
        message: str,
        history: Optional[List[Union[Dict[str, Any], Any]]] = None,
        user_id: Optional[Union[int, str]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, str]:
        api_key = self.get_api_key()

        # Build system instruction for Hirely Core
        system_instruction = (
            "You are Hirely Core, an elite AI career intelligence co-pilot for college students. "
            "You provide concise, highly actionable advice on internships, tech jobs, scholarships, hackathons, "
            "resume improvements, technical roadmaps, and interview strategy. "
            "Answer the user's latest question directly and use the conversation history to resolve references. "
            "Use the supplied candidate and opportunity context when relevant, and say when information is missing. "
            "Do not reuse a generic opportunity-match template. Keep responses tailored, concise, and actionable. "
            "Do not invent job details, metrics, or deadlines.\n"
            f"Relevant Hirely context (JSON): {json.dumps(context or {}, ensure_ascii=False)[:12000]}"
        )

        if api_key:
            # 1. Try with Gemini REST API with bounded timeouts
            reply, model = await self._call_gemini_api(api_key, message, history, system_instruction)
            if reply:
                return {"reply": reply, "model_used": model}

        if settings.GROQ_API_KEY:
            reply = await self._call_groq_api(settings.GROQ_API_KEY, message, history, system_instruction)
            if reply:
                return {"reply": reply, "model_used": "Groq llama-3.3-70b-versatile"}

        raise RuntimeError("Gemini and Groq could not generate a reply. Check provider credentials and backend logs.")

    async def _call_groq_api(
        self,
        api_key: str,
        message: str,
        history: Optional[List[Any]],
        system_instruction: str,
    ) -> Optional[str]:
        import httpx

        messages = [{"role": "system", "content": system_instruction}]
        for item in (history or [])[-12:]:
            if isinstance(item, dict):
                role = item.get("role")
                content = item.get("content", "")
            else:
                role = getattr(item, "role", None)
                content = getattr(item, "content", "")
            if role in {"user", "assistant", "model"} and content:
                messages.append({"role": "assistant" if role == "model" else role, "content": str(content)[:8000]})
        messages.append({"role": "user", "content": message})
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": messages,
                        "temperature": 0.75,
                        "max_completion_tokens": 1200,
                    },
                )
            response.raise_for_status()
            return response.json().get("choices", [{}])[0].get("message", {}).get("content")
        except Exception as exc:
            logger.warning("Groq Hirely Core chat failed: %s", exc)
            return None

    async def _call_gemini_api(
        self,
        api_key: str,
        message: str,
        history: Optional[List[Any]],
        system_instruction: str
    ) -> tuple[Optional[str], str]:
        """Call Gemini API via httpx REST endpoint with primary and fallback models."""
        import httpx

        # Keep requests bounded while retaining enough context for follow-up questions.
        contents = []
        if history:
            for item in history[-12:]:
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
                "temperature": 0.7,
                "maxOutputTokens": 1000
            }
        }

        # Try primary model then fallback with fast bounded timeouts
        models_to_try = [self.primary_model] + self.fallback_models

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
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
                            logger.warning(f"Gemini API returned {res.status_code} for model {model}")
                    except Exception as e:
                        logger.warning(f"Error querying Gemini model {model}: {e}")
        except Exception as e:
            logger.warning(f"Gemini client session error: {e}")

        return None, self.primary_model

gemini_service = GeminiService()
