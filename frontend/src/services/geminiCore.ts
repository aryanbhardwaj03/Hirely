import { StudentProfile, Opportunity } from '../types/opportunity';
import { getCurrentAuthToken } from './firebase';

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
  userId?: string | number;
  opportunities?: Opportunity[];
  selectedOpportunity?: Opportunity | null;
}

export interface HirelyCoreResponse {
  reply: string;
  modelUsed?: string;
  isFallback?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Sends chat prompt to FastAPI backend at POST /api/chat.
 * Tries configured chat backends and reports service failures instead of fabricating a canned answer.
 */
export async function askHirelyCore(request: HirelyCoreRequest): Promise<HirelyCoreResponse> {
  const { messages, userProfile, userId, selectedOpportunity, opportunities } = request;
  const lastMessage = messages[messages.length - 1]?.content || '';

  // Format conversation history for the backend
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Contextual enrichment if user has selected a specific opportunity
  let augmentedMessage = lastMessage;
  if (selectedOpportunity && !lastMessage.toLowerCase().includes(selectedOpportunity.title.toLowerCase())) {
    augmentedMessage = `[Opportunity Context: ${selectedOpportunity.title} at ${selectedOpportunity.organization} (${selectedOpportunity.location}, Stipend: ${selectedOpportunity.stipendOrAward}, Deadline: ${selectedOpportunity.deadlineFormatted})]\n${lastMessage}`;
  }

  const payload = {
    message: augmentedMessage,
    history,
    user_id: userId || userProfile.email || 1,
    context: {
      candidate: {
        name: userProfile.name,
        degree: userProfile.degree,
        field_of_study: userProfile.fieldOfStudy,
        year: userProfile.year,
        university: userProfile.university,
        skills: userProfile.skills,
        interests: userProfile.interests,
        location: userProfile.location,
      },
      selected_opportunity: selectedOpportunity ? {
        title: selectedOpportunity.title,
        organization: selectedOpportunity.organization,
        location: selectedOpportunity.location,
        required_skills: selectedOpportunity.required_skills,
        deadline: selectedOpportunity.deadlineFormatted,
        url: selectedOpportunity.url,
      } : null,
      top_opportunities: (opportunities || []).slice(0, 5).map((item) => ({
        title: item.title,
        organization: item.organization,
        required_skills: item.required_skills,
        deadline: item.deadlineFormatted,
        match_score: item.match_score,
        url: item.url,
      })),
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Attach Firebase ID token if authenticated
  try {
    const token = await getCurrentAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Auth token optional
  }

  // Candidate URLs to try:
  const candidateUrls = [
    API_BASE_URL ? `${API_BASE_URL}/api/chat` : null,
    '/api/chat',
    'http://localhost:8000/api/chat',
  ].filter((u): u is string => Boolean(u));

  const uniqueUrls = Array.from(new Set(candidateUrls));

  let lastError = '';
  for (const targetUrl of uniqueUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s per candidate attempt

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || data.response || data.message || data.answer;

        if (replyText) {
          return {
            reply: replyText,
            modelUsed: data.model_used || data.model || 'gemini-2.5-flash',
            isFallback: data.model_used === 'hirely-local-reasoning' || Boolean(data.is_fallback),
          };
        }
      } else {
        try {
          const data = await res.json();
          lastError = data.detail || data.error || `Hirely Core returned HTTP ${res.status}.`;
        } catch {
          lastError = `Hirely Core returned HTTP ${res.status}.`;
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err.message : 'Could not reach the Hirely Core service.';
    }
  }

  throw new Error(lastError || 'Could not connect to Hirely Core. Check that the backend is running and try again.');
}
