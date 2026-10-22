import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, ActiveTabType } from '../../context/AppContext';
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
  Mail,
  Bot,
  LogOut,
  CalendarCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
    sidebarCollapsed,
    setSidebarCollapsed,
    setIsEmailPreviewOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    logout,
    currentUser
  } = useApp();

  interface NavItem {
    id: ActiveTabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAi?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'discover', label: 'Opportunity Match', icon: Sparkles },
    { id: 'assistant', label: 'Hirely Core AI', icon: Bot, isAi: true },
    { id: 'planner', label: 'Action Planner', icon: CalendarCheck },
    { id: 'tracker', label: 'Application Tracker', icon: Kanban },
    { id: 'profile', label: 'Talent Profile', icon: UserCheck },
    { id: 'settings', label: 'Settings & Email', icon: Settings },
  ];

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (profile.profileCompletion / 100) * circumference;

  const navigate = useNavigate();

  const handleNavClick = (tabId: ActiveTabType) => {
    setActiveTab(tabId);
    navigate(tabId === 'dashboard' ? '/dashboard' : `/${tabId}`);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Floating Left Navigation Rail */}
      <aside
        className={`fixed top-0 left-0 h-screen z-40 transition-all duration-300 ease-out flex flex-col justify-between border-r border-white/[0.08] bg-[#050A08]/98 backdrop-blur-2xl ${
          isMobileMenuOpen
            ? 'translate-x-0 w-72'
            : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Top Header & Brand Wordmark */}
        <div>
          <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.08]">
            <div
              className="flex items-center gap-3 overflow-hidden cursor-pointer"
              onClick={() => handleNavClick('dashboard')}
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#5DD62C]/60 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(93,214,44,0.25)]">
                <Compass className="w-5 h-5 text-[#5DD62C]" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5DD62C] shadow-[0_0_8px_#5DD62C]" />
              </div>
              {(!sidebarCollapsed || isMobileMenuOpen) && (
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-white leading-tight">
                    HIRE<span className="text-[#5DD62C]">LY</span>
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase font-medium">
                    Spatial Intel
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Agent Tagline */}
          {(!sidebarCollapsed || isMobileMenuOpen) && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-slate-200">
                <Radio className="w-3.5 h-3.5 text-[#5DD62C] animate-pulse" />
                TINYFISH AGENT
              </span>
              <span className="text-[11px] font-mono font-semibold text-[#5DD62C] bg-[#5DD62C]/10 px-2 py-0.5 rounded">
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
                  onClick={() => handleNavClick(item.id)}
                  className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'text-white bg-white/[0.08] border border-white/[0.14] shadow-[0_0_20px_rgba(93,214,44,0.1)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={(sidebarCollapsed && !isMobileMenuOpen) ? item.label : undefined}
                >
                  {/* Left Active Glow Bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#5DD62C] shadow-[0_0_10px_#5DD62C]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#5DD62C]' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {(!sidebarCollapsed || isMobileMenuOpen) && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.isAi && (
                        <span className="text-[10px] font-mono font-bold text-[#5DD62C] bg-[#5DD62C]/15 px-1.5 py-0.5 rounded border border-[#5DD62C]/30 shadow-[0_0_8px_rgba(93,214,44,0.25)]">
                          AI
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Completion & Quick Links */}
        <div className="p-3 border-t border-white/[0.08] space-y-2.5">
          {/* Quick Email Preview Trigger */}
          <button
            onClick={() => setIsEmailPreviewOpen(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer ${
              (sidebarCollapsed && !isMobileMenuOpen) ? 'justify-center' : 'justify-between'
            }`}
            title="Preview Email Digest"
          >
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#5DD62C]" />
              {(!sidebarCollapsed || isMobileMenuOpen) && <span>Email Digest Preview</span>}
            </div>
            {(!sidebarCollapsed || isMobileMenuOpen) && (
              <span className="text-[11px] font-mono text-slate-300 font-medium">DAILY</span>
            )}
          </button>

          {/* Profile Completion Ring Card */}
          <div
            onClick={() => handleNavClick('profile')}
            className="cursor-pointer group rounded-xl p-3 bg-white/[0.03] border border-white/[0.08] hover:border-[#5DD62C]/50 hover:bg-white/[0.06] transition-all"
          >
            <div className="flex items-center gap-3">
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
                    stroke="#5DD62C"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute font-mono text-[11px] font-bold text-[#5DD62C]">
                  {profile.profileCompletion}%
                </span>
              </div>
              {(!sidebarCollapsed || isMobileMenuOpen) && (
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-semibold text-white truncate group-hover:text-[#5DD62C] transition-colors">
                    {profile.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 truncate">
                    {profile.degree} · Year {profile.year}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sign Out Button */}
          {currentUser && (
            <button
              onClick={() => logout()}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-300 hover:text-red-200 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 transition-all cursor-pointer ${
                (sidebarCollapsed && !isMobileMenuOpen) ? 'justify-center' : 'justify-start'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              {(!sidebarCollapsed || isMobileMenuOpen) && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
