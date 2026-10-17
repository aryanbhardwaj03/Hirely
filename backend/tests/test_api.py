import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    yield


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Hirely AI Backend"
        assert "endpoints" in data


@pytest.mark.asyncio
async def test_create_and_get_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "Alex Rivers",
            "email": "alex.rivers@example.com",
            "bio": "AI and Backend student developer passionate about autonomous agents.",
            "target_role": "AI Backend Engineer",
            "experience_level": "Student",
            "skills": ["Python", "FastAPI", "Docker", "PyTorch", "Git"],
            "preferred_locations": ["Remote", "San Francisco"],
            "opportunity_types": ["job", "internship", "hackathon"],
            "interests": ["AI Agents", "Open Source"]
        }
        res = await client.post("/api/profile", json=payload)
        assert res.status_code in (201, 400) # 400 if email already created in repeated test run

        # List profiles
        list_res = await client.get("/api/profile")
        assert list_res.status_code == 200
        profiles = list_res.json()
        assert len(profiles) >= 1
        user_id = profiles[0]["id"]

        # Get profile
        get_res = await client.get(f"/api/profile/{user_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == user_id


@pytest.mark.asyncio
async def test_resume_parser():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "Junior developer skilled in Python, FastAPI, Docker, and React. Passionate about AI agents."
        }
        res = await client.post("/api/profile/parse-resume", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "Python" in data["extracted_skills"]
        assert "FastAPI" in data["extracted_skills"]
        assert "AI Agents" in data["suggested_interests"]


@pytest.mark.asyncio
async def test_search_opportunities():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Search all
        res = await client.get("/api/search?query=Python&limit=10")
        assert res.status_code == 200
        items = res.json()
        assert len(items) > 0

        # Search jobs
        jobs_res = await client.get("/api/search/jobs?limit=5")
        assert jobs_res.status_code == 200
        assert all(item["type"] == "job" for item in jobs_res.json())

        # Search internships
        intern_res = await client.get("/api/search/internships?limit=5")
        assert intern_res.status_code == 200
        assert all(item["type"] == "internship" for item in intern_res.json())

        # Search hackathons
        hack_res = await client.get("/api/search/hackathons?limit=5")
        assert hack_res.status_code == 200
        assert all(item["type"] == "hackathon" for item in hack_res.json())


@pytest.mark.asyncio
async def test_match_on_the_fly():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        profile_data = {
            "name": "Jane Coder",
            "email": "jane@example.com",
            "bio": "Enthusiastic CS student",
            "target_role": "AI Engineer",
            "experience_level": "Student",
            "skills": ["Python", "FastAPI", "PyTorch", "Docker"],
            "preferred_locations": ["Remote"],
            "opportunity_types": ["job", "internship", "hackathon"],
            "interests": ["AI Agents"]
        }
        res = await client.post("/api/recommendations/match?limit_per_category=3", json=profile_data)
        assert res.status_code == 200
        data = res.json()
        assert "top_jobs" in data
        assert "top_internships" in data
        assert "top_hackathons" in data
        assert len(data["top_jobs"]) > 0
        
        # Verify match score and rationale
        top_match = data["top_jobs"][0]
        assert "match_score" in top_match
        assert top_match["match_score"] >= 0
        assert len(top_match["match_reasons"]) > 0


@pytest.mark.asyncio
async def test_summary_text_and_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Text Summary
        text_payload = {
            "title": "Autonomous AI Agent Engineer at Scale AI",
            "text": "Scale AI is seeking an AI Backend Engineer to build robust data pipelines and inference engines with Python, FastAPI, and Docker. Must have strong distributed systems background.",
            "opportunity_type": "job",
            "user_skills": ["Python", "FastAPI"]
        }
        res = await client.post("/api/summary/text", json=text_payload)
        assert res.status_code == 200
        data = res.json()
        assert "executive_summary" in data
        assert len(data["required_skills"]) > 0
        assert len(data["application_tips"]) > 0

        # Test URL Summary
        url_payload = {
            "url": "https://tinyfish.ai/hackathons/agent-builders-2026",
            "opportunity_type": "hackathon",
            "user_skills": ["Python", "TinyFish API"]
        }
        url_res = await client.post("/api/summary/url", json=url_payload)
        assert url_res.status_code == 200
        url_data = url_res.json()
        assert url_data["opportunity_type"] == "hackathon"
        assert len(url_data["application_tips"]) > 0


@pytest.mark.asyncio
async def test_tracker_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a user
        user_res = await client.post("/api/profile", json={
            "name": "Tracker Tester",
            "email": "tracker.tester@example.com",
            "target_role": "Backend Developer",
            "skills": ["Python"]
        })
        if user_res.status_code == 201:
            user_id = user_res.json()["id"]
        else:
            list_res = await client.get("/api/profile")
            user_id = list_res.json()[0]["id"]

        # 2. Save opportunity
        save_res = await client.post("/api/tracker/save", json={
            "user_id": user_id,
            "opportunity_id": "job-scale-ai-01",
            "opportunity_title": "AI Backend Engineer",
            "organization": "Scale AI",
            "opportunity_type": "job",
            "url": "https://scale.com/careers/ai-backend-engineer",
            "status": "saved",
            "notes": "Follow up after completing the agent prototype."
        })
        assert save_res.status_code in (200, 201)
        tracker_item = save_res.json()
        tracker_id = tracker_item["id"]

        # 3. List tracked
        list_tracked = await client.get(f"/api/tracker/{user_id}")
        assert list_tracked.status_code == 200
        assert len(list_tracked.json()) >= 1

        # 4. Update status to applied
        update_res = await client.patch(f"/api/tracker/{tracker_id}/status", json={
            "status": "applied",
            "notes": "Submitted application today with custom cover letter."
        })
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "applied"
        assert update_res.json()["applied_at"] is not None

        # 5. Delete tracker item
        del_res = await client.delete(f"/api/tracker/{tracker_id}")
        assert del_res.status_code == 204
