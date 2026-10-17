from app.routers.profile import router as profile_router
from app.routers.search import router as search_router
from app.routers.recommendations import router as recommendations_router
from app.routers.summary import router as summary_router
from app.routers.tracker import router as tracker_router

__all__ = [
    "profile_router",
    "search_router",
    "recommendations_router",
    "summary_router",
    "tracker_router"
]
