import { forwardRef, useMemo } from 'react';
import { RANKS, type Rank } from '../../lib/gameMath';
import { CLASS_COLOR, normalizeClass, type HunterClass } from '../../lib/cosmetics';

const RANK_COLOR: Record<Rank, string> = {
  E: '#94a3b8',
  D: '#34d399',
  C: '#22d3ee',
  B: '#60a5fa',
  A: '#c084fc',
  S: '#fbbf24',
};

// Small deterministic PRNG so the same player always gets the same portrait.
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Emblem({ cls, color }: { cls: HunterClass; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (cls) {
    case 'CODE ASSASSIN':
      return (
        <g {...common}>
          <path d="M88 198 L76 210 L88 222" />
          <path d="M112 198 L124 210 L112 222" />
          <path d="M104 196 L96 224" />
        </g>
      );
    case 'ARCHMAGE':
      return (
        <g {...common}>
          <path d="M100 194 L106 206 L120 208 L110 217 L113 231 L100 224 L87 231 L90 217 L80 208 L94 206 Z" />
        </g>
      );
    case 'BERSERKER':
      return (
        <g {...common}>
          <path d="M84 196 L100 226" />
          <path d="M98 194 L114 224" />
          <path d="M112 196 L128 226" />
        </g>
      );
    case 'SENTINEL':
      return (
        <g {...common}>
          <path d="M100 194 L124 202 L122 218 Q112 230 100 234 Q88 230 78 218 L76 202 Z" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path d="M112 196 A18 18 0 1 0 112 230 A13 13 0 1 1 112 196 Z" />
        </g>
      );
  }
}

interface Props {
  seed: string;
  rank: Rank;
  hunterClass: string | null;
  frame?: string | null;
  className?: string;
}

/**
 * Procedurally drawn hunter portrait — generative art, not an AI image, so it costs
 * nothing to run and works offline. Unique per player (seed), tinted by class, with one
 * aura ring per rank earned.
 */
export const HunterPortrait = forwardRef<SVGSVGElement, Props>(function HunterPortrait(
  { seed, rank, hunterClass, frame, className },
  ref,
) {
  const cls = normalizeClass(hunterClass);
  const eye = CLASS_COLOR[cls];
  const aura = RANK_COLOR[rank];
  const rankIdx = RANKS.indexOf(rank);

  const art = useMemo(() => {
    const rnd = mulberry32(hashSeed(seed));
    return {
      hoodW: 44 + rnd() * 10,
      hoodTop: 26 + rnd() * 8,
      eyeGap: 11 + rnd() * 6,
      eyeY: 100 + rnd() * 8,
      eyeTilt: (rnd() - 0.5) * 4,
      stars: Array.from({ length: 26 }, () => ({
        x: rnd() * 200,
        y: rnd() * 240,
        r: 0.4 + rnd() * 1.4,
        o: 0.25 + rnd() * 0.6,
      })),
      shards: Array.from({ length: 5 }, () => ({
        x: 20 + rnd() * 160,
        y: 20 + rnd() * 120,
        s: 4 + rnd() * 8,
        rot: rnd() * 360,
      })),
    };
  }, [seed]);

  const w = art.hoodW;
  const t = art.hoodTop;
  const id = useMemo(() => `hp-${hashSeed(seed).toString(36)}`, [seed]);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 240"
      className={className}
      role="img"
      aria-label={`${cls} portrait, rank ${rank}`}
    >
      <defs>
        <radialGradient id={`${id}-aura`} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={aura} stopOpacity="0.55" />
          <stop offset="60%" stopColor={aura} stopOpacity="0.12" />
          <stop offset="100%" stopColor={aura} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1324" />
          <stop offset="100%" stopColor="#04070d" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="200" height="240" fill={`url(#${id}-bg)`} />
      {art.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e6f1f7" opacity={s.o} />
      ))}
      {art.shards.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} fill="none" stroke={aura} strokeOpacity="0.35" transform={`rotate(${s.rot} ${s.x} ${s.y})`} />
      ))}

      <circle cx="100" cy="108" r="96" fill={`url(#${id}-aura)`} />
      {Array.from({ length: rankIdx + 1 }, (_, i) => (
        <circle key={i} cx="100" cy="108" r={58 + i * 9} fill="none" stroke={aura} strokeOpacity={0.5 - i * 0.06} strokeWidth="1.2" strokeDasharray={i % 2 ? '3 5' : undefined} />
      ))}

      {/* shoulders */}
      <path d="M14 240 Q24 172 100 162 Q176 172 186 240 Z" fill="#0b1220" stroke={aura} strokeOpacity="0.45" strokeWidth="1.5" />
      {/* hood */}
      <path
        d={`M100 ${t} C ${100 - w} ${t} ${100 - w - 6} 76 ${100 - w + 2} 112 C ${100 - w + 6} 138 74 160 100 168 C 126 160 ${100 + w - 6} 138 ${100 + w - 2} 112 C ${100 + w + 6} 76 ${100 + w} ${t} 100 ${t} Z`}
        fill="#0a0f1c"
        stroke={aura}
        strokeOpacity="0.7"
        strokeWidth="2"
      />
      <ellipse cx="100" cy="110" rx={w * 0.66} ry="38" fill="#02040a" />
      {/* eyes */}
      <g filter={`url(#${id}-glow)`} fill={eye}>
        <ellipse cx={100 - art.eyeGap} cy={art.eyeY - art.eyeTilt} rx="5.5" ry="2.4" transform={`rotate(-8 ${100 - art.eyeGap} ${art.eyeY})`} />
        <ellipse cx={100 + art.eyeGap} cy={art.eyeY + art.eyeTilt} rx="5.5" ry="2.4" transform={`rotate(8 ${100 + art.eyeGap} ${art.eyeY})`} />
      </g>
      <Emblem cls={cls} color={eye} />
      {frame && <rect x="2" y="2" width="196" height="236" fill="none" stroke={frame} strokeWidth="4" />}
    </svg>
  );
});

/** Rasterise a rendered portrait <svg> and download it as a PNG (shareable). */
export async function downloadPortraitPng(svg: SVGSVGElement, filename: string) {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not render portrait'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('Could not create PNG');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
