-- =====================================================================
-- Swap rules, enforced by the database so they hold no matter which page
-- (or how many people at once) changes a swap. Safe to run more than once.
--
--   pending  --(recipient accepts)-->  accepted  --(both tasks done)--> completed
--      |  \--(recipient declines)-->  rejected
--      \----(sender withdraws)----->  cancelled
--   accepted --(either person cancels)--> cancelled  (both tasks reopen)
-- =====================================================================

-- 'cancelled' is a new status
alter table public.task_swaps drop constraint if exists task_swaps_status_check;
alter table public.task_swaps
  add constraint task_swaps_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed'));

-- Can't send the same offer twice while the first is still waiting
create unique index if not exists task_swaps_one_pending_offer
  on public.task_swaps (sender_task_id, recipient_task_id)
  where status = 'pending';

-- ---------------------------------------------------------------------
-- BEFORE: check who is allowed to make each change
-- ---------------------------------------------------------------------
create or replace function public.check_swap_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  open_tasks int;
begin
  if new.status = old.status then
    return new;
  end if;

  -- Skip the "who" checks when run by an admin/SQL editor (me is null) or
  -- when this change was made automatically by another trigger (depth > 1),
  -- e.g. competing offers being declined when one swap is accepted.
  if me is not null and pg_trigger_depth() = 1 then
    if old.status = 'pending' and new.status in ('accepted', 'rejected') and me <> old.recipient_id then
      raise exception 'Only the person who received this offer can accept or decline it.';
    end if;
    if old.status = 'pending' and new.status = 'cancelled' and me <> old.sender_id then
      raise exception 'Only the person who sent this offer can withdraw it.';
    end if;
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
    select count(*) into open_tasks
      from tasks
     where id in (old.sender_task_id, old.recipient_task_id)
       and status = 'open';
    if open_tasks < 2 then
      raise exception 'One of these tasks has already been swapped with someone else.';
    end if;
  end if;

  if old.status in ('rejected', 'cancelled', 'completed') then
    raise exception 'This swap is closed and can no longer be changed.';
  end if;

  if old.status = 'accepted' and new.status not in ('cancelled', 'completed') then
    raise exception 'An accepted swap can only be cancelled or completed.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists task_swaps_check_change on public.task_swaps;
create trigger task_swaps_check_change
before update of status on public.task_swaps
for each row execute function public.check_swap_change();

-- ---------------------------------------------------------------------
-- AFTER: knock-on effects on tasks and competing offers
-- ---------------------------------------------------------------------
create or replace function public.apply_swap_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return null;
  end if;

  if new.status = 'accepted' then
    -- Both tasks are now taken
    update tasks set status = 'assigned', updated_at = now()
     where id in (new.sender_task_id, new.recipient_task_id);

    -- Decline every other waiting offer that involves either task
    update task_swaps set status = 'rejected', updated_at = now()
     where id <> new.id
       and status = 'pending'
       and (sender_task_id in (new.sender_task_id, new.recipient_task_id)
         or recipient_task_id in (new.sender_task_id, new.recipient_task_id));

  elsif old.status = 'accepted' and new.status = 'cancelled' then
    -- Reopen both tasks (unless one was already completed)
    update tasks
       set status = 'open', completed_by = null, completion_requested_at = null, updated_at = now()
     where id in (new.sender_task_id, new.recipient_task_id)
       and status in ('assigned', 'completion_requested');

    -- Any completion request still waiting no longer applies
    update task_completion_requests set status = 'rejected'
     where task_id in (new.sender_task_id, new.recipient_task_id)
       and status = 'pending';
  end if;

  return null;
end;
$$;

drop trigger if exists task_swaps_apply_change on public.task_swaps;
create trigger task_swaps_apply_change
after update of status on public.task_swaps
for each row execute function public.apply_swap_change();
