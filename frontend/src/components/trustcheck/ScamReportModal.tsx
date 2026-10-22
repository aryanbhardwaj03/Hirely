import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { submitScamReport } from '../../services/api';
import { useApp } from '../../context/AppContext';

interface ScamReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  opportunityTitle: string;
  organization: string;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  'Demands upfront application fee / security deposit',
  'Impersonating known organization or deceptive domain',
  'Requests wire transfer, crypto, or gift card payment',
  'Unrealistic guarantees (e.g. job offer without interview)',
  'Pressure tactics / extreme urgency to send personal data',
  'Phishing link / malicious download prompt',
  'Other suspicious behavior'
];

export const ScamReportModal: React.FC<ScamReportModalProps> = ({
  isOpen,
  onClose,
  opportunityId,
  opportunityTitle,
  organization,
  onReportSubmitted,
}) => {
  const { showToast, currentUser } = useApp();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      showToast('Please provide details explaining the suspicious behavior.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const success = await submitScamReport({
      opportunity_id: opportunityId,
      reason: selectedReason,
      details: details.trim(),
      contact_email: contactEmail.trim() || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      setIsSuccess(true);
      showToast('Report submitted for community safety review.', 'success');
      if (onReportSubmitted) onReportSubmitted();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    } else {
      showToast('Failed to submit report. Please try again.', 'warning');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0F1410] border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden z-10"
        >
          {/* Top highlight bar */}
          <div className="h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500" />

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Flag Suspicious Opportunity
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Help protect student peers from recruitment fraud & scams
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Opportunity Snapshot */}
            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Target Listing:</span>
              <div className="font-semibold text-white truncate mt-0.5">{opportunityTitle}</div>
              <div className="text-slate-400 truncate">{organization}</div>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#5DD62C] mx-auto animate-bounce" />
                <h4 className="text-base font-semibold text-white">Report Successfully Logged</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Thank you! Our trust algorithms will immediately factor this report into candidate risk scoring.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Primary Suspicion Category
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-amber-500/60 transition-colors"
                  >
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason} className="bg-[#121613] text-white">
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Specific Observations & Details <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe what occurred (e.g. asked for Telegram contact, demanded $100 onboarding deposit, mismatched sender domain)..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Contact Email (Optional, for investigation follow-up)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Report...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Scam Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
