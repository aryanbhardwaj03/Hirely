export type OpportunityCategory = 
  | 'internship' 
  | 'scholarship' 
  | 'hackathon' 
  | 'fellowship' 
  | 'job' 
  | 'competition';

export type EligibilityStatus = 'verified' | 'eligible' | 'unknown' | 'ineligible';

export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site' | 'Unverified';

export type OpportunitySortOption =
  | 'newest'
  | 'highest_paying'
  | 'nearest'
  | 'best_match'
  | 'deadline_soonest';

export type LocationScope =
  | 'all'
  | 'delhi_ncr'
  | 'india'
  | 'remote_worldwide';

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  url: string;
  deadline: string | null;
  deadlineFormatted: string;
  daysLeft: number | null;
  eligibility: string;
  location: string;
  city?: string;
  country?: string;
  isRemote: boolean;
  workArrangement: WorkArrangement;
  description: string;
  required_skills: string[];
  match_score: number;
  match_reasons: string[];
  missing_requirements: string[];
  eligibility_status: EligibilityStatus;
  last_checked_at: string;
  postedDate?: string;
  stipendOrAward: string;
  compensationNumeric?: number;
  source: string;
  sourcePlatform?: string;
  sourceDomain?: string;
  isSourceVerified?: boolean;
  isDemoFallback?: boolean;
  isTopMatch?: boolean;
  trust_status?: 'verified' | 'suspicious' | 'unverified';
  trust_score?: number;
  trust_assessment?: TrustAssessment;
}

export type TrustStatus = 'verified' | 'suspicious' | 'unverified';

export interface TrustAssessment {
  opportunity_id: string;
  status: 'verified' | 'suspicious' | 'unverified';
  status_label: string;
  score: number;
  verified_facts: string[];
  risk_indicators: string[];
  missing_information: string[];
  evidence_urls: string[];
  explanation: string;
  organizer_details?: {
    name?: string;
    domain?: string;
    is_official_domain?: boolean;
    is_trusted_platform?: boolean;
    scam_reports_filed?: number;
  };
  financial_details?: {
    fee_required?: boolean;
    fee_status?: string;
    compensation_claimed?: string;
    payment_instructions?: string;
  };
  eligibility_details?: {
    stated_deadline?: string;
    education_level?: string;
    experience_level?: string;
  };
  source_domain?: string;
  is_official_domain?: boolean;
  disclaimer?: string;
  rechecked_at?: string;
  created_at?: string;
}

export interface ScamReport {
  id?: number;
  opportunity_id: string;
  user_id?: number | null;
  reason: string;
  details: string;
  contact_email?: string | null;
  status?: string;
  created_at?: string;
}

export interface Commitment {
  day: string;
  title: string;
  hours: number;
  time_range?: string;
}

export interface ActionPlannerTask {
  id: number;
  plan_id: number;
  user_id: number;
  opportunity_id: string;
  opportunity_title: string;
  organization: string;
  opportunity_type: string;
  opportunity_url: string;
  trust_status: 'verified' | 'suspicious' | 'unverified';
  deadline?: string | null;
  task_title: string;
  task_type: string;
  scheduled_day: string;
  scheduled_date: string;
  time_slot: string;
  estimated_hours: number;
  is_estimate: boolean;
  priority_rank: number;
  status: 'pending' | 'completed' | 'rescheduled' | 'removed';
  match_reason?: string;
  eligibility_summary?: string;
  notes?: string;
  created_at?: string;
}

export interface RankedOpportunityItem {
  opportunity_id: string;
  title: string;
  organization: string;
  type: string;
  url: string;
  trust_status: 'verified' | 'suspicious' | 'unverified';
  trust_score: number;
  match_score: number;
  composite_rank_score: number;
  deadline?: string | null;
  estimated_hours: number;
  ranking_rationale: string;
  is_scheduled: boolean;
}

export interface ExcludedOpportunityItem {
  opportunity_id: string;
  title: string;
  organization: string;
  type: string;
  trust_status: string;
  exclusion_reason: string;
}

export interface ActionPlan {
  id: number;
  user_id: number;
  planning_period_start: string;
  planning_period_end: string;
  available_hours_per_day: Record<string, number>;
  used_hours_per_day: Record<string, number>;
  commitments: Commitment[];
  tasks: ActionPlannerTask[];
  shortlist_ranked: RankedOpportunityItem[];
  excluded_opportunities: ExcludedOpportunityItem[];
  summary_explanation: string;
  total_hours_allocated: number;
  total_hours_available: number;
  has_capacity_limits: boolean;
  created_at?: string;
}

export interface StudentProfile {
  name: string;
  email: string;
  degree: string;
  fieldOfStudy: string;
  year: number;
  university: string;
  skills: string[];
  interests: string[];
  location: string;
  preferredCategories: OpportunityCategory[];
  remotePreference: boolean;
  emailDigest: boolean;
  digestFrequency: 'daily' | 'weekly';
  deadlineAlerts: boolean;
  profileCompletion: number;
}

export type ApplicationColumnId = 'matched' | 'applied' | 'in_review' | 'offers';

export interface ApplicationItem {
  id: string;
  opportunityId: string;
  status: ApplicationColumnId;
  updatedAt: string;
  notes?: string;
}

export interface DiscoveryStage {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface EmailDigestConfig {
  email: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  categories: OpportunityCategory[];
  includeMatchReason: boolean;
  sendDeadlineAlerts: boolean;
  lastSentAt: string | null;
  nextScheduledAt: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}
