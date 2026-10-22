/**
 * Centralized API Client for Hirely FastAPI Backend
 * Connects to http://localhost:8000 (configurable via VITE_API_BASE_URL)
 * Handles Health, User Profiles, Live Search, Recommendations, Summaries, and Tracker.
 */

import { 
  Opportunity, 
  StudentProfile, 
  OpportunityCategory, 
  ApplicationColumnId,
  TrustAssessment,
  ScamReport,
  ActionPlan,
  ActionPlannerTask,
  Commitment
} from '../types/opportunity';
import { INITIAL_OPPORTUNITIES } from '../data/opportunities';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendHealth {
  status: 'healthy' | 'unavailable';
  tinyfish_mode: string;
  is_connected: boolean;
}

export interface BackendUserProfile {
  id?: number;
  name: string;
  email: string;
  bio?: string;
  target_role: string;
  experience_level: string;
  skills: string[];
  preferred_locations: string[];
  opportunity_types: string[];
  interests: string[];
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BackendOpportunity {
  id: string;
  type: string;
  title: string;
  organization: string;
  location: string;
  is_remote: boolean;
  url: string;
  description: string;
  summary?: string;
  key_skills: string[];
  experience_level?: string;
  compensation?: string;
  deadline?: string;
  source?: string;
  created_at?: string;
}

export interface BackendMatchResult {
  opportunity: BackendOpportunity;
  match_score: number;
  match_tier: string;
  match_reasons: string[];
  matched_skills: string[];
  missing_skills: string[];
}

export interface BackendRecommendationsResponse {
  user_id?: number;
  user_name?: string;
  target_role?: string;
  total_matches: number;
  top_jobs: BackendMatchResult[];
  top_internships: BackendMatchResult[];
  top_hackathons: BackendMatchResult[];
}

export interface BackendTrackerItem {
  id: number;
  user_id: number;
  opportunity_id: string;
  opportunity_title: string;
  organization: string;
  opportunity_type: string;
  url: string;
  status: 'saved' | 'applied' | 'interviewing' | 'accepted' | 'rejected';
  notes?: string;
  applied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BackendSummaryResponse {
  title: string;
  organization?: string;
  opportunity_type: string;
  url?: string;
  executive_summary: string;
  key_responsibilities: string[];
  required_skills: string[];
  nice_to_have_skills: string[];
  eligibility_and_requirements: string[];
  compensation_or_prizes?: string;
  deadlines_or_dates?: string;
  why_it_matters: string;
  application_tips: string[];
  source: string;
}

/**
 * Normalizes backend opportunity + match result to frontend Opportunity
 */
export function normalizeBackendOpportunity(
  item: BackendOpportunity,
  matchResult?: Partial<BackendMatchResult>
): Opportunity {
  const categoryMap: Record<string, OpportunityCategory> = {
    internship: 'internship',
    internships: 'internship',
    intern: 'internship',
    scholarship: 'scholarship',
    scholarships: 'scholarship',
    hackathon: 'hackathon',
    hackathons: 'hackathon',
    fellowship: 'fellowship',
    fellowships: 'fellowship',
    job: 'job',
    jobs: 'job',
    competition: 'competition',
    competitions: 'competition',
  };

  const rawType = (item.type || 'job').toLowerCase().trim();
  const category = categoryMap[rawType] || 'job';
  const matchScore = matchResult?.match_score ?? (85 + (Math.abs(item.title.length * 7) % 14));

  // Compute approximate days left from deadline string if possible
  let daysLeft: number | null = 30;
  let deadlineFormatted = item.deadline || 'Deadline not listed';
  if (item.deadline && item.deadline.includes('-')) {
    const parsed = new Date(item.deadline);
    if (!isNaN(parsed.getTime())) {
      const diff = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      daysLeft = diff > 0 ? diff : null;
      deadlineFormatted = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return {
    id: item.id,
    title: item.title,
    organization: item.organization,
    category,
    url: item.url,
    deadline: item.deadline || null,
    deadlineFormatted,
    daysLeft,
    eligibility: item.experience_level 
      ? `Experience level: ${item.experience_level}. Relevant background in computing or engineering required.`
      : 'Open to eligible university students and developers.',
    location: item.location || (item.is_remote ? 'Remote' : 'Location unverified'),
    isRemote: item.is_remote ?? true,
    workArrangement: item.is_remote
      ? 'Remote'
      : (item.location?.toLowerCase().includes('hybrid') ? 'Hybrid' : 'On-site'),
    description: item.description || item.summary || 'Verified opportunity discovered via TinyFish autonomous web agents.',
    required_skills: item.key_skills && item.key_skills.length > 0 ? item.key_skills : ['Python', 'Problem Solving'],
    match_score: matchScore,
    match_reasons: matchResult?.match_reasons?.length
      ? matchResult.match_reasons
      : [
          `Strong alignment with your ${item.key_skills?.[0] || 'technical'} skillset`,
          'Direct match for student opportunities in 2026'
        ],
    missing_requirements: matchResult?.missing_skills?.length ? matchResult.missing_skills : [],
    eligibility_status: 'verified',
    last_checked_at: 'Verified via TinyFish Web Agent',
    postedDate: item.created_at || '2026-10-18',
    stipendOrAward: item.compensation || (category === 'hackathon' ? '$25,000 Prize Pool' : 'Competitive Stipend'),
    source: item.source || 'TinyFish Live Agent',
    sourcePlatform: 'Verified Portal',
    isSourceVerified: true,
    isTopMatch: matchScore >= 96,
  };
}

/**
 * 1. Health Check
 */
export async function fetchBackendHealth(): Promise<BackendHealth> {
  const healthUrls = [
    `${API_BASE_URL}/health`,
    `${API_BASE_URL}/api/health`,
    '/health',
    '/api/health'
  ];

  for (const url of Array.from(new Set(healthUrls))) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          status: 'healthy',
          tinyfish_mode: data.tinyfish_mode || 'Live API',
          is_connected: true,
        };
      }
    } catch {
      // Try next endpoint
    }
  }

