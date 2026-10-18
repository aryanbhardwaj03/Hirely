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
} from '../services/tinyfish';
import { scheduleEmailNotification } from '../services/email';
import {
  fetchBackendHealth,
  getBackendRecommendations,
  BackendHealth
} from '../services/api';
import {
  subscribeToAuthChanges,
  logoutUser,
  getCurrentAuthToken
} from '../services/firebase';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}

export type ActiveTabType = 'dashboard' | 'discover' | 'assistant' | 'tracker' | 'profile' | 'settings' | 'notfound';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PROFILE = 'hirely_profile_v1';
const STORAGE_KEY_SAVED = 'hirely_saved_ids_v1';
const STORAGE_KEY_APPLICATIONS = 'hirely_applications_v1';
const STORAGE_KEY_EMAIL = 'hirely_email_config_v1';

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

const readUserStorage = <T,>(key: string, uid: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(`${key}:${uid}`);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
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
    }, 4000);
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
        return;
      }
      const uid = user.uid;
      const loadedProfile = readUserStorage(STORAGE_KEY_PROFILE, uid, createBlankProfile(user));
      // Firebase email is authoritative; profile email is prefilled only for a new profile.
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

  const isProfileComplete = Boolean(
    profile.name.trim() && profile.university.trim() && profile.degree.trim() &&
    profile.fieldOfStudy.trim() && profile.year >= 1 && profile.location.trim() &&
    profile.skills.some(skill => skill.trim().length > 0)
  );

  // Logout handler
  const logout = useCallback(async () => {
    await logoutUser();
    setCurrentUser(null);
    setAuthToken(null);
    showToast('Signed out of Hirely session.', 'info');
  }, [showToast]);

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

  // Update application status
  const updateApplicationStatus = useCallback((opportunityId: string, status: ApplicationColumnId) => {
    setApplications(prev => {
      const existing = prev.find(a => a.opportunityId === opportunityId);
      const now = new Date().toISOString();
      if (existing) {
        return prev.map(a => a.opportunityId === opportunityId ? { ...a, status, updatedAt: now } : a);
      } else {
        return [...prev, {
          id: `app-${Date.now()}`,
          opportunityId,
          status,
          updatedAt: now,
        }];
      }
    });

    const opp = opportunities.find(o => o.id === opportunityId);
    if (status === 'applied') {
      showToast('Confirmation email scheduled.', 'success');
      scheduleEmailNotification({
        email: profile.email,
        opportunityId,
        opportunityTitle: opp ? opp.title : 'Opportunity',
        deadline: opp ? opp.deadline : null,
        reminderType: 'applied_confirmation',
      });
    } else {
      const labels: Record<ApplicationColumnId, string> = {
        matched: 'Moved to Matched',
        applied: 'Moved to Applied',
        in_review: 'Moved to In Review',
        offers: 'Moved to Offers 🎉',
      };
      showToast(labels[status], 'info');
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
          showToast(`Discovered ${rec.totalMatches} live opportunities via FastAPI & TinyFish.`, 'success');
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
          : `Discovery complete: 12 high-signal matches calibrated.`,
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
