import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useWallet } from '../../hooks/useWallet';
import { RankUpOverlay } from '../hud/RankUpOverlay';
import type { ReactNode } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'DASHBOARD', exact: true },
  { to: '/forge', label: 'FORGE' },
  { to: '/boss', label: 'BOSS' },
  { to: '/guild', label: 'GUILD' },
  { to: '/leaderboard', label: 'RANKINGS' },
  { to: '/analytics', label: 'ANALYTICS' },
  { to: '/profile', label: 'PROFILE' },
  { to: '/settings', label: 'SETTINGS' },
];

const THEME_KEY = 'system:theme';

// Applies the equipped store theme to <html data-theme=...> (see globals.css). The value is
// also cached in localStorage so the next page load paints in the right colours at once.
function useApplyTheme() {
  const { profile } = useProfile();
  const theme = profile?.equipped_theme ?? '';
  useEffect(() => {
    if (!profile) return;
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked */
    }
  }, [profile, theme]);
}

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { coins } = useWallet();
  useApplyTheme();

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7]">
      <RankUpOverlay />
      {/* Top nav */}
      <header className="border-b border-[#3fd6f5]/15 sticky top-0 bg-[#04070d]/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-rajdhani text-xl font-extrabold tracking-wider text-[#3fd6f5]">
              THE SYSTEM
            </span>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_LINKS.map(({ to, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `font-rajdhani font-semibold text-xs tracking-wider px-3 py-1.5 rounded transition-colors ${
                      isActive
                        ? 'text-[#3fd6f5] bg-[#3fd6f5]/10'
                        : 'text-[#6d81a0] hover:text-[#e6f1f7] hover:bg-[#3fd6f5]/5'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store"
              title="Shadow coins — spend them in the store"
              className="font-rajdhani font-bold text-sm text-amber-300 hover:text-amber-200 transition-colors"
            >
              ◈ {coins.toLocaleString()}
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                } catch (err) {
                  console.error('Sign out failed:', err);
                }
              }}
              className="hidden sm:block border border-[#ff4d5e]/40 text-[#ff4d5e] hover:bg-[#ff4d5e]/10 font-rajdhani font-semibold px-4 py-1.5 rounded transition-colors text-xs cursor-pointer"
            >
              SIGN OUT
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex overflow-x-auto px-4 pb-2 gap-1 items-center">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `font-rajdhani font-semibold text-xs tracking-wider px-3 py-1.5 rounded whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-[#3fd6f5] bg-[#3fd6f5]/10'
                    : 'text-[#6d81a0] hover:text-[#e6f1f7]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={async () => { try { await signOut(); } catch (err) { console.error('Sign out failed:', err); } }}
            className="ml-auto border border-[#ff4d5e]/40 text-[#ff4d5e] font-rajdhani font-semibold px-3 py-1.5 rounded text-xs whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            SIGN OUT
          </button>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">{children}</main>
    </div>
  );
}
