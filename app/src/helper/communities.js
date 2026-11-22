import supabase from './supabaseClient';

export const JOIN_POLICY_LABELS = {
  open: 'Anyone can join',
  email_domain: 'Verified email required',
  invite_code: 'Invite code required',
};

/** Communities the given user belongs to: [{ id, name, role }] sorted by name. */
export async function fetchMyCommunities(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('community_members')
    .select('role, communities(id, name, join_policy, email_domain)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || [])
    .filter(row => row.communities)
    .map(row => ({ ...row.communities, role: row.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Supabase errors from our database functions carry a readable message. */
export const friendlyError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.message || fallback;
