-- Deleting an auth user cascades auth.users -> profiles -> everything the player owns,
-- but ai_submissions referenced profiles and daily_logs with NO ACTION, so any player who
-- had ever used the AI Judge could not be deleted ("Database error deleting user").
-- Make both references cascade so account deletion is complete.
-- (ai_submissions.quest_id stays NO ACTION: those rows already disappear via user_id.)
alter table ai_submissions drop constraint if exists ai_submissions_user_id_fkey;
alter table ai_submissions
  add constraint ai_submissions_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table ai_submissions drop constraint if exists ai_submissions_daily_log_id_fkey;
alter table ai_submissions
  add constraint ai_submissions_daily_log_id_fkey
  foreign key (daily_log_id) references daily_logs(id) on delete cascade;
