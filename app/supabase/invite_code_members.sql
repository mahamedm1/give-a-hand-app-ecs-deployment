-- Let every member of a community (not only admins) see its invite code,
-- so members can invite friends. Only admins can still reset it.
-- (Already included in communities.sql; this file updates a database where
-- communities.sql was run before this change.) Safe to run more than once.

create or replace function public.get_invite_code(p_community_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not is_community_member(p_community_id) then
    raise exception 'Only members can see the invite code.';
  end if;
  return (select code from community_invite_codes where community_id = p_community_id);
end;
$$;

-- Make sure every existing community has a code
insert into public.community_invite_codes (community_id, code)
select c.id, public.new_invite_code()
  from public.communities c
 where not exists (select 1 from public.community_invite_codes i where i.community_id = c.id);
