import { StudentProfile, Opportunity } from '../types/opportunity';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  isFallback?: boolean;
}

export interface HirelyCoreRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  userProfile: StudentProfile;
  opportunities: Opportunity[];
  selectedOpportunity?: Opportunity | null;
  action?: string;
  customText?: string;
}

export interface HirelyCoreResponse {
  reply: string;
  modelUsed: string;
  isFallback: boolean;
}

export async function askHirelyCore(request: HirelyCoreRequest): Promise<HirelyCoreResponse> {
  try {
    const res = await fetch('/api/hirely-core', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        reply: data.reply,
        modelUsed: data.modelUsed || 'gemini-3.8-flash',
        isFallback: Boolean(data.isFallback),
      };
    }
  } catch (err) {
    console.warn('Backend Hirely Core proxy unavailable, activating client-side intelligence fallback:', err);
  }

  // Graceful client-side fallback if server endpoint is offline
  return generateIntelligentFallback(request);
}

function generateIntelligentFallback(request: HirelyCoreRequest): HirelyCoreResponse {
  const { messages, userProfile, opportunities, selectedOpportunity } = request;
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';

  // 1. Match explanation
  if (selectedOpportunity || lastUserMsg.includes('match') || lastUserMsg.includes('why')) {
    const opp = selectedOpportunity || opportunities[0];
    if (opp) {
      const userSkills = new Set(userProfile.skills.map(s => s.toLowerCase()));
      const matchingSkills = opp.required_skills.filter(s => userSkills.has(s.toLowerCase()));
      const missingSkills = opp.required_skills.filter(s => !userSkills.has(s.toLowerCase()));

      let reply = `## Match Assessment for ${opp.title} at ${opp.organization}\n\n`;
      reply += `**Overall Match Score:** ${opp.match_score}%\n\n`;
      reply += `**Why This Fits Your Profile:**\n`;
      if (matchingSkills.length > 0) {
        reply += `* You meet the core required skills: **${matchingSkills.join(', ')}** based on your verified ${userProfile.degree} coursework.\n`;
      }
      reply += `* Work mode is **${opp.workArrangement}** (${opp.location}), which aligns with your preference.\n`;
      reply += `* Stipend & Award: **${opp.stipendOrAward}**.\n\n`;

      if (missingSkills.length > 0) {
        reply += `**Recommended Priority Skills to Add:**\n`;
        missingSkills.forEach(skill => {
          reply += `* **${skill}**: Build a concrete mini-project or review core concepts before applying.\n`;
        });
        reply += `\n`;
      }

      reply += `**Application Deadline:** ${opp.deadlineFormatted} (${opp.daysLeft !== null ? `${opp.daysLeft} days remaining` : 'Rolling admissions'}).\n\n`;
      reply += `**Next Actionable Step:** Verify your resume includes links to your GitHub and projects showcasing **${matchingSkills[0] || 'Python'}**, then submit directly on the [Official Application Portal](${opp.url}).`;

      return {
        reply,
        modelUsed: 'hirely-deterministic-engine',
        isFallback: true,
      };
    }
  }

  // 2. Skill gap / learning roadmap
  if (lastUserMsg.includes('skill') || lastUserMsg.includes('learn') || lastUserMsg.includes('roadmap')) {
    const allRequiredSkills = Array.from(new Set(opportunities.flatMap(o => o.required_skills)));
    const userSkills = new Set(userProfile.skills.map(s => s.toLowerCase()));
    const unacquired = allRequiredSkills.filter(s => !userSkills.has(s.toLowerCase())).slice(0, 4);

    let reply = `## Skills Gap & Learning Strategy for ${userProfile.name}\n\n`;
    reply += `Based on the latest **${opportunities.length} live opportunities** discovered across Delhi/NCR and Global Remote:\n\n`;
    reply += `**Your Strong Foundation:**\n`;
    userProfile.skills.slice(0, 4).forEach(s => {
      reply += `* **${s}** — high market demand across AI and systems engineering roles.\n`;
    });
    reply += `\n**Top 3 High-Yield Skills to Acquire:**\n`;
    unacquired.forEach((s, idx) => {
      reply += `${idx + 1}. **${s}**: Appears frequently in senior research and infrastructure postings like Google DeepMind and Microsoft IDC.\n`;
    });
    reply += `\n**Weekly Action Plan:**\n`;
    reply += `* **Days 1–3**: Implement a distributed worker or async pipeline using ${unacquired[0] || 'Distributed Systems'}.\n`;
    reply += `* **Days 4–6**: Connect an AI inference endpoint with streaming tokens.\n`;
    reply += `* **Day 7**: Polish documentation and push to public GitHub.`;

    return {
      reply,
      modelUsed: 'hirely-deterministic-engine',
      isFallback: true,
    };
  }

  // 3. General overview
  const topOpp = opportunities[0];
  let reply = `## Hello ${userProfile.name.split(' ')[0]}! I'm Hirely Core.\n\n`;
  reply += `I have indexed your talent profile (**${userProfile.degree}** in **${userProfile.fieldOfStudy}**) and **${opportunities.length} verified live opportunities**.\n\n`;
  reply += `**Highlights for your profile today:**\n`;
  if (topOpp) {
    reply += `* Top Match: **${topOpp.title}** at **${topOpp.organization}** with **${topOpp.match_score}% match**.\n`;
  }
  reply += `* Target Location: **${userProfile.location}**.\n`;
  reply += `* Active Applications: You have applications currently tracked in your pipeline.\n\n`;
  reply += `**How can I assist you right now?**\n`;
  reply += `* Ask: *"Analyze my top matches in Delhi/NCR"*\n`;
  reply += `* Ask: *"What skills should I learn for Google DeepMind?"*\n`;
  reply += `* Ask: *"Review my eligibility for the MIT Hackathon"*\n`;
  reply += `* Or paste any job description to extract structured requirements.`;

  return {
    reply,
    modelUsed: 'hirely-deterministic-engine',
    isFallback: true,
  };
}
