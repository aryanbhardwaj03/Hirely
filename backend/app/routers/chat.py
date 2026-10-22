from fastapi import APIRouter, HTTPException, status
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/chat", tags=["Hirely Core AI"])


@router.post("", response_model=ChatResponse)
async def chat_with_hirely_core(payload: ChatRequest):
    """
    Hirely Core AI chat endpoint powered by Google Gemini.
    Provides opportunity analysis, resume feedback, and personalized interview strategies.
    Keys are securely managed in the backend .env and environment variables.
    """
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    try:
        result = await gemini_service.generate_chat_reply(
            message=payload.message,
            history=payload.history,
            user_id=payload.user_id,
            context=payload.context
        )
        return ChatResponse(
            reply=result["reply"],
            model_used=result.get("model_used", "gemini-3.8-flash"),
            status="success"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hirely Core chat service error: {str(e)}"
        )
