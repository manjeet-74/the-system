-- Adds a per-quest recurrence flag.
-- recurring = true  -> daily-rollover regenerates a log for this quest every day (default, existing behavior)
-- recurring = false -> one-time quest: a log is created only for the day it was added, never regenerated
alter table quest_templates
  add column recurring boolean not null default true;
