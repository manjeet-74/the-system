import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

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

  // Notification pref state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('20:00');

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
      const githubUsername = user.user_metadata?.user_name ?? null;
      await supabase.from('github_links').upsert({
        user_id: user.id,
        repo_full_name: repoInput.trim() || null,
        github_username: githubUsername,
      });
    },
    onSuccess: () => {
      setRepoSaved(true);
      setTimeout(() => setRepoSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['github_link', user?.id] });
    },
  });

  const saveNotifMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('notification_prefs').upsert({
        user_id: user.id,
        email_enabled: emailEnabled,
        reminder_time: reminderTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_prefs', user?.id] });
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
          <span className="font-rajdhani text-[#e6f1f7] text-sm">Email reminders</span>
          <button
            onClick={() => setEmailEnabled(!emailEnabled)}
            className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative ${
              emailEnabled ? 'bg-[#3fd6f5]' : 'bg-[#3fd6f5]/20'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                emailEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {emailEnabled && (
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
          </div>
        )}

        <button
          onClick={() => saveNotifMutation.mutate()}
          disabled={saveNotifMutation.isPending}
          className="bg-[#3fd6f5]/10 border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/20 font-rajdhani font-bold text-sm px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50"
        >
          {saveNotifMutation.isPending ? 'SAVING...' : 'SAVE PREFERENCES'}
        </button>

        {saveNotifMutation.isSuccess && (
          <p className="text-emerald-400 font-rajdhani text-xs">Preferences saved.</p>
        )}
      </section>
    </div>
  );
}
