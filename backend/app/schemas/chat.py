from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field


class ChatMessageItem(BaseModel):
    role: str = Field(..., description="Role of the sender ('user' or 'assistant')")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User prompt or question to Hirely Core")
    history: List[Union[ChatMessageItem, Dict[str, Any]]] = Field(default_factory=list, description="Previous messages in chat history")
    user_id: Optional[Union[int, str]] = Field(default=1, description="Authenticated user ID or email")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant response text")
    model_used: str = Field(default="gemini-3.8-flash", description="Gemini model invoked")
    status: str = Field(default="success", description="Status of the chat response")
