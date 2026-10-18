
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, BellRing, Eye } from 'lucide-react';

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Not scheduled';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};

export const EmailAutomationCard: React.FC = () => {
  const {
    emailConfig,
    updateEmailConfig,
    setIsEmailPreviewOpen,
    profile,
  } = useApp();

  return (
    <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] flex-1 flex flex-col justify-between glass-inner-highlight">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#5DD62C]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Email Automation
            </h3>
          </div>
          <span
            className="font-mono text-[10px] text-[#5DD62C] bg-[#5DD62C]/10 px-2.5 py-0.5 rounded-full border border-[#5DD62C]/30 font-semibold"
            title="SMTP backend status"
          >
            SMTP PRIMED
          </span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[11px] font-mono uppercase text-slate-300 font-medium">
                Next Digest
              </div>
              <div
                className="text-xs font-semibold text-white mt-1"
                title={emailConfig.nextScheduledAt || 'Not scheduled'}
              >
                {formatDateTime(emailConfig.nextScheduledAt)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-[11px] font-mono uppercase text-slate-300 font-medium">
                Last Briefing Sent
              </div>
              <div
                className="text-xs font-semibold text-slate-300 mt-1"
                title={emailConfig.lastSentAt || 'None sent yet'}
              >
                {emailConfig.lastSentAt
                  ? formatDateTime(emailConfig.lastSentAt)
                  : 'None sent yet'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#5DD62C]" />
              <span className="text-xs text-slate-200 font-medium">
                Automated 7-day deadline alerts
              </span>
            </div>
            <button
              onClick={() =>
                updateEmailConfig({
                  sendDeadlineAlerts: !emailConfig.sendDeadlineAlerts,
                })
              }
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                emailConfig.sendDeadlineAlerts ? 'bg-[#5DD62C]' : 'bg-white/10'
              }`}
              aria-label="Toggle deadline alerts"
              aria-pressed={emailConfig.sendDeadlineAlerts}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                  emailConfig.sendDeadlineAlerts
                    ? 'translate-x-4'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.08] mt-3 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-300 truncate max-w-[190px]">
          Target: {profile.email}
        </span>
        <button
          onClick={() => setIsEmailPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-[#5DD62C] transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Preview Digest</span>
        </button>
      </div>
    </div>
  );
};
