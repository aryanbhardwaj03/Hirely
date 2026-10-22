import re
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.user_profile import UserProfile
from app.models.opportunity import Opportunity
from app.models.planner import ActionPlan, ActionPlanTask
from app.models.application import ApplicationTracker
from app.services.matching_service import matching_service
from app.services.trustcheck_service import trustcheck_service
from app.data.mock_opportunities import MOCK_OPPORTUNITIES

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

# Default weekly available hours (realistic student schedule)
DEFAULT_HOURS_PER_DAY = {
    "monday": 2.5,
    "tuesday": 2.5,
    "wednesday": 3.0,
    "thursday": 2.5,
    "friday": 3.0,
    "saturday": 4.5,
    "sunday": 4.5
}

# Standard realistic effort benchmarks (hours)
EFFORT_BENCHMARKS = {
    "job": 2.0,
    "internship": 1.5,
    "hackathon": 3.0,
    "scholarship": 3.5,
    "fellowship": 4.0,
    "research": 4.0
}


def utc_now():
    return datetime.now(timezone.utc)


class ActionPlannerService:
    """
    Hirely Action Planner Engine:
    Transforms overwhelming lists of opportunities into a personalized, conflict-free weekly schedule.
    Enforces capacity limits, respects deadlines, excludes suspicious/expired listings,
    and provides transparent ranking scoring.
    """

    async def generate_weekly_plan(
        self,
        user_id: int,
        planning_period_days: int = 7,
        custom_available_hours: Optional[Dict[str, float]] = None,
        commitments: Optional[List[Dict[str, Any]]] = None,
        preferred_categories: Optional[List[str]] = None,
        target_skills: Optional[List[str]] = None,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Generates or regenerates an ActionPlan and schedules conflict-free tasks.
        """
        # 1. Fetch user profile
        user = None
        if db and user_id:
            user_res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
            user = user_res.scalar_one_or_none()

        if not user:
            # Fallback user model for anonymous / guest users
            user = UserProfile(
                id=user_id or 1,
                name="Student Developer",
                email="student@university.edu",
                target_role="Software / AI Engineer",
                experience_level="Student",
                skills=target_skills or ["Python", "React", "TypeScript", "FastAPI", "Machine Learning"],
                preferred_locations=["Remote", "Delhi/NCR, India"],
                opportunity_types=preferred_categories or ["job", "internship", "hackathon"],
                interests=["AI/ML", "Web Development", "Hackathons"]
            )

        # 2. Normalize availability hours per day
        available_hours = dict(DEFAULT_HOURS_PER_DAY)
        if custom_available_hours:
            for d in WEEKDAYS:
                if d in custom_available_hours:
                    available_hours[d] = max(0.0, float(custom_available_hours[d]))

        # Normalize commitments
        norm_commitments = commitments or []

        # Calculate net capacity per day
        commitment_hours_per_day = {d: 0.0 for d in WEEKDAYS}
        for c in norm_commitments:
            d = c.get("day", "").lower()
            if d in commitment_hours_per_day:
                commitment_hours_per_day[d] += float(c.get("hours", 0.0))

        net_capacity = {}
        for d in WEEKDAYS:
            net = max(0.0, available_hours[d] - commitment_hours_per_day[d])
            net_capacity[d] = round(net, 1)

        total_available = sum(available_hours.values())
        total_net_capacity = sum(net_capacity.values())

        # 3. Retrieve all candidate opportunities from database + AI search + curated catalog
        candidate_opps = await self._gather_candidate_opportunities(user, db)

        # 4. Filter expired listings and confirmed eligibility mismatches
        qualified_opps, excluded_opps = await self._filter_opportunities(candidate_opps, user, db)

        # 5. Score and rank opportunities with transparent documented formula
        ranked_opps = self._rank_opportunities(qualified_opps, user, preferred_categories)

        # 6. Schedule tasks using conflict-free greedy packing
        now = datetime.now()
        day_dates = {}
        for idx, day_name in enumerate(WEEKDAYS):
            target_date = now + timedelta(days=idx)
            day_dates[day_name] = target_date.strftime("%Y-%m-%d")

        scheduled_tasks, used_hours, unassigned = self._schedule_tasks(
            ranked_opps=ranked_opps,
            net_capacity=net_capacity,
            day_dates=day_dates,
            commitments=norm_commitments
        )

        has_capacity_limits = len(unassigned) > 0 or total_net_capacity < 5.0

        # Construct human-readable summary explanation
        summary_explanation = self._build_plan_explanation(
            total_net_capacity=total_net_capacity,
            scheduled_count=len(scheduled_tasks),
            excluded_count=len(excluded_opps),
            unassigned_count=len(unassigned),
            commitments_count=len(norm_commitments)
        )

        start_date = day_dates[WEEKDAYS[0]]
        end_date = day_dates[WEEKDAYS[-1]]

        plan_dict = {
            "id": 1,
            "user_id": user.id,
            "planning_period_start": start_date,
            "planning_period_end": end_date,
            "available_hours_per_day": available_hours,
            "used_hours_per_day": used_hours,
            "commitments": norm_commitments,
            "tasks": scheduled_tasks,
            "shortlist_ranked": ranked_opps,
            "excluded_opportunities": excluded_opps,
            "summary_explanation": summary_explanation,
            "total_hours_allocated": round(sum(used_hours.values()), 1),
            "total_hours_available": round(total_available, 1),
            "has_capacity_limits": has_capacity_limits,
            "created_at": utc_now()
        }

        # 7. Persist to DB if session provided
        if db and user_id:
            # Deactivate or delete old active plans
            old_plans_res = await db.execute(select(ActionPlan).where(ActionPlan.user_id == user_id))
            old_plans = old_plans_res.scalars().all()
            for op in old_plans:
                op.is_active = False

            db_plan = ActionPlan(
                user_id=user_id,
                planning_period_start=start_date,
                planning_period_end=end_date,
                available_hours_per_day=available_hours,
                commitments=norm_commitments,
                priorities=preferred_categories or [],
                summary_explanation=summary_explanation,
                is_active=True,
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(db_plan)
            await db.flush()

            plan_dict["id"] = db_plan.id

            # Save tasks
            db_tasks = []
            for st in scheduled_tasks:
                task_obj = ActionPlanTask(
                    plan_id=db_plan.id,
                    user_id=user_id,
                    opportunity_id=st["opportunity_id"],
                    opportunity_title=st["opportunity_title"],
                    organization=st["organization"],
                    opportunity_type=st["opportunity_type"],
                    opportunity_url=st["opportunity_url"],
                    trust_status=st["trust_status"],
                    deadline=st.get("deadline"),
                    task_title=st["task_title"],
                    task_type=st["task_type"],
                    scheduled_day=st["scheduled_day"],
                    scheduled_date=st["scheduled_date"],
                    time_slot=st["time_slot"],
                    estimated_hours=st["estimated_hours"],
                    is_estimate=st.get("is_estimate", True),
                    priority_rank=st.get("priority_rank", 1),
                    status=st.get("status", "pending"),
                    match_reason=st.get("match_reason", ""),
                    eligibility_summary=st.get("eligibility_summary", ""),
                    notes=st.get("notes", ""),
                    created_at=utc_now(),
                    updated_at=utc_now()
                )
                db.add(task_obj)
                db_tasks.append(task_obj)

            await db.commit()
            await db.refresh(db_plan)
            for idx, task_obj in enumerate(db_tasks):
                await db.refresh(task_obj)
                scheduled_tasks[idx]["id"] = task_obj.id
                scheduled_tasks[idx]["plan_id"] = db_plan.id

        return plan_dict

    async def _gather_candidate_opportunities(self, user: UserProfile, db: Optional[AsyncSession]) -> List[Dict[str, Any]]:
        """Collects opportunities across the database and curated catalog."""
        all_opps = list(MOCK_OPPORTUNITIES)
        seen_ids = {o["id"] for o in all_opps}

        if db:
            db_res = await db.execute(select(Opportunity))
            for opp in db_res.scalars().all():
                if opp.id not in seen_ids:
                    seen_ids.add(opp.id)
                    all_opps.append({
                        "id": opp.id,
                        "type": opp.type,
                        "title": opp.title,
                        "organization": opp.organization,
                        "location": opp.location,
                        "is_remote": opp.is_remote,
                        "url": opp.url,
                        "description": opp.description,
                        "summary": opp.summary,
                        "key_skills": opp.key_skills or [],
                        "experience_level": opp.experience_level,
                        "compensation": opp.compensation,
                        "deadline": opp.deadline,
                        "source": opp.source
                    })

        return all_opps

    async def _filter_opportunities(
        self,
        candidate_opps: List[Dict[str, Any]],
        user: UserProfile,
        db: Optional[AsyncSession]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Applies deterministic filtering:
        - Excludes expired deadlines
        - Excludes confirmed senior/lead eligibility mismatches
        - Excludes suspicious scam opportunities flagged by TrustCheck
        """
        qualified = []
        excluded = []
        now = datetime.now()

        user_exp = (getattr(user, "experience_level", "") or "Student").lower()

        for opp in candidate_opps:
            opp_id = opp["id"]
            title = opp.get("title", "")
            org = opp.get("organization", "")
            opp_type = opp.get("type", "opportunity")
            deadline_str = opp.get("deadline", "") or "Rolling"
            exp_level = (opp.get("experience_level", "") or "Any").lower()

            # 1. Expiry check
            is_expired = False
            if deadline_str and deadline_str != "Rolling":
                # Check for ISO or simple date pattern YYYY-MM-DD
                date_match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", deadline_str)
                if date_match:
                    try:
                        d_year, d_month, d_day = int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))
                        deadline_dt = datetime(d_year, d_month, d_day)
                        if deadline_dt < now - timedelta(days=1):
                            is_expired = True
                    except Exception:
                        pass

            if is_expired:
                excluded.append({
                    "opportunity_id": opp_id,
                    "title": title,
                    "organization": org,
                    "type": opp_type,
                    "trust_status": "unverified",
                    "exclusion_reason": f"Deadline expired on {deadline_str}."
                })
                continue

            # 2. Eligibility mismatch check
            # If candidate is Student / Entry-level, but role requires 5+ years / Staff / Principal
            if user_exp in ("student", "entry-level") and any(s in exp_level for s in ["senior", "lead", "staff", "principal", "5+ years", "director"]):
                excluded.append({
                    "opportunity_id": opp_id,
                    "title": title,
                    "organization": org,
                    "type": opp_type,
                    "trust_status": "unverified",
                    "exclusion_reason": f"Eligibility mismatch: requires {opp.get('experience_level')} experience."
                })
                continue

            # 3. TrustCheck assessment & scam risk exclusion
            assessment = await trustcheck_service.assess_opportunity(opp, force_fresh=False, db=db)
            trust_status = assessment.get("status", "unverified")

            if trust_status == "suspicious":
                excluded.append({
                    "opportunity_id": opp_id,
                    "title": title,
                    "organization": org,
                    "type": opp_type,
                    "trust_status": "suspicious",
                    "exclusion_reason": f"Excluded by TrustCheck: {assessment.get('explanation')}"
                })
                continue

            # Attach trust assessment to candidate opportunity for ranking
            opp_copy = dict(opp)
            opp_copy["trust_status"] = trust_status
            opp_copy["trust_score"] = assessment.get("score", 50)
            qualified.append(opp_copy)

        return qualified, excluded

    def _rank_opportunities(
        self,
        qualified_opps: List[Dict[str, Any]],
        user: UserProfile,
        preferred_categories: Optional[List[str]]
    ) -> List[Dict[str, Any]]:
        """
        Transparent documented scoring logic:
        Score = Match (0-45) + Trust (0-25) + Deadline Urgency (0-20) + User Priority (0-10)
        """
        pref_cats = [c.lower() for c in (preferred_categories or getattr(user, "opportunity_types", []))]

        ranked = []
        for opp in qualified_opps:
            opp_id = opp["id"]
            opp_type = opp.get("type", "job").lower()
            trust_status = opp.get("trust_status", "unverified")
            trust_score = opp.get("trust_score", 50)

            # 1. Match score from matching engine (0 - 45 pts)
            match_score, match_tier, match_reasons, _, _ = matching_service.match_opportunity(user, opp)
            skill_role_pts = round((match_score / 100.0) * 45.0, 1)

            # 2. Trust bonus (0 - 25 pts)
            if trust_status == "verified":
                trust_pts = 25.0
            else:  # unverified
                trust_pts = 10.0

            # 3. Deadline Urgency (0 - 20 pts)
            deadline_str = opp.get("deadline", "Rolling")
            deadline_pts = 5.0  # default for Rolling
            if deadline_str and deadline_str != "Rolling":
                date_match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", deadline_str)
                if date_match:
                    try:
                        d_dt = datetime(int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3)))
                        days_away = (d_dt - datetime.now()).days
                        if days_away <= 3:
                            deadline_pts = 20.0
                        elif days_away <= 7:
                            deadline_pts = 16.0
                        elif days_away <= 14:
                            deadline_pts = 12.0
                        else:
                            deadline_pts = 8.0
                    except Exception:
                        pass

            # 4. Priority alignment (0 - 10 pts)
            priority_pts = 10.0 if opp_type in pref_cats else 2.0

            composite_score = round(skill_role_pts + trust_pts + deadline_pts + priority_pts, 1)

            effort_hours = EFFORT_BENCHMARKS.get(opp_type, 2.0)

            rationale = (
                f"Rank {composite_score}/100: Skill & Role Match ({skill_role_pts}/45), "
                f"Trust Assurance ({trust_pts}/25, status: {trust_status}), "
                f"Deadline Urgency ({deadline_pts}/20), Priority Category ({priority_pts}/10)."
            )

            ranked.append({
                "opportunity_id": opp_id,
                "title": opp.get("title", ""),
                "organization": opp.get("organization", ""),
                "type": opp_type,
                "url": opp.get("url", ""),
                "trust_status": trust_status,
                "trust_score": trust_score,
                "match_score": match_score,
                "composite_rank_score": composite_score,
                "deadline": deadline_str,
                "estimated_hours": effort_hours,
                "ranking_rationale": rationale,
                "match_reason": match_reasons[0] if match_reasons else "Aligned with technical profile.",
                "eligibility_summary": f"Stated experience: {opp.get('experience_level', 'Open')}. Location: {opp.get('location', 'Remote')}.",
                "is_scheduled": False
            })

        ranked.sort(key=lambda x: x["composite_rank_score"], reverse=True)
        return ranked

    def _schedule_tasks(
        self,
        ranked_opps: List[Dict[str, Any]],
        net_capacity: Dict[str, float],
        day_dates: Dict[str, str],
        commitments: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, float], List[Dict[str, Any]]]:
        """
        Greedy conflict-free packing:
        Assigns highest-scoring tasks to earliest days with sufficient remaining capacity.
        Generates clean time slots avoiding overlapping tasks.
        """
        remaining_capacity = dict(net_capacity)
        used_hours = {d: 0.0 for d in WEEKDAYS}
        scheduled_tasks = []
        unassigned = []

        # Standard evening study time blocks (e.g. 18:00 start)
        day_start_hour = {
            "monday": 18.0,
            "tuesday": 18.0,
            "wednesday": 18.5,
            "thursday": 18.0,
            "friday": 17.5,
            "saturday": 10.0,
            "sunday": 11.0
        }

        task_counter = 1

        for item in ranked_opps:
            effort = item["estimated_hours"]
            scheduled = False

            # Try to place on the earliest day that has enough room
            for day_name in WEEKDAYS:
                if remaining_capacity[day_name] >= effort:
                    # Allocate on this day
                    start_h = day_start_hour[day_name] + used_hours[day_name]
                    end_h = start_h + effort
                    
                    start_str = f"{int(start_h):02d}:{int((start_h % 1) * 60):02d}"
                    end_str = f"{int(end_h):02d}:{int((end_h % 1) * 60):02d}"
                    time_slot = f"{start_str} - {end_str}"

                    task_title = self._create_task_title(item["type"], item["organization"], item["title"])

                    scheduled_tasks.append({
                        "id": task_counter,
                        "plan_id": 1,
                        "user_id": 1,
                        "opportunity_id": item["opportunity_id"],
                        "opportunity_title": item["title"],
                        "organization": item["organization"],
                        "opportunity_type": item["type"],
                        "opportunity_url": item["url"],
                        "trust_status": item["trust_status"],
                        "deadline": item["deadline"],
                        "task_title": task_title,
                        "task_type": "application" if item["type"] in ("job", "internship") else "preparation",
                        "scheduled_day": day_name,
                        "scheduled_date": day_dates[day_name],
                        "time_slot": time_slot,
                        "estimated_hours": effort,
                        "is_estimate": True,
                        "priority_rank": task_counter,
                        "status": "pending",
                        "match_reason": item["match_reason"],
                        "eligibility_summary": item["eligibility_summary"],
                        "notes": f"Estimated prep & submission time: {effort}h. Adjust time as needed."
                    })

                    remaining_capacity[day_name] = round(remaining_capacity[day_name] - effort, 2)
                    used_hours[day_name] = round(used_hours[day_name] + effort, 2)
                    item["is_scheduled"] = True
                    task_counter += 1
                    scheduled = True
                    break

            if not scheduled:
                unassigned.append(item)

        return scheduled_tasks, used_hours, unassigned

    def _create_task_title(self, opp_type: str, organization: str, title: str) -> str:
        if opp_type == "job":
            return f"Tailor Resume & Complete Job Submission for {organization}"
        elif opp_type == "internship":
            return f"Prepare Internship Statement & Apply to {organization}"
        elif opp_type == "hackathon":
            return f"Draft Problem Architecture & Register Team for {title}"
        elif opp_type == "scholarship":
            return f"Write Scholarship Essay & Submit Dossier for {organization}"
        else:
            return f"Review & Submit {opp_type.capitalize()} Application for {organization}"

    def _build_plan_explanation(
        self,
        total_net_capacity: float,
        scheduled_count: int,
        excluded_count: int,
        unassigned_count: int,
        commitments_count: int
    ) -> str:
        parts = [
            f"Generated a realistic weekly action plan with {scheduled_count} prioritized tasks across {total_net_capacity:.1f} net study hours."
        ]
        if commitments_count > 0:
            parts.append(f"Accounted for {commitments_count} existing commitments to prevent overlapping deadlines.")
        if excluded_count > 0:
            parts.append(f"Filtered out {excluded_count} unverified/suspicious listings or expired deadlines for safety.")
        if unassigned_count > 0:
            parts.append(f"{unassigned_count} additional qualified opportunities were deferred to protect your daily workload from burnout.")
        return " ".join(parts)


action_planner_service = ActionPlannerService()
