-- =====================================================================
-- Launch features: skills, editable profiles, account deletion,
-- report/block with a site-admin inbox, and email notifications.
-- Run AFTER communities.sql. Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profile additions
-- ---------------------------------------------------------------------
-- What a person can help with (uses the same names as task categories)
alter table public.users add column if not exists skills text[] not null default '{}';
-- Whether to email this person about offers and messages (private)
alter table public.users add column if not exists email_notifications boolean not null default true;

-- Skills are public profile information
grant select (skills) on public.users to anon, authenticated;

-- Your own private details (email, phone, email setting) - only ever yourself
create or replace function public.get_my_private_details()
returns table (email text, phone_number text, email_notifications boolean)
language sql stable security definer set search_path = public as $$
  select u.email, u.phone_number, u.email_notifications
    from users u
   where u.id = auth.uid();
$$;
grant execute on function public.get_my_private_details() to authenticated;

-- Nobody can change someone else's profile, and you can't fake your rating
-- (average_rating / reviews_count are kept up to date by the database)
create or replace function public.protect_user_columns()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 and auth.uid() is not null then
    new.id := old.id;
    new.average_rating := old.average_rating;
    new.reviews_count := old.reviews_count;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
drop trigger if exists users_protect_columns on public.users;
create trigger users_protect_columns
before update on public.users
for each row execute function public.protect_user_columns();

-- ---------------------------------------------------------------------
-- 2. Communities survive their creator leaving or deleting their account
-- ---------------------------------------------------------------------
alter table public.communities alter column created_by drop not null;
alter table public.communities drop constraint if exists communities_created_by_fkey;
alter table public.communities
  add constraint communities_created_by_fkey
  foreign key (created_by) references public.users(id) on delete set null;

-- ---------------------------------------------------------------------
-- 3. Site admins (you), reports and blocks
-- ---------------------------------------------------------------------
-- Add yourself after running this file:
--   insert into public.site_admins (user_id)
--   select id from auth.users where email = 'YOUR-EMAIL';
create table if not exists public.site_admins (
  user_id uuid primary key references public.users(id) on delete cascade
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from site_admins where user_id = auth.uid());
$$;
grant execute on function public.is_site_admin() to anon, authenticated;

create table if not exists public.user_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid references public.users(id) on delete set null,
  reported_user_id uuid references public.users(id) on delete cascade,
  task_id          uuid references public.tasks(id) on delete set null,
  reason           text not null check (reason in
                     ('harassment', 'unsafe', 'scam', 'inappropriate', 'spam', 'no_show', 'other', 'contact')),
  details          text check (details is null or char_length(details) <= 2000),
  status           text not null default 'open' check (status in ('open', 'resolved')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);
create index if not exists user_reports_status_idx on public.user_reports (status, created_at desc);

alter table public.user_reports enable row level security;
grant select, insert, update on public.user_reports to authenticated;

drop policy if exists "report as yourself" on public.user_reports;
create policy "report as yourself" on public.user_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and (reported_user_id is null or reported_user_id <> auth.uid()));
drop policy if exists "see your own reports" on public.user_reports;
create policy "see your own reports" on public.user_reports
  for select to authenticated using (reporter_id = auth.uid() or is_site_admin());
drop policy if exists "site admins resolve reports" on public.user_reports;
create policy "site admins resolve reports" on public.user_reports
  for update to authenticated using (is_site_admin()) with check (is_site_admin());

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
grant select, insert, delete on public.user_blocks to authenticated;

drop policy if exists "manage your own blocks" on public.user_blocks;
create policy "manage your own blocks" on public.user_blocks
  for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- True if either person has blocked the other
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks
                  where (blocker_id = a and blocked_id = b)
                     or (blocker_id = b and blocked_id = a));
$$;

-- Blocked people can't message you or send you swap offers
drop policy if exists "no messages between blocked users" on public.messages;
create policy "no messages between blocked users" on public.messages
  as restrictive for insert to authenticated
  with check (not is_blocked_between(sender_id, recipient_id));
drop policy if exists "no swaps between blocked users" on public.task_swaps;
create policy "no swaps between blocked users" on public.task_swaps
  as restrictive for insert to authenticated
  with check (not is_blocked_between(sender_id, recipient_id));

-- ---------------------------------------------------------------------
-- 4. Delete my account (UK GDPR right to erasure)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c record;
  successor uuid;
