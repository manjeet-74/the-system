create table notification_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  reminder_time time not null default '20:00',
  email_enabled boolean not null default true
);

alter table notification_prefs enable row level security;
create policy "manage own prefs" on notification_prefs for all using (auth.uid() = user_id);

create function public.seed_notification_prefs()
returns trigger as $$
begin
  insert into public.notification_prefs (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_seed_prefs
  after insert on profiles
  for each row execute procedure public.seed_notification_prefs();
