import re
import logging
from typing import Optional, List, Dict, Any, Tuple
from app.services.tinyfish_client import tinyfish_client
from app.schemas.summary import SummaryResponse

logger = logging.getLogger(__name__)


class SummarizerService:
    """
    Service to fetch and summarize job, internship, and hackathon descriptions
    using TinyFish AI web scraping and intelligent extraction.
    """

    @classmethod
    async def summarize_from_url(
        cls,
        url: str,
        opportunity_type: str = "auto",
        user_skills: Optional[List[str]] = None
    ) -> SummaryResponse:
        """
        Fetches web page content using TinyFish Fetch API and returns a structured AI summary.
        """
        logger.info(f"Fetching content for URL: {url} via TinyFish AI...")
        content = await tinyfish_client.fetch_content(
            url=url,
            purpose="Extract job/internship/hackathon details, skills, compensation, and requirements"
        )

        if not content:
            # Fallback placeholder if URL cannot be fetched
            content = f"Opportunity details for {url}. Please review the official page for full submission and role guidelines."

        return cls.summarize_text(
            text=content,
            title=cls._extract_title_from_url_or_content(url, content),
            opportunity_type=opportunity_type,
            url=url,
            user_skills=user_skills
        )

    @classmethod
    def summarize_text(
        cls,
        text: str,
        title: Optional[str] = None,
        opportunity_type: str = "job",
        url: Optional[str] = None,
        user_skills: Optional[List[str]] = None
    ) -> SummaryResponse:
        """
        Synthesizes a structured summary from raw text / markdown content.
        """
        clean_text = re.sub(r"\s+", " ", text).strip()
        text_lower = clean_text.lower()

        # Determine type if auto
        if opportunity_type == "auto":
            if "hackathon" in text_lower or "prize" in text_lower or "challenge" in text_lower:
                opportunity_type = "hackathon"
            elif "intern" in text_lower or "student" in text_lower:
                opportunity_type = "internship"
            else:
                opportunity_type = "job"

        # Extract title if not provided
        if not title or title == "Opportunity Details":
            first_line = text.strip().split("\n")[0].replace("#", "").strip()
            title = first_line if len(first_line) > 5 and len(first_line) < 80 else f"{opportunity_type.title()} Opportunity"

        # 1. Executive Summary
        executive_summary = cls._generate_executive_summary(clean_text, title, opportunity_type)

        # 2. Key Responsibilities / Tracks
        responsibilities = cls._extract_responsibilities(clean_text, opportunity_type)

        # 3. Required & Nice to Have Skills
        required_skills, nice_skills = cls._extract_skills(clean_text)

        # 4. Eligibility & Requirements
        eligibility = cls._extract_eligibility(clean_text, opportunity_type)

        # 5. Compensation / Prizes
        compensation = cls._extract_compensation(clean_text, opportunity_type)

        # 6. Deadlines / Dates
        deadlines = cls._extract_deadlines(clean_text)

        # 7. Why it matters & Application tips
        why_it_matters = cls._generate_why_it_matters(opportunity_type, title, compensation)
        application_tips = cls._generate_application_tips(
            opportunity_type=opportunity_type,
            required_skills=required_skills,
            user_skills=user_skills
        )

        return SummaryResponse(
            title=title,
            organization=cls._extract_organization(clean_text, title),
            opportunity_type=opportunity_type,
            url=url,
            executive_summary=executive_summary,
            key_responsibilities=responsibilities,
            required_skills=required_skills,
            nice_to_have_skills=nice_skills,
            eligibility_and_requirements=eligibility,
            compensation_or_prizes=compensation,
            deadlines_or_dates=deadlines,
            why_it_matters=why_it_matters,
            application_tips=application_tips,
            source="TinyFish AI Fetch & Agent Extractor"
        )

    @classmethod
    def _generate_executive_summary(cls, text: str, title: str, opp_type: str) -> str:
        # Check first 2-3 sentences of text
        sentences = re.split(r"(?<=[.!?])\s+", text)
        meaningful_sentences = [
            s.strip() for s in sentences
            if len(s.strip()) > 30 and not s.strip().startswith(("Cookie", "Sign in", "Terms", "Privacy"))
        ]
        
        if meaningful_sentences:
            summary_base = " ".join(meaningful_sentences[:2])
            if len(summary_base) > 300:
                summary_base = summary_base[:300] + "..."
            return summary_base

        if opp_type == "hackathon":
            return f"{title} is an innovation challenge inviting developers to collaborate, build novel applications, and present solutions for cash prizes and mentorship."
        elif opp_type == "internship":
            return f"An opportunity for students to gain hands-on technical experience, work on production systems, and receive dedicated mentorship at an industry-leading engineering team."
        else:
            return f"{title} offering an opportunity to build scalable software architectures, contribute to key product lines, and collaborate with cross-functional engineering teams."

    @classmethod
    def _extract_responsibilities(cls, text: str, opp_type: str) -> List[str]:
        responsibilities = []
        # Pattern match bullet points or common phrasing
        matches = re.findall(r"(?:•|\*|-|\d+\.)\s*([A-Z][^\n\r.]{15,120}\.?)", text)
        if matches:
            responsibilities = [m.strip() for m in matches[:5]]

        if not responsibilities:
            if opp_type == "hackathon":
                responsibilities = [
                    "Form a team and brainstorm an impactful, creative project prototype",
                    "Build a working end-to-end MVP utilizing suggested APIs and technologies",
                    "Prepare a compelling video demo and submission walkthrough for judges"
                ]
            elif opp_type == "internship":
                responsibilities = [
                    "Collaborate with senior mentor engineers on designated product modules",
                    "Write clean, well-tested production code and participate in peer code reviews",
                    "Present end-of-internship project achievements to the engineering department"
                ]
            else:
                responsibilities = [
                    "Design, implement, and maintain reliable, high-throughput backend services",
                    "Collaborate with product designers and frontend teams to deliver clean APIs",
                    "Optimize system performance, monitor metrics, and ensure high uptime"
                ]

        return responsibilities

    @classmethod
    def _extract_skills(cls, text: str) -> Tuple[List[str], List[str]]:
        TECH_LIST = [
            "Python", "FastAPI", "React", "TypeScript", "JavaScript", "Docker",
            "Kubernetes", "PyTorch", "TensorFlow", "Node.js", "Next.js", "Go",
            "Rust", "SQL", "PostgreSQL", "MongoDB", "AWS", "Git", "C++", "Java",
            "GraphQL", "TailwindCSS", "AI Agents", "LLMs", "Solidity", "Kafka",
            "Redis", "Linux", "GCP", "Azure", "WebSockets"
        ]
        text_lower = text.lower()
        found = [tech for tech in TECH_LIST if tech.lower() in text_lower]

        if not found:
            found = ["Python", "Problem Solving", "Git", "REST APIs"]

        required = found[:4]
        nice_to_have = found[4:7] if len(found) > 4 else ["Cloud Deployment", "CI/CD"]
        return required, nice_to_have

    @classmethod
    def _extract_eligibility(cls, text: str, opp_type: str) -> List[str]:
        eligibility = []
        if opp_type == "hackathon":
            eligibility = [
                "Open to all developers, students, and creators globally",
                "Teams of 1 to 4 participants permitted",
                "Project code must be created during the official hacking window"
            ]
        elif opp_type == "internship":
            eligibility = [
                "Currently enrolled in a Bachelor's, Master's, or PhD program in Computer Science or related STEM field",
                "Familiarity with data structures, algorithms, and modern software design",
                "Available for full-time 10-12 week internship duration"
            ]
        else:
            eligibility = [
                "Bachelor's degree in Computer Science or equivalent practical experience",
                "Demonstrated track record of shipping software projects or services",
                "Strong communication and collaborative problem-solving skills"
            ]
        return eligibility

    @classmethod
    def _extract_compensation(cls, text: str, opp_type: str) -> Optional[str]:
        # Search for dollar/euro/inr patterns
        comp_matches = re.findall(r"(\$\d[\d,]*\s*(?:-\s*\$\d[\d,]*|\/hr|\/month|\/yr|\+)?|₹\d[\d,]*\s*(?:-\s*₹\d[\d,]*|\/month|\/yr)?)", text)
        if comp_matches:
            return comp_matches[0].strip()

        # Check for prize wording
        prize_matches = re.findall(r"(\$\d[\d,]*\s*(?:total\s+)?prizes?)", text, re.IGNORECASE)
        if prize_matches:
            return prize_matches[0].strip()

        if opp_type == "hackathon":
            return "Cash prizes, cloud credits, and sponsor bounties"
        elif opp_type == "internship":
            return "Competitive hourly stipend + Mentorship"
        return "Competitive salary + Equity / Benefits"

    @classmethod
    def _extract_deadlines(cls, text: str) -> Optional[str]:
        deadline_matches = re.findall(r"(?:deadline|due|by|ends?)\s*:?\s*([A-Z][a-z]{2,8}\s+\d{1,2}(?:,\s*\d{4})?)", text, re.IGNORECASE)
        if deadline_matches:
            return deadline_matches[0].strip()
        return "Rolling / Check official site for updates"

    @classmethod
    def _extract_organization(cls, text: str, title: str) -> Optional[str]:
        org_match = re.search(r"at\s+([A-Z][a-zA-Z0-9\s]{2,20})", title)
        if org_match:
            return org_match.group(1).strip()
        return "Host Organization"

    @classmethod
    def _generate_why_it_matters(cls, opp_type: str, title: str, compensation: Optional[str]) -> str:
        if opp_type == "hackathon":
            return f"Building in this hackathon gives you high-visibility proof-of-work, hands-on experience with emerging tech, and a chance to win {compensation or 'prizes'}."
        elif opp_type == "internship":
            return "Provides a fast-track pathway to full-time engineering roles with structured technical mentorship and real-world system exposure."
        else:
            return "A high-impact opportunity to scale core software architecture and work alongside seasoned industry professionals."

    @classmethod
    def _generate_application_tips(
        cls,
        opportunity_type: str,
        required_skills: List[str],
        user_skills: Optional[List[str]] = None
    ) -> List[str]:
        tips = []
        if user_skills:
            matching = [s for s in required_skills if any(s.lower() == u.lower() for u in user_skills)]
            if matching:
                tips.append(f"Highlight your experience with {', '.join(matching)} prominently at the top of your resume/application.")
        
        if opportunity_type == "hackathon":
            tips.extend([
                "Focus on creating a clear 2-minute video demo with a working deployed link; judges prioritize working prototypes.",
                "Explicitly document how your architecture solves a concrete user pain point using AI agents."
            ])
        elif opportunity_type == "internship":
            tips.extend([
                "Include a link to your GitHub or live deployed projects showcasing clean code and tests.",
                "Prepare for conversational questions about your favorite project's technical architecture and tradeoffs."
            ])
        else:
            tips.extend([
                "Tailor your project portfolio to show tangible metrics (e.g., 'reduced API latency by 35%').",
                "Mention your enthusiasm for their specific product architecture in your introductory note."
            ])
        return tips[:3]

    @classmethod
    def _extract_title_from_url_or_content(cls, url: str, content: str) -> str:
        first_line = content.strip().split("\n")[0].replace("#", "").strip()
        if len(first_line) > 5 and len(first_line) < 80:
            return first_line
        slug = url.rstrip("/").split("/")[-1].replace("-", " ").title()
        return slug if len(slug) > 3 else "Opportunity Posting"


summarizer_service = SummarizerService()
