import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta

from app.main import app
from app.core.database import AsyncSessionLocal, init_db
from app.models.user_profile import UserProfile
from app.models.opportunity import Opportunity
from app.models.trustcheck import TrustAssessment, ScamReport
from app.models.planner import ActionPlan, ActionPlanTask
from app.services.trustcheck_service import trustcheck_service
from app.services.action_planner_service import action_planner_service


@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Clear previous test artifacts
        from sqlalchemy import delete
        await session.execute(delete(ScamReport).where(ScamReport.opportunity_id.like("test-%")))
        await session.execute(delete(TrustAssessment).where(TrustAssessment.opportunity_id.like("test-%")))
        await session.execute(delete(ActionPlanTask).where(ActionPlanTask.user_id == 999))
        await session.execute(delete(ActionPlan).where(ActionPlan.user_id == 999))
        await session.commit()

        # Create test user
        user = UserProfile(
            id=999,
            name="Test Student",
            email="test.student@university.edu",
            target_role="AI Engineer",
            experience_level="Student",
            skills=["Python", "React", "Docker", "FastAPI"],
            preferred_locations=["Remote"],
            opportunity_types=["job", "internship", "hackathon"],
            interests=["AI/ML", "Hackathons"]
        )
        await session.merge(user)

        # Seed valid verified opportunity
        opp_verified = Opportunity(
            id="test-scale-verified",
            type="job",
            title="AI Systems Engineer",
            organization="Scale AI",
            location="Remote",
            is_remote=True,
            url="https://scale.com/careers/ai-systems",
            description="Build scalable AI pipelines with Python, FastAPI, and Docker. Enrolled students or recent graduates welcome.",
            summary="Join Scale AI to build ML infra.",
            key_skills=["Python", "FastAPI", "Docker"],
            experience_level="Entry-Level",
            compensation="$130,000 - $160,000",
            deadline="2026-12-31",
            source="Curated"
        )
        await session.merge(opp_verified)

        # Seed suspicious scam opportunity (requests fee + free host)
        opp_suspicious = Opportunity(
            id="test-scam-internship",
            type="internship",
            title="Crypto Data Analyst Intern (Urgent)",
            organization="Anonymous Tech Group",
            location="Remote",
            is_remote=True,
            url="https://crypto-careers.blogspot.com/apply",
            description="Immediate opening! Mandatory $250 application fee & security deposit via USDT wire transfer. Guaranteed job offer without interview.",
            summary="Crypto intern position.",
            key_skills=["Python", "Crypto"],
            experience_level="Student",
            compensation="$10,000/week guaranteed",
            deadline="2026-12-31",
            source="Web Scraping"
        )
        await session.merge(opp_suspicious)

        # Seed expired opportunity
        opp_expired = Opportunity(
            id="test-expired-opp",
            type="job",
            title="Past Internship",
            organization="Historic Corp",
            location="Remote",
            is_remote=True,
            url="https://scale.com/careers/past",
            description="Old listing that closed last year.",
            summary="Past position.",
            key_skills=["Python"],
            experience_level="Student",
            compensation="$30/hr",
            deadline="2024-01-01",
            source="Curated"
        )
        await session.merge(opp_expired)

        # Seed senior mismatch opportunity
        opp_senior = Opportunity(
            id="test-staff-lead",
            type="job",
            title="Principal Staff Distributed Systems Architect",
            organization="Enterprise Scale",
            location="Remote",
            is_remote=True,
            url="https://scale.com/careers/staff",
            description="Minimum 10+ years professional experience leading distributed architectures.",
            summary="Staff role.",
            key_skills=["Distributed Systems", "C++"],
            experience_level="Principal / 10+ years",
            compensation="$300,000",
            deadline="Rolling",
            source="Curated"
        )
        await session.merge(opp_senior)

        await session.commit()

    yield


@pytest.mark.asyncio
async def test_trustcheck_verified_opportunity():
    """Verify that a legitimate organization on a trusted domain receives 'verified' status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/trustcheck/test-scale-verified")
        assert resp.status_code == 200
        data = resp.json()

        assert data["opportunity_id"] == "test-scale-verified"
        assert data["status"] == "verified"
        assert data["status_label"] == "Verified Against Sources"
        assert data["score"] >= 70
        assert len(data["verified_facts"]) > 0
        assert len(data["risk_indicators"]) == 0
        assert "evidence_urls" in data
        assert "disclaimer" in data


@pytest.mark.asyncio
async def test_trustcheck_suspicious_opportunity_detection():
    """Verify that listings demanding upfront fees or using free hosts are flagged as 'suspicious'."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/trustcheck/test-scam-internship")
        assert resp.status_code == 200
        data = resp.json()

        assert data["opportunity_id"] == "test-scam-internship"
        assert data["status"] == "suspicious"
        assert data["status_label"] == "Suspicious"
        assert len(data["risk_indicators"]) > 0
        # Check that fee warning or free host warning was caught
        risk_str = " ".join(data["risk_indicators"]).lower()
        assert "fee" in risk_str or "free platform" in risk_str


