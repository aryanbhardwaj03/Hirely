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
  const activeRecipient = profile.email || emailConfig.email;

  const handleSendTestDigest = async () => {
    setIsSending(true);
    const result = await sendDigestEmail(emailConfig, topOpps, profile, true);
    setIsSending(false);
    showToast(result.statusText, result.success ? 'success' : 'warning');
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
          className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#0F0F0F] border border-white/[0.14] shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#141414]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#122A14] border border-[#5DD62C]/50 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#5DD62C]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Automated Opportunity Digest Preview
                </h3>
                <p className="text-[11px] font-mono text-slate-300">
                  To: {activeRecipient || 'No email saved'} · Sent daily at 07:00 AM
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
          <div className="p-6 overflow-y-auto space-y-5 bg-[#0A0A0A]">
            {/* Email Header Simulation */}
            <div className="text-center py-4 border-b border-white/[0.08] space-y-1">
              <span className="text-xl font-bold tracking-tight text-white">
                HIRE<span className="text-[#5DD62C]">LY</span>
              </span>
              <p className="text-xs text-slate-300 font-serif italic">
                Your Morning Opportunity Briefing · Personalized for you
              </p>
            </div>

            {/* Personalized greeting in email */}
            <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.08] text-xs text-slate-200 space-y-1.5">
              <p className="font-semibold text-white">Good morning {profile.name ? profile.name.split(' ')[0] : 'Candidate'},</p>
              <p className="text-slate-300 leading-relaxed">
                Here are your {topOpps.length} strongest matches based on your {profile.degree || 'Engineering'} curriculum and declared skills:
              </p>
            </div>

            {/* Opportunities List in Digest */}
            <div className="space-y-3">
              {topOpps.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 rounded-xl bg-[#171717] border border-white/[0.08] hover:border-[#5DD62C]/50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#5DD62C] bg-[#5DD62C]/10 px-2.5 py-0.5 rounded-full border border-[#5DD62C]/30 font-semibold">
                      {opp.category} · {opp.match_score}% MATCH
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      Deadline: {opp.deadlineFormatted || opp.deadline || 'Rolling'}
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
                    <span className="font-mono text-[#5DD62C] font-semibold">
                      {opp.stipendOrAward || 'Competitive'}
                    </span>
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5DD62C] hover:underline flex items-center gap-1 font-semibold"
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
              <p className="font-mono text-[11px] text-slate-500">HIRELY AI · Opportunity Discovery</p>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 border-t border-white/[0.08] bg-[#141414] flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300">
              Frequency: <span className="text-[#5DD62C] uppercase font-bold">{emailConfig.frequency}</span>
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-[#5DD62C] hover:text-black text-xs font-bold shadow-xl transition-all cursor-pointer disabled:opacity-50"
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
