import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

interface Preview {
  id: string;
  boss_title: string;
  boss_brief: string;
  status: 'open' | 'active' | 'cleared';
  deadline: string;
  host: string | null;
  is_host: boolean;
  is_guest: boolean;
}

/** Landing page for a raid invite link: /raid/:code */
export function RaidInvitePage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: preview, isLoading } = useQuery<Preview | null>({
    queryKey: ['raid_preview', code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_raid_preview', { p_code: code });
      if (error) throw error;
      return (data as Preview | null) ?? null;
    },
  });

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('join_raid', { p_code: code });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_raids'] });
      navigate('/boss', { replace: true });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#ff4d5e]/30 border-t-[#ff4d5e] rounded-full animate-spin" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <p className="font-rajdhani text-2xl font-bold text-[#ff4d5e] tracking-wider">RAID NOT FOUND</p>
        <p className="text-[#6d81a0] font-rajdhani text-sm">This invite link is invalid or the raid no longer exists.</p>
        <Link to="/boss" className="text-[#3fd6f5] font-rajdhani font-bold text-sm hover:underline">Back to bosses</Link>
      </div>
    );
  }

  const expired = new Date(preview.deadline).getTime() <= Date.now();
  const alreadyIn = preview.is_host || preview.is_guest;
  const full = preview.status !== 'open' && !alreadyIn;

  return (
    <div className="max-w-md mx-auto border border-[#ff4d5e]/30 bg-[#ff4d5e]/5 rounded-lg p-6 space-y-4 mt-8">
      <p className="font-rajdhani text-xs font-bold tracking-[0.3em] text-[#ff4d5e]">CO-OP RAID INVITE</p>
      <h2 className="font-rajdhani text-2xl font-bold text-[#e6f1f7]">{preview.boss_title}</h2>
      <p className="selectable text-[#6d81a0] font-rajdhani text-sm">{preview.boss_brief}</p>
      <p className="font-rajdhani text-sm text-[#e6f1f7]">
        <span className="text-[#6d81a0]">Hunter:</span> {preview.host ?? 'Hunter'}
      </p>
      <p className="font-rajdhani text-xs text-[#6d81a0]">
        Both hunters must submit what they did. When both finish, each earns +150 XP and +75 ◈.
      </p>

      {join.error && <p className="text-[#ff4d5e] font-rajdhani text-sm">{(join.error as Error).message}</p>}

      {alreadyIn ? (
        <Link to="/boss" className="block text-center bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold py-2 rounded">
          {preview.is_host ? 'This is your raid — share the link with a friend' : 'You joined — open the raid'}
        </Link>
      ) : expired ? (
        <p className="text-[#ff4d5e] font-rajdhani font-bold text-center">THIS RAID HAS EXPIRED</p>
      ) : full ? (
        <p className="text-[#ff4d5e] font-rajdhani font-bold text-center">THIS RAID ALREADY HAS TWO HUNTERS</p>
      ) : (
        <button
          type="button"
          onClick={() => join.mutate()}
          disabled={join.isPending}
          className="w-full bg-[#ff4d5e] text-[#04070d] font-rajdhani font-bold text-lg py-2.5 rounded cursor-pointer disabled:opacity-50"
        >
          {join.isPending ? 'JOINING…' : 'JOIN THE RAID'}
        </button>
      )}
    </div>
  );
}
