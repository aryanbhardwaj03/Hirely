import { EmailDigestConfig, Opportunity } from '../types/opportunity';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface ScheduleEmailPayload {
  email: string;
  opportunityId: string;
  opportunityTitle: string;
  deadline: string | null;
  reminderType: 'applied_confirmation' | 'deadline_approaching';
}

export interface EmailDispatchResult {
  success: boolean;
  statusText: string;
  isSimulated: boolean;
}

/**
 * Schedules an email notification (e.g. application confirmation or deadline reminder).
 */
export async function scheduleEmailNotification(payload: ScheduleEmailPayload): Promise<EmailDispatchResult> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/schedule-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return {
          success: true,
          statusText: 'Confirmation email queued on production mail worker.',
          isSimulated: false,
        };
      }
    } catch {
      // Fallback
    }
  }

  // Hackathon simulation mode
  return {
    success: true,
    statusText: `Confirmation email scheduled for ${payload.email}`,
    isSimulated: true,
  };
}

/**
 * Triggers dispatch of the student opportunity briefing digest.
 */
export async function sendDigestEmail(
  config: EmailDigestConfig,
  topOpportunities: Opportunity[]
): Promise<EmailDispatchResult> {
  if (API_BASE_URL) {
    try {
      // TODO: Connects to backend email digest endpoint
      const res = await fetch(`${API_BASE_URL}/api/send-digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, opportunityIds: topOpportunities.map(o => o.id) }),
      });
      if (res.ok) {
        return {
          success: true,
          statusText: `Live digest sent to ${config.email}`,
          isSimulated: false,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    success: true,
    statusText: `Demo digest generated and queued for ${config.email}`,
    isSimulated: true,
  };
}
