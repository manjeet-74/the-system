import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { disablePush, enablePush, getPushState, type PushState } from '../../lib/push';
import { Toggle } from './Toggle';

const MESSAGE: Record<PushState, string> = {
  unsupported: 'This browser does not support push. On iPhone, add THE SYSTEM to your Home Screen first.',
  unconfigured: 'Push is not configured on this deployment.',
  denied: 'Notifications are blocked. Allow them in your browser/site settings, then reload.',
  off: 'Get a notification when quests are still open at your reminder time.',
  on: 'ENABLED on this device — you will be notified at your reminder time.',
};

export function PushSettings() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  const toggle = async (next: boolean) => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      if (next) await enablePush(user.id);
      else await disablePush();
      setState(await getPushState());
    } catch (err: any) {
      setError(err?.message ?? 'Could not change push settings.');
      setState(await getPushState().catch(() => 'unsupported' as PushState));
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;
  const usable = state === 'on' || state === 'off';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="font-rajdhani text-[#e6f1f7] text-sm">Push notifications</span>
          <p className="text-[#6d81a0] font-rajdhani text-xs mt-0.5">{MESSAGE[state]}</p>
        </div>
        <Toggle checked={state === 'on'} onChange={toggle} label="Push notifications" disabled={!usable || busy} />
      </div>
      {error && <p className="text-[#ff4d5e] font-rajdhani text-xs">{error}</p>}
    </div>
  );
}
