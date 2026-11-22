-- =====================================================================
-- Clean-up after restoring the April 2025 backup. Safe to run more than once.
-- =====================================================================

-- 1. Leftover functions from an early version of the app. They refer to
--    tables/columns that don't exist (reviews, reviewed_id, creator_id,
--    helper_id, reputation_score) and nothing uses them.
drop function if exists public.update_user_reputation() cascade;
drop function if exists public.calculate_user_reputation(uuid) cascade;
drop function if exists public.update_task_counters() cascade;

-- 2. One set of task statuses everywhere:
--      open -> assigned -> completion_requested -> completed
--    Older code used 'pending_completion' for the same step.
update public.tasks set status = 'completion_requested' where status = 'pending_completion';

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'assigned', 'completion_requested', 'completed'))
  not valid;  -- enforce for new/changed rows without failing on any odd old row
