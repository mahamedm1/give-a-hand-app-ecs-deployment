import {createClient} from "@supabase/supabase-js";

// Values come from task-helper/.env (restart `npm run dev` after changing it)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in task-helper/.env");
}

// Always fetch fresh data. Supabase's responses don't say they vary by
// Origin, so the browser can otherwise reuse a cached reply from a different
// localhost port and block it as a CORS error.
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
  },
});
export default supabase;
