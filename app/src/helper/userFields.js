// The users columns the app is allowed to read. Email and phone number are
// deliberately left out: the database refuses to hand them out (see
// supabase/privacy.sql), so asking for them, or for '*', would fail.
export const PUBLIC_USER_FIELDS =
  'id, display_name, first_name, last_name, city, profile_picture_url, average_rating, reviews_count, skills, created_at';
