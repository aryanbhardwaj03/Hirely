import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Opportunity, 
  StudentProfile, 
  ApplicationItem, 
  ApplicationColumnId, 
  EmailDigestConfig, 
  OpportunityCategory,
  OpportunitySortOption,
  LocationScope,
  AuthUser
} from '../types/opportunity';
import {
  INITIAL_OPPORTUNITIES
} from '../data/opportunities';
import {
  checkBackendHealth,
  discoverOpportunities,
  BackendHealthResponse
} from '../services/discovery';
import { scheduleEmailNotification } from '../services/email';
import {
  fetchBackendHealth,
  getBackendRecommendations,
  saveOpportunityToTracker,
  deleteTrackerItem,
  BackendHealth
} from '../services/api';
import {
  subscribeToAuthChanges,
  logoutUser,
  getCurrentAuthToken
} from '../services/firebase';
import { ChatMessage } from '../services/geminiCore';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}

export type ActiveTabType = 'dashboard' | 'discover' | 'assistant' | 'tracker' | 'planner' | 'profile' | 'settings' | 'notfound';

interface AppContextType {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  logout: () => Promise<void>;
  profile: StudentProfile;
  updateProfile: (updated: Partial<StudentProfile>) => void;
  isProfileComplete: boolean;
  opportunities: Opportunity[];
  savedOpportunityIds: string[];
  toggleSaveOpportunity: (id: string) => void;
  isOpportunitySaved: (id: string) => boolean;
  applications: ApplicationItem[];
  addToPipeline: (opportunityId: string) => void;
  removeFromPipeline: (opportunityId: string) => void;
  isOpportunityInPipeline: (opportunityId: string) => boolean;
  getOpportunityPipelineStatus: (opportunityId: string) => ApplicationColumnId | null;
  updateApplicationStatus: (opportunityId: string, status: ApplicationColumnId) => void;
  emailConfig: EmailDigestConfig;
  updateEmailConfig: (updated: Partial<EmailDigestConfig>) => void;
  selectedOpportunity: Opportunity | null;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  isDiscovering: boolean;
  discoveryProgress: { index: number; message: string; progress: number } | null;
  runDiscovery: (customCategories?: OpportunityCategory[]) => Promise<void>;
  backendHealth: BackendHealthResponse | null;
  fastapiHealth: BackendHealth | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: OpportunitySortOption;
  setSortBy: (sort: OpportunitySortOption) => void;
  locationScope: LocationScope;
  setLocationScope: (scope: LocationScope) => void;
  radarFilters: {
    scholarships: boolean;
    internships: boolean;
    remoteOnly: boolean;
  };
  setRadarFilters: React.Dispatch<React.SetStateAction<{
    scholarships: boolean;
    internships: boolean;
    remoteOnly: boolean;
  }>>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
  isEmailPreviewOpen: boolean;
  setIsEmailPreviewOpen: (open: boolean) => void;
  isDiscoveryModalOpen: boolean;
  setIsDiscoveryModalOpen: (open: boolean) => void;
  isHirelyCoreOpen: boolean;
  setIsHirelyCoreOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  resetChatMessages: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PROFILE = 'hirely_profile_v1';
const STORAGE_KEY_SAVED = 'hirely_saved_ids_v1';
const STORAGE_KEY_APPLICATIONS = 'hirely_applications_v1';
const STORAGE_KEY_EMAIL = 'hirely_email_config_v1';
const STORAGE_KEY_CHAT_SESSION = 'hirely_chat_session_v1';

const createBlankProfile = (user?: AuthUser | null): StudentProfile => ({
  name: user?.displayName || '',
  email: user?.email || '',
  degree: '',
  fieldOfStudy: '',
  year: 0,
  university: '',
  skills: [],
  interests: [],
  location: '',
  preferredCategories: ['internship', 'scholarship', 'hackathon', 'fellowship'],
  remotePreference: true,
  emailDigest: true,
  digestFrequency: 'daily',
  deadlineAlerts: true,
  profileCompletion: 0,
});

const createInitialChatMessage = (p?: StudentProfile | null): ChatMessage => ({
  id: `init-msg`,
  role: 'assistant',
  content: `## Welcome to Hirely Core Intelligence\n\nI'm your dedicated AI opportunity advisor. I have indexed your profile (**${p?.name || 'Candidate'}**, **${p?.degree || 'Degree'}** in **${p?.fieldOfStudy || 'Computing'}**) and live verified opportunities.\n\n* **Ask me to analyze your match** for any opportunity in your feed.\n* **Discover missing skills** and get a personalized learning roadmap.\n* **Paste any job description or resume** to extract requirements and eligibility.\n\nHow can I help you accelerate your career search today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  modelUsed: 'gemini-3.8-flash',
});

const readUserStorage = <T,>(key: string, uid: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(`${key}:${uid}`);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
};

const readChatSession = (uid: string, profile: StudentProfile): ChatMessage[] => {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY_CHAT_SESSION}:${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Could not read chat session:', e);
  }
  return [createInitialChatMessage(profile)];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHirelyCoreOpen, setIsHirelyCoreOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Sorting and Filtering State
  const [sortBy, setSortBy] = useState<OpportunitySortOption>('newest');
  const [locationScope, setLocationScope] = useState<LocationScope>('delhi_ncr');

  // Start blank. User-specific data is loaded only after Firebase identifies the account.
  const [profile, setProfile] = useState<StudentProfile>(() => createBlankProfile());
  const [savedOpportunityIds, setSavedOpportunityIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailDigestConfig>({
    email: '', enabled: true, frequency: 'daily',
    categories: ['internship', 'scholarship', 'hackathon', 'fellowship'],
    includeMatchReason: true, sendDeadlineAlerts: true,
    lastSentAt: null, nextScheduledAt: new Date().toISOString(),
  });

  // AI Chat Conversation Session Memory (isolated per authenticated user, persists across navigation & refresh)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [createInitialChatMessage()]);

  // Opportunities are shared discovery data, not personal account data.
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);

  // UI state
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState<{ index: number; message: string; progress: number } | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [fastapiHealth, setFastapiHealth] = useState<BackendHealth | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);

  // Radar Quick Toggles
  const [radarFilters, setRadarFilters] = useState({
    scholarships: true,
    internships: true,
    remoteOnly: false,
  });

  // Toast dispatch
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load each account's own data when Firebase auth changes. Never reuse demo profile data.
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user, token) => {
      setCurrentUser(user);
      setAuthToken(token);
      if (!user) {
        setProfile(createBlankProfile());
        setSavedOpportunityIds([]);
        setApplications([]);
        setEmailConfig({
          email: '', enabled: true, frequency: 'daily',
          categories: ['internship', 'scholarship', 'hackathon', 'fellowship'],
          includeMatchReason: true, sendDeadlineAlerts: true,
          lastSentAt: null, nextScheduledAt: new Date().toISOString(),
        });
        setChatMessages([createInitialChatMessage()]);
        return;
      }
      const uid = user.uid;
      const loadedProfile = readUserStorage(STORAGE_KEY_PROFILE, uid, createBlankProfile(user));
      if (!loadedProfile.email) loadedProfile.email = user.email || '';
      if (!loadedProfile.name && user.displayName) loadedProfile.name = user.displayName;
      setProfile(loadedProfile);
      setSavedOpportunityIds(readUserStorage(STORAGE_KEY_SAVED, uid, []));
      setApplications(readUserStorage(STORAGE_KEY_APPLICATIONS, uid, []));
      setEmailConfig(readUserStorage(STORAGE_KEY_EMAIL, uid, {
        email: user.email || '', enabled: true, frequency: 'daily',
        categories: ['internship', 'scholarship', 'hackathon', 'fellowship'],
        includeMatchReason: true, sendDeadlineAlerts: true,
        lastSentAt: null, nextScheduledAt: new Date().toISOString(),
      }));
      // Restore isolated conversation memory for this authenticated user
      const userChat = readChatSession(uid, loadedProfile);
      setChatMessages(userChat);
    });
    return () => unsubscribe();
  }, []);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((health) => {
      setBackendHealth(health);
    });
    fetchBackendHealth().then((health) => {
      setFastapiHealth(health);
      if (health.is_connected) {
        getBackendRecommendations(profile).then((rec) => {
          if (rec.isLive && rec.opportunities.length > 0) {
            setOpportunities(rec.opportunities);
          }
        });
      }
    });
  }, []);

  // Persist personal data only under the authenticated Firebase UID.
  useEffect(() => {
    if (currentUser) localStorage.setItem(`${STORAGE_KEY_PROFILE}:${currentUser.uid}`, JSON.stringify(profile));
  }, [profile, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`${STORAGE_KEY_SAVED}:${currentUser.uid}`, JSON.stringify(savedOpportunityIds));
  }, [savedOpportunityIds, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`${STORAGE_KEY_APPLICATIONS}:${currentUser.uid}`, JSON.stringify(applications));
  }, [applications, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`${STORAGE_KEY_EMAIL}:${currentUser.uid}`, JSON.stringify(emailConfig));
  }, [emailConfig, currentUser]);

  // Persist conversation memory in session storage keyed by authenticated user ID
  useEffect(() => {
    if (currentUser?.uid && chatMessages.length > 0) {
      sessionStorage.setItem(`${STORAGE_KEY_CHAT_SESSION}:${currentUser.uid}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, currentUser]);

