import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { OpportunityCard } from '../opportunity/OpportunityCard';
import { ChevronLeft, ChevronRight, Sparkles, Radio } from 'lucide-react';
import { motion } from 'motion/react';

const STATUS_PIPELINE = [
  'SCANNING CAREER SITES...',
  'FILTERING PROFILE MATCHES...',
  '12 NEW OPPORTUNITIES FOUND',
];

export const RecommendedFeed: React.FC = () => {
  const { opportunities, profile, radarFilters } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Filter recommendations based on radar toggles
  const filteredFeed = opportunities.filter((opp) => {
    if (radarFilters.remoteOnly && !opp.isRemote) return false;
    if (!radarFilters.scholarships && opp.category === 'scholarship') return false;
    if (!radarFilters.internships && opp.category === 'internship') return false;
    return true;
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const currentLine = STATUS_PIPELINE[pipelineIndex];
  const displayedText = currentLine.slice(0, typedChars);

  return (
    <section className="space-y-4">
      {/* 1. Greeting in elegant Serif */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#F8F8F8] leading-tight">
            Good evening, {profile.name.split(' ')[0]}. <span className="text-[#00E676] italic">12 new matches</span> today.
          </h1>

          {/* 2. Live Scan Line with Typewriter, Previous lines faded, and TinyFish · LIVE label */}
          <div className="flex flex-wrap items-center gap-3 mt-2.5 font-mono text-xs text-slate-300">
            {/* TinyFish Live Label */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] text-[11px] font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
              <span>TinyFish · LIVE</span>
            </div>

            {/* Stepped Status Display: previous stages faded to 40% */}
            <div className="flex items-center gap-2 overflow-hidden text-xs sm:text-sm">
              {STATUS_PIPELINE.map((stage, idx) => {
                if (idx < pipelineIndex) {
                  return (
                    <span key={idx} className="opacity-40 line-through text-slate-400 hidden sm:inline">
                      {stage} &gt;
                    </span>
                  );
                }
                if (idx === pipelineIndex) {
                  return (
                    <span key={idx} className="text-[#00E676] font-bold tracking-wider">
                      {displayedText}
                      <span className="inline-block w-2 h-4 ml-0.5 bg-[#00E676] animate-pulse align-middle" />
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        {/* Feed Header Controls */}
        <div className="flex items-center gap-2 self-start md:self-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Recommended Feed ({filteredFeed.length})</span>
          </div>

          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Horizontal Scrollable Row of Glass Cards with fade mask on the right edge */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x horizontal-scroll-mask no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredFeed.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} layout="horizontal" />
          ))}
        </div>
      </div>
    </section>
  );
};
