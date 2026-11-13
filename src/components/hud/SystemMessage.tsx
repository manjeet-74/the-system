import { useEffect, useState } from 'react';
import { useSystemMessage } from '../../hooks/useSystemMessage';

/** Types the day's message out like a terminal. Renders nothing if the call fails. */
export function SystemMessage() {
  const { data: message, isLoading } = useSystemMessage();
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (!message) return;
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(message.slice(0, i));
      if (i >= message.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [message]);

  if (isLoading) {
    return <div className="h-14 rounded-lg border border-[#3fd6f5]/15 bg-[#0a0f1c] animate-pulse" />;
  }
  if (!message) return null;

  return (
    <div className="rounded-lg border border-[#3fd6f5]/30 bg-[#0a0f1c] px-5 py-4 shadow-[0_0_20px_rgba(63,214,245,0.08)]">
      <p className="font-rajdhani text-[10px] font-bold tracking-[0.35em] text-[#3fd6f5]/70 mb-1">
        [ SYSTEM MESSAGE ]
      </p>
      <p className="selectable font-rajdhani text-lg text-[#e6f1f7] leading-snug min-h-[1.75rem]">
        {shown}
        {shown.length < message.length && <span className="animate-pulse text-[#3fd6f5]">▌</span>}
      </p>
    </div>
  );
}
