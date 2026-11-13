import { NavLink } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';

const TABS = [
  { to: '/profile', label: 'PROFILE' },
  { to: '/achievements', label: 'ACHIEVEMENTS' },
  { to: '/store', label: 'STORE' },
];

export function ProfileTabs() {
  const { coins } = useWallet();
  return (
    <div className="flex items-center justify-between border-b border-[#3fd6f5]/15 mb-6">
      <nav className="flex gap-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `font-rajdhani font-bold text-sm tracking-wider px-4 py-2 border-b-2 -mb-px transition-colors ${
                isActive ? 'text-[#3fd6f5] border-[#3fd6f5]' : 'text-[#6d81a0] border-transparent hover:text-[#e6f1f7]'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <span className="font-rajdhani font-bold text-sm text-amber-300 pb-2" title="Shadow coins">
        ◈ {coins.toLocaleString()}
      </span>
    </div>
  );
}
