export interface PlayerStatsMath {
  str: number;
  int_: number;
  vit: number;
  sense: number;
  agi: number;
}

export function totalXP(stats: PlayerStatsMath): number {
  return (
    (stats.str || 0) +
    (stats.int_ || 0) +
    (stats.vit || 0) +
    (stats.sense || 0) +
    (stats.agi || 0)
  );
}

export function levelOf(stats: PlayerStatsMath): number {
  return Math.floor(totalXP(stats) / 100) + 1;
}

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export function rankOf(level: number): Rank {
  if (level < 10) return 'E';
  if (level < 20) return 'D';
  if (level < 35) return 'C';
  if (level < 50) return 'B';
  if (level < 70) return 'A';
  return 'S';
}

export function xpIntoLevel(stats: PlayerStatsMath): number {
  return totalXP(stats) % 100;
}
