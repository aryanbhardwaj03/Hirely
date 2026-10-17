import re
from typing import List, Dict, Any, Tuple
from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileBase

SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "k8s": "kubernetes",
    "tf": "tensorflow",
    "reactjs": "react",
    "react.js": "react",
    "vuejs": "vue",
    "nextjs": "next.js",
    "node": "node.js",
    "nodejs": "node.js",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "ml": "machine learning",
    "dl": "deep learning",
    "genai": "generative ai",
    "llm": "llms",
    "agents": "ai agents",
    "sol": "solidity"
}


def normalize_skill(skill: str) -> str:
    cleaned = re.sub(r"[^\w\s\.\+#]", "", skill.strip().lower())
    return SKILL_ALIASES.get(cleaned, cleaned)


class MatchingService:
    """
    Intelligent profile-to-opportunity matching engine.
    Calculates weighted match score (0-100), categorizes match tiers,
    and explains match rationale with specific skill overlaps.
    """

    @classmethod
    def match_opportunity(
        cls,
        user: UserProfile | UserProfileBase | Dict[str, Any],
        opportunity: Dict[str, Any]
    ) -> Tuple[int, str, List[str], List[str], List[str]]:
        """
        Computes match score and breakdown between user profile and opportunity.
        Returns: (match_score, match_tier, match_reasons, matched_skills, missing_skills)
        """
        # Extract user profile attributes
        if isinstance(user, dict):
            user_skills = user.get("skills", [])
            target_role = user.get("target_role", "Software Engineer")
            experience_level = user.get("experience_level", "Student")
            pref_locations = user.get("preferred_locations", ["Remote"])
            interests = user.get("interests", [])
            opp_types = user.get("opportunity_types", ["job", "internship", "hackathon"])
        else:
            user_skills = getattr(user, "skills", []) or []
            target_role = getattr(user, "target_role", "Software Engineer") or "Software Engineer"
            experience_level = getattr(user, "experience_level", "Student") or "Student"
            pref_locations = getattr(user, "preferred_locations", ["Remote"]) or ["Remote"]
            interests = getattr(user, "interests", []) or []
            opp_types = getattr(user, "opportunity_types", ["job", "internship", "hackathon"]) or ["job", "internship", "hackathon"]

        # Normalize user skills
        user_norm_skills = {normalize_skill(s): s for s in user_skills}

        # Opportunity attributes
        opp_skills = opportunity.get("key_skills", []) or []
        opp_type = opportunity.get("type", "job")
        opp_title = opportunity.get("title", "")
        opp_desc = opportunity.get("description", "")
        opp_loc = opportunity.get("location", "")
        is_remote = opportunity.get("is_remote", True)
        opp_exp = opportunity.get("experience_level", "Any")

        # 1. Skill Overlap Calculation (Weight: 45%)
        matched_skills = []
        missing_skills = []
        for req_skill in opp_skills:
            norm_req = normalize_skill(req_skill)
            if norm_req in user_norm_skills or any(norm_req in u or u in norm_req for u in user_norm_skills):
                matched_skills.append(req_skill)
            else:
                missing_skills.append(req_skill)

        if opp_skills:
            skill_ratio = len(matched_skills) / len(opp_skills)
            skill_score = min(100, int(skill_ratio * 100))
        else:
            # If opportunity doesn't list explicit skills, scan description against user skills
            matched_in_desc = [s for s, norm in user_norm_skills.items() if norm in opp_desc.lower()]
            skill_score = min(100, len(matched_in_desc) * 25)
            matched_skills = matched_in_desc

        # 2. Target Role & Title Alignment (Weight: 25%)
        role_terms = [t.lower() for t in re.split(r"[\s\/\-]+", target_role) if len(t) > 2]
        title_terms = [t.lower() for t in re.split(r"[\s\/\-]+", opp_title) if len(t) > 2]
        
        role_matches = sum(1 for term in role_terms if term in title_terms or term in opp_title.lower())
        if role_terms:
            role_score = min(100, int((role_matches / len(role_terms)) * 100))
        else:
            role_score = 70

        # Hackathon role flexibility boost
        if opp_type == "hackathon":
            role_score = max(role_score, 85)

        # 3. Experience Level Compatibility (Weight: 15%)
        exp_score = 75
        user_exp_lower = experience_level.lower()
        opp_exp_lower = opp_exp.lower()

        if opp_type == "hackathon":
            exp_score = 100  # Hackathons welcome all experience levels
        elif "student" in user_exp_lower:
            if opp_type == "internship":
                exp_score = 100
            elif opp_exp_lower in ("entry-level", "student", "any"):
                exp_score = 90
            else:
                exp_score = 55
        elif "entry" in user_exp_lower or "junior" in user_exp_lower:
            if opp_exp_lower in ("entry-level", "junior", "any", "student"):
                exp_score = 100
            else:
                exp_score = 65
        else:
            exp_score = 85

        # 4. Location & Remote Compatibility (Weight: 10%)
        loc_score = 50
        pref_locs_lower = [l.lower() for l in pref_locations]
        if is_remote and any("remote" in l for l in pref_locs_lower):
            loc_score = 100
        elif any(l in opp_loc.lower() for l in pref_locs_lower):
            loc_score = 100
        elif is_remote:
            loc_score = 85

        # 5. Domain Interests Match (Weight: 5%)
        interest_score = 50
        interests_lower = [i.lower() for i in interests]
        combined_text = f"{opp_title} {opp_desc}".lower()
        matched_interests = [i for i in interests_lower if i in combined_text]
        if matched_interests:
            interest_score = 100

        # Weighted Total Score
        total_score = int(
            (skill_score * 0.45) +
            (role_score * 0.25) +
            (exp_score * 0.15) +
            (loc_score * 0.10) +
            (interest_score * 0.05)
        )
        total_score = max(15, min(99, total_score))

        # Check opportunity type preference
        if opp_type not in opp_types:
            total_score = int(total_score * 0.8)

        # Determine Tier
        if total_score >= 85:
            tier = "Exceptional Match"
        elif total_score >= 70:
            tier = "Strong Match"
        elif total_score >= 55:
            tier = "Good Match"
        else:
            tier = "Worth Exploring"

        # Generate Reason Explanations
        reasons = []
        if matched_skills:
            sample_skills = ", ".join(matched_skills[:4])
            reasons.append(f"Matches {len(matched_skills)} of your skills: {sample_skills}")
        
        if role_score >= 80:
            reasons.append(f"Strongly aligns with your desired role '{target_role}'")

        if opp_type == "hackathon":
            reasons.append(f"Great hackathon to showcase your portfolio and build agentic AI tools")
        elif opp_type == "internship" and "student" in user_exp_lower:
            reasons.append(f"Tailored for students seeking top-tier internship experience")

        if is_remote:
            reasons.append("Remote flexibility matches your location preferences")

        if matched_interests:
            reasons.append(f"Connects to your interest in {', '.join(matched_interests[:2])}")

        if not reasons:
            reasons.append("Matches your core engineering interests and experience profile")

        return total_score, tier, reasons, matched_skills, missing_skills

    @classmethod
    def rank_opportunities(
        cls,
        user: UserProfile | UserProfileBase | Dict[str, Any],
        opportunities: List[Dict[str, Any]],
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """Ranks a list of opportunities for a given user profile."""
        ranked = []
        for opp in opportunities:
            score, tier, reasons, matched_skills, missing_skills = cls.match_opportunity(user, opp)
            ranked.append({
                "opportunity": opp,
                "match_score": score,
                "match_tier": tier,
                "match_reasons": reasons,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills
            })

        ranked.sort(key=lambda x: x["match_score"], reverse=True)
        return ranked[:limit]


matching_service = MatchingService()
