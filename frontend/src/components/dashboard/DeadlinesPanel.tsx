import React from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Calendar, ArrowUpRight, AlertCircle } from 'lucide-react';

export const DeadlinesPanel: React.FC = () => {
  const { opportunities, setSelectedOpportunity } = useApp();

  // Sort by deadline daysLeft (lowest first, ignoring nulls)
  const upcoming = opportunities
    .filter((opp) => opp.daysLeft !== null && opp.daysLeft > 0)
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    .slice(0, 3);

  return (
    <div className="rounded-2xl p-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_0_40px_rgba(0,230,118,0.08)] flex-1 flex flex-col justify-between glass-inner-highlight">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00E676]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Upcoming Deadlines
            </h3>
          </div>
          <span className="font-mono text-[11px] text-slate-300 font-medium">
            Next 30 days
          </span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {upcoming.map((opp) => (
            <div
              key={opp.id}
              onClick={() => setSelectedOpportunity(opp)}
              className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/[0.03] -mx-2 px-2.5 rounded-xl transition-colors"
            >
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white group-hover:text-[#00E676] transition-colors truncate">
                  {opp.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {opp.organization} · {opp.category}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                    {opp.daysLeft}d left
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 uppercase">
                    {opp.deadlineFormatted}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#00E676] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 text-[11px] font-mono text-slate-300 flex items-center gap-2 border-t border-white/[0.06] mt-3">
        <AlertCircle className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
        <span>Deadlines cross-referenced with live provider portals.</span>
      </div>
    </div>
  );
};
