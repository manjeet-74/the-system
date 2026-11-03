import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'DASHBOARD', exact: true },
  { to: '/forge', label: 'FORGE' },
  { to: '/boss', label: 'BOSS' },
  { to: '/analytics', label: 'ANALYTICS' },
  { to: '/settings', label: 'SETTINGS' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7]">
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
          <button
            type="button"
            onClick={async () => {
              try {
                await signOut();
              } catch (err) {
                console.error('Sign out failed:', err);
              }
            }}
            className="border border-[#ff4d5e]/40 text-[#ff4d5e] hover:bg-[#ff4d5e]/10 font-rajdhani font-semibold px-4 py-1.5 rounded transition-colors text-xs cursor-pointer"
          >
            SIGN OUT
          </button>
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
