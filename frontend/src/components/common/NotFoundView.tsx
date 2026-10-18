import React from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, LayoutDashboard, Radio } from 'lucide-react';
import { motion } from 'motion/react';

interface NotFoundViewProps {
  onReturnHome?: () => void;
  onGoBack?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onReturnHome, onGoBack }) => {
  const { setActiveTab } = useApp();
  const navigate = useNavigate();

  const handleReturnDashboard = () => {
    setActiveTab('dashboard');
    if (onReturnHome) {
      onReturnHome();
    } else {
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      setActiveTab('dashboard');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 w-full">
      <div className="relative max-w-lg w-full rounded-3xl p-8 sm:p-10 bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center space-y-6">
        {/* Subtle Spatial Radar Ping Visual */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#337418]/50 animate-ping opacity-30" />
          <div className="absolute inset-2 rounded-full border border-[#5DD62C]/30 animate-pulse" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#5DD62C]/60 flex items-center justify-center shadow-[0_0_25px_rgba(93,214,44,0.3)]">
            <Compass className="w-8 h-8 text-[#5DD62C] animate-spin" style={{ animationDuration: '14s' }} />
          </div>
        </div>

        {/* 404 Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5DD62C]/10 border border-[#5DD62C]/30 text-[#5DD62C] text-xs font-mono font-semibold tracking-wider uppercase">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Coordinate Unreachable · Error 404</span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F8F8F8] tracking-tight">
            Opportunity Frequency Lost
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            The spatial coordinates or URL path you requested does not exist or has expired.
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={handleReturnDashboard}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(93,214,44,0.4)]"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Back to dashboard</span>
          </button>
          <button
            onClick={handleBack}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/20 text-slate-200 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Bottom subtle metadata */}
        <div className="pt-4 border-t border-white/[0.06] text-[11px] font-mono text-slate-400">
          HIRELY SPATIAL SYSTEM PROTOCOL · 404 ROUTE
        </div>
      </div>
    </div>
  );
};