  const isProfileComplete = Boolean(
    profile.name.trim() && profile.university.trim() && profile.degree.trim() &&
    profile.fieldOfStudy.trim() && profile.year >= 1 && profile.location.trim() &&
    profile.skills.some(skill => skill.trim().length > 0)
  );

  // Logout handler - clears active user session conversation
  const logout = useCallback(async () => {
    if (currentUser?.uid) {
      sessionStorage.removeItem(`${STORAGE_KEY_CHAT_SESSION}:${currentUser.uid}`);
    }
    await logoutUser();
    setCurrentUser(null);
    setAuthToken(null);
    setChatMessages([createInitialChatMessage()]);
    showToast('Signed out of Hirely session.', 'info');
  }, [currentUser, showToast]);

  // Reset conversation
  const resetChatMessages = useCallback(() => {
    const fresh = createInitialChatMessage(profile);
    setChatMessages([fresh]);
    if (currentUser?.uid) {
      sessionStorage.setItem(`${STORAGE_KEY_CHAT_SESSION}:${currentUser.uid}`, JSON.stringify([fresh]));
    }
    showToast('Conversation reset.', 'info');
  }, [currentUser, profile, showToast]);

  // Profile update
  const updateProfile = useCallback((updated: Partial<StudentProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updated };
      let score = 50;
      if (next.skills.length >= 4) score += 20;
      if (next.university) score += 10;
      if (next.interests.length >= 3) score += 10;
      if (next.degree && next.fieldOfStudy) score += 10;
      next.profileCompletion = Math.min(100, score);
      return next;
    });
    showToast('Student profile updated & matches recalibrated.', 'success');
  }, [showToast]);

  // Save toggle
  const toggleSaveOpportunity = useCallback((id: string) => {
    setSavedOpportunityIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        showToast('Removed from saved opportunities.', 'info');
        return prev.filter(item => item !== id);
      } else {
        showToast('Opportunity saved to your workspace.', 'success');
        return [...prev, id];
      }
    });
  }, [showToast]);

  const isOpportunitySaved = useCallback((id: string) => {
    return savedOpportunityIds.includes(id);
  }, [savedOpportunityIds]);

  // Add to pipeline
  const addToPipeline = useCallback((opportunityId: string) => {
    const opp = opportunities.find(o => o.id === opportunityId);
    if (!opp) return;

    setApplications(prev => {
      const existing = prev.find(a => a.opportunityId === opportunityId);
      if (existing) {
        showToast(`Already in your pipeline (Stage: ${existing.status.toUpperCase()})`, 'info');
        return prev;
      }
      const newApp: ApplicationItem = {
        id: `app-${Date.now()}-${opportunityId}`,
        opportunityId,
        status: 'matched',
        updatedAt: new Date().toISOString(),
        notes: `Added from verified listings.`
      };
      showToast(`Added "${opp.title.slice(0, 36)}..." to Pipeline under Matched.`, 'success');
      return [newApp, ...prev];
    });

    // Sync to backend tracker
    saveOpportunityToTracker({
      user_id: 1,
      opportunity_id: opp.id,
      opportunity_title: opp.title,
      organization: opp.organization,
      opportunity_type: opp.category,
      url: opp.url,
      status: 'matched'
    }).catch(() => {});
  }, [opportunities, showToast]);

  // Remove from pipeline
  const removeFromPipeline = useCallback((opportunityId: string) => {
    setApplications(prev => prev.filter(a => a.opportunityId !== opportunityId));
    showToast('Removed from Application Pipeline.', 'info');
  }, [showToast]);

  // Check if opportunity is in pipeline
  const isOpportunityInPipeline = useCallback((opportunityId: string) => {
    return applications.some(a => a.opportunityId === opportunityId);
  }, [applications]);

  // Get opportunity pipeline status
  const getOpportunityPipelineStatus = useCallback((opportunityId: string): ApplicationColumnId | null => {
    const found = applications.find(a => a.opportunityId === opportunityId);
    return found ? found.status : null;
  }, [applications]);

  // Update application status
  const updateApplicationStatus = useCallback((opportunityId: string, status: ApplicationColumnId) => {
    setApplications(prev => {
      const existing = prev.find(a => a.opportunityId === opportunityId);
      const now = new Date().toISOString();
      if (existing) {
        return prev.map(a => a.opportunityId === opportunityId ? { ...a, status, updatedAt: now } : a);
      } else {
        return [{
          id: `app-${Date.now()}-${opportunityId}`,
          opportunityId,
          status,
          updatedAt: now,
        }, ...prev];
      }
    });

    const opp = opportunities.find(o => o.id === opportunityId);
    const labels: Record<ApplicationColumnId, string> = {
      matched: 'Moved to Matched',
      applied: 'Moved to Applied · Application Recorded ✓',
      in_review: 'Moved to In Review',
      offers: 'Moved to Offers 🎉',
    };
    showToast(labels[status], status === 'offers' ? 'success' : 'info');

    if (status === 'applied') {
      scheduleEmailNotification({
        email: profile.email,
        opportunityId,
        opportunityTitle: opp ? opp.title : 'Opportunity',
        deadline: opp ? opp.deadline : null,
        reminderType: 'applied_confirmation',
      }).catch(() => {});
    }
  }, [opportunities, profile.email, showToast]);

  // Email config update
  const updateEmailConfig = useCallback((updated: Partial<EmailDigestConfig>) => {
    setEmailConfig(prev => ({ ...prev, ...updated }));
    showToast('Email preferences updated.', 'success');
  }, [showToast]);

  // Run discovery
  const runDiscovery = useCallback(async (customCategories?: OpportunityCategory[]) => {
    setIsDiscovering(true);
    setIsDiscoveryModalOpen(true);
    try {
      const categoriesToScan = customCategories || profile.preferredCategories;

      // If live backend is connected, fetch recommendations from API
      if (fastapiHealth?.is_connected) {
        const rec = await getBackendRecommendations(profile);
        if (rec.opportunities.length > 0) {
          setOpportunities(rec.opportunities);
          showToast(`Discovered ${rec.totalMatches} live opportunities from verified web portals.`, 'success');
          return;
        }
      }

      // Autonomous pipeline
      const res = await discoverOpportunities(
        profile,
        categoriesToScan,
        (index, message, progress) => {
          setDiscoveryProgress({ index, message, progress });
        }
      );
      setOpportunities(res.opportunities);
      showToast(
        res.source === 'live_backend'
          ? `Discovered ${res.totalDiscovered} live opportunities from backend.`
          : `Discovery complete: 12 verified high-signal matches calibrated.`,
        'success'
      );
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Discovery cancelled or failed.', 'warning');
    } finally {
      setIsDiscovering(false);
      setTimeout(() => {
        setIsDiscoveryModalOpen(false);
        setDiscoveryProgress(null);
      }, 900);
    }
  }, [profile, fastapiHealth, showToast]);

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
    currentUser,
    setCurrentUser,
    authToken,
    setAuthToken,
    logout,
    profile,
    updateProfile,
    isProfileComplete,
    opportunities,
    savedOpportunityIds,
    toggleSaveOpportunity,
    isOpportunitySaved,
    applications,
    addToPipeline,
    removeFromPipeline,
    isOpportunityInPipeline,
    getOpportunityPipelineStatus,
    updateApplicationStatus,
    emailConfig,
    updateEmailConfig,
    selectedOpportunity,
    setSelectedOpportunity,
    isDiscovering,
    discoveryProgress,
    runDiscovery,
    backendHealth,
    fastapiHealth,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    locationScope,
    setLocationScope,
    radarFilters,
    setRadarFilters,
    toasts,
    showToast,
    removeToast,
    isEmailPreviewOpen,
    setIsEmailPreviewOpen,
    isDiscoveryModalOpen,
    setIsDiscoveryModalOpen,
    isHirelyCoreOpen,
    setIsHirelyCoreOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    chatMessages,
    setChatMessages,
    resetChatMessages,
  }), [
    activeTab,
    currentUser,
    authToken,
    logout,
    profile,
    updateProfile,
    isProfileComplete,
    opportunities,
    savedOpportunityIds,
    toggleSaveOpportunity,
    isOpportunitySaved,
    applications,
    addToPipeline,
    removeFromPipeline,
    isOpportunityInPipeline,
    getOpportunityPipelineStatus,
    updateApplicationStatus,
    emailConfig,
    updateEmailConfig,
    selectedOpportunity,
    isDiscovering,
    discoveryProgress,
    runDiscovery,
    backendHealth,
    fastapiHealth,
    searchQuery,
    sortBy,
    locationScope,
    radarFilters,
    toasts,
    showToast,
    removeToast,
    isEmailPreviewOpen,
    isDiscoveryModalOpen,
    isHirelyCoreOpen,
    sidebarCollapsed,
    isMobileMenuOpen,
    chatMessages,
    resetChatMessages,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
