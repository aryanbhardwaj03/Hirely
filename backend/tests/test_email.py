import pytest
import pytest_asyncio
from unittest.mock import MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import init_db
from app.services.email_service import email_service
from app.data.mock_opportunities import MOCK_OPPORTUNITIES


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    yield


@pytest.mark.asyncio
async def test_email_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/email/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "online"
        assert "mode" in data
        assert "smtp_enabled" in data
        assert "from_email" in data


@pytest.mark.asyncio
async def test_send_test_email():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "recipient": "tester@hirely.ai",
            "subject": "Test Verification",
            "message": "Testing SMTP pipeline."
        }
        res = await client.post("/api/email/test", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["recipient"] == "tester@hirely.ai"
        assert data["mode"] in ("simulated", "live")


@pytest.mark.asyncio
async def test_welcome_email_and_opportunity_email_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a candidate profile
        profile_payload = {
            "name": "Sarah Connor",
            "email": "sarah.connor@example.com",
            "bio": "AI Systems engineer specialized in autonomous agents and Python backend.",
            "target_role": "AI Backend Engineer",
            "experience_level": "Mid-Level",
            "skills": ["Python", "FastAPI", "Docker", "PyTorch", "Web Search"],
            "preferred_locations": ["Remote", "Bengaluru"],
            "opportunity_types": ["job", "internship", "hackathon"],
            "interests": ["AI Agents", "Cloud Architecture"]
        }
        create_res = await client.post("/api/profile", json=profile_payload)
        if create_res.status_code == 201:
            user_id = create_res.json()["id"]
        else:
            list_res = await client.get("/api/profile")
            user_id = list_res.json()[0]["id"]

        # 2. Trigger welcome email endpoint
        welcome_res = await client.post(f"/api/email/welcome/{user_id}")
        assert welcome_res.status_code == 200
        welcome_data = welcome_res.json()
        assert welcome_data["success"] is True
        assert "Sarah" in welcome_data["subject"] or "Welcome" in welcome_data["subject"]

        # 3. Trigger opportunity recommendation email endpoint (live search + matching)
        opp_res = await client.post(f"/api/email/opportunities/{user_id}?limit=4&use_live_search=true")
        assert opp_res.status_code == 200
        opp_data = opp_res.json()
        assert opp_data["success"] is True
        assert opp_data["items_count"] == 4
        assert "Opportunities" in opp_data["subject"] or "Career" in opp_data["subject"]

        # 4. Test send-recommendations payload endpoint
        req_payload = {
            "user_id": user_id,
            "limit": 3,
            "use_live_search": False,
            "opportunity_type": "job"
        }
        rec_res = await client.post("/api/email/send-recommendations", json=req_payload)
        assert rec_res.status_code == 200
        rec_data = rec_res.json()
        assert rec_data["success"] is True
        assert rec_data["items_count"] <= 3


@pytest.mark.asyncio
async def test_email_digest_all():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/email/digest-all?limit_per_user=2&use_live_search=false")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        assert data["successful"] >= 1


def test_email_template_builders():
    user_dict = {
        "name": "Devin Coder",
        "email": "devin@example.com",
        "target_role": "Full Stack Engineer",
        "experience_level": "Junior",
        "skills": ["Python", "FastAPI", "React", "Docker"],
        "preferred_locations": ["Remote"]
    }

    # Test Welcome Email Template
    sub_w, html_w, text_w = email_service.build_welcome_email(user_dict)
    assert "Devin Coder" in sub_w or "Welcome" in sub_w
    assert "Devin Coder" in html_w
    assert "Full Stack Engineer" in html_w
    assert "Python" in html_w
    assert "AI-powered" in html_w

    # Test Opportunity Email Template
    opp_sample = [
        {
            "opportunity": MOCK_OPPORTUNITIES[0],
            "match_score": 95,
            "match_tier": "Exceptional Match",
            "match_reasons": ["High skill match on Python and FastAPI"],
            "matched_skills": ["Python", "FastAPI"]
        }
    ]
    sub_o, html_o, text_o = email_service.build_opportunity_email(user_dict, opp_sample)
    assert "Opportunities" in sub_o or "Career" in sub_o
    assert "95% Match" in html_o
    assert "Exceptional Match" in html_o
    assert "Python" in html_o
    assert MOCK_OPPORTUNITIES[0]["title"] in html_o


def test_live_smtp_transport_mocked():
    """Verifies the live SMTP connection and transport logic using mocked smtplib."""
    with patch("smtplib.SMTP") as mock_smtp_class:
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__.return_value = mock_server

        # Test sync transport
        result = email_service._send_smtp_sync(
            to_email="recipient@example.com",
            subject="Test Subject",
            html_content="<p>Hello World</p>",
            text_content="Hello World"
        )

        assert result["success"] is True
        assert mock_server.send_message.called
