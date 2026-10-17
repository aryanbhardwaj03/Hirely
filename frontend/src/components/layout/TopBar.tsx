import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Bell, Sparkles, Command, Check, ExternalLink, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TopBar: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    profile, 
    opportunities, 
    setSelectedOpportunity, 
    setActiveTab,
    runDiscovery,
    isDiscovering,
    backendHealth
  } = useApp();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cmd+K hotkey handler
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

  const searchResults = searchQuery.trim() 
    ? opportunities.filter(o => 
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-30 w-full h-18 border-b border-white/[0.08] bg-[#050A08]/85 backdrop-blur-2xl px-6 flex items-center justify-between gap-4">
      {/* Left: Clean search input without any prefilled text */}
      <div className="relative flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="Search scholarships, internships, hackathons..."
            className="w-full h-10 pl-10 pr-16 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00E676]/50 focus:ring-1 focus:ring-[#00E676]/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          />
          <div className="absolute right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-slate-300">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>

        {/* Live Search Results Dropdown */}
        <AnimatePresence>
          {isSearchFocused && searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-0 right-0 top-12 p-2 rounded-xl bg-[#090E0B]/95 backdrop-blur-2xl border border-white/[0.14] shadow-2xl z-50 divide-y divide-white/[0.06]"
            >
              {searchResults.length > 0 ? (
                searchResults.map((opp) => (
                  <div
                    key={opp.id}
                    onMouseDown={() => {
                      setSelectedOpportunity(opp);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.06] cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="text-xs font-medium text-white group-hover:text-[#00E676] transition-colors">
                        {opp.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {opp.organization} · {opp.category}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-[#00E676] font-semibold">
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

      {/* Right: TinyFish Live status chip, Live Trigger, Notification bell, Avatar */}
      <div className="flex items-center gap-3.5">
        {/* TinyFish Agent Status Chip */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#00E676]" />
            <div className="absolute w-3.5 h-3.5 rounded-full bg-[#00E676]/40 animate-ping" />
          </div>
          <span className="text-slate-300 font-mono text-[11px] tracking-wide">
            TinyFish AI · <span className="text-[#00E676] font-semibold">FETCHING ACTIVE</span>
          </span>
        </div>

        {/* Scan Live Web CTA */}
        <button
          onClick={() => runDiscovery()}
          disabled={isDiscovering}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] text-xs font-semibold tracking-wide shadow-[0_0_20px_rgba(0,230,118,0.15)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Scanning...' : 'Scan Live Web'}</span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]" />
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {isNotificationOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                className="absolute right-0 top-12 w-80 p-3 rounded-2xl bg-[#090E0B]/95 backdrop-blur-2xl border border-white/[0.14] shadow-2xl z-50 space-y-2"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-white">Live Intelligence Feeds</span>
                  <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-full">
                    3 unread
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <div className="text-xs font-medium text-white flex items-center justify-between">
                      <span>DeepMind Fellow deadline</span>
                      <span className="text-[10px] font-mono text-amber-400">34d left</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      98% match for your PyTorch & AI profile.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer">
                    <div className="text-xs font-medium text-white flex items-center justify-between">
                      <span>HackMIT Registration Open</span>
                      <span className="text-[10px] font-mono text-[#00E676]">Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      TinyFish agent verified team application portal.
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
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:border-[#00E676]/40 hover:bg-white/[0.08] transition-all cursor-pointer shadow-sm"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00E676]/30 to-[#122A14] border border-[#00E676]/50 flex items-center justify-center text-xs font-bold text-[#00E676]">
            AC
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-white leading-tight">
              {profile.name}
            </div>
            <div className="text-[10px] font-mono text-[#00E676]">
              Profile {profile.profileCompletion}% complete
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
