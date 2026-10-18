import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OpportunityCard } from '../opportunity/OpportunityCard';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  MapPin,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { OpportunitySortOption } from '../../types/opportunity';
import { matchesLocationScope, sortOpportunities, isTrustworthySource } from '../../utils/opportunityFilters';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_PIPELINE = [
  'SCANNING CAREER SITES...',
  'FILTERING PROFILE MATCHES...',
  '12 NEW OPPORTUNITIES FOUND',
];

export const RecommendedFeed: React.FC = () => {
  const {
    opportunities,
    profile,
    radarFilters,
    sortBy,
    setSortBy,
    locationScope,
    setLocationScope
  } = useApp();

  const scrollRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Typewriter status messages cycling
  const [pipelineIndex, setPipelineIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    const currentLine = STATUS_PIPELINE[pipelineIndex];
    let timer: NodeJS.Timeout;
    if (typedChars < currentLine.length) {
      timer = setTimeout(() => {
        setTypedChars(prev => prev + 1);
      }, 35);
    } else {
      timer = setTimeout(() => {
        setTypedChars(0);
        setPipelineIndex(prev => (prev + 1) % STATUS_PIPELINE.length);
      }, 3200);
    }
    return () => clearTimeout(timer);
  }, [typedChars, pipelineIndex]);

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter recommendations based on radar toggles, location scope, and trustworthy source
  const filteredFeed = opportunities.filter((opp) => {
    if (radarFilters.remoteOnly && !opp.isRemote) return false;
    if (!radarFilters.scholarships && opp.category === 'scholarship') return false;
    if (!radarFilters.internships && opp.category === 'internship') return false;
    if (!matchesLocationScope(opp, locationScope)) return false;
    if (!isTrustworthySource(opp.url, opp.source)) return false;
    return true;
  });

  // Sort feed
  const sortedFeed = sortOpportunities(filteredFeed, sortBy, profile.location);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const currentLine = STATUS_PIPELINE[pipelineIndex];
  const displayedText = currentLine.slice(0, typedChars);

  const sortLabels: Record<OpportunitySortOption, string> = {
    newest: 'Newest first',
    highest_paying: 'Highest paying',
    nearest: 'Nearest first',
    best_match: 'Best match',
    deadline_soonest: 'Deadline soonest',
  };

  return (
    <section className="space-y-4 w-full min-w-0">
      {/* 1. Greeting & Live Telemetry Line */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium tracking-tight text-[#F8F8F8] leading-tight break-words">
            Good evening, {profile.name.split(' ')[0]}.{' '}
            <span className="text-[#5DD62C] italic">{sortedFeed.length} opportunities</span> calibrated.
          </h1>

          {/* Live Scan Line with Typewriter */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5DD62C]/10 border border-[#5DD62C]/30 text-[#5DD62C] text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5DD62C] animate-pulse" />
              <span>TinyFish · LIVE</span>
            </div>

            <div className="flex items-center gap-2 overflow-hidden text-xs">
              {STATUS_PIPELINE.map((stage, idx) => {
                if (idx < pipelineIndex) {
                  return (
                    <span key={idx} className="opacity-40 line-through text-slate-400 hidden md:inline">
                      {stage} &gt;
                    </span>
                  );
                }
                if (idx === pipelineIndex) {
                  return (
                    <span key={idx} className="text-[#5DD62C] font-bold tracking-wider truncate">
                      {displayedText}
                      <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#5DD62C] animate-pulse align-middle" />
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        {/* Feed Header Controls: Sort Dropdown + Feed Counter + Carousel Navigation */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-end">
          {/* Opportunity Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202020] border border-white/[0.1] hover:border-[#5DD62C]/40 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
              title="Change sort ordering"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5DD62C]" />
              <span className="hidden sm:inline text-slate-400">Sort:</span>
              <span className="font-medium text-white">{sortLabels[sortBy]}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  className="absolute right-0 top-11 w-48 p-1.5 rounded-2xl bg-[#090E0B]/98 backdrop-blur-2xl border border-white/[0.14] shadow-2xl z-50 space-y-1"
                >
                  {(['newest', 'highest_paying', 'nearest', 'best_match', 'deadline_soonest'] as OpportunitySortOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSortBy(opt);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-colors flex items-center justify-between ${
                        sortBy === opt
                          ? 'bg-[#5DD62C]/15 text-[#5DD62C] font-semibold border border-[#5DD62C]/30'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span>{sortLabels[opt]}</span>
                      {sortBy === opt && <span className="w-1.5 h-1.5 rounded-full bg-[#5DD62C]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recommended Feed Count Badge */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#202020] border border-white/[0.08] text-[11px] sm:text-xs font-mono text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-[#5DD62C]" />
            <span>Feed ({sortedFeed.length})</span>
          </div>

          {/* Left/Right Carousel Buttons */}
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-[#202020] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-[#202020] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Horizontal Scrollable Row of Glass Cards */}
      <div className="relative w-full max-w-full overflow-hidden">
        {sortedFeed.length > 0 ? (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x horizontal-scroll-mask no-scrollbar w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {sortedFeed.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} layout="horizontal" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-8 bg-[#202020]/80 border border-white/[0.1] text-center space-y-3">
            <MapPin className="w-8 h-8 text-[#5DD62C] mx-auto opacity-70" />
            <div className="text-sm font-semibold text-white">
              No opportunities found matching current filters
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your location filter is currently set to "{locationScope.replace('_', ' ').toUpperCase()}". Broaden your filter to view all verified national and global remote opportunities.
            </p>
            <button
              onClick={() => setLocationScope('all')}
              className="px-4 py-2 rounded-xl bg-[#5DD62C] text-[#0F0F0F] font-semibold text-xs transition-transform hover:scale-105 cursor-pointer shadow-lg"
            >
              Show All Remote & Worldwide Opportunities
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
