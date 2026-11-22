-- =====================================================================
-- Communities: groups of people who help each other (a hall, a uni, a
-- street, a mutual-aid group...). Anyone can create one and becomes its
-- admin. Tasks can be posted publicly or to one community; community tasks
-- are only visible to that community's members. Safe to run more than once.
-- Run AFTER missing_tables.sql, privacy.sql, cleanup.sql and swap_rules.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.communities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 3 and 80),
  description  text check (description is null or char_length(description) <= 1000),
  -- how people join: anyone / only emails ending in email_domain / with an invite code
  join_policy  text not null default 'open'
               check (join_policy in ('open', 'email_domain', 'invite_code')),
  email_domain text check (email_domain is null or email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  created_by   uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint communities_domain_needed
    check (join_policy <> 'email_domain' or email_domain is not null)
);
create unique index if not exists communities_name_unique on public.communities (lower(btrim(name)));

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('admin', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members (user_id);

-- Invite codes live in their own table so only admins can ever read them
create table if not exists public.community_invite_codes (
  community_id uuid primary key references public.communities(id) on delete cascade,
  code         text not null
);

-- A task is public when community_id is null, otherwise members-only
alter table public.tasks add column if not exists community_id uuid
  references public.communities(id) on delete cascade;
create index if not exists tasks_community_idx on public.tasks (community_id);

-- ---------------------------------------------------------------------
-- 2. Helper checks (security definer so policies can use them without
--    tripping over community_members' own security rules)
-- ---------------------------------------------------------------------
create or replace function public.is_community_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from community_members where community_id = cid and user_id = auth.uid());
$$;

create or replace function public.is_community_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from community_members
                  where community_id = cid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.new_invite_code()
returns text language sql volatile as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

-- ---------------------------------------------------------------------
-- 3. Creating a community makes you its admin and gives it an invite code
-- ---------------------------------------------------------------------
create or replace function public.on_community_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into community_members (community_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;
  insert into community_invite_codes (community_id, code)
  values (new.id, new_invite_code())
  on conflict do nothing;
  return null;
end;
$$;

drop trigger if exists communities_after_insert on public.communities;
create trigger communities_after_insert
after insert on public.communities
for each row execute function public.on_community_created();

-- A community must always keep at least one admin
create or replace function public.keep_one_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- cascades from deleting the whole community are fine
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from community_members
                      where community_id = old.community_id
                        and role = 'admin'
                        and user_id <> old.user_id) then
    raise exception 'A community needs at least one admin. Make someone else an admin first, or delete the community.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists community_members_keep_admin on public.community_members;
create trigger community_members_keep_admin
before update or delete on public.community_members
for each row execute function public.keep_one_admin();

-- ---------------------------------------------------------------------
-- 4. Joining, and invite codes (the only ways in)
-- ---------------------------------------------------------------------
create or replace function public.join_community(p_community_id uuid, p_code text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  c communities%rowtype;
  my_email text;
begin
  if auth.uid() is null then
    raise exception 'Please log in to join a community.';
  end if;

  select * into c from communities where id = p_community_id;
  if not found then
    raise exception 'Community not found.';
  end if;

  if c.join_policy = 'email_domain' then
    select lower(email) into my_email from auth.users where id = auth.uid();
    if my_email is null
       or not (my_email like '%@' || c.email_domain or my_email like '%.' || c.email_domain) then
      raise exception 'This community is only for people with an @% email address.', c.email_domain;
    end if;
  elsif c.join_policy = 'invite_code' then
    if not exists (select 1 from community_invite_codes
                    where community_id = c.id
                      and upper(btrim(code)) = upper(btrim(coalesce(p_code, '')))) then
      raise exception 'That invite code is not right. Ask the community admin for the current code.';
    end if;
  end if;

  insert into community_members (community_id, user_id, role)
  values (c.id, auth.uid(), 'member')
  on conflict do nothing;
end;
$$;

-- Members (not just admins) can see the code so anyone inside can invite friends
create or replace function public.get_invite_code(p_community_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not is_community_member(p_community_id) then
    raise exception 'Only members can see the invite code.';
  end if;
  return (select code from community_invite_codes where community_id = p_community_id);
end;
$$;

create or replace function public.reset_invite_code(p_community_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  fresh text := new_invite_code();
begin
  if not is_community_admin(p_community_id) then
    raise exception 'Only admins can change the invite code.';
  end if;
  insert into community_invite_codes (community_id, code) values (p_community_id, fresh)
  on conflict (community_id) do update set code = excluded.code;
  return fresh;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Who can do what
-- ---------------------------------------------------------------------
alter table public.communities            enable row level security;
alter table public.community_members      enable row level security;
alter table public.community_invite_codes enable row level security;  -- no policies: functions only

grant select on public.communities to anon, authenticated;
grant insert, update, delete on public.communities to authenticated;
grant select, update, delete on public.community_members to authenticated;
revoke all on public.community_invite_codes from anon, authenticated;
grant execute on function public.join_community(uuid, text) to authenticated;
grant execute on function public.get_invite_code(uuid)      to authenticated;
grant execute on function public.reset_invite_code(uuid)    to authenticated;
grant execute on function public.is_community_member(uuid)  to anon, authenticated;
grant execute on function public.is_community_admin(uuid)   to anon, authenticated;

-- communities: anyone can browse; you create as yourself; admins edit/delete
drop policy if exists "communities are browsable" on public.communities;
create policy "communities are browsable" on public.communities
  for select using (true);
drop policy if exists "create community as yourself" on public.communities;
create policy "create community as yourself" on public.communities
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "admins edit community" on public.communities;
create policy "admins edit community" on public.communities
  for update to authenticated using (is_community_admin(id)) with check (is_community_admin(id));
drop policy if exists "admins delete community" on public.communities;
create policy "admins delete community" on public.communities
  for delete to authenticated using (is_community_admin(id));

-- members: logged-in users can see who's in a community; joining only via
-- join_community(); admins change roles; you can leave / admins can remove
drop policy if exists "members are visible" on public.community_members;
create policy "members are visible" on public.community_members
  for select to authenticated using (true);
drop policy if exists "admins change roles" on public.community_members;
create policy "admins change roles" on public.community_members
  for update to authenticated
  using (is_community_admin(community_id)) with check (is_community_admin(community_id));
drop policy if exists "leave or remove members" on public.community_members;
create policy "leave or remove members" on public.community_members
  for delete to authenticated
  using (user_id = auth.uid() or is_community_admin(community_id));

-- ---------------------------------------------------------------------
-- 6. Tasks: public vs community-only
-- ---------------------------------------------------------------------
-- Replace the old "see all tasks" rules with visibility-aware ones
drop policy if exists "Anyone can view open tasks" on public.tasks;
drop policy if exists "logged-in users can view all tasks" on public.tasks;
drop policy if exists "tasks visible to the right people" on public.tasks;
create policy "tasks visible to the right people" on public.tasks
  for select using (
    -- public tasks: open ones for everyone, all of them for logged-in users
    (community_id is null and (status = 'open' or auth.uid() is not null))
    -- your own tasks
    or user_id = auth.uid()
    -- community tasks: members only
    or (community_id is not null and is_community_member(community_id))
    -- tasks you're swapping on, even if you've since left the community
    or exists (select 1 from task_swaps s
                where (s.sender_task_id = tasks.id or s.recipient_task_id = tasks.id)
                  and auth.uid() in (s.sender_id, s.recipient_id))
  );

-- You can only post to (or move a task into) a community you belong to
drop policy if exists "post only to your communities" on public.tasks;
create policy "post only to your communities" on public.tasks
  as restrictive for insert to authenticated
  with check (community_id is null or is_community_member(community_id));
-- Moving an existing task into a community also needs membership (checked
-- only when community_id actually changes, so finishing a task after
-- leaving its community still works)
drop policy if exists "move only into your communities" on public.tasks;
create or replace function public.check_task_community_move()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.community_id is distinct from old.community_id
     and new.community_id is not null
     and auth.uid() is not null
     and not is_community_member(new.community_id) then
    raise exception 'You can only post tasks to communities you have joined.';
  end if;
  return new;
end;
$$;
drop trigger if exists tasks_check_community_move on public.tasks;
create trigger tasks_check_community_move
before update of community_id on public.tasks
for each row execute function public.check_task_community_move();

-- Community admins can remove posts from their community
drop policy if exists "admins remove community tasks" on public.tasks;
create policy "admins remove community tasks" on public.tasks
  for delete to authenticated
  using (community_id is not null and is_community_admin(community_id));
