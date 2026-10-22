from app.routers.profile import router as profile_router
from app.routers.search import router as search_router
from app.routers.recommendations import router as recommendations_router
from app.routers.summary import router as summary_router
from app.routers.tracker import router as tracker_router
from app.routers.chat import router as chat_router
from app.routers.email import router as email_router
from app.routers.discover import router as discover_router
from app.routers.trustcheck import router as trustcheck_router
from app.routers.planner import router as planner_router

__all__ = [
    "profile_router",
    "search_router",
    "recommendations_router",
    "summary_router",
    "tracker_router",
    "chat_router",
    "email_router",
    "discover_router",
    "trustcheck_router",
    "planner_router"
]
