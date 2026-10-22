import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
  isFirebaseConfigured
} from '../../services/firebase';
import {
  Compass,
  Sparkles,
  ShieldCheck,
  Radio,
  AlertCircle,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'signin' | 'register' | 'forgot_password';

export const SignInView: React.FC = () => {
  const { setCurrentUser, setAuthToken, showToast } = useApp();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const hasFirebaseKeys = isFirebaseConfigured();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { user, token } = await loginWithGoogle();
      setCurrentUser(user);
      setAuthToken(token);
      showToast('Successfully signed in with Google!', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'forgot_password') {
      setIsLoading(true);
      try {
        await sendPasswordReset(email);
        setInfoMessage('Password reset link sent! Check your inbox to set a new password.');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to send password reset email.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const { user, token } = await registerWithEmail(email, password, displayName);
        setCurrentUser(user);
        setAuthToken(token);
        showToast('Account created successfully! Welcome to Hirely.', 'success');
      } catch (err: any) {
        setErrorMessage(err.message || 'Registration failed.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Default: Sign In with Email
    setIsLoading(true);
    try {
      const { user, token } = await loginWithEmail(email, password);
      setCurrentUser(user);
      setAuthToken(token);
      showToast('Successfully signed in!', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0F0F0F] text-[#F8F8F8] flex items-center justify-center p-4 sm:p-6 overflow-hidden selection:bg-[#5DD62C]/25 selection:text-[#5DD62C]">
      {/* Background radial glows */}
      <div className="fixed top-0 left-0 w-[550px] h-[550px] bg-[#337418]/20 rounded-full blur-[150px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
      <div className="fixed bottom-0 right-0 w-[650px] h-[650px] bg-[#5DD62C]/10 rounded-full blur-[180px] pointer-events-none translate-x-1/4 translate-y-1/4" />
      <div className="fixed top-1/2 left-1/2 w-[500px] h-[500px] bg-[#122A14]/30 rounded-full blur-[160px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      {/* Grid texture */}
      <div className="fixed inset-0 spatial-dot-grid opacity-60 pointer-events-none" />

      {/* Main Glass Panel */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_0_60px_rgba(0,0,0,0.9)] space-y-5"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#122A14] to-[#0A150C] border border-[#5DD62C]/60 shadow-[0_0_24px_rgba(93,214,44,0.3)]">
            <Compass className="w-6 h-6 text-[#5DD62C]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              HIRE<span className="text-[#5DD62C]">LY</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-[#5DD62C] uppercase font-semibold mt-0.5">
              Spatial Opportunity Intelligence
            </p>
          </div>
          <p className="text-xs text-slate-300 max-w-xs mx-auto">
            Discover verified scholarships, internships, hackathons, and fellowships matched to your student profile.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="space-y-1.5 py-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200">
            <Radio className="w-3.5 h-3.5 text-[#5DD62C] shrink-0 animate-pulse" />
            <span className="truncate">AI-Powered Live Job Discovery</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-[#5DD62C] shrink-0" />
            <span className="truncate">Hirely Core AI (Gemini 3.8 Flash Assistant)</span>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed flex-1">{errorMessage}</div>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 rounded-xl bg-[#5DD62C]/10 border border-[#5DD62C]/30 text-xs text-[#5DD62C] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed flex-1">{infoMessage}</div>
          </div>
        )}

        {/* Primary Google Sign In CTA */}
        {mode !== 'forgot_password' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#F8F8F8] text-[#0F0F0F] hover:bg-[#5DD62C] hover:shadow-[0_0_24px_rgba(93,214,44,0.45)] text-xs sm:text-sm font-bold tracking-tight transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-white/[0.08] w-full" />
              <span className="bg-[#202020] px-3 text-[10px] font-mono text-slate-400 uppercase">
                or continue with email
              </span>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#5DD62C]/60"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu or proton / outlook"
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#5DD62C]/60"
                required
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-slate-300 uppercase">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-[11px] font-mono text-[#5DD62C] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-9 pl-9 pr-9 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#5DD62C]/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#5DD62C]/60"
                  required
                />
              </div>
            </div>
          )}

          {/* Form Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#5DD62C] text-[#0F0F0F] hover:shadow-[0_0_20px_rgba(93,214,44,0.4)] text-xs sm:text-sm font-bold tracking-tight transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : mode === 'register' ? (
              <span>Create Free Student Account</span>
            ) : mode === 'forgot_password' ? (
              <span>Send Password Reset Link</span>
            ) : (
              <span>Sign In with Email</span>
            )}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle between modes */}
        <div className="text-center pt-2 text-xs text-slate-300">
          {mode === 'signin' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-[#5DD62C] font-semibold hover:underline cursor-pointer ml-1"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-[#5DD62C] font-semibold hover:underline cursor-pointer ml-1"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot_password' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-[#5DD62C] font-semibold hover:underline cursor-pointer ml-1"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>

        {/* Security & Firebase Status Badge */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3 h-3 text-[#5DD62C]" />
            <span>Firebase Authentication</span>
          </span>
          <span className="text-[#5DD62C]">
            {hasFirebaseKeys ? 'Firebase Live' : 'Ready for Credentials'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
