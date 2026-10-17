import React from 'react';
import { useApp } from '../../context/AppContext';
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
import { OpportunityDetailDrawer } from '../opportunity/OpportunityDetailDrawer';
import { DiscoveryModal } from '../dashboard/DiscoveryModal';
import { EmailDigestModal } from '../email/EmailDigestModal';
import { ToastContainer } from '../ui/Toast';
import { motion } from 'motion/react';

export const AppShell: React.FC = () => {
  const { activeTab, sidebarCollapsed } = useApp();

  return (
    <div className="relative min-h-screen bg-[#050A08] text-[#F8F8F8] flex overflow-x-hidden selection:bg-[#00E676]/25 selection:text-[#00E676]">
      {/* 1. Luminous Radial Glows bleeding in from corners & center */}
      <div className="fixed top-0 left-0 w-[550px] h-[550px] bg-[#00E676]/15 rounded-full blur-[150px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
      <div className="fixed bottom-0 right-0 w-[650px] h-[650px] bg-[#00E676]/12 rounded-full blur-[170px] pointer-events-none translate-x-1/4 translate-y-1/4" />
      <div className="fixed top-1/3 left-1/2 w-[600px] h-[500px] bg-[#122A14]/40 rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

      {/* 2. Slow-Drifting Blurred Gradient Orbs (Framer Motion 20-30s loops) */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed top-1/4 right-1/4 w-96 h-96 bg-[#00E676]/10 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 70, -30, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed bottom-1/3 left-1/3 w-80 h-80 bg-[#00E5FF]/[0.06] rounded-full blur-[150px] pointer-events-none"
      />

      {/* 3. Subtle Perspective Grid & Fine Dot-Grid Texture */}
      <div className="fixed inset-0 spatial-dot-grid opacity-70 pointer-events-none" />
      <div className="fixed inset-0 spatial-perspective-grid opacity-40 pointer-events-none" />

      {/* Floating Left Navigation Rail */}
      <Sidebar />

      {/* Main App Workspace */}
      <div
        className={`relative z-10 flex-1 flex flex-col min-h-screen transition-all duration-300 ease-out ${
          sidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <TopBar />

        {/* Dynamic Main Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1540px] w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 1. Hero: Recommended For You Feed + Live Scan Line */}
              <RecommendedFeed />

              {/* 2. Main Area: Two-Column Split (Radar Command Center + Application Pipeline) */}
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                <OpportunityRadar />
                <KanbanBoard />
              </div>

              {/* 3. Bottom Strip: Upcoming Deadlines + Email Automation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DeadlinesPanel />
                <EmailAutomationCard />
              </div>
            </div>
          )}

          {activeTab === 'discover' && <DiscoverView />}

          {activeTab === 'tracker' && (
            <div className="space-y-6">
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
          )}

          {activeTab === 'profile' && <ProfileView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Overlays, Drawers & Portals */}
      <OpportunityDetailDrawer />
      <DiscoveryModal />
      <EmailDigestModal />
      <ToastContainer />
    </div>
  );
};
