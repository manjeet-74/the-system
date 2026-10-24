create table forge_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  tier text not null check (tier in ('spark','build','dungeon')),
  brief text not null,
  status text not null default 'active' check (status in ('active','completed','expired')),
  unlocked_at timestamptz not null default now(),
  deadline timestamptz,
  completed_at timestamptz,
  reward_xp int not null default 0
);

alter table forge_challenges enable row level security;
create policy "select own forge" on forge_challenges for select using (auth.uid() = user_id);
create policy "complete own forge" on forge_challenges for update using (auth.uid() = user_id);
-- Inserts are service-role only (done by the rollover function).

-- RPC to award forge XP transactionally
create function public.complete_forge(p_forge_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_reward_xp int;
  v_status text;
begin
  select user_id, reward_xp, status
    into v_user_id, v_reward_xp, v_status
    from forge_challenges where id = p_forge_id;

  if v_user_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  if v_status != 'active' then
    return; -- no-op if already completed or expired
  end if;

  update forge_challenges
    set status = 'completed', completed_at = now()
    where id = p_forge_id;

  -- Award XP split across all stats equally (20% each)
  update player_stats
    set str   = str   + (v_reward_xp / 5),
        int_  = int_  + (v_reward_xp / 5),
        vit   = vit   + (v_reward_xp / 5),
        sense = sense + (v_reward_xp / 5),
        agi   = agi   + (v_reward_xp / 5),
        updated_at = now()
    where user_id = v_user_id;
end;
$$ language plpgsql security definer;
