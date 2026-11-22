-- =====================================================================
-- Task Helper: tables and columns added after the 23 April 2025 backup.
-- Run AFTER restoring db_cluster.backup, in Supabase -> SQL Editor.
-- Rebuilt from how the app code uses them. Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columns missing from the restored tables
-- ---------------------------------------------------------------------
alter table public.messages add column if not exists is_read boolean not null default false;

-- No foreign key on completed_by: a second tasks->users link makes the app's
-- `users(display_name)` lookups ambiguous (PGRST201) and breaks task lists.
alter table public.tasks add column if not exists completed_by uuid;
alter table public.tasks drop constraint if exists tasks_completed_by_fkey;
alter table public.tasks add column if not exists completion_requested_at timestamptz;

alter table public.users add column if not exists average_rating double precision not null default 0;
alter table public.users add column if not exists reviews_count integer not null default 0;

-- The backup has two identical foreign keys on tasks.user_id and on
-- messages.recipient_id. Duplicates make Supabase's `users(...)` joins
-- ambiguous, so drop the extra one of each.
alter table public.tasks    drop constraint if exists fk_tasks_user;
alter table public.messages drop constraint if exists messages_receiver_id_fkey;

-- ---------------------------------------------------------------------
-- 2. task_swaps
-- ---------------------------------------------------------------------
create table if not exists public.task_swaps (
  id                uuid primary key default gen_random_uuid(),
  sender_id         uuid not null references public.users(id) on delete cascade,
  recipient_id      uuid not null references public.users(id) on delete cascade,
  sender_task_id    uuid not null references public.tasks(id) on delete cascade,
  recipient_task_id uuid not null references public.tasks(id) on delete cascade,
  status            text not null default 'pending'
                    check (status in ('pending','accepted','rejected','completed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists task_swaps_sender_idx    on public.task_swaps (sender_id);
create index if not exists task_swaps_recipient_idx on public.task_swaps (recipient_id);

-- ---------------------------------------------------------------------
-- 3. task_completion_requests
-- ---------------------------------------------------------------------
create table if not exists public.task_completion_requests (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  requester_id  uuid not null references public.users(id) on delete cascade,
  task_owner_id uuid not null references public.users(id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending','accepted','rejected')),
  created_at    timestamptz not null default now()
);
create index if not exists tcr_owner_idx     on public.task_completion_requests (task_owner_id);
create index if not exists tcr_requester_idx on public.task_completion_requests (requester_id);

-- ---------------------------------------------------------------------
-- 4. user_reviews  (one review per reviewer, per user, per task)
-- ---------------------------------------------------------------------
create table if not exists public.user_reviews (
  id               uuid primary key default gen_random_uuid(),
  reviewer_id      uuid not null references public.users(id) on delete cascade,
  reviewed_user_id uuid not null references public.users(id) on delete cascade,
  task_id          uuid references public.tasks(id) on delete set null,
  rating           integer not null check (rating between 1 and 5),
  comment          text,
  created_at       timestamptz not null default now(),
  constraint user_reviews_not_self check (reviewer_id <> reviewed_user_id),
  constraint user_reviews_unique unique nulls not distinct (reviewer_id, reviewed_user_id, task_id)
);
create index if not exists user_reviews_reviewed_idx on public.user_reviews (reviewed_user_id);

-- Keep users.average_rating / reviews_count in sync with user_reviews
create or replace function public.refresh_user_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.reviewed_user_id, old.reviewed_user_id);
begin
  update public.users u
     set average_rating = coalesce((select avg(rating)::double precision from public.user_reviews where reviewed_user_id = target), 0),
         reviews_count  = (select count(*) from public.user_reviews where reviewed_user_id = target)
   where u.id = target;
  return null;
end;
$$;

drop trigger if exists user_reviews_refresh_rating on public.user_reviews;
create trigger user_reviews_refresh_rating
after insert or update or delete on public.user_reviews
for each row execute function public.refresh_user_rating();

-- ---------------------------------------------------------------------
-- 5. swap_notifications  (written when a swap is offered)
-- ---------------------------------------------------------------------
create table if not exists public.swap_notifications (
  id                   uuid primary key default gen_random_uuid(),
  swap_id              uuid references public.task_swaps(id) on delete cascade,
  recipient_id         uuid references public.users(id) on delete cascade,
  recipient_email      text,
  recipient_name       text,
  initiator_id         uuid references public.users(id) on delete cascade,
  initiator_name       text,
  action               text,
  sender_task_title    text,
  recipient_task_title text,
  admin_email          text,
  processed            boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. get_total_task_swaps()  -> { "count": n }   (Home page stat)
-- ---------------------------------------------------------------------
create or replace function public.get_total_task_swaps()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object('count', count(*)) from public.task_swaps;
$$;
grant execute on function public.get_total_task_swaps() to anon, authenticated;

-- Let the app's API roles reach the new tables (RLS below still limits rows)
grant select, insert, update, delete on
  public.task_swaps, public.task_completion_requests, public.user_reviews, public.swap_notifications
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Row-level security
-- ---------------------------------------------------------------------
alter table public.task_swaps               enable row level security;
alter table public.task_completion_requests enable row level security;
alter table public.user_reviews             enable row level security;
alter table public.swap_notifications       enable row level security;

-- task_swaps: anyone logged in can read (task lists hide swapped tasks);
-- sender creates; sender or recipient updates.
drop policy if exists "swaps readable by logged-in users" on public.task_swaps;
create policy "swaps readable by logged-in users" on public.task_swaps
  for select to authenticated using (true);
drop policy if exists "sender creates swap" on public.task_swaps;
create policy "sender creates swap" on public.task_swaps
  for insert to authenticated with check (auth.uid() = sender_id);
drop policy if exists "participants update swap" on public.task_swaps;
create policy "participants update swap" on public.task_swaps
  for update to authenticated
  using (auth.uid() in (sender_id, recipient_id))
  with check (auth.uid() in (sender_id, recipient_id));

-- task_completion_requests: readable by logged-in users (leaderboard,
-- profile counts); requester creates; owner or requester updates.
drop policy if exists "completion requests readable" on public.task_completion_requests;
create policy "completion requests readable" on public.task_completion_requests
  for select to authenticated using (true);
drop policy if exists "requester creates completion request" on public.task_completion_requests;
create policy "requester creates completion request" on public.task_completion_requests
  for insert to authenticated with check (auth.uid() = requester_id);
drop policy if exists "owner or requester updates completion request" on public.task_completion_requests;
create policy "owner or requester updates completion request" on public.task_completion_requests
  for update to authenticated
  using (auth.uid() in (task_owner_id, requester_id))
  with check (auth.uid() in (task_owner_id, requester_id));

-- user_reviews: public read; you can only write reviews as yourself.
drop policy if exists "reviews are public" on public.user_reviews;
create policy "reviews are public" on public.user_reviews
  for select using (true);
drop policy if exists "reviewer creates review" on public.user_reviews;
create policy "reviewer creates review" on public.user_reviews
  for insert to authenticated with check (auth.uid() = reviewer_id);

-- swap_notifications: insert-only from the app.
drop policy if exists "initiator creates notification" on public.swap_notifications;
create policy "initiator creates notification" on public.swap_notifications
  for insert to authenticated with check (auth.uid() = initiator_id);

-- tasks: the April policies only let people see OPEN tasks and edit their
-- own. Swaps and completions need more than that.
drop policy if exists "logged-in users can view all tasks" on public.tasks;
create policy "logged-in users can view all tasks" on public.tasks
  for select to authenticated using (true);
drop policy if exists "swap or completion participants update task" on public.tasks;
create policy "swap or completion participants update task" on public.tasks
  for update to authenticated
  using (
    exists (select 1 from public.task_swaps s
            where (s.sender_task_id = tasks.id or s.recipient_task_id = tasks.id)
              and auth.uid() in (s.sender_id, s.recipient_id)
              and s.status in ('pending','accepted','completed'))
    or exists (select 1 from public.task_completion_requests r
               where r.task_id = tasks.id and auth.uid() in (r.requester_id, r.task_owner_id))
  );

-- messages: recipient can mark messages as read.
drop policy if exists "recipient marks messages read" on public.messages;
create policy "recipient marks messages read" on public.messages
  for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- ---------------------------------------------------------------------
-- 8. Realtime (header badges, inbox, swap list, task list)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['messages','tasks','task_swaps'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Realtime UPDATE events need the old row to compare is_read.
alter table public.messages replica identity full;
