import React from 'react';
import { Opportunity } from '../../types/opportunity';
import { useApp } from '../../context/AppContext';
import { 
  Bookmark, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Sparkles, 
  ArrowUpRight 
} from 'lucide-react';
import { motion } from 'motion/react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  layout?: 'horizontal' | 'grid' | 'compact';
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ 
  opportunity, 
  layout = 'horizontal' 
}) => {
  const { 
    setSelectedOpportunity, 
    toggleSaveOpportunity, 
    isOpportunitySaved 
  } = useApp();

  const isSaved = isOpportunitySaved(opportunity.id);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'scholarship':
        return 'text-amber-300 border-amber-400/20 bg-amber-400/10';
      case 'internship':
        return 'text-[#00E676] border-[#00E676]/25 bg-[#00E676]/10';
      case 'hackathon':
        return 'text-cyan-300 border-cyan-400/20 bg-cyan-400/10';
      case 'fellowship':
        return 'text-purple-300 border-purple-400/20 bg-purple-400/10';
      default:
        return 'text-slate-300 border-white/10 bg-white/5';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group relative rounded-2xl p-5 bg-white/[0.04] backdrop-blur-2xl border transition-all duration-300 flex flex-col justify-between h-[360px] glass-inner-highlight ${
        opportunity.isTopMatch
          ? 'border-[#00E676]/50 shadow-[0_0_35px_rgba(0,230,118,0.14)]'
          : 'border-white/[0.1] hover:border-[#00E676]/40 hover:shadow-[0_0_30px_rgba(0,230,118,0.09)]'
      } ${layout === 'horizontal' ? 'w-[360px] shrink-0 snap-start' : 'w-full'}`}
    >
      {/* Top Header Row: Category Tag, TinyFish mono label, Match Pill, Save Icon */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider border font-medium ${getCategoryBadgeClass(opportunity.category)}`}>
              {opportunity.category}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
              TinyFish
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Match % Pill */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00E676]/15 border border-[#00E676]/35 text-[#00E676] font-mono text-xs font-bold tracking-tight">
              <Sparkles className="w-3 h-3" />
              <span>{opportunity.match_score}% MATCH</span>
            </div>

            {/* Save Icon Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveOpportunity(opportunity.id);
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSaved
                  ? 'bg-[#00E676]/20 border-[#00E676]/40 text-[#00E676]'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
              }`}
              title={isSaved ? "Remove from saved" : "Save opportunity"}
              aria-label={isSaved ? "Remove from saved" : "Save opportunity"}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isSaved ? '#00E676' : 'none'} />
            </button>
          </div>
        </div>

        {/* Title & Organization - wraps cleanly to 2 lines, no overflow */}
        <div 
          className="cursor-pointer mb-2.5 min-h-[44px]"
          onClick={() => setSelectedOpportunity(opportunity)}
        >
          <h3 className="text-base font-semibold text-white group-hover:text-[#00E676] transition-colors line-clamp-2 leading-snug">
            {opportunity.title}
          </h3>
          <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
            {opportunity.organization}
          </p>
        </div>

        {/* Location & Deadline Meta Line */}
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-2.5">
          <div className="flex items-center gap-1 truncate max-w-[150px]">
            <MapPin className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
            <span className="truncate">{opportunity.location}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className={opportunity.daysLeft && opportunity.daysLeft <= 14 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
              {opportunity.deadlineFormatted}
            </span>
          </div>
        </div>

        {/* Matched Skills Chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {opportunity.required_skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-200"
            >
              {skill}
            </span>
          ))}
          {opportunity.required_skills.length > 3 && (
            <span className="px-1.5 py-0.5 text-[11px] font-mono text-slate-400">
              +{opportunity.required_skills.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer: FETCHED LIVE via TinyFish + Full-width Apply Button */}
      <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span className="text-[#00E676] font-medium truncate">
            {opportunity.stipendOrAward}
          </span>
          <span className="uppercase text-[11px] text-slate-400 font-mono">
            FETCHED LIVE via TinyFish
          </span>
        </div>

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={() => setSelectedOpportunity(opportunity)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] transition-colors cursor-pointer shrink-0"
          >
            Details
          </button>

          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-white text-black hover:bg-slate-100 text-xs font-bold tracking-tight shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Apply Now</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
