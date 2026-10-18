import React, { useEffect } from 'react';
import { useApp, ActiveTabType } from '../../context/AppContext';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { RecommendedFeed } from '../dashboard/RecommendedFeed';
import { OpportunityRadar } from '../dashboard/OpportunityRadar';
import { KanbanBoard } from '../dashboard/KanbanBoard';
import { DeadlinesPanel } from '../dashboard/DeadlinesPanel';
import { EmailAutomationCard } from '../dashboard/EmailAutomationCard';
import { DiscoverView } from '../discover/DiscoverView';
import { ProfileView } from '../profile/ProfileView';
import { SettingsView } from '../settings/SettingsView';
import { HirelyCoreView } from '../assistant/HirelyCoreView';
import { HirelyCoreDrawer } from '../assistant/HirelyCoreDrawer';
import { NotFoundView } from '../common/NotFoundView';
import { SignInView } from '../auth/SignInView';
import { OpportunityDetailDrawer } from '../opportunity/OpportunityDetailDrawer';
import { DiscoveryModal } from '../dashboard/DiscoveryModal';
import { EmailDigestModal } from '../email/EmailDigestModal';
import { ToastContainer } from '../ui/Toast';
import { Bot } from 'lucide-react';
import { motion } from 'motion/react';

export const AppShell: React.FC = () => {
  const {
    sidebarCollapsed,
    currentUser,
    setIsHirelyCoreOpen,
    setActiveTab
  } = useApp();

  const location = useLocation();

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname.replace(/^\//, '').toLowerCase();
    if (!path || path === 'dashboard') {
      setActiveTab('dashboard');
    } else if (path === 'discover') {
      setActiveTab('discover');
    } else if (path === 'assistant') {
      setActiveTab('assistant');
    } else if (path === 'tracker') {
      setActiveTab('tracker');
    } else if (path === 'profile') {
      setActiveTab('profile');
    } else if (path === 'settings') {
      setActiveTab('settings');
    } else {
      setActiveTab('notfound');
    }
  }, [location.pathname, setActiveTab]);

  // Route protection: If user is not authenticated, show the authentication landing page
  if (!currentUser) {
    return <SignInView />;
  }

  return (
    <div className="relative min-h-screen bg-[#0F0F0F] text-[#F8F8F8] flex overflow-x-hidden selection:bg-[#5DD62C]/25 selection:text-[#5DD62C]">
      {/* 1. Luminous Radial Glows (#337418 / #5DD62C) */}
      <div className="fixed top-0 left-0 w-[550px] h-[550px] bg-[#337418]/20 rounded-full blur-[150px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
      <div className="fixed bottom-0 right-0 w-[650px] h-[650px] bg-[#5DD62C]/10 rounded-full blur-[170px] pointer-events-none translate-x-1/4 translate-y-1/4" />
      <div className="fixed top-1/3 left-1/2 w-[600px] h-[500px] bg-[#122A14]/40 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

      {/* 2. Slow-Drifting Blurred Gradient Orbs */}
      <motion.div
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -50, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed top-1/4 right-1/4 w-80 h-80 bg-[#5DD62C]/[0.08] rounded-full blur-[140px] pointer-events-none"
      />

      {/* 3. Subtle Perspective Grid & Fine Dot-Grid Texture */}
      <div className="fixed inset-0 spatial-dot-grid opacity-50 pointer-events-none" />
      <div className="fixed inset-0 spatial-perspective-grid opacity-30 pointer-events-none" />

      {/* Floating Left Navigation Rail */}
      <Sidebar />

      {/* Main App Workspace with Responsive Padding */}
      <div
        className={`relative z-10 flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-out pl-0 md:pl-20 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <TopBar />

        {/* Dynamic Main Content Viewport with real React Router routes */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 min-w-0 overflow-x-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-6 w-full min-w-0">
                  <RecommendedFeed />
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full min-w-0">
                    <OpportunityRadar />
                    <KanbanBoard />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
                    <DeadlinesPanel />
                    <EmailAutomationCard />
                  </div>
                </div>
              }
            />
            <Route
              path="/dashboard"
              element={
                <div className="space-y-6 w-full min-w-0">
                  <RecommendedFeed />
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full min-w-0">
                    <OpportunityRadar />
                    <KanbanBoard />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
                    <DeadlinesPanel />
                    <EmailAutomationCard />
                  </div>
                </div>
              }
            />
            <Route path="/discover" element={<DiscoverView />} />
            <Route
              path="/assistant"
              element={
                <div className="space-y-4 w-full min-w-0">
                  <HirelyCoreView embedded={false} />
                </div>
              }
            />
            <Route
              path="/tracker"
              element={
                <div className="space-y-6 w-full min-w-0">
                  <div className="pb-3 border-b border-white/[0.08]">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      Application Pipeline Tracker
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Manage your candidate submissions, interview milestones, and active scholarship awards.
                    </p>
                  </div>
                  <KanbanBoard />
                </div>
              }
            />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />

            {/* Catch-all 404 Route for unknown URLs */}
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </main>
      </div>

      {/* Floating Hirely Core AI quick trigger in bottom right */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsHirelyCoreOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#202020] border border-[#5DD62C]/60 hover:border-[#5DD62C] text-white shadow-[0_0_30px_rgba(93,214,44,0.3)] backdrop-blur-2xl transition-all cursor-pointer group"
        title="Open Hirely Core AI"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5DD62C] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5DD62C]" />
        </span>
        <Bot className="w-4 h-4 text-[#5DD62C] group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide">Hirely Core AI</span>
        <span className="text-[10px] font-mono text-[#5DD62C] bg-[#5DD62C]/15 px-1.5 py-0.5 rounded font-bold">
          GEMINI
        </span>
      </motion.button>

      {/* Overlays, Drawers & Portals */}
      <HirelyCoreDrawer />
      <OpportunityDetailDrawer />
      <DiscoveryModal />
      <EmailDigestModal />
      <ToastContainer />
    </div>
  );
};