@pytest.mark.asyncio
async def test_trustcheck_scam_reporting():
    """Verify student reporting of suspicious opportunities and recheck."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        report_payload = {
            "opportunity_id": "test-scale-verified",
            "user_id": 999,
            "reason": "Phishing domain impersonation",
            "details": "Saw an email asking for telegram contact.",
            "contact_email": "student@university.edu"
        }
        rep_resp = await ac.post("/api/trustcheck/report", json=report_payload)
        assert rep_resp.status_code == 201
        report_data = rep_resp.json()
        assert report_data["opportunity_id"] == "test-scale-verified"
        assert report_data["status"] == "pending"

        # Check reports listing endpoint
        list_resp = await ac.get("/api/trustcheck/reports/test-scale-verified")
        assert list_resp.status_code == 200
        reports = list_resp.json()
        assert len(reports) >= 1
        assert reports[0]["reason"] == "Phishing domain impersonation"


@pytest.mark.asyncio
async def test_trustcheck_recheck_action():
    """Verify force recheck endpoint operates with fresh assessment."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        recheck_payload = {
            "opportunity_id": "test-scale-verified",
            "force_fresh_fetch": True
        }
        resp = await ac.post("/api/trustcheck/recheck", json=recheck_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["opportunity_id"] == "test-scale-verified"
        assert "rechecked_at" in data


@pytest.mark.asyncio
async def test_action_planner_defaults():
    """Verify defaults endpoint provides hours per day and effort benchmarks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/planner/defaults")
        assert resp.status_code == 200
        data = resp.json()
        assert "default_hours_per_day" in data
        assert "effort_benchmarks" in data
        assert "monday" in data["default_hours_per_day"]


@pytest.mark.asyncio
async def test_action_planner_generation_and_constraints():
    """
    Verify Action Planner:
    1. Never exceeds available hours on any day.
    2. Excludes expired listings and senior mismatches.
    3. Excludes suspicious scam listings from scheduled plan.
    4. Produces conflict-free non-overlapping time slots.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        request_payload = {
            "user_id": 999,
            "planning_period_days": 7,
            "available_hours_per_day": {
                "monday": 2.0,
                "tuesday": 2.0,
                "wednesday": 2.5,
                "thursday": 2.0,
                "friday": 2.5,
                "saturday": 4.0,
                "sunday": 4.0
            },
            "commitments": [
                {
                    "day": "wednesday",
                    "title": "Algorithms Midterm Examination",
                    "hours": 2.0,
                    "time_range": "14:00 - 16:00"
                }
            ],
            "preferred_categories": ["job", "internship"]
        }
        resp = await ac.post("/api/planner/generate", json=request_payload)
        assert resp.status_code == 200
        plan = resp.json()

        assert plan["user_id"] == 999
        assert "tasks" in plan
        assert len(plan["tasks"]) > 0

        # Check constraint: never exceed available hours
        avail_hours = plan["available_hours_per_day"]
        used_hours = plan["used_hours_per_day"]
        for day, used in used_hours.items():
            assert used <= avail_hours[day] + 0.01, f"Day {day} exceeded capacity: {used} > {avail_hours[day]}"

        # Check that suspicious opportunities are in excluded list, not in scheduled tasks
        task_opp_ids = [t["opportunity_id"] for t in plan["tasks"]]
        assert "test-scam-internship" not in task_opp_ids
        assert "test-expired-opp" not in task_opp_ids
        assert "test-staff-lead" not in task_opp_ids

        excluded_ids = [e["opportunity_id"] for e in plan["excluded_opportunities"]]
        assert "test-scam-internship" in excluded_ids or any(e["trust_status"] == "suspicious" for e in plan["excluded_opportunities"])
        assert "test-expired-opp" in excluded_ids
        assert "test-staff-lead" in excluded_ids

        # Check that scheduled task has effort, estimate flag, and formatted slot
        first_task = plan["tasks"][0]
        assert first_task["is_estimate"] is True
        assert first_task["estimated_hours"] > 0
        assert " - " in first_task["time_slot"]


@pytest.mark.asyncio
async def test_action_planner_task_update_and_tracker_sync():
    """Verify updating task status and rescheduling, including syncing to ApplicationTracker."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First retrieve latest plan
        plan_resp = await ac.get("/api/planner/999")
        assert plan_resp.status_code == 200
        plan = plan_resp.json()
        assert len(plan["tasks"]) > 0
        task_id = plan["tasks"][0]["id"]

        # Reschedule and mark completed with tracker sync
        update_payload = {
            "status": "completed",
            "scheduled_day": "saturday",
            "time_slot": "10:00 - 12:00",
            "estimated_hours": 2.0,
            "notes": "Application successfully submitted through official portal.",
            "sync_to_tracker": True
        }
        patch_resp = await ac.patch(f"/api/planner/task/{task_id}", json=update_payload)
        assert patch_resp.status_code == 200
        updated_task = patch_resp.json()
        assert updated_task["status"] == "completed"
        assert updated_task["scheduled_day"] == "saturday"
        assert updated_task["time_slot"] == "10:00 - 12:00"

        # Check that ApplicationTracker has the item recorded
        tracker_resp = await ac.get("/api/tracker/999")
        assert tracker_resp.status_code == 200
        tracker_items = tracker_resp.json()
        tracked_opp_ids = [item["opportunity_id"] for item in tracker_items]
        assert updated_task["opportunity_id"] in tracked_opp_ids
