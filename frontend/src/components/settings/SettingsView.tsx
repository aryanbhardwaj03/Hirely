import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings, 
  Mail, 
  Server, 
  ShieldCheck, 
  Bell, 
  Eye, 
  Check, 
  RotateCcw,
  Radio,
  ExternalLink,
  Send
} from 'lucide-react';
import { OpportunityCategory } from '../../types/opportunity';
import { sendDigestEmail } from '../../services/email';

export const SettingsView: React.FC = () => {
  const {
    emailConfig,
    updateEmailConfig,
    setIsEmailPreviewOpen,
    backendHealth,
    fastapiHealth,
    profile,
    opportunities,
    showToast
  } = useApp();

  const [isSendingDigest, setIsSendingDigest] = useState(false);

  const [emailInput, setEmailInput] = useState(emailConfig.email);
  const [frequency, setFrequency] = useState(emailConfig.frequency);
  const [enabled, setEnabled] = useState(emailConfig.enabled);
  const [deadlineAlerts, setDeadlineAlerts] = useState(emailConfig.sendDeadlineAlerts);

  const categories: { id: OpportunityCategory; label: string }[] = [
    { id: 'internship', label: 'Internships' },
    { id: 'scholarship', label: 'Scholarships' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'fellowship', label: 'Fellowships' },
  ];

  const handleSaveEmailConfig = () => {
    updateEmailConfig({
      email: emailInput,
      frequency,
      enabled,
      sendDeadlineAlerts: deadlineAlerts,
    });
  };

  const handleResetData = () => {
    localStorage.clear();
    showToast('Reset local workspace state. Reloading...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const isConnected = fastapiHealth?.is_connected || backendHealth?.isLiveBackend;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Settings & Automation Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Configure email dispatch cadences, backend telemetry, and autonomous agent preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Digest Settings */}
        <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] space-y-5 glass-inner-highlight">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Opportunity Intelligence Briefings
              </h2>
            </div>
            <button
              onClick={() => setIsEmailPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-[#00E676] transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Email</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Opt-in Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="mt-0.5 rounded accent-[#00E676] w-4 h-4 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Enable Autonomous Daily Opportunity Digest
                </span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">
                  Receive high-signal verified matches, application reminders, and fellowship alerts in your inbox.
                </span>
              </div>
            </label>

            {/* Target Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Delivery Email Address
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full max-w-md h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00E676]/50 font-mono"
              />
            </div>

            {/* Cadence Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Briefing Cadence
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    frequency === 'daily'
                      ? 'bg-[#00E676] text-black shadow-md'
                      : 'bg-white/[0.03] text-slate-300 border border-white/[0.08]'
                  }`}
                >
                  Daily (Every morning at 07:00 AM)
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    frequency === 'weekly'
                      ? 'bg-[#00E676] text-black shadow-md'
                      : 'bg-white/[0.03] text-slate-300 border border-white/[0.08]'
                  }`}
                >
                  Weekly (Monday morning digest)
                </button>
              </div>
            </div>

            {/* Deadline Alerts */}
            <label className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
              <input
                type="checkbox"
                checked={deadlineAlerts}
                onChange={(e) => setDeadlineAlerts(e.target.checked)}
                className="rounded accent-[#00E676] w-4 h-4 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Proactive 7-day and 48-hour deadline warning alerts
                </span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">
                  Ensures you never miss competitive scholarships or residency closing dates.
                </span>
              </div>
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSaveEmailConfig}
                className="px-5 py-2.5 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                Save Email Preferences
              </button>

              <button
                onClick={async () => {
                  setIsSendingDigest(true);
                  const result = await sendDigestEmail(
                    emailConfig,
                    opportunities.slice(0, 3),
                    profile.email,
                    profile.name
                  );
                  setIsSendingDigest(false);
                  showToast(result.statusText, result.success ? 'success' : 'warning');
                }}
                disabled={isSendingDigest}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] border border-[#5DD62C]/60 hover:border-[#5DD62C] hover:bg-[#5DD62C]/10 text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#5DD62C]" />
                <span>{isSendingDigest ? 'Dispatching...' : 'Send Test Digest'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Backend & Integration Telemetry */}
        <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] space-y-4 glass-inner-highlight">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Backend Architecture & API Status
              </h2>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              isConnected 
                ? 'text-[#00E676] bg-[#00E676]/15 border-[#00E676]/30'
                : 'text-amber-300 bg-amber-400/10 border-amber-400/25'
            }`}>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isConnected ? 'FastAPI Connected' : 'Autonomous Client Fallback Mode'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="font-mono text-[11px] text-slate-400 uppercase">
                API Base URL
              </span>
              <div className="font-mono text-slate-200 truncate font-medium">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="font-mono text-[11px] text-slate-400 uppercase">
                TinyFish Web Agent Health
              </span>
              <div className="font-mono text-[#00E676] flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Active & Discovering (18 Portals Monitored)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Cache & Reset */}
        <div className="rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white">Reset Workspace Data</h3>
            <p className="text-[11px] text-slate-400">
              Clear your saved opportunities and application data for this account.
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
