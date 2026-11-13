import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { levelOf, rankOf, RANKS, type Rank } from '../../lib/gameMath';
import { playRankUpSting } from '../../lib/sound';

const RANK_COLOR: Record<Rank, string> = {
  E: '#94a3b8',
  D: '#34d399',
  C: '#22d3ee',
  B: '#60a5fa',
  A: '#c084fc',
  S: '#fbbf24',
};

// ?previewRankUp=S lets you see the cinematic without grinding to a new rank.
function previewRank(): Rank | null {
  try {
    const p = new URLSearchParams(window.location.search).get('previewRankUp');
    return p && (RANKS as string[]).includes(p) ? (p as Rank) : null;
  } catch {
    return null;
  }
}

/**
 * Full-screen takeover the first time you ever reach a new rank. We remember the HIGHEST
 * rank reached (in localStorage), not the last one seen, so losing and regaining a rank
 * to a penalty never replays it. First visit just records the current rank silently.
 */
export function RankUpOverlay() {
  const { user } = useAuth();
  const { stats, loading } = usePlayerStats();
  const rank = rankOf(levelOf(stats));
  const [shown, setShown] = useState<Rank | null>(previewRank);

  useEffect(() => {
    if (!user || loading) return;
    const key = `system:highestRank:${user.id}`;
    let prev: string | null = null;
    try {
      prev = localStorage.getItem(key);
    } catch {
      return; // no storage -> we can't tell a new rank from a reload, so never show
    }
    const prevIdx = prev ? RANKS.indexOf(prev as Rank) : -1;
    const curIdx = RANKS.indexOf(rank);
    if (prevIdx >= 0 && curIdx > prevIdx) setShown(rank);
    if (prevIdx < 0 || curIdx > prevIdx) {
      try {
        localStorage.setItem(key, rank);
      } catch {
        /* ignore */
      }
    }
  }, [user, loading, rank]);

  useEffect(() => {
    if (!shown) return;
    playRankUpSting();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setShown(null);
    };
    window.addEventListener('keydown', onKey);
    const timer = setTimeout(() => setShown(null), 10000);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [shown]);

  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        angle: Math.random() * 360,
        dist: 120 + Math.random() * 280,
        delay: Math.random() * 0.5,
        size: 3 + Math.random() * 5,
      })),
    [shown],
  );

  if (!shown) return null;
  const color = RANK_COLOR[shown];

  const share = async () => {
    const text = `THE SYSTEM recognizes my growth. I just reached Rank ${shown}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'THE SYSTEM', text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  return (
    <div
      role="dialog"
      aria-label={`Rank up. You are now rank ${shown}`}
      onClick={() => setShown(null)}
      className="rankup-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(circle at center, ${color}26 0%, #04070df2 62%)` }}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="rankup-ring" style={{ borderColor: color }} />
        {particles.map((p, i) => (
          <span
            key={i}
            className="rankup-particle"
            style={
              {
                background: color,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                '--angle': `${p.angle}deg`,
                '--dist': `${p.dist}px`,
                boxShadow: `0 0 10px ${color}`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative text-center px-6 select-none" onClick={(e) => e.stopPropagation()}>
        <p className="rankup-line font-rajdhani text-xs sm:text-sm tracking-[0.4em] text-[#6d81a0]" style={{ animationDelay: '0.2s' }}>
          [ SYSTEM NOTICE ]
        </p>
        <p className="rankup-line font-rajdhani text-lg sm:text-2xl font-bold tracking-widest text-[#e6f1f7] mt-3" style={{ animationDelay: '0.5s' }}>
          THE SYSTEM RECOGNIZES YOUR GROWTH.
        </p>
        <div
          className="rankup-letter font-rajdhani font-extrabold leading-none my-6"
          style={{ color, fontSize: 'clamp(7rem, 28vw, 14rem)', textShadow: `0 0 40px ${color}, 0 0 90px ${color}88` }}
        >
          {shown}
        </div>
        <p className="rankup-line font-rajdhani text-2xl sm:text-4xl font-extrabold tracking-[0.3em]" style={{ color, animationDelay: '1.1s' }}>
          RANK UP
        </p>
        <div className="rankup-line mt-8 flex gap-3 justify-center" style={{ animationDelay: '1.6s' }}>
          <button
            type="button"
            onClick={share}
            className="border border-[#3fd6f5]/50 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold text-sm px-5 py-2 rounded cursor-pointer"
          >
            SHARE
          </button>
          <button
            type="button"
            onClick={() => setShown(null)}
            className="bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-sm px-5 py-2 rounded cursor-pointer"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
