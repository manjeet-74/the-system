export const HUNTER_CLASSES = [
  'SHADOW HUNTER',
  'CODE ASSASSIN',
  'ARCHMAGE',
  'BERSERKER',
  'SENTINEL',
] as const;

export type HunterClass = (typeof HUNTER_CLASSES)[number];

export const CLASS_COLOR: Record<HunterClass, string> = {
  'SHADOW HUNTER': '#3fd6f5',
  'CODE ASSASSIN': '#34d399',
  ARCHMAGE: '#a78bfa',
  BERSERKER: '#ff4d5e',
  SENTINEL: '#f5c33f',
};

export function normalizeClass(value: string | null | undefined): HunterClass {
  return (HUNTER_CLASSES as readonly string[]).includes(value ?? '')
    ? (value as HunterClass)
    : 'SHADOW HUNTER';
}

/** Ring colour for an equipped avatar frame (null = default thin cyan ring). */
export function frameStyle(frame: string | null | undefined): React.CSSProperties {
  const color = frame ?? '#3fd6f5';
  return {
    borderColor: color,
    boxShadow: frame ? `0 0 18px ${color}88, inset 0 0 12px ${color}33` : `0 0 12px ${color}33`,
  };
}
