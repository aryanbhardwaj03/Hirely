from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.application import ApplicationTracker
from app.models.user_profile import UserProfile
from app.schemas.tracker import (
    TrackerItemCreate,
    TrackerStatusUpdate,
    TrackerItemResponse
)

router = APIRouter(prefix="/tracker", tags=["Application Tracker & Bookmarks"])


def utc_now():
    return datetime.now(timezone.utc)


@router.post("/save", response_model=TrackerItemResponse, status_code=status.HTTP_201_CREATED)
async def save_opportunity(
    item_in: TrackerItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """Saves or bookmarks an opportunity to the user's application tracker."""
    # Check if user exists
    user_res = await db.execute(select(UserProfile).where(UserProfile.id == item_in.user_id))
    if not user_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {item_in.user_id} does not exist."
        )

    # Check if already saved
    existing = await db.execute(
        select(ApplicationTracker).where(
            ApplicationTracker.user_id == item_in.user_id,
            ApplicationTracker.opportunity_id == item_in.opportunity_id
        )
    )
    already_saved = existing.scalar_one_or_none()
    if already_saved:
        return already_saved

    new_tracker = ApplicationTracker(
        user_id=item_in.user_id,
        opportunity_id=item_in.opportunity_id,
        opportunity_title=item_in.opportunity_title,
        organization=item_in.organization,
        opportunity_type=item_in.opportunity_type,
        url=item_in.url,
        status=item_in.status,
        notes=item_in.notes or "",
        applied_at=utc_now() if item_in.status == "applied" else None
    )
    db.add(new_tracker)
    await db.commit()
    await db.refresh(new_tracker)
    return new_tracker


@router.get("/{user_id}", response_model=List[TrackerItemResponse])
async def list_user_tracked_opportunities(
    user_id: int,
    status_filter: Optional[str] = Query(None, description="Filter by status: saved, applied, interviewing, accepted, rejected"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all opportunities saved or applied by the user."""
    stmt = select(ApplicationTracker).where(ApplicationTracker.user_id == user_id)
    if status_filter:
        stmt = stmt.where(ApplicationTracker.status == status_filter)
    stmt = stmt.order_by(ApplicationTracker.updated_at.desc())
    
    res = await db.execute(stmt)
    return res.scalars().all()


@router.patch("/{tracker_id}/status", response_model=TrackerItemResponse)
async def update_tracker_status(
    tracker_id: int,
    update_data: TrackerStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates status (e.g. from saved to applied, interviewing, etc.) and notes."""
    res = await db.execute(select(ApplicationTracker).where(ApplicationTracker.id == tracker_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracker item with ID {tracker_id} not found."
        )

    item.status = update_data.status
    if update_data.status == "applied" and not item.applied_at:
        item.applied_at = utc_now()
    if update_data.notes is not None:
        item.notes = update_data.notes

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{tracker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracker_item(
    tracker_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Removes an opportunity from the tracker."""
    res = await db.execute(select(ApplicationTracker).where(ApplicationTracker.id == tracker_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracker item with ID {tracker_id} not found."
        )

    await db.delete(item)
    await db.commit()
    return None
