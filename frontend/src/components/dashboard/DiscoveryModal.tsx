import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Radio, CheckCircle2, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STAGES = [
  'Preparing your search & querying live job sources...',
  'Discovering opportunities across live career portals & university feeds...',
  'Checking source pages, eligibility criteria & accreditation records...',
  'Evaluating coursework alignment against student curriculum & skills...',
  'Synthesizing semantic weights and ranking your personalized matches...',
];

export const DiscoveryModal: React.FC = () => {
  const { isDiscoveryModalOpen, setIsDiscoveryModalOpen, discoveryProgress, isDiscovering } = useApp();

  if (!isDiscoveryModalOpen) return null;

  const currentStageIndex = discoveryProgress ? discoveryProgress.index : 0;
  const currentProgress = discoveryProgress ? discoveryProgress.progress : 15;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl bg-[#090E0B] border border-[#00E676]/40 shadow-2xl p-6 z-10 space-y-5 glass-inner-highlight"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#122A14] border border-[#00E676]/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#00E676] animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  AI Opportunity Discovery
                </h3>
                <span className="text-[11px] font-mono text-[#00E676] font-medium">
                  LIVE WEB INTELLIGENCE AGENT
                </span>
              </div>
            </div>

            <span className="font-mono text-xs text-[#00E676] bg-[#00E676]/15 px-2.5 py-0.5 rounded-full tabular-nums font-bold border border-[#00E676]/30">
              {currentProgress}%
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#122A14] via-[#00E676] to-[#5DD62C] rounded-full"
                animate={{ width: `${currentProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-300">
              <span>SCANNING DEEP WEB PORTALS</span>
              <span className="text-[#00E676] font-semibold">5-STAGE PIPELINE</span>
            </div>
          </div>

          {/* 5 Stages List */}
          <div className="space-y-2.5 pt-1">
            {STAGES.map((desc, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 text-xs transition-colors p-2.5 rounded-xl ${
                    isCurrent
                      ? 'bg-[#00E676]/10 text-white border border-[#00E676]/30 font-semibold'
                      : isPast
                      ? 'text-slate-200'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0 mt-0.5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#00E676] shrink-0 mt-0.5 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20 shrink-0 mt-0.5" />
                  )}
                  <span>{desc}</span>
                </div>
              );
            })}
          </div>

          {/* Footer Status */}
          <div className="pt-2 text-[11px] font-mono text-slate-300 flex items-center justify-between border-t border-white/[0.08]">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#00E676] animate-pulse" />
              Real-time semantic filtering active
            </span>
            {!isDiscovering && (
              <button
                onClick={() => setIsDiscoveryModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                View Matches
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
