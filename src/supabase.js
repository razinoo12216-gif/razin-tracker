// ─────────────────────────────────────────────────────────────
// PASTE YOUR SUPABASE KEYS BELOW
// Get them from: Supabase → Project Settings → API
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://umfipzywobtfbvdhwszo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RD0zD0yTfubMIbV7IL7WiA_GYh8-JZ5';

// ─────────────────────────────────────────────────────────────
// Do not edit below this line.
// ─────────────────────────────────────────────────────────────

const isPlaceholder =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL.startsWith('YOUR_') ||
  SUPABASE_ANON_KEY.startsWith('YOUR_');

window.SUPABASE_CONFIGURED = !isPlaceholder;
window.db = isPlaceholder
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
