import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    authError,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    clearAuthError();
    setLocalError(null);
    setResetSent(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setLocalError(null);
    await signInWithGoogle();
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (authModalMode === 'forgot') {
      setIsSubmitting(true);
      const ok = await resetPassword(email.trim());
      setIsSubmitting(false);
      if (ok) {
        setResetSent(true);
      }
      return;
    }

    if (!password) {
      setLocalError('Please enter a password.');
      return;
    }

    if (authModalMode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      await signUpWithEmail(email.trim(), password, displayName.trim());
      setIsSubmitting(false);
    } else {
      setIsSubmitting(true);
      await signInWithEmail(email.trim(), password);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-white/90 bg-[#FAF8FC] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE5EC] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#A99BEA] to-[#8C7BD0] text-sm font-bold text-white shadow-xs">
              ✳
            </span>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                {authModalMode === 'signin' && 'Sign in to FinPilot'}
                {authModalMode === 'signup' && 'Create your account'}
                {authModalMode === 'forgot' && 'Reset your password'}
              </h3>
              <p className="text-[11px] text-[#7A7285]">
                {authModalMode === 'signin' && 'Access your private financial records securely'}
                {authModalMode === 'signup' && 'Start organizing your cashflow and wealth targets'}
                {authModalMode === 'forgot' && 'We will send a secure password recovery link'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#898393] hover:bg-[#EAE5EC] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback / Error Alerts */}
        {(authError || localError) && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{localError || authError}</div>
          </div>
        )}

        {resetSent && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              Password reset link sent to <strong>{email}</strong>. Check your inbox and spam folder.
            </div>
          </div>
        )}

        {/* Google 1-Click Button (Only for sign in or sign up) */}
        {authModalMode !== 'forgot' && (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#DCD5E0] bg-white py-2.5 px-4 text-xs font-semibold text-[#29272F] shadow-xs hover:bg-[#FAF8FC] hover:border-[#A99BEA] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {/* Google G Icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#EAE3EE]" />
              <span className="relative bg-[#FAF8FC] px-3 text-[11px] font-medium text-[#898393]">
                or with email
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#898393]" />
                <input
                  type="text"
                  placeholder="e.g. Alex Miller"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-9 pr-3.5 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#534C5D] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#898393]" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-9 pr-3.5 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
                required
              />
            </div>
          </div>

          {authModalMode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#534C5D]">Password</label>
                {authModalMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('forgot');
                      clearAuthError();
                      setLocalError(null);
                    }}
                    className="text-[11px] font-medium text-[#7867B5] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#898393]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-9 pr-10 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#898393] hover:text-[#29272F]"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#898393]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-9 pr-3.5 py-2 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20 transition-all"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-md shadow-[#7867B5]/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <span>
              {authModalMode === 'signin' && (isSubmitting ? 'Signing in...' : 'Sign In')}
              {authModalMode === 'signup' && (isSubmitting ? 'Creating account...' : 'Create Account')}
              {authModalMode === 'forgot' && (isSubmitting ? 'Sending link...' : 'Send Recovery Email')}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Footer Mode Switchers */}
        <div className="mt-5 pt-3 border-t border-[#EAE3EE] flex items-center justify-between text-xs text-[#7A7285]">
          {authModalMode === 'signin' ? (
            <div>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  clearAuthError();
                  setLocalError(null);
                }}
                className="font-semibold text-[#7867B5] hover:underline"
              >
                Sign up
              </button>
            </div>
          ) : (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  clearAuthError();
                  setLocalError(null);
                  setResetSent(false);
                }}
                className="font-semibold text-[#7867B5] hover:underline"
              >
                Sign in
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="text-[11px] text-[#898393] hover:text-[#29272F]"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
