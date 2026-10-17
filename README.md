# 🚀 Hirely AI - Backend

**Hirely AI** is an intelligent career & hackathon co-pilot built for hackathons. It leverages the **TinyFish AI API** (Search, Fetch, and Web Agents) to search live jobs, internships, and hackathons tailored to a developer's profile, generate personalized AI match scores with clear rationales, and extract structured summaries with actionable application tips.

---

## 🌟 Key Features

1. **TinyFish AI Live Search & Discovery**:
   - Searches live web opportunities across jobs, internships, and hackathons via the TinyFish Search API.
   - Built-in smart fallback to curated opportunities if the API key is not yet set or during offline hackathon demo presentations.
2. **AI Recommendation & Profile Matching Engine**:
   - Analyzes user skills, target role, experience level, location preferences, and domain interests.
   - Computes weighted **Match Scores (0 - 100%)**, classifies match tiers (*Exceptional Match*, *Strong Match*, etc.), and generates human-readable match explanations with matched & missing skills.
3. **TinyFish Web Scraper & AI Summarization**:
   - Given any job or hackathon URL (LinkedIn, Devpost, company career sites), uses the **TinyFish Fetch API** to render and scrape clean page markdown (stripping ads and clutter).
   - Generates structured summaries: Executive Overview, Key Responsibilities, Required vs. Nice-to-Have Skills, Eligibility & Deadlines, Compensation/Prizes, and **Strategic Application Tips** to help candidates stand out.
4. **Resume / Bio Auto-Parser**:
   - Extracts technical skills, suggested roles, and domain interests directly from raw resume text or bio.
5. **Application Tracker & Bookmarks**:
   - Save and track opportunities across stages: `saved`, `applied`, `interviewing`, `accepted`, `rejected`.
6. **Frontend-Ready**:
   - Fully enabled CORS (`*`, `localhost:3000`, `localhost:5173`, etc.).
   - Interactive OpenAPI/Swagger documentation at `/docs`.

---

## 🛠️ Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **AI Web Agent & Search**: [TinyFish AI SDK & REST APIs](https://tinyfish.ai) (`tinyfish` >= 0.9.0)
- **Database**: SQLite with async [SQLAlchemy 2.0](https://www.sqlalchemy.org/) & `aiosqlite`
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) & `email-validator`
- **Testing**: `pytest` & `pytest-asyncio` with `httpx`

---

## ⚡ Quick Start

### 1. Prerequisites
- Python 3.11+ installed

### 2. Activate Virtual Environment & Install Dependencies
```bash
# If using uv (fastest):
uv venv .venv
.venv\Scripts\activate
uv pip install -r requirements.txt

# Or with standard python:
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and add your **TinyFish API key** (get one at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)):
```env
TINYFISH_API_KEY=your_tinyfish_api_key_here
```
> **Note:** If `TINYFISH_API_KEY` is left blank, the backend automatically runs in **Smart Mock & Demo Mode**, returning realistic opportunities so your frontend teammates can develop and demo without blockers!

### 4. Run the Backend Server
```bash
python run.py
```
Or directly with uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Docs**: `http://localhost:8000/redoc`

---

## 📡 API Reference for Frontend Teammates

### 1. User Profile

#### `POST /api/profile` - Create Profile
**Request:**
```json
{
  "name": "Aryan Sharma",
  "email": "aryan@example.com",
  "bio": "AI and Full Stack developer building agentic workflows.",
  "target_role": "Full Stack / AI Engineer",
  "experience_level": "Student",
  "skills": ["Python", "FastAPI", "React", "Docker", "TypeScript"],
  "preferred_locations": ["Remote", "Bengaluru"],
  "opportunity_types": ["job", "internship", "hackathon"],
  "interests": ["AI Agents", "Cloud Architecture"]
}
```

#### `GET /api/profile/{id}` - Get Profile
Returns the profile object with `id`, `created_at`, and `updated_at`.

#### `POST /api/profile/parse-resume` - Auto-Extract Skills
**Request:**
```json
{
  "text": "Junior developer skilled in Python, FastAPI, Docker, and React. Passionate about AI agents."
}
```
**Response:**
```json
{
  "extracted_skills": ["Python", "FastAPI", "Docker", "React"],
  "suggested_target_role": "Full Stack Developer",
  "suggested_experience_level": "Junior",
  "suggested_interests": ["AI Agents"],
  "extracted_summary": "Profile identified as Junior specializing in Full Stack Developer..."
}
```

---

### 2. Search (TinyFish AI)

#### `GET /api/search`
Query parameters:
- `query` *(optional)*: Search keywords (e.g., `Python`, `AI Agent`)
- `opportunity_type` *(optional)*: `job`, `internship`, `hackathon`, or `all` (default: `all`)
- `location` *(optional)*: e.g. `Remote`, `Bengaluru`
- `remote_only` *(optional)*: `true` / `false`
- `limit` *(optional)*: Number of results (default: `20`)

#### Category Specific Search Shortcuts:
- `GET /api/search/jobs`
- `GET /api/search/internships`
- `GET /api/search/hackathons`

---

### 3. Personalized AI Recommendations

#### `GET /api/recommendations/{user_id}`
Returns AI-matched opportunities ranked by match score for a registered user.

