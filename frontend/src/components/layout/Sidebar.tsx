import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Compass, 
  LayoutDashboard, 
  Sparkles, 
  Kanban, 
  UserCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Radio, 
  Mail
} from 'lucide-react';
import { motion } from 'motion/react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    profile, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    setIsEmailPreviewOpen 
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'discover', label: 'Opportunity Match', icon: Sparkles },
    { id: 'tracker', label: 'Application Tracker', icon: Kanban },
    { id: 'profile', label: 'Talent Profile', icon: UserCheck },
    { id: 'settings', label: 'Settings & Email', icon: Settings },
  ] as const;

  // Calculate circular progress for 85% completion
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (profile.profileCompletion / 100) * circumference;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 transition-all duration-300 ease-out flex flex-col justify-between border-r border-white/[0.08] bg-[#050A08]/95 backdrop-blur-2xl ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Brand Wordmark: "HIRE" in white + "LY" in neon green */}
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#00E676]/50 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(0,230,118,0.2)]">
              <Compass className="w-5 h-5 text-[#00E676]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676]" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white leading-tight">
                  HIRE<span className="text-[#00E676]">LY</span>
                </span>
                <span className="text-[11px] font-mono tracking-widest text-slate-300 uppercase font-medium">
                  Spatial Intel
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Agent Tagline */}
        {!sidebarCollapsed && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-slate-200">
              <Radio className="w-3.5 h-3.5 text-[#00E676] animate-pulse" />
              TINYFISH AGENT
            </span>
            <span className="text-[11px] font-mono font-semibold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded">
              ONLINE
            </span>
          </div>
        )}

        {/* Navigation Rail */}
        <nav className="mt-4 px-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'text-white bg-white/[0.08] border border-white/[0.14] shadow-[0_0_20px_rgba(0,230,118,0.1)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {/* Left Active Glow Bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#00E676] shadow-[0_0_10px_#00E676]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#00E676]' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />

                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Completion & Quick Links */}
      <div className="p-3 border-t border-white/[0.08] space-y-3">
        {/* Quick Email Preview Trigger */}
        <button
          onClick={() => setIsEmailPreviewOpen(true)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title="Preview Email Digest"
        >
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[#00E676]" />
            {!sidebarCollapsed && <span>Email Digest Preview</span>}
          </div>
          {!sidebarCollapsed && (
            <span className="text-[11px] font-mono text-slate-300 font-medium">DAILY</span>
          )}
        </button>

        {/* Profile Completion Ring Card */}
        <div
          onClick={() => setActiveTab('profile')}
          className="cursor-pointer group rounded-xl p-3 bg-white/[0.03] border border-white/[0.08] hover:border-[#00E676]/50 hover:bg-white/[0.06] transition-all"
        >
          <div className="flex items-center gap-3">
            {/* SVG Progress Ring */}
            <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90 transform">
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-white/[0.08]"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="#00E676"
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  fill="transparent"
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-bold text-[#00E676]">
                {profile.profileCompletion}%
              </span>
            </div>

            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate group-hover:text-[#00E676] transition-colors">
                  {profile.name}
                </div>
                <div className="text-[11px] font-mono text-slate-300 truncate">
                  {profile.degree} · Year {profile.year}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
