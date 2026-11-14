import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

// Landing page for the password-reset email. Supabase turns the link's token into a
// short-lived "recovery" session; we wait for it, then let the player pick a new password.
export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // The event can fire before we subscribe, so also check for an existing session.
    // No session after a moment = the link was invalid, expired, or already used.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const t = setTimeout(() => setExpired(true), 4000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err: any) {
      setError(err?.message ?? 'Could not update the password.');
    } finally {
      setLoading(false);
    }
  };

  const input =
    'w-full bg-[#04070d] border border-[#3fd6f5]/20 rounded px-3 py-2 mb-4 text-[#e6f1f7] focus:border-[#3fd6f5] focus:outline-none focus:shadow-[0_0_10px_rgba(63,214,245,0.25)] transition-all';

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] flex items-center justify-center p-4">
      <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_20px_rgba(63,214,245,0.15)]">
        <h1 className="font-rajdhani text-3xl font-bold tracking-wider text-[#3fd6f5] mb-4">NEW PASSWORD</h1>

        {done ? (
          <p className="text-emerald-400 text-sm">Password updated. Entering the System...</p>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="text-left">
            <label className="block text-[#6d81a0] text-xs font-rajdhani tracking-wide mb-1 uppercase">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className={input} />
            <label className="block text-[#6d81a0] text-xs font-rajdhani tracking-wide mb-1 uppercase">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={input} />
            {error && <p className="text-[#ff4d5e] text-sm mb-4 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-lg py-3 px-6 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'WORKING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        ) : expired ? (
          <>
            <p className="text-[#ff4d5e] text-sm mb-4">This reset link is invalid or has expired.</p>
            <button onClick={() => navigate('/login', { replace: true })} className="text-[#3fd6f5] text-sm hover:underline cursor-pointer">
              Back to sign in to request a new one
            </button>
          </>
        ) : (
          <div className="w-8 h-8 mx-auto border-2 border-[#3fd6f5]/30 border-t-[#3fd6f5] rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
