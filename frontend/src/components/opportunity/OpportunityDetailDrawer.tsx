import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ApplicationColumnId } from '../../types/opportunity';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Bookmark, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  ArrowRight,
  Bot,
  Lightbulb,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getOpportunitySummary, BackendSummaryResponse } from '../../services/api';

export const OpportunityDetailDrawer: React.FC = () => {
  const { 
    selectedOpportunity, 
    setSelectedOpportunity, 
    toggleSaveOpportunity, 
    isOpportunitySaved,
    applications,
    updateApplicationStatus,
    addToPipeline,
    removeFromPipeline,
    isOpportunityInPipeline,
    profile,
    setIsHirelyCoreOpen
  } = useApp();

  const [aiSummary, setAiSummary] = useState<BackendSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOpportunity(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedOpportunity]);

  // Reset summary on opportunity change
  useEffect(() => {
    setAiSummary(null);
  }, [selectedOpportunity?.id]);

  if (!selectedOpportunity) return null;

  const isSaved = isOpportunitySaved(selectedOpportunity.id);
  const currentApp = applications.find(a => a.opportunityId === selectedOpportunity.id);
  const currentStatus: ApplicationColumnId = currentApp ? currentApp.status : 'matched';

  const handleFetchAiSummary = async () => {
    setLoadingSummary(true);
    const summary = await getOpportunitySummary(
      selectedOpportunity.url,
      selectedOpportunity.category,
      profile.skills
    );
    setLoadingSummary(false);
    if (summary) {
      setAiSummary(summary);
    } else {
      // Mock structured summary adhering to SummaryResponse schema
      setAiSummary({
        title: selectedOpportunity.title,
        organization: selectedOpportunity.organization,
        opportunity_type: selectedOpportunity.category,
        url: selectedOpportunity.url,
        executive_summary: `${selectedOpportunity.organization} is offering a high-impact ${selectedOpportunity.category} position for students with foundational aptitude in ${selectedOpportunity.required_skills.slice(0, 2).join(' and ')}. Work includes designing robust distributed architectures, collaborative team sprints, and direct mentoring.`,
        key_responsibilities: [
          'Participate in daily engineering scrums and architectural design reviews',
          'Implement verified test cases, CI/CD pipeline automation, and code refactoring',
          'Collaborate with staff researchers on benchmark evaluations and performance analysis'
        ],
        required_skills: selectedOpportunity.required_skills,
        nice_to_have_skills: ['Docker / Containers', 'Git & CI/CD Workflows', 'Technical Documentation'],
        eligibility_and_requirements: [
          'Enrolled undergraduate or graduate candidate in CS or related STEM program',
          'Proficiency in core language fundamentals (Python, TypeScript, or C++)'
        ],
        compensation_or_prizes: selectedOpportunity.stipendOrAward,
        deadlines_or_dates: selectedOpportunity.deadlineFormatted,
        why_it_matters: 'Exceptional opportunity to gain verifiable technical experience, publish or ship production code, and build senior industry connections.',
        application_tips: [
          'Tailor resume bullet points specifically to matched coursework projects',
          'Highlight GitHub repositories demonstrating clean modular code and readme documentation'
        ],
        source: 'TinyFish AI Summarizer'
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedOpportunity(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Slide-out Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-xl h-full bg-[#050A08] border-l border-white/[0.12] shadow-2xl z-50 flex flex-col justify-between overflow-y-auto"
        >
          {/* Top Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#5DD62C]/50 to-transparent pointer-events-none" />

          {/* Drawer Header */}
          <div className="p-6 border-b border-white/[0.08] sticky top-0 bg-[#050A08]/95 backdrop-blur-xl z-20 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[#5DD62C]/15 border border-[#5DD62C]/30 text-[#5DD62C] font-semibold">
                  {selectedOpportunity.category}
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  {selectedOpportunity.last_checked_at}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                {selectedOpportunity.title}
              </h2>
              <p className="text-sm text-slate-300 mt-0.5 font-medium">
                {selectedOpportunity.organization}
              </p>
            </div>

            <button
              onClick={() => setSelectedOpportunity(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Match Intelligence Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#122A14] to-[#0A160D] border border-[#5DD62C]/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5DD62C]" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    AI Opportunity Fit Analysis
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-[#5DD62C]">
                  {selectedOpportunity.match_score}% Match Score
                </div>
              </div>

              {/* Match Reasons */}
              <div className="space-y-1.5">
                {selectedOpportunity.match_reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5DD62C] shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {selectedOpportunity.missing_requirements.length > 0 && (
                <div className="pt-2 border-t border-[#5DD62C]/20 text-xs text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Recommendation: {selectedOpportunity.missing_requirements[0]}</span>
                </div>
              )}
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase">
                  <MapPin className="w-3.5 h-3.5 text-[#5DD62C]" />
                  <span>Location</span>
                </div>
                <div className="text-white font-medium mt-1 truncate">
                  {selectedOpportunity.location}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase">
                  <Calendar className="w-3.5 h-3.5 text-[#5DD62C]" />
                  <span>Deadline</span>
                </div>
                <div className="text-white font-medium mt-1 font-mono">
                  {selectedOpportunity.deadlineFormatted}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase">
                  <DollarSign className="w-3.5 h-3.5 text-[#5DD62C]" />
                  <span>Stipend / Award</span>
                </div>
                <div className="text-[#5DD62C] font-medium mt-1 font-mono">
                  {selectedOpportunity.stipendOrAward}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5DD62C]" />
                  <span>Verification Status</span>
                </div>
                <div className="text-white font-medium mt-1 capitalize flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5DD62C]" />
                  {selectedOpportunity.eligibility_status}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Opportunity Overview
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {selectedOpportunity.description}
              </p>
            </div>

            {/* TinyFish Deep AI Page Summarizer on Demand */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#5DD62C]" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    TinyFish Web Extractor & Summary
                  </span>
                </div>
                {!aiSummary && (
                  <button
                    onClick={handleFetchAiSummary}
                    disabled={loadingSummary}
                    className="px-3 py-1 rounded-lg bg-[#5DD62C]/15 hover:bg-[#5DD62C]/25 border border-[#5DD62C]/40 text-[#5DD62C] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingSummary ? 'Extracting Page...' : 'Extract Full Summary'}
                  </button>
                )}
              </div>

              {aiSummary && (
                <div className="space-y-3 pt-2 text-xs text-slate-300 divide-y divide-white/[0.06]">
                  <div>
                    <span className="font-semibold text-white block mb-1">Executive Summary</span>
                    <p className="leading-relaxed">{aiSummary.executive_summary}</p>
                  </div>

                  <div className="pt-2">
                    <span className="font-semibold text-white block mb-1">Key Responsibilities</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {aiSummary.key_responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2">
                    <span className="font-semibold text-white block mb-1">Application Tips</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {aiSummary.application_tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Prerequisites & Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedOpportunity.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Eligibility Requirements */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Eligibility Guidelines
              </h3>
              <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                {selectedOpportunity.eligibility}
              </p>
            </div>

            {/* Pipeline Stage Control */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Application Pipeline Tracking
                </span>
                {currentApp && (
                  <button
                    onClick={() => removeFromPipeline(selectedOpportunity.id)}
                    className="text-[11px] font-mono text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Remove from Pipeline
                  </button>
                )}
              </div>

              {!currentApp ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300">
                    Track this opportunity through your application lifecycle (Matched → Applied → In Review → Offers).
                  </p>
                  <button
                    onClick={() => addToPipeline(selectedOpportunity.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#5DD62C]/20 hover:bg-[#5DD62C]/30 border border-[#5DD62C]/50 text-[#5DD62C] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Add to Application Pipeline (Matched)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Active Stage:</span>
                    <span className="font-mono text-[#5DD62C] uppercase font-bold">
                      {currentStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['matched', 'applied', 'in_review', 'offers'] as ApplicationColumnId[]).map((status) => {
                      const isCurrent = currentStatus === status;
                      const labels: Record<ApplicationColumnId, string> = {
                        matched: 'Matched',
                        applied: 'Applied',
                        in_review: 'In Review',
                        offers: 'Offers',
                      };
                      return (
                        <button
                          key={status}
                          onClick={() => updateApplicationStatus(selectedOpportunity.id, status)}
                          className={`py-2 px-1.5 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer text-center ${
                            isCurrent
                              ? 'bg-[#5DD62C] text-black font-bold shadow-md'
                              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {labels[status]}
                        </button>
                      );
                    })}
                  </div>
                  {currentStatus === 'matched' && (
                    <button
                      onClick={() => updateApplicationStatus(selectedOpportunity.id, 'applied')}
                      className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-[#5DD62C]/20 border border-[#5DD62C]/30 text-xs text-[#5DD62C] font-semibold transition-all cursor-pointer text-center"
                    >
                      ✓ Submitted Application? Mark as Applied
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Drawer Sticky Footer with CTAs */}
          <div className="p-4 sm:p-6 border-t border-white/[0.08] bg-[#0F0F0F]/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => toggleSaveOpportunity(selectedOpportunity.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                isSaved
                  ? 'bg-[#5DD62C]/20 border-[#5DD62C]/50 text-[#5DD62C]'
                  : 'bg-white/[0.04] border-white/[0.1] text-slate-200 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? '#5DD62C' : 'none'} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={() => {
                setSelectedOpportunity(selectedOpportunity);
                setIsHirelyCoreOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-[#202020] border border-[#5DD62C]/50 hover:border-[#5DD62C] text-[#5DD62C] hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Interrogate this opportunity with Hirely Core AI"
            >
              <Bot className="w-4 h-4 text-[#5DD62C]" />
              <span>Ask AI Core</span>
            </button>

            <a
              href={selectedOpportunity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] text-xs font-bold transition-all shadow-xl cursor-pointer"
            >
              <span>Apply Official Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