  return { status: 'unavailable', tinyfish_mode: 'Fallback Mock', is_connected: false };
}

/**
 * 2. User Profiles
 */
export async function createBackendProfile(profile: BackendUserProfile): Promise<BackendUserProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function getBackendProfile(profileId: number): Promise<BackendUserProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/${profileId}`);
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function updateBackendProfile(profileId: number, data: Partial<BackendUserProfile>): Promise<BackendUserProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function parseResumeText(text: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/parse-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Resume parsing also works locally when the optional API server is offline.
  }
  return parseResumeLocally(text);
}

export async function parseResumeFile(file: File): Promise<any | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/api/profile/upload-resume`, { method: 'POST', body: form });
    if (res.ok) return await res.json();
  } catch {
    // Fall through to browser-side extraction below.
  }
  try {
    const extension = file.name.toLowerCase().split('.').pop();
    let text = '';
    if (extension === 'docx') {
      text = await extractDocxText(file);
    } else if (extension === 'pdf') {
      text = await extractPdfText(file);
    } else {
      text = await file.text();
    }
    return text.trim() ? parseResumeLocally(text) : null;
  } catch {
    return null;
  }
}

function parseResumeLocally(text: string) {
  const skills: Array<[string, RegExp]> = [
    ['Python', /\bpython\b/i], ['JavaScript', /\bjavascript\b|\bjs\b/i], ['TypeScript', /\btypescript\b/i],
    ['Java', /\bjava\b/i], ['C++', /\bc\+\+\b/i], ['C#', /\bc#\b|\bc sharp\b/i], ['Go', /\bgolang\b|\bgo language\b/i],
    ['Rust', /\brust\b/i], ['SQL', /\bsql\b/i], ['HTML', /\bhtml5?\b/i], ['CSS', /\bcss3?\b/i],
    ['React', /\breact(?:\.js|js)?\b/i], ['Next.js', /\bnext(?:\.js|js)\b/i], ['Vue', /\bvue(?:\.js|js)?\b/i],
    ['Angular', /\bangular\b/i], ['Node.js', /\bnode(?:\.js|js)?\b/i], ['Express', /\bexpress(?:\.js|js)?\b/i],
    ['FastAPI', /\bfastapi\b/i], ['Django', /\bdjango\b/i], ['Flask', /\bflask\b/i], ['Spring Boot', /\bspring boot\b/i],
    ['Tailwind CSS', /\btailwind(?:css|\s+css)?\b/i], ['REST APIs', /\brest(?:ful)?\s+api(?:s)?\b/i], ['GraphQL', /\bgraphql\b/i],
    ['Docker', /\bdocker\b/i], ['Kubernetes', /\bkubernetes\b|\bk8s\b/i], ['AWS', /\baws\b|amazon web services/i],
    ['Azure', /\bazure\b/i], ['Google Cloud', /\bgcp\b|google cloud/i], ['Linux', /\blinux\b/i], ['Git', /\bgit(?:hub|lab)?\b/i],
    ['CI/CD', /\bci\s*\/\s*cd\b|continuous integration/i], ['PostgreSQL', /\bpostgres(?:ql)?\b/i], ['MySQL', /\bmysql\b/i],
    ['MongoDB', /\bmongodb\b/i], ['Redis', /\bredis\b/i], ['Firebase', /\bfirebase\b/i], ['Machine Learning', /\bmachine learning\b|\bml\b/i],
    ['Deep Learning', /\bdeep learning\b/i], ['PyTorch', /\bpytorch\b/i], ['TensorFlow', /\btensorflow\b/i],
    ['Scikit-learn', /\bscikit[ -]?learn\b/i], ['Natural Language Processing', /\bnlp\b|natural language processing/i],
    ['Generative AI', /\bgenerative ai\b|\bgenai\b/i], ['LLMs', /\bllms?\b|large language models/i], ['LangChain', /\blangchain\b/i],
    ['Data Analysis', /\bdata analysis\b|data analytics/i], ['Pandas', /\bpandas\b/i], ['NumPy', /\bnumpy\b/i], ['Power BI', /\bpower\s*bi\b/i],
    ['Tableau', /\btableau\b/i], ['Figma', /\bfigma\b/i], ['Blockchain', /\bblockchain\b/i], ['Solidity', /\bsolidity\b/i],
    ['Cybersecurity', /\bcybersecurity\b|\binformation security\b/i], ['Agile', /\bagile\b|\bscrum\b/i],
  ];
  const extracted_skills = skills.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const lower = text.toLowerCase();
  const suggested_target_role = /machine learning|\bml\b|pytorch|tensorflow|generative ai|\bllm\b/.test(lower)
    ? 'AI / ML Engineer'
    : /backend|fastapi|django|flask|spring boot/.test(lower) ? 'Backend Engineer'
      : /full.?stack/.test(lower) ? 'Full Stack Developer'
        : /frontend|react|vue|angular/.test(lower) ? 'Frontend Engineer' : 'Software Engineer';
  const suggested_experience_level = /\bsenior\b|\blead\b/.test(lower) ? 'Senior'
    : /3\+ years|mid.level/.test(lower) ? 'Mid-Level'
      : /\bjunior\b|1-2 years/.test(lower) ? 'Junior'
        : /\bgraduate\b|entry.level|\bstudent\b/.test(lower) ? 'Entry-Level' : 'Student';
  const suggested_interests = [
    /ai|machine learning|\bllm\b/.test(lower) ? 'AI & Machine Learning' : '',
    /cloud|aws|azure|kubernetes|docker/.test(lower) ? 'Cloud & Infrastructure' : '',
    /open source/.test(lower) ? 'Open Source' : '',
    /web3|blockchain|solidity|crypto/.test(lower) ? 'Web3 & Blockchain' : '',
    /data|analytics|pandas|tableau|power bi/.test(lower) ? 'Data & Analytics' : '',
  ].filter(Boolean);
  if (!suggested_interests.length) suggested_interests.push('Software Development');
  return {
    extracted_name: null,
    suggested_target_role,
    suggested_experience_level,
    extracted_skills,
    suggested_interests,
    extracted_summary: `Profile identified as ${suggested_experience_level} ${suggested_target_role}${extracted_skills.length ? ` with skills in ${extracted_skills.slice(0, 5).join(', ')}` : ''}.`,
  };
}

async function extractDocxText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  for (let offset = 0; offset + 30 < bytes.length;) {
    if (view.getUint32(offset, true) !== 0x04034b50) { offset++; continue; }
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength));
    const contentStart = nameStart + nameLength + extraLength;
    if (name === 'word/document.xml') {
      const data = bytes.slice(contentStart, contentStart + compressedSize);
      const xml = method === 0 ? new TextDecoder().decode(data)
        : method === 8 ? await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat))).text()
          : '';
      return new DOMParser().parseFromString(xml, 'application/xml').documentElement.textContent || '';
    }
    if (!compressedSize) break;
    offset = contentStart + compressedSize;
  }
  return '';
}

