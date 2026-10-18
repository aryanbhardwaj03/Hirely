import { EmailDigestConfig, Opportunity } from '../types/opportunity';

/**
 * Dedicated Email Service Adapter for Hirely
 * Prepared for the backend email provider integration.
 * Preserves separation between UI preferences and actual delivery logic.
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
  | 'pending_backend_contract'
  | 'delivered'
  | 'failed';

export interface EmailDispatchResult {
  success: boolean;
  status: EmailDeliveryStatus;
  statusText: string;
}

/**
 * Checks if the backend email service endpoint is configured.
 */
export function isSmtpBackendAvailable(): boolean {
  // The frontend adapter remains conservative until a user profile ID is available.
  return false;
}

/**
 * Schedules an email notification (application confirmation or deadline reminder).
 * Kept pending to avoid fake delivery claims before backend deployment.
 */
export async function scheduleEmailNotification(payload: ScheduleEmailPayload): Promise<EmailDispatchResult> {
  // An application confirmation requires a persisted backend profile and tracker item.
  return {
    success: false,
    status: 'pending_backend_contract',
    statusText: `Email notification adapter ready for ${payload.email} — backend profile link required.`,
  };
}

/**
 * Triggers dispatch of the student opportunity briefing digest.
 * UI cleanly reports pending backend status without claiming fake delivery.
 */
export async function sendDigestEmail(
  config: EmailDigestConfig,
  topOpportunities: Opportunity[]
): Promise<EmailDispatchResult> {
  return {
    success: false,
    status: 'pending_backend_contract',
    statusText: `Email delivery adapter primed for ${config.email} (${topOpportunities.length} opportunities) — backend profile link required.`,
  };
}