begin
  if me is null then
    raise exception 'Please log in first.';
  end if;

  -- Call off active swaps so the other person's task reopens
  update task_swaps set status = 'cancelled'
   where status = 'accepted' and me in (sender_id, recipient_id);

  -- Hand over communities where I'm the only admin (or delete empty ones)
  for c in
    select m.community_id from community_members m
     where m.user_id = me and m.role = 'admin'
       and not exists (select 1 from community_members o
                        where o.community_id = m.community_id and o.role = 'admin' and o.user_id <> me)
  loop
    select user_id into successor from community_members
     where community_id = c.community_id and user_id <> me
     order by joined_at limit 1;
    if successor is null then
      delete from communities where id = c.community_id;
    else
      update community_members set role = 'admin'
       where community_id = c.community_id and user_id = successor;
    end if;
  end loop;

  -- Messages may point at my tasks; keep the messages, drop the link
  update messages set task_id = null
   where task_id in (select id from tasks where user_id = me);

  -- (Profile picture files are removed by the app through the Storage API
  --  just before calling this, since Supabase blocks deleting them via SQL.)

  -- Deleting the login removes the profile and everything linked to it
  delete from auth.users where id = me;
end;
$$;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Email notifications (via Brevo's email API, sent from the database)
--
-- One-time setup in the Supabase SQL editor (values stay encrypted in Vault,
-- never in the app's code):
--   select vault.create_secret('xkeysib-...your Brevo API key...', 'brevo_api_key');
--   select vault.create_secret('you@example.com', 'notification_sender_email');
--   select vault.create_secret('http://localhost:5173', 'app_url');
-- Until those exist, nothing is sent and nothing breaks.
-- ---------------------------------------------------------------------
create extension if not exists pg_net;

create or replace function public.app_secret(secret_name text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  value text;
begin
  begin
    select decrypted_secret into value from vault.decrypted_secrets where name = secret_name limit 1;
  exception when others then
    value := null;  -- Vault not available
  end;
  return value;
end;
$$;
revoke all on function public.app_secret(text) from public, anon, authenticated;

create or replace function public.send_notification_email(
  to_user uuid, subject text, heading text, body_text text, link_path text)
returns void language plpgsql security definer set search_path = public as $$
declare
  api_key   text := app_secret('brevo_api_key');
  sender    text := app_secret('notification_sender_email');
  app_url   text := coalesce(app_secret('app_url'), 'http://localhost:5173');
  recipient record;
  html      text;
begin
  if api_key is null or sender is null then
    return;  -- not configured yet
  end if;

  select u.display_name, au.email, u.email_notifications
    into recipient
    from users u join auth.users au on au.id = u.id
   where u.id = to_user;
  if recipient.email is null or not recipient.email_notifications then
    return;
  end if;

  html := format(
    '<div style="font-family:Arial,sans-serif;max-width:520px">'
    '<h2 style="color:#f97316">%s</h2><p>Hi %s,</p><p>%s</p>'
    '<p><a href="%s%s" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open Give a Hand</a></p>'
    '<p style="color:#888;font-size:12px">You can turn these emails off on your profile page.</p></div>',
    heading, coalesce(recipient.display_name, 'there'), body_text, app_url, link_path);

  perform net.http_post(
    url     := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', api_key, 'content-type', 'application/json', 'accept', 'application/json'),
    body    := jsonb_build_object(
                 'sender', jsonb_build_object('name', 'Give a Hand', 'email', sender),
                 'to', jsonb_build_array(jsonb_build_object('email', recipient.email)),
                 'subject', subject,
                 'htmlContent', html));
exception when others then
  -- An email problem must never stop the swap or message from saving
  raise warning 'notification email failed: %', sqlerrm;
end;
$$;
revoke all on function public.send_notification_email(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.notify_on_swap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    select display_name into other_name from users where id = new.sender_id;
    perform send_notification_email(new.recipient_id,
      'New swap offer on Give a Hand', 'You have a new swap offer',
      format('%s would like to swap tasks with you.', coalesce(other_name, 'Someone')),
      '/swap-requests');
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    select display_name into other_name from users where id = new.recipient_id;
    perform send_notification_email(new.sender_id,
      'Your swap offer was accepted', 'Swap accepted!',
      format('%s accepted your swap offer. Message them to arrange the details.', coalesce(other_name, 'Someone')),
      '/swap-requests');
  end if;
  return null;
end;
$$;
drop trigger if exists task_swaps_notify on public.task_swaps;
create trigger task_swaps_notify
after insert or update of status on public.task_swaps
for each row execute function public.notify_on_swap();

create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sender_name text;
begin
  -- At most one email per conversation every 15 minutes
  if exists (select 1 from messages
              where sender_id = new.sender_id and recipient_id = new.recipient_id
                and id <> new.id and created_at > now() - interval '15 minutes') then
    return null;
  end if;
  select display_name into sender_name from users where id = new.sender_id;
  perform send_notification_email(new.recipient_id,
    'New message on Give a Hand', 'You have a new message',
    format('%s sent you a message.', coalesce(sender_name, 'Someone')),
    '/inbox');
  return null;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
after insert on public.messages
for each row execute function public.notify_on_message();
