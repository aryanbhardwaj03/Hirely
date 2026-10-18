import { EmailDigestConfig, Opportunity } from '../types/opportunity';

/**
 * Dedicated Email Service Adapter for Hirely
 * Prepared for pending SMTP backend integration from teammate.
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
 * Checks if the backend SMTP service endpoint is configured.
 */
export function isSmtpBackendAvailable(): boolean {
  // Marked as pending until backend teammate supplies the finalized SMTP route
  return false;
}

/**
 * Schedules an email notification (application confirmation or deadline reminder).
 * Kept pending to avoid fake delivery claims before backend deployment.
 */
export async function scheduleEmailNotification(payload: ScheduleEmailPayload): Promise<EmailDispatchResult> {
  // Explicitly note that SMTP backend contract is currently pending deployment by backend teammate
  return {
    success: false,
    status: 'pending_backend_contract',
    statusText: `SMTP notification adapter ready for ${payload.email} — awaiting finalized backend contract.`,
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
    statusText: `Email delivery adapter primed for ${config.email} (${topOpportunities.length} opportunities) — awaiting backend SMTP deployment.`,
  };
}
