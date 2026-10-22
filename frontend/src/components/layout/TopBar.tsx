import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Sparkles,
  Command,
  Bell,
  Radio,
  Bot,
  Menu,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocationScope } from '../../types/opportunity';

export const TopBar: React.FC = () => {
  const {
    profile,
    opportunities,
    setSelectedOpportunity,
    runDiscovery,
    isDiscovering,
    setActiveTab,
    setIsHirelyCoreOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    locationScope,
    setLocationScope
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  // Command + K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside notification or location dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter search results
  const searchResults = searchQuery.trim()
    ? opportunities.filter(
        (opp) =>
          opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opp.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opp.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
          opp.location.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const locationLabels: Record<LocationScope, string> = {
    all: 'All Locations',
    delhi_ncr: 'Delhi/NCR, India',
    india: 'Anywhere in India',
    remote_worldwide: 'Remote Worldwide',
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 sm:h-18 border-b border-white/[0.08] bg-[#050A08]/90 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Mobile Hamburger Menu Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5 text-[#5DD62C]" />
        </button>

        {/* Search Input Container */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Search internships, hackathons, skills..."
              className="w-full h-9 sm:h-10 pl-9 sm:pl-10 pr-12 sm:pr-14 rounded-xl bg-[#202020] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5DD62C]/60 focus:ring-1 focus:ring-[#5DD62C]/30 transition-all shadow-inner"
            />
            <div className="hidden sm:flex absolute right-2.5 items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-slate-300">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>

          {/* Search Dropdown Results */}
          <AnimatePresence>
            {isSearchFocused && searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-0 right-0 top-12 p-2 rounded-2xl bg-[#090E0B]/98 backdrop-blur-2xl border border-white/[0.14] shadow-2xl z-50 divide-y divide-white/[0.06]"
              >
                {searchResults.length > 0 ? (
                  searchResults.map((opp) => (
                    <div
                      key={opp.id}
                      onMouseDown={() => {
                        setSelectedOpportunity(opp);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] cursor-pointer group transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-medium text-white group-hover:text-[#5DD62C] transition-colors truncate">
                          {opp.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {opp.organization} · {opp.location}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#5DD62C] font-semibold shrink-0">
                        {opp.match_score}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    No matching opportunities found for "{searchQuery}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Location Scope Pill Selector */}
        <div className="relative hidden lg:block" ref={locationRef}>
          <button
            onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202020] border border-white/[0.1] hover:border-[#5DD62C]/40 text-xs font-mono text-slate-200 transition-all cursor-pointer"
            title="Filter by geographic region"
          >
            <MapPin className="w-3.5 h-3.5 text-[#5DD62C]" />
            <span>{locationLabels[locationScope]}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <AnimatePresence>
            {isLocationDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                className="absolute right-0 top-11 w-52 p-1.5 rounded-2xl bg-[#090E0B]/98 backdrop-blur-2xl border border-white/[0.14] shadow-2xl z-50 space-y-1"
              >
                {(['delhi_ncr', 'india', 'remote_worldwide', 'all'] as LocationScope[]).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      setLocationScope(scope);
                      setIsLocationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-colors flex items-center justify-between ${
                      locationScope === scope
                        ? 'bg-[#5DD62C]/15 text-[#5DD62C] font-semibold border border-[#5DD62C]/30'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span>{locationLabels[scope]}</span>
                    {locationScope === scope && <span className="w-1.5 h-1.5 rounded-full bg-[#5DD62C]" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live AI search Telemetry Chip */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#202020] border border-white/[0.08] text-xs shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#5DD62C]" />
            <div className="absolute w-3.5 h-3.5 rounded-full bg-[#5DD62C]/40 animate-ping" />
          </div>
          <span className="text-slate-300 font-mono text-[11px] tracking-wide">
            AI SEARCH · <span className="text-[#5DD62C] font-semibold">FETCHING ACTIVE</span>
          </span>
        </div>

        {/* Scan Live Web CTA */}
        <button
          onClick={() => runDiscovery()}
          disabled={isDiscovering}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#5DD62C]/15 hover:bg-[#5DD62C]/25 border border-[#5DD62C]/40 text-[#5DD62C] text-xs font-semibold tracking-wide shadow-[0_0_20px_rgba(93,214,44,0.15)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Scanning...' : 'Scan Live Web'}</span>
        </button>

        {/* Hirely Core AI Quick Trigger Pill */}
        <button
          onClick={() => setIsHirelyCoreOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#202020] hover:bg-white/[0.08] border border-[#5DD62C]/50 hover:border-[#5DD62C] text-white text-xs font-medium transition-all shadow-[0_0_15px_rgba(93,214,44,0.2)] cursor-pointer"
          title="Open Hirely Core AI Assistant"
        >
          <Bot className="w-3.5 h-3.5 text-[#5DD62C]" />
          <span className="hidden sm:inline font-semibold">Hirely Core</span>
          <span className="text-[10px] font-mono text-[#5DD62C] bg-[#5DD62C]/15 px-1 py-0.2 rounded font-bold">
            AI
          </span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 rounded-xl bg-[#202020] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#5DD62C] shadow-[0_0_6px_#5DD62C]" />
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {isNotificationOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                className="absolute right-0 top-12 w-72 sm:w-80 p-3 rounded-2xl bg-[#090E0B]/98 backdrop-blur-2xl border border-white/[0.14] shadow-2xl z-50 space-y-2"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-white">Live Intelligence Feeds</span>
                  <span className="text-[10px] font-mono text-[#5DD62C] bg-[#5DD62C]/10 px-2 py-0.5 rounded-full">
                    3 unread
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <div className="text-xs font-medium text-white flex items-center justify-between">
                      <span>Microsoft IDC Noida</span>
                      <span className="text-[10px] font-mono text-[#5DD62C]">29d left</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      97% match for your Delhi/NCR B.Tech profile.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <div className="text-xs font-medium text-white flex items-center justify-between">
                      <span>Google DeepMind Fellow</span>
                      <span className="text-[10px] font-mono text-amber-400">34d left</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      98% match for your PyTorch & AI profile.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar Chip */}
        <div
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-2 pl-2 pr-2.5 sm:pr-3 py-1.5 rounded-xl bg-[#202020] border border-white/[0.1] hover:border-[#5DD62C]/40 hover:bg-white/[0.08] transition-all cursor-pointer shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#5DD62C]/30 to-[#122A14] border border-[#5DD62C]/60 flex items-center justify-center text-xs font-bold text-[#5DD62C]">
            {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">
              {profile.name}
            </div>
            <div className="text-[10px] font-mono text-[#5DD62C]">
              {profile.profileCompletion}% ready
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
