import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { TrustStatus } from '../../types/opportunity';

interface TrustCheckBadgeProps {
  status?: TrustStatus;
  score?: number;
  showScore?: boolean;
  className?: string;
  onClick?: () => void;
}

export const TrustCheckBadge: React.FC<TrustCheckBadgeProps> = ({
  status = 'unverified',
  score,
  showScore = false,
  className = '',
  onClick,
}) => {
  const isClickable = Boolean(onClick);

  if (status === 'verified') {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wide bg-[#5DD62C]/10 text-[#5DD62C] border border-[#5DD62C]/30 shadow-[0_0_12px_rgba(93,214,44,0.15)] ${
          isClickable ? 'cursor-pointer hover:bg-[#5DD62C]/20 hover:border-[#5DD62C]/60 transition-all' : ''
        } ${className}`}
        title="Verified Against Sources: Organizer and domain authenticated with no fee flags."
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#5DD62C] shrink-0" />
        <span>Verified</span>
        {showScore && typeof score === 'number' && (
          <span className="text-[10px] bg-[#5DD62C]/20 px-1 rounded font-bold">{score}%</span>
        )}
      </span>
    );
  }

  if (status === 'suspicious') {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)] ${
          isClickable ? 'cursor-pointer hover:bg-amber-500/25 transition-all' : ''
        } ${className}`}
        title="Suspicious: Potential fee risk, impersonation, or high-pressure tactics require review."
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Suspicious</span>
        {showScore && typeof score === 'number' && (
          <span className="text-[10px] bg-amber-500/25 px-1 rounded font-bold">{score}%</span>
        )}
      </span>
    );
  }

  // Default: unverified
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium tracking-wide bg-slate-800/60 text-slate-300 border border-slate-700/60 ${
        isClickable ? 'cursor-pointer hover:bg-slate-700/60 hover:text-white transition-all' : ''
      } ${className}`}
      title="Unverified: Insufficient public evidence to independently verify organizer authenticity."
    >
      <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>Unverified</span>
      {showScore && typeof score === 'number' && (
        <span className="text-[10px] bg-slate-700/60 px-1 rounded text-slate-300">{score}%</span>
      )}
    </span>
  );
};
