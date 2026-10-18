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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Sends chat prompt to FastAPI backend at POST /api/chat
 * The backend handles all Gemini API execution using server-side GEMINI_API_KEY.
 * No API keys are read, stored, or exposed in the frontend.
 */
export async function askHirelyCore(request: HirelyCoreRequest): Promise<HirelyCoreResponse> {
  const { messages, userProfile, userId, selectedOpportunity } = request;
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

  // Contract: POST {VITE_API_BASE_URL}/api/chat
  const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/chat` : '/api/chat';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Attach Firebase ID token if authenticated
  const token = await getCurrentAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = {
    message: augmentedMessage,
    history,
    user_id: userId || userProfile.email || 1,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for LLM inference

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          `The backend chat endpoint (${targetUrl}) returned 404 Not Found. Please ensure the Python FastAPI backend has the /api/chat router registered.`
        );
      }
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || errorData?.message || `Backend service error (HTTP ${res.status}).`
      );
    }

    const data = await res.json();
    const replyText = data.reply || data.response || data.message || data.answer;

    if (!replyText) {
      throw new Error('Received an invalid or empty response from the backend chat service.');
    }

    return {
      reply: replyText,
      modelUsed: data.model_used || data.model || 'gemini-3.8-flash',
      isFallback: data.model_used === 'hirely-local-reasoning' || Boolean(data.is_fallback),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Hirely Core request timed out. Please check your backend connection and try again.');
    }
    // Re-throw genuine backend or network failure without fabricating fake AI response
    throw new Error(err.message || 'Unable to connect to Hirely Core chat service.');
  }
}