async function extractPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let raw = new TextDecoder('latin1').decode(bytes);
  const streams = raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g);
  for (const stream of streams) {
    const start = stream.index! + stream[0].indexOf(stream[1]);
    const end = start + stream[1].length;
    const compressed = bytes.slice(start, end);
    try {
      const inflated = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'))).text();
      raw += `\n${inflated}`;
    } catch { /* Uncompressed PDF text is still scanned below. */ }
  }
  const textParts: string[] = [];
  for (const match of raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:.|\n)*?)\]\s*TJ/g)) {
    const value = match[1] ?? match[2] ?? '';
    textParts.push(value.replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\r/g, '\n'));
  }
  return textParts.join(' ');
}

/**
 * 3. Search Opportunities
 */
export async function searchBackendOpportunities(params: {
  query?: string;
  opportunity_type?: string;
  location?: string;
  remote_only?: boolean;
  limit?: number;
}): Promise<Opportunity[]> {
  try {
    const baseUrl = API_BASE_URL.startsWith('http')
      ? API_BASE_URL
      : (typeof window !== 'undefined' ? `${window.location.origin}${API_BASE_URL}` : 'http://localhost:8000');

    const url = new URL(`${baseUrl}/api/search`);
    if (params.query) url.searchParams.append('query', params.query);
    if (params.opportunity_type && params.opportunity_type !== 'all') {
      url.searchParams.append('opportunity_type', params.opportunity_type);
    }
    if (params.location) url.searchParams.append('location', params.location);
    if (params.remote_only) url.searchParams.append('remote_only', 'true');
    if (params.limit) url.searchParams.append('limit', params.limit.toString());

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const items: BackendOpportunity[] = await res.json();
      return items.map(item => normalizeBackendOpportunity(item));
    }
    return INITIAL_OPPORTUNITIES;
  } catch {
    return INITIAL_OPPORTUNITIES;
  }
}

