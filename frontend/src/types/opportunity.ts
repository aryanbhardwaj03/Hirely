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
