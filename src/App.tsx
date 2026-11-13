import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/common/Layout';

const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ForgePage = lazy(() => import('./pages/ForgePage').then(m => ({ default: m.ForgePage })));
const BossPage = lazy(() => import('./pages/BossPage').then(m => ({ default: m.BossPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const StorePage = lazy(() => import('./pages/StorePage').then(m => ({ default: m.StorePage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const GuildPage = lazy(() => import('./pages/GuildPage').then(m => ({ default: m.GuildPage })));
const RaidInvitePage = lazy(() => import('./pages/RaidInvitePage').then(m => ({ default: m.RaidInvitePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-[#3fd6f5]/30 border-t-[#3fd6f5] rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowUnonboarded>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forge"
            element={
              <ProtectedRoute>
                <Layout>
                  <ForgePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boss"
            element={
              <ProtectedRoute>
                <Layout>
                  <BossPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <Layout>
                  <AchievementsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/store"
            element={
              <ProtectedRoute>
                <Layout>
                  <StorePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <LeaderboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guild"
            element={
              <ProtectedRoute>
                <Layout>
                  <GuildPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/raid/:code"
            element={
              <ProtectedRoute>
                <Layout>
                  <RaidInvitePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <p className="font-rajdhani text-6xl font-extrabold text-[#3fd6f5]/30 tracking-widest">404</p>
                    <p className="font-rajdhani text-2xl font-bold text-[#e6f1f7] tracking-widest mt-2">PAGE NOT FOUND</p>
                    <p className="font-rajdhani text-sm text-[#6d81a0] mt-3">This sector does not exist in THE SYSTEM.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