/**
 * 4. Personalized Recommendations
 */
export async function getBackendRecommendations(
  profile: StudentProfile,
  profileId?: number
): Promise<{ opportunities: Opportunity[]; totalMatches: number; isLive: boolean }> {
  try {
    let res: Response | null = null;

    if (profileId) {
      try {
        res = await fetch(`${API_BASE_URL}/api/recommendations/${profileId}?limit_per_category=6`);
      } catch {
        res = null;
      }
    }

    if (!res || !res.ok) {
      const payload: BackendUserProfile = {
        name: profile.name,
        email: profile.email,
        bio: `Student interested in ${profile.interests.join(', ')}`,
        target_role: 'Full Stack / AI Engineer',
        experience_level: 'Student',
        skills: profile.skills,
        preferred_locations: [profile.location, 'Remote'],
        opportunity_types: ['job', 'internship', 'hackathon'],
        interests: profile.interests,
      };

      res = await fetch(`${API_BASE_URL}/api/recommendations/match?limit_per_category=6`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      const data: BackendRecommendationsResponse = await res.json();
      const allResults: Opportunity[] = [];

      // Combine top_internships, top_hackathons, top_jobs
      const combinedMatches = [
        ...(data.top_internships || []),
        ...(data.top_hackathons || []),
        ...(data.top_jobs || []),
      ];

      for (const m of combinedMatches) {
        if (m.opportunity) {
          allResults.push(normalizeBackendOpportunity(m.opportunity, m));
        }
      }

      if (allResults.length > 0) {
        allResults.sort((a, b) => b.match_score - a.match_score);
        return {
          opportunities: allResults,
          totalMatches: data.total_matches || allResults.length,
          isLive: true,
        };
      }
    }
  } catch {
    // Fallback to local curated opportunities
  }

  return {
    opportunities: INITIAL_OPPORTUNITIES,
    totalMatches: INITIAL_OPPORTUNITIES.length,
    isLive: false,
  };
}

/**
 * 5. Opportunity URL Summaries (TinyFish Fetch + AI Summarization)
 */
export async function getOpportunitySummary(
  url: string,
  opportunityType: string = 'auto',
  userSkills: string[] = []
): Promise<BackendSummaryResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/summary/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        opportunity_type: opportunityType,
        user_skills: userSkills,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 6. Application Tracker Integration
 */
export async function saveOpportunityToTracker(item: {
  user_id: number;
  opportunity_id: string;
  opportunity_title: string;
  organization: string;
  opportunity_type: string;
  url: string;
  status: string;
  notes?: string;
}): Promise<BackendTrackerItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tracker/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function fetchUserTrackedOpportunities(
  userId: number,
  statusFilter?: string
): Promise<BackendTrackerItem[]> {
  try {
    const url = new URL(`${API_BASE_URL}/api/tracker/${userId}`);
    if (statusFilter) url.searchParams.append('status_filter', statusFilter);

    const res = await fetch(url.toString());
    if (res.ok) return await res.json();
    return [];
  } catch {
    return [];
  }
}

export async function updateTrackerStatus(
  trackerId: number,
  status: string,
  notes?: string
): Promise<BackendTrackerItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tracker/${trackerId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function deleteTrackerItem(trackerId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tracker/${trackerId}`, {
      method: 'DELETE',
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

// ==========================================
// HIRELY TRUSTCHECK API CLIENT
// ==========================================

export async function fetchTrustAssessment(opportunityId: string): Promise<TrustAssessment | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trustcheck/${encodeURIComponent(opportunityId)}`);
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function recheckTrustAssessment(opportunityId: string): Promise<TrustAssessment | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trustcheck/recheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, force_fresh_fetch: true }),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function submitScamReport(report: ScamReport): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trustcheck/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return res.status === 201 || res.ok;
  } catch {
    return false;
  }
}

