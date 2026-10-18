import { EmailDigestConfig, Opportunity, StudentProfile } from '../types/opportunity';
import { getCurrentAuthToken } from './firebase';

/**
 * Dedicated Email Service Adapter for Hirely
 * Connects directly to backend email automation endpoints (FastAPI / Express).
 * Never fakes delivery: validates real responses and surfaces actionable errors.
 */

export interface ScheduleEmailPayload {
  email: string;
  opportunityId: string;
  opportunityTitle: string;
  deadline: string | null;
  reminderType: 'applied_confirmation' | 'deadline_approaching';
}

export type EmailDeliveryStatus =
  | 'idle'
  | 'delivered'
  | 'failed';

export interface EmailDispatchResult {
  success: boolean;
  status: EmailDeliveryStatus;
  statusText: string;
  mode?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Checks if the backend email service endpoint is active and configured.
 */
export async function fetchEmailBackendStatus(): Promise<{
  online: boolean;
  isConfigured: boolean;
  mode: string;
  fromEmail: string;
  error?: string;
}> {
  const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/email/status` : '/api/email/status';
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        isConfigured: Boolean(data.is_configured || data.smtp_configured || data.resend_configured),
        mode: data.mode || (data.smtp_configured ? 'SMTP' : 'Unconfigured'),
        fromEmail: data.from_email || 'notifications@hirely.ai'
      };
    }
    return {
      online: false,
      isConfigured: false,
      mode: 'Unavailable',
      fromEmail: '',
      error: `Status endpoint returned HTTP ${res.status}`
    };
  } catch (err: any) {
    return {
      online: false,
      isConfigured: false,
      mode: 'Disconnected',
      fromEmail: '',
      error: err?.message || 'Failed to reach email service'
    };
  }
}

/**
 * Sends a real test digest email using the backend service and teammate's template.
 * Passes the signed-in user's profile and isolates preferences per account.
 */
export async function sendDigestEmail(
  config: EmailDigestConfig,
  topOpportunities: Opportunity[],
  profile?: Partial<StudentProfile> | null,
  isTest: boolean = true
): Promise<EmailDispatchResult> {
  const recipient = profile?.email?.trim() || config.email?.trim();

  if (!recipient || !recipient.includes('@')) {
    return {
      success: false,
      status: 'failed',
      statusText: 'No valid recipient email address configured. Please save your email under Profile or Settings.'
    };
  }

  const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/email/send-recommendations` : '/api/email/send-recommendations';

  const token = await getCurrentAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = {
    recipient,
    email: recipient,
    recipient_name: profile?.name || 'Student Candidate',
    name: profile?.name || 'Student Candidate',
    target_role: profile?.fieldOfStudy ? `${profile.fieldOfStudy} Engineer` : 'Software / AI Engineer',
    skills: profile?.skills || [],
    interests: profile?.interests || [],
    location: profile?.location || 'Remote',
    is_test: isTest,
    opportunities: topOpportunities.map(o => ({
      id: o.id,
      title: o.title,
      organization: o.organization,
      type: o.category,
      category: o.category,
      url: o.url,
      deadline: o.deadlineFormatted || o.deadline,
      compensation: o.stipendOrAward,
      stipend: o.stipendOrAward,
      location: o.location,
      is_remote: o.isRemote,
      match_score: o.match_score,
      summary: o.description,
      description: o.description,
      key_skills: o.required_skills
    })),
    use_tinyfish_live: false,
    limit: topOpportunities.length
  };

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success) {
      return {
        success: true,
        status: 'delivered',
        statusText: `Opportunity digest successfully dispatched to ${recipient}.`,
        mode: data.mode
      };
    }

    const errorDetail =
      data?.detail ||
      data?.message ||
      (res.status === 400 || res.status === 503
        ? 'Email service is unconfigured. Please configure RESEND_API_KEY or SMTP credentials in backend/.env'
        : `Email delivery could not be completed (HTTP ${res.status}).`);

    return {
      success: false,
      status: 'failed',
      statusText: errorDetail
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      statusText: `Backend email service unreachable (${err?.message || 'Network error'}). Ensure the backend server is running.`
    };
  }
}

/**
 * Schedules an application confirmation notification.
 */
export async function scheduleEmailNotification(payload: ScheduleEmailPayload): Promise<EmailDispatchResult> {
  if (!payload.email || !payload.email.includes('@')) {
    return {
      success: false,
      status: 'failed',
      statusText: 'Invalid email address.'
    };
  }

  const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/email/test` : '/api/email/test';
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        recipient: payload.email,
        subject: `Application Confirmation: ${payload.opportunityTitle}`,
        message: `Your application submission for "${payload.opportunityTitle}" has been logged in your Hirely pipeline.`
      })
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return {
        success: true,
        status: 'delivered',
        statusText: `Confirmation email dispatched to ${payload.email}.`
      };
    }
    return {
      success: false,
      status: 'failed',
      statusText: data?.detail || data?.message || 'Email service unconfigured.'
    };
  } catch {
    return {
      success: false,
      status: 'failed',
      statusText: 'Could not connect to backend email service.'
    };
  }
}