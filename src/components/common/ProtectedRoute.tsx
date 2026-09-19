import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

interface ProtectedRouteProps {
  children: ReactNode;
  allowUnonboarded?: boolean;
}

export function ProtectedRoute({ children, allowUnonboarded = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || (!!user && profileLoading)) {
    return (
      <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] flex items-center justify-center">
        <div className="font-rajdhani text-xl text-[#3fd6f5] animate-pulse">
          INITIALIZING SYSTEM...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Gating based on courage_test_passed
  if (!allowUnonboarded && profile && !profile.courage_test_passed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowUnonboarded && profile?.courage_test_passed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