**Response Structure:**
```json
{
  "user_id": 1,
  "user_name": "Aryan Sharma",
  "target_role": "Full Stack / AI Engineer",
  "total_matches": 15,
  "top_jobs": [
    {
      "opportunity": {
        "id": "job-scale-ai-01",
        "type": "job",
        "title": "AI Backend Engineer",
        "organization": "Scale AI",
        "location": "San Francisco, CA / Remote",
        "is_remote": true,
        "url": "https://scale.com/careers/ai-backend-engineer",
        "key_skills": ["Python", "FastAPI", "Docker", "Kubernetes", "PyTorch"],
        "compensation": "$135,000 - $165,000 + Equity"
      },
      "match_score": 92,
      "match_tier": "Exceptional Match",
      "match_reasons": [
        "Matches 3 of your skills: Python, FastAPI, Docker",
        "Strongly aligns with your desired role 'Full Stack / AI Engineer'",
        "Remote flexibility matches your location preferences"
      ],
      "matched_skills": ["Python", "FastAPI", "Docker"],
      "missing_skills": ["Kubernetes", "PyTorch"]
    }
  ],
  "top_internships": [...],
  "top_hackathons": [...]
}
```

#### `POST /api/recommendations/match` - On-the-Fly Match
Matches opportunities instantly for guest users before saving a profile.

---

### 4. TinyFish AI Summarizer

#### `POST /api/summary/url` - Scrape & Summarize Opportunity Link
Renders the URL using **TinyFish Fetch API** and returns structured insights.

**Request:**
```json
{
  "url": "https://devpost.com/hackathons/tinyfish-agent-hackathon",
  "opportunity_type": "hackathon",
  "user_skills": ["Python", "FastAPI", "React"]
}
```

**Response:**
```json
{
  "title": "TinyFish Web Agent & Browser AI Hackathon",
  "organization": "TinyFish AI",
  "opportunity_type": "hackathon",
  "url": "https://devpost.com/hackathons/tinyfish-agent-hackathon",
  "executive_summary": "Build the next generation of autonomous web agents, live browser scrapers, and AI copilots using TinyFish's Search, Fetch, and Agent APIs...",
  "key_responsibilities": [
    "Form a team and brainstorm an impactful, creative project prototype",
    "Build a working end-to-end MVP utilizing suggested APIs and technologies",
    "Prepare a compelling video demo and submission walkthrough for judges"
  ],
  "required_skills": ["Python", "FastAPI", "TinyFish API", "AI Agents"],
  "nice_to_have_skills": ["Cloud Deployment", "CI/CD"],
  "eligibility_and_requirements": [
    "Open to all developers, students, and creators globally",
    "Teams of 1 to 4 participants permitted"
  ],
  "compensation_or_prizes": "$25,000 Prize Pool + TinyFish Cloud Credits",
  "deadlines_or_dates": "Nov 25, 2026",
  "why_it_matters": "Building in this hackathon gives you high-visibility proof-of-work...",
  "application_tips": [
    "Highlight your experience with Python, FastAPI prominently at the top of your resume/application.",
    "Focus on creating a clear 2-minute video demo with a working deployed link; judges prioritize working prototypes."
  ],
  "source": "TinyFish AI Fetch & Agent Extractor"
}
```

#### `POST /api/summary/text` - Summarize Raw Text
Summarizes pasted job or hackathon description text.

---

### 5. Application Tracker

- `POST /api/tracker/save` - Save/bookmark opportunity
- `GET /api/tracker/{user_id}` - Retrieve tracked items (optional `?status_filter=saved`)
- `PATCH /api/tracker/{tracker_id}/status` - Update status (`saved`, `applied`, `interviewing`, `accepted`, `rejected`) and notes
- `DELETE /api/tracker/{tracker_id}` - Remove tracked opportunity

---

## 🧪 Running Tests

The backend includes an automated test suite verifying all endpoints, SQLite integration, TinyFish fallbacks, and matching scores:

```bash
pytest -v
```

All 8 tests pass with 100% success rate.

---

## 📁 Project Structure

```
Hirely/
├── app/
│   ├── core/
│   │   ├── config.py             # Settings, pydantic-settings, CORS
│   │   └── database.py           # SQLite async SQLAlchemy engine & sessions
│   ├── data/
│   │   └── mock_opportunities.py # Curated fallback jobs, internships, hackathons
│   ├── models/
│   │   ├── user_profile.py       # User profile model
│   │   ├── opportunity.py        # Opportunity model
│   │   └── application.py        # Application tracker model
│   ├── schemas/
│   │   ├── user_profile.py       # Profile & resume parser schemas
│   │   ├── opportunity.py        # Search, filters, match result schemas
│   │   ├── summary.py            # TinyFish summary schemas
│   │   └── tracker.py            # Application tracker schemas
│   ├── services/
│   │   ├── tinyfish_client.py    # TinyFish Search, Fetch, Agent API client
│   │   ├── matching_service.py   # Multi-factor profile matching engine
│   │   └── summarizer_service.py # Web scraping & AI extraction service
│   ├── routers/
│   │   ├── profile.py            # Profile CRUD & resume parser
│   │   ├── search.py             # Opportunity search
│   │   ├── recommendations.py    # AI matched suggestions
│   │   ├── summary.py            # Opportunity summarization
│   │   └── tracker.py            # Saved/applied application tracker
│   └── main.py                   # FastAPI app, CORS, lifespan seeding
├── tests/
│   └── test_api.py               # Pytest suite for all endpoints
├── .env.example                  # Sample environment variables
├── .env                          # Local environment variables
├── .gitignore                    # Python gitignore
├── requirements.txt              # Production & test dependencies
├── run.py                        # Startup script
└── README.md                     # Comprehensive backend documentation
```