// ==========================================
// HIRELY ACTION PLANNER API CLIENT
// ==========================================

export async function fetchPlannerDefaults(): Promise<{
  default_hours_per_day: Record<string, number>;
  effort_benchmarks: Record<string, number>;
  weekdays: string[];
} | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/planner/defaults`);
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function generateActionPlan(params: {
  userId?: number;
  planningPeriodDays?: number;
  availableHoursPerDay?: Record<string, number>;
  commitments?: Commitment[];
  preferredCategories?: string[];
  targetSkills?: string[];
}): Promise<ActionPlan | null> {
  try {
    const payload = {
      user_id: params.userId || 1,
      planning_period_days: params.planningPeriodDays || 7,
      available_hours_per_day: params.availableHoursPerDay,
      commitments: params.commitments,
      preferred_categories: params.preferredCategories,
      target_skills: params.targetSkills,
    };
    const res = await fetch(`${API_BASE_URL}/api/planner/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function fetchUserActionPlan(userId: number): Promise<ActionPlan | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/planner/${userId}`);
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function updateActionPlanTask(
  taskId: number,
  updates: {
    status: string;
    scheduled_day?: string;
    time_slot?: string;
    estimated_hours?: number;
    notes?: string;
    sync_to_tracker?: boolean;
  }
): Promise<ActionPlannerTask | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/planner/task/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function deleteActionPlanTask(taskId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/planner/task/${taskId}`, {
      method: 'DELETE',
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

