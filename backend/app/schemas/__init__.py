from app.schemas.user_profile import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    ResumeParseRequest,
    ResumeParseResponse
)
from app.schemas.opportunity import (
    OpportunityBase,
    OpportunityResponse,
    SearchFilters,
    OpportunityMatchResult,
    RecommendationsResponse
)
from app.schemas.summary import (
    SummarizeUrlRequest,
    SummarizeTextRequest,
    SummaryResponse
)
from app.schemas.tracker import (
    TrackerItemCreate,
    TrackerStatusUpdate,
    TrackerItemResponse
)
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessageItem
)
from app.schemas.email import (
    EmailSendResponse,
    TestEmailRequest,
    SendWelcomeEmailRequest,
    SendOpportunityEmailRequest,
    EmailBatchResponse
)

__all__ = [
    "UserProfileCreate",
    "UserProfileUpdate",
    "UserProfileResponse",
    "ResumeParseRequest",
    "ResumeParseResponse",
    "OpportunityBase",
    "OpportunityResponse",
    "SearchFilters",
    "OpportunityMatchResult",
    "RecommendationsResponse",
    "SummarizeUrlRequest",
    "SummarizeTextRequest",
    "SummaryResponse",
    "TrackerItemCreate",
    "TrackerStatusUpdate",
    "TrackerItemResponse",
    "ChatRequest",
    "ChatResponse",
    "ChatMessageItem",
    "EmailSendResponse",
    "TestEmailRequest",
    "SendWelcomeEmailRequest",
    "SendOpportunityEmailRequest",
    "EmailBatchResponse"
]
