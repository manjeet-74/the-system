import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { signInWithGitHub, signInWithEmail, signUpWithEmail } = useAuth();

  // mode: are we logging in or creating an account?
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Edge case: empty fields. The browser's `required` catches most of this,
    // but we guard anyway so the error is friendly, not a raw API message.
    if (!email || !password) {
      setError('Enter both an email and a password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUpWithEmail(email, password);
        if (needsConfirmation) {
          // Project has "Confirm email" ON — no session yet. Tell them to check inbox.
          setCheckEmail(true);
        }
        // If no confirmation needed, onAuthStateChange fires and the app
        // swaps LoginPage for the dashboard automatically — nothing else to do.
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      // Supabase returns human-readable messages like "Invalid login credentials"
      // or "User already registered" — surface them directly.
      setError(err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Confirmation screen: shown after signup when email verification is required.
  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] flex items-center justify-center p-4">
        <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_20px_rgba(63,214,245,0.15)]">
          <h1 className="font-rajdhani text-3xl font-bold tracking-wider text-[#3fd6f5] mb-4">
            CHECK YOUR INBOX
          </h1>
          <p className="text-[#6d81a0] text-sm mb-6">
            We sent a confirmation link to <span className="text-[#e6f1f7]">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <button
            type="button"
            onClick={() => {
              setCheckEmail(false);
              setMode('signin');
              setPassword('');
            }}
            className="text-[#3fd6f5] text-sm hover:underline cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] flex items-center justify-center p-4">
      <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_20px_rgba(63,214,245,0.15)]">
        <h1 className="font-rajdhani text-4xl font-bold tracking-wider text-[#3fd6f5] mb-2">
          THE SYSTEM
        </h1>
        <p className="text-[#6d81a0] mb-6 text-sm">
          Level up your life. Track stats, clear daily quests, build your streak.
        </p>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="text-left mb-4">
          <label className="block text-[#6d81a0] text-xs font-rajdhani tracking-wide mb-1 uppercase">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-[#04070d] border border-[#3fd6f5]/20 rounded px-3 py-2 mb-4 text-[#e6f1f7] focus:border-[#3fd6f5] focus:outline-none focus:shadow-[0_0_10px_rgba(63,214,245,0.25)] transition-all"
            placeholder="hunter@example.com"
          />

          <label className="block text-[#6d81a0] text-xs font-rajdhani tracking-wide mb-1 uppercase">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full bg-[#04070d] border border-[#3fd6f5]/20 rounded px-3 py-2 mb-4 text-[#e6f1f7] focus:border-[#3fd6f5] focus:outline-none focus:shadow-[0_0_10px_rgba(63,214,245,0.25)] transition-all"
            placeholder="••••••••"
          />

          {error && (
            <p className="text-[#ff4d5e] text-sm mb-4 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-lg py-3 px-6 rounded transition-all duration-200 hover:bg-[#3fd6f5]/90 hover:shadow-[0_0_15px_rgba(63,214,245,0.5)] active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'WORKING...'
              : mode === 'signup'
                ? 'CREATE ACCOUNT'
                : 'SIGN IN'}
          </button>
        </form>

        {/* Toggle between sign in and sign up */}
        <p className="text-[#6d81a0] text-sm mb-6">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError(null);
            }}
            className="text-[#3fd6f5] hover:underline cursor-pointer"
          >
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-[#3fd6f5]/20 flex-1" />
          <span className="text-[#6d81a0] text-xs">OR</span>
          <div className="h-px bg-[#3fd6f5]/20 flex-1" />
        </div>

        <button
          type="button"
          onClick={signInWithGitHub}
          className="w-full bg-transparent border border-[#3fd6f5]/40 text-[#e6f1f7] font-rajdhani font-bold text-lg py-3 px-6 rounded transition-all duration-200 hover:bg-[#3fd6f5]/10 hover:border-[#3fd6f5] active:scale-95 cursor-pointer flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
