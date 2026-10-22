from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.planner import ActionPlan, ActionPlanTask
from app.models.application import ApplicationTracker
from app.models.user_profile import UserProfile
from app.schemas.planner import (
    GeneratePlanRequest,
    ActionPlanResponse,
    ActionPlanTaskResponse,
    TaskStatusUpdateRequest
)
from app.services.action_planner_service import (
    action_planner_service, 
    DEFAULT_HOURS_PER_DAY, 
    EFFORT_BENCHMARKS,
    WEEKDAYS,
    utc_now
)

router = APIRouter(prefix="/planner", tags=["Hirely Action Planner"])


@router.get("/defaults", response_model=Dict[str, Any])
async def get_planner_defaults():
    """Returns standard capacity configurations and effort benchmarks."""
    return {
        "default_hours_per_day": DEFAULT_HOURS_PER_DAY,
        "effort_benchmarks": EFFORT_BENCHMARKS,
        "weekdays": WEEKDAYS
    }


@router.post("/generate", response_model=ActionPlanResponse)
async def generate_action_plan(
    request: GeneratePlanRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a personalized weekly plan tailored to the user's available hours and profile.
    Enforces daily capacity constraints, avoids overlaps, prioritizes verified listings,
    and estimates preparation effort.
    """
    user_id = request.user_id or 1
    
    # Check if user exists, if not use default profile
    user_res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        # Check if any user profile exists in database
        first_user_res = await db.execute(select(UserProfile).limit(1))
        first_user = first_user_res.scalar_one_or_none()
        if first_user:
            user_id = first_user.id

    commitments_list = [c.model_dump() for c in request.commitments] if request.commitments else []

    plan = await action_planner_service.generate_weekly_plan(
        user_id=user_id,
        planning_period_days=request.planning_period_days,
        custom_available_hours=request.available_hours_per_day,
        commitments=commitments_list,
        preferred_categories=request.preferred_categories,
        target_skills=request.target_skills,
        db=db
    )
    return plan


@router.get("/{user_id}", response_model=ActionPlanResponse)
async def get_latest_plan(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves the latest active weekly action plan for a user."""
    res = await db.execute(
        select(ActionPlan)
        .where(ActionPlan.user_id == user_id, ActionPlan.is_active == True)
        .order_by(ActionPlan.created_at.desc())
    )
    plan = res.scalar_one_or_none()
    if not plan:
        # Generate default plan automatically
        return await action_planner_service.generate_weekly_plan(
            user_id=user_id,
            planning_period_days=7,
            db=db
        )

    # Fetch associated tasks
    tasks_res = await db.execute(
        select(ActionPlanTask)
        .where(ActionPlanTask.plan_id == plan.id)
        .order_by(ActionPlanTask.priority_rank.asc())
    )
    tasks = tasks_res.scalars().all()

    # Calculate used hours per day
    used_hours = {d: 0.0 for d in WEEKDAYS}
    for t in tasks:
        d = t.scheduled_day.lower()
        if d in used_hours and t.status != "removed":
            used_hours[d] = round(used_hours[d] + t.estimated_hours, 2)

    total_allocated = sum(used_hours.values())
    total_avail = sum((plan.available_hours_per_day or DEFAULT_HOURS_PER_DAY).values())

    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "planning_period_start": plan.planning_period_start,
        "planning_period_end": plan.planning_period_end,
        "available_hours_per_day": plan.available_hours_per_day or DEFAULT_HOURS_PER_DAY,
        "used_hours_per_day": used_hours,
        "commitments": plan.commitments or [],
        "tasks": tasks,
        "shortlist_ranked": [],
        "excluded_opportunities": [],
        "summary_explanation": plan.summary_explanation,
        "total_hours_allocated": round(total_allocated, 1),
        "total_hours_available": round(total_avail, 1),
        "has_capacity_limits": total_allocated >= total_avail * 0.9,
        "created_at": plan.created_at
    }


@router.patch("/task/{task_id}", response_model=ActionPlanTaskResponse)
async def update_task(
    task_id: int,
    update_data: TaskStatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates task status (e.g. completed, rescheduled, removed), adjust time slot, or add notes.
    Optionally syncs status to Application Tracker.
    """
    res = await db.execute(select(ActionPlanTask).where(ActionPlanTask.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action Plan task {task_id} not found."
        )

    task.status = update_data.status
    if update_data.scheduled_day:
        task.scheduled_day = update_data.scheduled_day.lower()
    if update_data.time_slot:
        task.time_slot = update_data.time_slot
    if update_data.estimated_hours is not None:
        task.estimated_hours = max(0.25, update_data.estimated_hours)
    if update_data.notes is not None:
        task.notes = update_data.notes

    # Optional sync to Application Tracker
    if update_data.sync_to_tracker:
        # Check if application tracker item already exists
        tracker_res = await db.execute(
            select(ApplicationTracker).where(
                ApplicationTracker.user_id == task.user_id,
                ApplicationTracker.opportunity_id == task.opportunity_id
            )
        )
        existing_tracker = tracker_res.scalar_one_or_none()
        tracker_status = "applied" if update_data.status == "completed" else "saved"
        
        if existing_tracker:
            existing_tracker.status = tracker_status
            if tracker_status == "applied" and not existing_tracker.applied_at:
                existing_tracker.applied_at = utc_now()
        else:
            new_tracker = ApplicationTracker(
                user_id=task.user_id,
                opportunity_id=task.opportunity_id,
                opportunity_title=task.opportunity_title,
                organization=task.organization,
                opportunity_type=task.opportunity_type,
                url=task.opportunity_url,
                status=tracker_status,
                applied_at=utc_now() if tracker_status == "applied" else None,
                notes=task.notes or "Scheduled via Hirely Action Planner"
            )
            db.add(new_tracker)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Deletes or removes a task from the active plan."""
    res = await db.execute(select(ActionPlanTask).where(ActionPlanTask.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found."
        )
    await db.delete(task)
    await db.commit()
    return None
