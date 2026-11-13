import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

interface ProtectedRouteProps {
  children: ReactNode;
  allowUnonboarded?: boolean;
}

const RETURN_TO_KEY = 'system:returnTo';

export function ProtectedRoute({ children, allowUnonboarded = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const initializing = (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] flex items-center justify-center">
      <div className="font-rajdhani text-xl text-[#3fd6f5] animate-pulse">
        INITIALIZING SYSTEM...
      </div>
    </div>
  );

  if (authLoading || (!!user && profileLoading)) {
    return initializing;
  }

  if (!user) {
    // Remember where they were headed (e.g. a raid or guild invite link) so we can send
    // them back after login — including after a GitHub OAuth round-trip.
    try {
      sessionStorage.setItem(RETURN_TO_KEY, location.pathname + location.search);
    } catch {
      /* storage blocked: they just land on the dashboard after login */
    }
    return <Navigate to="/login" replace />;
  }

  // Logged in but the profile row isn't visible yet (the handle_new_user trigger can lag
  // a beat behind the first OAuth session). Keep initializing rather than rendering a
  // profile-less page whose child queries would error on a missing row.
  if (!profile) {
    return initializing;
  }

  // Gating based on courage_test_passed
  if (!allowUnonboarded && profile && !profile.courage_test_passed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowUnonboarded && profile?.courage_test_passed) {
    return <Navigate to="/" replace />;
  }

  // Just logged in and we have somewhere to resume: go there once.
  try {
    const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
    if (returnTo) {
      sessionStorage.removeItem(RETURN_TO_KEY);
      if (returnTo !== location.pathname + location.search) {
        return <Navigate to={returnTo} replace />;
      }
    }
  } catch {
    /* ignore */
  }

  return <>{children}</>;
}
