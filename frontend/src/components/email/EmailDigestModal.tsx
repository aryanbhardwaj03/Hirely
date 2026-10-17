import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { sendDigestEmail } from '../../services/email';
import { 
  X, 
  Mail, 
  Send, 
  Sparkles, 
  Check, 
  ArrowUpRight, 
  Calendar, 
  MapPin, 
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EmailDigestModal: React.FC = () => {
  const { 
    isEmailPreviewOpen, 
    setIsEmailPreviewOpen, 
    emailConfig, 
    profile, 
    opportunities,
    showToast 
  } = useApp();

  const [isSending, setIsSending] = useState(false);

  if (!isEmailPreviewOpen) return null;

  const topOpps = opportunities.slice(0, 3);

  const handleSendTestDigest = async () => {
    setIsSending(true);
    const result = await sendDigestEmail(emailConfig, topOpps);
    setIsSending(false);
    showToast(result.statusText, 'success');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsEmailPreviewOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#090C0E] border border-white/[0.14] shadow-2xl flex flex-col z-10 overflow-hidden glass-inner-highlight"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#0E1310]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#122A14] border border-[#00E676]/50 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#00E676]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Automated Opportunity Digest Preview
                </h3>
                <p className="text-[11px] font-mono text-slate-300">
                  To: {profile.email} · Sent daily at 07:00 AM
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEmailPreviewOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Email Body Simulation */}
          <div className="p-6 overflow-y-auto space-y-5 bg-[#050A08]">
            {/* Email Header Simulation */}
            <div className="text-center py-4 border-b border-white/[0.08] space-y-1">
              <span className="text-xl font-bold tracking-tight text-white">
                HIRE<span className="text-[#00E676]">LY</span>
              </span>
              <p className="text-xs text-slate-300 font-serif italic">
                Your Morning Opportunity Briefing · Curated by TinyFish
              </p>
            </div>

            {/* Personalized greeting in email */}
            <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.08] text-xs text-slate-200 space-y-1.5">
              <p className="font-semibold text-white">Good morning {profile.name.split(' ')[0]},</p>
              <p className="text-slate-300 leading-relaxed">
                TinyFish autonomous agents scanned 24 verified university databases and tech programs overnight. Here are your 3 highest-probability matches based on your {profile.degree} curriculum and Python/ML skills:
              </p>
            </div>

            {/* Opportunities List in Digest */}
            <div className="space-y-3">
              {topOpps.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-[#00E676]/50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded-full border border-[#00E676]/30 font-semibold">
                      {opp.category} · {opp.match_score}% MATCH
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      Deadline: {opp.deadlineFormatted}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {opp.title}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {opp.organization} · {opp.location}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {opp.description}
                  </p>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="font-mono text-[#00E676] font-semibold">
                      {opp.stipendOrAward}
                    </span>
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00E676] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Review Details & Apply</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Email Footer Note */}
            <div className="text-center pt-4 border-t border-white/[0.08] text-[11px] text-slate-400 space-y-1">
              <p>You are receiving this digest because you opted-in via HIRELY student intelligence workspace.</p>
              <p className="font-mono text-[11px] text-slate-500">HIRELY Autonomous Agents · TinyFish API</p>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 border-t border-white/[0.08] bg-[#090C0E] flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300">
              Frequency: <span className="text-[#00E676] uppercase font-bold">{emailConfig.frequency}</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEmailPreviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={handleSendTestDigest}
                disabled={isSending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-bold shadow-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending...' : 'Send Test Digest'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
