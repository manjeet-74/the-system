import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      console.error('Error signing in with GitHub:', error.message);
      throw error;
    }
  };

  // Sign in an existing user with email + password.
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Create a new account. Returns whether a session was created immediately:
  // if the Supabase project has "Confirm email" ON, data.session is null and the
  // user must click a link in their inbox before they can log in.
  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    // With "Confirm email" on, signing up an address that already has an account does NOT
    // error (that would reveal which emails are registered). Supabase returns a user with an
    // empty identities list and sends nothing — detect it so the player isn't left waiting.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('An account with this email already exists. Try signing in instead.');
    }
    return { needsConfirmation: data.session === null };
  };

  // Send the activation link again (the first one may be late, in spam, or expired).
  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  };

  // Email a password-reset link. The link lands on /reset-password with a short-lived
  // recovery session. Supabase answers "ok" even for unknown emails (no account enumeration).
  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  // Set a new password for the currently signed-in (recovery) session.
  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      throw error;
    }
    // Don't leave the previous player's store theme painted on the login screen.
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.removeItem('system:theme');
    } catch {
      /* storage blocked */
    }
  };

  return { session, user, loading, signInWithGitHub, signInWithEmail, signUpWithEmail, resendConfirmation, requestPasswordReset, updatePassword, signOut };
}
