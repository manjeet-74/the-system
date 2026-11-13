import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { PushSettings } from '../components/common/PushSettings';
import { Toggle } from '../components/common/Toggle';
import { soundEnabled, setSoundEnabled } from '../lib/sound';

interface GitHubLink {
  repo_full_name: string | null;
  github_username: string | null;
}

interface NotificationPrefs {
  reminder_time: string;
  email_enabled: boolean;
}

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // GitHub Link state
  const [repoInput, setRepoInput] = useState('');
  const [repoSaved, setRepoSaved] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [notifError, setNotifError] = useState('');

  // Notification pref state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [notifSaved, setNotifSaved] = useState(false);
  const [sound, setSound] = useState(soundEnabled);

  const githubQuery = useQuery<GitHubLink | null>({
    queryKey: ['github_link', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('github_links')
        .select('repo_full_name, github_username')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const notifQuery = useQuery<NotificationPrefs | null>({
    queryKey: ['notification_prefs', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('notification_prefs')
        .select('reminder_time, email_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (githubQuery.data?.repo_full_name) {
      setRepoInput(githubQuery.data.repo_full_name);
    }
  }, [githubQuery.data]);

  useEffect(() => {
    if (notifQuery.data) {
      setEmailEnabled(notifQuery.data.email_enabled);
      setReminderTime(notifQuery.data.reminder_time ?? '20:00');
    }
  }, [notifQuery.data]);

  const saveGitHubMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const trimmed = repoInput.trim();
      // Validate owner/repo shape so a typo doesn't silently 404 in github-verify.
      if (trimmed && !/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
        throw new Error('Repository must be in the format owner/repo-name');
      }
      const githubUsername = user.user_metadata?.user_name ?? null;
      await supabase.from('github_links').upsert({
        user_id: user.id,
        repo_full_name: repoInput.trim() || null,
        github_username: githubUsername,
      });
    },
    onSuccess: () => {
      setRepoSaved(true);
      setGithubError('');
      setTimeout(() => setRepoSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['github_link', user?.id] });
    },
    onError: (err: any) => {
      setGithubError(err?.message ?? 'Failed to save GitHub settings.');
    },
  });

  const saveNotifMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from('notification_prefs').upsert({
        user_id: user.id,
        email_enabled: emailEnabled,
        reminder_time: reminderTime,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      setNotifError('');
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['notification_prefs', user?.id] });
    },
    onError: (err: any) => {
      setNotifError(err?.message ?? 'Failed to save notification preferences.');
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">SETTINGS</h2>
        <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
          Configure your system integrations and notification preferences.
        </p>
      </div>

      {/* GitHub Integration */}
      <section className="bg-[#04070d] border border-[#3fd6f5]/20 rounded-lg p-5 space-y-4">
        <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
          GITHUB INTEGRATION
        </h3>
        <p className="text-[#6d81a0] font-rajdhani text-xs">
          Link a repository to enable automatic quest verification on commit push.
          Format: <span className="text-[#3fd6f5]">owner/repo-name</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="e.g. manjeet/portfolio-site"
            className="flex-1 bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
          />
          <button
            onClick={() => saveGitHubMutation.mutate()}
            disabled={saveGitHubMutation.isPending}
            className="bg-[#3fd6f5]/10 border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/20 font-rajdhani font-bold text-sm px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {saveGitHubMutation.isPending ? 'SAVING...' : repoSaved ? 'SAVED ✓' : 'SAVE'}
          </button>
        </div>
        {githubError && (
          <p className="text-[#ff4d5e] font-rajdhani text-xs">{githubError}</p>
        )}
        {githubQuery.data?.github_username && (
          <p className="text-[#6d81a0] font-rajdhani text-xs">
            GitHub account: <span className="text-[#3fd6f5]">@{githubQuery.data.github_username}</span>
          </p>
        )}
      </section>

      {/* Notification Preferences */}
      <section className="bg-[#04070d] border border-[#3fd6f5]/20 rounded-lg p-5 space-y-4">
        <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
          NOTIFICATIONS
        </h3>
        <p className="text-[#6d81a0] font-rajdhani text-xs">
          Receive an email reminder if you have incomplete quests. Time is UTC.
        </p>

        <div className="flex items-center justify-between">
          <div>
            <span className="font-rajdhani text-[#e6f1f7] text-sm">Email reminders</span>
            <p className="text-[#6d81a0] font-rajdhani text-xs mt-0.5">
              {emailEnabled ? 'ENABLED — daily email at reminder time' : 'DISABLED'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailEnabled}
            onClick={() => setEmailEnabled(prev => !prev)}
            aria-label={emailEnabled ? 'Disable email reminders' : 'Enable email reminders'}
            className="relative rounded-full cursor-pointer flex-shrink-0"
            style={{
              width: 56,
              height: 28,
              backgroundColor: emailEnabled ? '#3fd6f5' : '#33415c',
              transition: 'background-color 300ms ease',
            }}
          >
            <span
              className="absolute rounded-full bg-white"
              style={{
                width: 22,
                height: 22,
                top: 3,
                left: emailEnabled ? 31 : 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                transition: 'left 300ms ease',
              }}
            />
          </button>
        </div>

        <PushSettings />

        <div>
          <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
            REMINDER TIME (UTC)
          </label>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
          />
          <p className="text-[#6d81a0] font-rajdhani text-xs mt-1">
            Reminders go out at the top of this hour, and only if you still have open quests
            {(() => {
              const [h = '20'] = reminderTime.split(':');
              const local = new Date(Date.UTC(2000, 0, 1, parseInt(h, 10) || 0));
              return ` — about ${local.toLocaleTimeString([], { hour: 'numeric' })} your time.`;
            })()}
          </p>
        </div>

        <button
          onClick={() => saveNotifMutation.mutate()}
          disabled={saveNotifMutation.isPending}
          className="bg-[#3fd6f5]/10 border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/20 font-rajdhani font-bold text-sm px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50"
        >
          {saveNotifMutation.isPending ? 'SAVING...' : notifSaved ? 'SAVED ✓' : 'SAVE PREFERENCES'}
        </button>

        {notifError && (
          <p className="text-[#ff4d5e] font-rajdhani text-xs">{notifError}</p>
        )}
      </section>

      {/* Interface */}
      <section className="bg-[#04070d] border border-[#3fd6f5]/20 rounded-lg p-5 space-y-4">
        <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">INTERFACE</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="font-rajdhani text-[#e6f1f7] text-sm">Sound effects</span>
            <p className="text-[#6d81a0] font-rajdhani text-xs mt-0.5">The rank-up sting. Saved on this device.</p>
          </div>
          <Toggle
            checked={sound}
            onChange={(on) => {
              setSound(on);
              setSoundEnabled(on);
            }}
            label="Sound effects"
          />
        </div>
      </section>
    </div>
  );
}
