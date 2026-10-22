import React from 'react';
import { Opportunity } from '../../types/opportunity';
import { useApp } from '../../context/AppContext';
import { 
  Bookmark, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Sparkles, 
  ArrowUpRight,
  ShieldCheck,
  Building,
  Radio
} from 'lucide-react';
import { motion } from 'motion/react';
import { TrustCheckBadge } from '../trustcheck/TrustCheckBadge';

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
    isOpportunitySaved,
    setIsHirelyCoreOpen
  } = useApp();

  const isSaved = isOpportunitySaved(opportunity.id);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'scholarship':
        return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
      case 'internship':
        return 'text-[#5DD62C] border-[#5DD62C]/30 bg-[#5DD62C]/10';
      case 'hackathon':
        return 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10';
      case 'fellowship':
        return 'text-purple-300 border-purple-400/30 bg-purple-400/10';
      default:
        return 'text-slate-300 border-white/10 bg-white/5';
    }
  };

  const getWorkArrangementBadgeClass = (arrangement: string) => {
    switch (arrangement) {
      case 'Remote':
        return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
      case 'Hybrid':
        return 'text-blue-300 border-blue-400/30 bg-blue-400/10';
      case 'On-site':
        return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
      default:
        return 'text-slate-400 border-white/10 bg-white/5';
    }
  };

  const displayOrg = opportunity.organization || 'Company unverified';
  const displayLocation = opportunity.location || 'Location unverified';
  const displayDeadline = opportunity.deadlineFormatted || 'Deadline not specified';
  const isRolePosting = opportunity.category === 'job' || opportunity.category === 'internship';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`group relative rounded-2xl p-5 bg-[#202020]/90 backdrop-blur-2xl border transition-all duration-300 flex flex-col justify-between h-[375px] glass-inner-highlight ${
        opportunity.isTopMatch
          ? 'border-[#5DD62C]/60 shadow-[0_0_35px_rgba(93,214,44,0.16)]'
          : 'border-[#337418]/60 hover:border-[#5DD62C] hover:shadow-[0_0_30px_rgba(93,214,44,0.14)]'
      } ${layout === 'horizontal' ? 'w-[84vw] sm:w-[320px] md:w-[340px] shrink-0 snap-start' : 'w-full'}`}
    >
      {/* Top Header Row: Category Tag, TinyFish status, Match Pill, Save Icon */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border font-medium ${getCategoryBadgeClass(opportunity.category)}`}>
              {opportunity.category}
            </span>

            {/* Work arrangement badge */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border font-medium ${getWorkArrangementBadgeClass(opportunity.workArrangement)}`}>
              {opportunity.workArrangement || (opportunity.isRemote ? 'Remote' : 'On-site')}
            </span>

            {/* TrustCheck Status Badge */}
            <TrustCheckBadge
              status={opportunity.trust_status || (opportunity.isSourceVerified ? 'verified' : 'unverified')}
              score={opportunity.trust_score}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Match % Pill */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#5DD62C]/15 border border-[#5DD62C]/40 text-[#5DD62C] font-mono text-xs font-bold tracking-tight">
              <Sparkles className="w-3 h-3" />
              <span>{opportunity.match_score}% MATCH</span>
            </div>

            {/* Bookmark button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveOpportunity(opportunity.id);
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSaved
                  ? 'bg-[#5DD62C]/20 border-[#5DD62C]/50 text-[#5DD62C]'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
              }`}
              title={isSaved ? "Remove from saved" : "Save opportunity"}
              aria-label={isSaved ? "Remove from saved" : "Save opportunity"}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isSaved ? '#5DD62C' : 'none'} />
            </button>
          </div>
        </div>

        {/* Title & Organization */}
        <div
          className="cursor-pointer mb-2.5 min-h-[46px]"
          onClick={() => setSelectedOpportunity(opportunity)}
        >
          <h3 className="text-sm sm:text-base font-semibold text-[#F8F8F8] group-hover:text-[#5DD62C] transition-colors line-clamp-2 leading-snug">
            {opportunity.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium truncate mt-1">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{displayOrg}</span>
            {opportunity.isSourceVerified && (
              <span title="Verified Employer / Official Portal">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5DD62C] shrink-0" />
              </span>
            )}
          </div>
        </div>

        {/* Location & Deadline Meta */}
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2.5 gap-2">
          <div className="flex items-center gap-1 truncate max-w-[170px]" title={displayLocation}>
            <MapPin className="w-3.5 h-3.5 text-[#5DD62C] shrink-0" />
            <span className="truncate">{displayLocation}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className={opportunity.daysLeft && opportunity.daysLeft <= 14 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
              {displayDeadline}
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

      {/* Bottom Footer: Compensation, Source telemetry, Details + Apply buttons */}
      <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span className="text-[#5DD62C] font-semibold truncate max-w-[180px]">
            {opportunity.stipendOrAward || 'Stipend details on site'}
          </span>
          <span className="uppercase text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={opportunity.sourcePlatform || opportunity.source}>
            {opportunity.sourceDomain || 'VERIFIED SOURCE'}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={() => setSelectedOpportunity(opportunity)}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] transition-colors cursor-pointer shrink-0"
          >
            Details
          </button>

          {/* Apply Now button: solid #F8F8F8 with #0F0F0F text, turns #5DD62C on hover with 300ms transition */}
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] hover:shadow-[0_0_18px_rgba(93,214,44,0.4)] text-xs font-bold tracking-tight transition-all duration-300 cursor-pointer whitespace-nowrap"
          >
            <span>{isRolePosting ? 'View job description' : 'View official listing'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
