import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  Radio,
  LogIn,
  Search,
  ClipboardList,
  User,
} from 'lucide-react';

interface NotFoundViewProps {
  onReturnHome?: () => void;
  onGoBack?: () => void;
  /** True when the visitor is signed out: renders without the app shell. */
  standalone?: boolean;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onReturnHome,
  onGoBack,
  standalone = false,
}) => {
  const { setActiveTab } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the 404 out of search engines and give the tab a clear title
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);

    const previousTitle = document.title;
    document.title = 'Page not found · Hirely';

    return () => {
      document.head.removeChild(meta);
      document.title = previousTitle;
    };
  }, []);

  const handleReturnDashboard = () => {
    setActiveTab('dashboard');
    if (onReturnHome) {
      onReturnHome();
    } else {
      navigate('/dashboard');
    }
  };

  // Signed-out visitors: "/" shows the sign-in screen
  const handleLogin = () => {
    navigate('/');
  };

  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(standalone ? '/' : '/dashboard');
    }
  };

  const quickLinks = [
    { label: 'Discover', path: '/discover', icon: Search },
    { label: 'Tracker', path: '/tracker', icon: ClipboardList },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const card = (
    <div className="relative max-w-lg w-full rounded-3xl p-8 sm:p-10 bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center space-y-6">
      {/* Subtle spatial radar ping visual */}
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[#337418]/50 animate-ping opacity-30" />
        <div className="absolute inset-2 rounded-full border border-[#5DD62C]/30 animate-pulse" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#5DD62C]/60 flex items-center justify-center shadow-[0_0_25px_rgba(93,214,44,0.3)]">
          <Compass className="w-8 h-8 text-[#5DD62C] animate-spin" style={{ animationDuration: '14s' }} />
        </div>
      </div>

      {/* 404 status pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5DD62C]/10 border border-[#5DD62C]/30 text-[#5DD62C] text-xs font-mono font-semibold tracking-wider uppercase">
        <Radio className="w-3.5 h-3.5 animate-pulse" />
        <span>Page not found · Error 404</span>
      </div>

      {/* Headings */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F8F8F8] tracking-tight">
          Opportunity Frequency Lost
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-sm mx-auto">
          We couldn&apos;t find that page. The link may be broken, or the page may have moved.
        </p>
      </div>

      {/* Primary actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        {standalone ? (
          <button
            onClick={handleLogin}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] font-semibold text-sm transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(93,214,44,0.4)]"
          >
            <LogIn className="w-4 h-4" />
            <span>Log in</span>
          </button>
        ) : (
          <button
            onClick={handleReturnDashboard}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] font-semibold text-sm transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(93,214,44,0.4)]"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Back to dashboard</span>
          </button>
        )}
        <button
          onClick={handleBack}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/20 text-slate-200 text-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>

      {/* Quick links (signed-in users only) */}
      {!standalone && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {quickLinks.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-[#5DD62C]/40 hover:text-[#5DD62C] text-slate-300 text-xs transition-all cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Requested path, so users can spot typos */}
      <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-slate-400 break-all">
        <span className="text-slate-500">REQUESTED PATH · </span>
        {location.pathname}
      </div>
    </div>
  );

  // Signed-out layout: clean header with a Log in button, no sidebar, no user data
  if (standalone) {
    return (
      <div className="relative min-h-screen bg-[#0F0F0F] text-[#F8F8F8] flex flex-col overflow-hidden selection:bg-[#5DD62C]/25 selection:text-[#5DD62C]">
        <div className="fixed top-0 left-0 w-[550px] h-[550px] bg-[#337418]/20 rounded-full blur-[150px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
        <div className="fixed bottom-0 right-0 w-[650px] h-[650px] bg-[#5DD62C]/10 rounded-full blur-[170px] pointer-events-none translate-x-1/4 translate-y-1/4" />

        <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5">
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 cursor-pointer"
            aria-label="Hirely home"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#5DD62C]/50 flex items-center justify-center">
              <Compass className="w-4 h-4 text-[#5DD62C]" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              HIRE<span className="text-[#5DD62C]">LY</span>
            </span>
          </button>
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#5DD62C]/50 text-[#5DD62C] hover:bg-[#5DD62C]/10 text-sm font-semibold transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Log in</span>
          </button>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          {card}
        </main>
      </div>
    );
  }

  // Signed-in layout: rendered inside the app shell (sidebar + top bar stay visible)
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 w-full">
      {card}
    </div>
  );
};