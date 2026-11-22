-- =====================================================================
-- Privacy: stop the app's API from handing out email and phone numbers.
--
-- Row-level security already decides WHICH users rows a logged-in person
-- can read (all of them, so profiles and search work). This limits WHICH
-- COLUMNS: everyone can read the public profile fields below, nobody can
-- read email / phone_number through the API. (Your own email still shows
-- on your profile page because it comes from your login, not this table.)
--
-- Inserting and updating your own row is unchanged.
-- Safe to run more than once.
-- =====================================================================

revoke select on public.users from anon, authenticated;

grant select (
  id,
  display_name,
  first_name,
  last_name,
  city,
  profile_picture_url,
  average_rating,
  reviews_count,
  created_at
) on public.users to anon, authenticated;

-- With email/phone locked away above, public profile fields can be shown to
-- everyone, including logged-out visitors (poster names on tasks, Find Users).
drop policy if exists "public profiles are readable" on public.users;
create policy "public profiles are readable" on public.users
  for select using (true);
