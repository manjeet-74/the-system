import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { useStreak } from '../hooks/useStreak';
import { useOwnedTitles } from '../hooks/useCosmetics';
import { levelOf, rankOf, totalXP } from '../lib/gameMath';
import { HUNTER_CLASSES, frameStyle, normalizeClass } from '../lib/cosmetics';
import { HunterPortrait, downloadPortraitPng } from '../components/profile/HunterPortrait';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { Toggle } from '../components/common/Toggle';

interface Summary {
  quests_done: number;
  bosses_defeated: number;
  forges_done: number;
  raids_cleared: number;
  achievements: number;
  longest_streak: number;
  coins: number;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#0a0f1c] border border-[#3fd6f5]/15 rounded-lg px-4 py-3">
      <p className="font-rajdhani text-[10px] tracking-[0.2em] text-[#6d81a0] font-bold">{label}</p>
      <p className="font-rajdhani text-2xl font-bold text-[#e6f1f7]">{value}</p>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile, updateProfile } = useProfile();
  const { stats } = usePlayerStats();
  const { streak } = useStreak();
  const titles = useOwnedTitles();
  const svgRef = useRef<SVGSVGElement>(null);

  const [username, setUsername] = useState('');
  const [hunterClass, setHunterClass] = useState('SHADOW HUNTER');
  const [isPublic, setIsPublic] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setHunterClass(normalizeClass(profile.class));
    setIsPublic(profile.public_profile);
  }, [profile]);

  const { data: summary } = useQuery<Summary | null>({
    queryKey: ['profile_summary', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_profile_summary');
      if (err) throw err;
      return data as Summary;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = username.trim();
      if (name.length < 2 || name.length > 24) throw new Error('Name must be 2-24 characters.');
      await updateProfile({ username: name, class: hunterClass, public_profile: isPublic });
    },
    onSuccess: () => {
      setError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: any) => setError(err?.message ?? 'Could not save profile.'),
  });

  const titleMutation = useMutation({
    mutationFn: async (title: string | null) => {
      const { error: err } = await supabase.rpc('equip_title', { p_title: title });
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
    onError: (err: any) => setError(err?.message ?? 'Could not equip title.'),
  });

  const level = levelOf(stats);
  const rank = rankOf(level);
  const dirty =
    !!profile &&
    (username.trim() !== (profile.username ?? '') ||
      hunterClass !== normalizeClass(profile.class) ||
      isPublic !== profile.public_profile);

  const download = async () => {
    if (!svgRef.current) return;
    try {
      await downloadPortraitPng(svgRef.current, `hunter-${rank}-${(profile?.username ?? 'hunter').replace(/\W+/g, '_')}.png`);
    } catch (err: any) {
      setError(err?.message ?? 'Could not export portrait.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileTabs />

      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        {/* Portrait */}
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden border-2" style={frameStyle(profile?.equipped_frame)}>
            <HunterPortrait
              ref={svgRef}
              seed={user?.id ?? 'hunter'}
              rank={rank}
              hunterClass={profile?.class ?? null}
              frame={profile?.equipped_frame}
              className="w-full h-auto block"
            />
          </div>
          <button
            type="button"
            onClick={download}
            className="w-full border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold text-sm py-2 rounded cursor-pointer"
          >
            DOWNLOAD PORTRAIT
          </button>
          <p className="text-[#6d81a0] font-rajdhani text-xs text-center">
            Generated from your class and rank. It evolves as you rank up.
          </p>
        </div>

        <div className="space-y-6">
          {/* Identity */}
          <section className="bg-[#04070d] border border-[#3fd6f5]/20 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-rajdhani text-2xl font-bold text-[#e6f1f7]">{profile?.username ?? 'Hunter'}</h2>
              {profile?.equipped_title && (
                <span className="font-rajdhani text-xs font-bold text-amber-300 border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 rounded">
                  {profile.equipped_title}
                </span>
              )}
              <span className="font-rajdhani text-xs text-[#6d81a0]">
                RANK <span className="text-[#3fd6f5] font-bold">{rank}</span> · LEVEL{' '}
                <span className="text-[#3fd6f5] font-bold">{level}</span>
              </span>
            </div>

            <label className="block">
              <span className="font-rajdhani text-xs text-[#6d81a0] font-semibold tracking-wider">HUNTER NAME</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                className="mt-1 w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
              />
            </label>

            <label className="block">
              <span className="font-rajdhani text-xs text-[#6d81a0] font-semibold tracking-wider">CLASS</span>
              <select
                value={hunterClass}
                onChange={(e) => setHunterClass(e.target.value)}
                className="mt-1 w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
              >
                {HUNTER_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-rajdhani text-xs text-[#6d81a0] font-semibold tracking-wider">EQUIPPED TITLE</span>
              <select
                value={profile?.equipped_title ?? ''}
                onChange={(e) => titleMutation.mutate(e.target.value || null)}
                disabled={titleMutation.isPending}
                className="mt-1 w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
              >
                <option value="">— none —</option>
                {titles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {titles.length === 0 && (
                <span className="text-[#6d81a0] font-rajdhani text-xs">Unlock titles via achievements or the store.</span>
              )}
            </label>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-rajdhani text-sm text-[#e6f1f7]">Show me on the global leaderboard</p>
                <p className="text-[#6d81a0] font-rajdhani text-xs mt-0.5">
                  Off by default. Only your name, level, streak and title are shown — never your email.
                </p>
              </div>
              <Toggle checked={isPublic} onChange={setIsPublic} label="Show me on the global leaderboard" />
            </div>

            {error && <p className="text-[#ff4d5e] font-rajdhani text-sm">{error}</p>}
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !dirty}
              className="bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-sm px-6 py-2 rounded cursor-pointer disabled:opacity-40"
            >
              {saveMutation.isPending ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE CHANGES'}
            </button>
          </section>

          {/* Lifetime stats */}
          <section>
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm mb-3">LIFETIME STATS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="TOTAL XP" value={totalXP(stats).toLocaleString()} />
              <Stat label="CURRENT STREAK" value={`${streak.current_streak}d`} />
              <Stat label="LONGEST STREAK" value={`${Math.max(summary?.longest_streak ?? 0, streak.longest_streak)}d`} />
              <Stat label="QUESTS CLEARED" value={summary?.quests_done ?? '—'} />
              <Stat label="BOSSES DEFEATED" value={summary?.bosses_defeated ?? '—'} />
              <Stat label="RAIDS CLEARED" value={summary?.raids_cleared ?? '—'} />
              <Stat label="FORGES DONE" value={summary?.forges_done ?? '—'} />
              <Stat label="ACHIEVEMENTS" value={summary?.achievements ?? '—'} />
              <Stat label="COINS" value={(summary?.coins ?? 0).toLocaleString()} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
