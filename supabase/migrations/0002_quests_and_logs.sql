create table quest_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  stat text not null check (stat in ('STR','INT','VIT','SENSE','AGI')),
  xp int not null default 10,
  is_default boolean not null default false,
  verification_method text not null default 'manual'
    check (verification_method in ('manual','github','ai_judge')),
  rubric text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  log_date date not null,
  quest_id uuid references quest_templates(id) not null,
  done boolean not null default false,
  completed_at timestamptz,
  xp_awarded int,
  verified_via text,
  is_penalty boolean not null default false,
  unique(user_id, log_date, quest_id)
);

alter table quest_templates enable row level security;
alter table daily_logs enable row level security;

create policy "manage own quests" on quest_templates for all using (auth.uid() = user_id);
create policy "manage own logs" on daily_logs for all using (auth.uid() = user_id);

-- Seed the 5 default quests whenever a profile is created
create function public.seed_default_quests()
returns trigger as $$
begin
  insert into public.quest_templates (user_id, title, stat, xp, is_default) values
    (new.id, 'Solve today''s problem', 'STR', 15, true),
    (new.id, 'Ship real progress', 'AGI', 15, true),
    (new.id, 'Learn something new', 'INT', 10, true),
    (new.id, 'Show up, no excuses', 'VIT', 10, true),
    (new.id, 'Review & refine old work', 'SENSE', 10, true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_seed_quests
  after insert on profiles
  for each row execute procedure public.seed_default_quests();

create function public.complete_quest(p_log_id uuid, p_done boolean)
returns void as $$
declare
  v_user_id uuid;
  v_quest_id uuid;
  v_stat text;
  v_xp int;
  v_prev_done boolean;
  v_delta int;
begin
  select user_id, quest_id, done into v_user_id, v_quest_id, v_prev_done
  from daily_logs where id = p_log_id;

  if v_user_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  select stat, xp into v_stat, v_xp from quest_templates where id = v_quest_id;

  if v_prev_done = p_done then
    return; -- no-op, already in that state
  end if;

  v_delta := case when p_done then v_xp else -v_xp end;

  update daily_logs
    set done = p_done,
        completed_at = case when p_done then now() else null end,
        xp_awarded = case when p_done then v_xp else null end,
        verified_via = case when p_done then 'manual' else null end
    where id = p_log_id;

  execute format(
    'update player_stats set %I = greatest(0, %I + $1), updated_at = now() where user_id = $2',
    v_stat, v_stat
  ) using v_delta, v_user_id;
end;
$$ language plpgsql security definer;
