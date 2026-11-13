// Tiny Web Audio helper. No audio files — the stings are synthesized, so there is nothing
// to download and nothing to license. Browsers only allow audio after a user gesture; every
// call is wrapped so a blocked/unsupported AudioContext fails silently.
const KEY = 'system:sound';

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked — setting just won't persist */
  }
}

export function playRankUpSting() {
  if (!soundEnabled()) return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    // Rising arpeggio, then a held major chord.
    const notes: [number, number, number][] = [
      [0, 392.0, 0.35],
      [0.13, 523.25, 0.35],
      [0.26, 659.25, 0.35],
      [0.39, 783.99, 1.4],
      [0.39, 987.77, 1.4],
      [0.39, 1318.51, 1.4],
    ];
    for (const [offset, freq, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + dur + 0.05);
    }
    setTimeout(() => ctx.close().catch(() => {}), 2500);
  } catch {
    /* audio blocked or unsupported */
  }
}
