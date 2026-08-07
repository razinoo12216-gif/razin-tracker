// api/ebrief.js — the daily call brief for Razin's calls with his partner "E".
//
//   GET  /api/ebrief             -> { text, date }   latest stored brief (instant)
//   GET  /api/ebrief?generate=1  -> generates a fresh one from live state, stores it, returns it
//   POST /api/ebrief { text }    -> store a brief (used by the Cowork daily-e-brief task,
//                                   which has access to OPS-MASTER.md and CALL-LOG.md)
//
// Stored in agent_memory under key `ebrief:<YYYY-MM-DD>`. That table has no unique
// constraint on `key`, so writes are delete-then-insert rather than upsert.

import { runAgent } from '../lib/agentCore.js';

const londonToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

// PROMPT rewritten 2026-08-07 to Razin's spec. The previous version pulled his
// whole financial position and his personal debts into a brief for a call with a
// business partner, and capped decisions at 3. Both were wrong.
//
// The governing rule now: E SCOPE. This brief covers the ventures Razin runs WITH
// E and nothing else. Everything outside that scope is noise on this call.
const E_SCOPE =
  'E SCOPE — WHAT THIS BRIEF IS ABOUT.\n' +
  'E is Razin\'s senior business partner. This brief covers ONLY the ventures they run together:\n' +
  '- Primekey Stays / RASNEST Ireland (the Irish operation) — IN SCOPE.\n' +
  '- Royal Orchard — IN SCOPE. This is a NEW company being set up. It is NOT the shelf company.\n' +
  '- Any project where E is named as a decision-maker, funder or blocker in the data.\n\n' +
  'EXPLICITLY OUT OF SCOPE — never include these, even when the data is sitting right there:\n' +
  '- RASNEST UK / RASNEST Properties. Different venture, partners Jibril, Almir and Saul. ' +
  'E happens to be landlord of one UK house; that does NOT make UK RASNEST an E topic.\n' +
  '- Razin\'s overall cash position, total debt, income and spend. Not E\'s business.\n' +
  '- The "BSK" debt line. That is a personal balance being cleared automatically with every ' +
  'invoice. It is settled business, not a live call topic. Never surface it.\n' +
  '- Receivables, payables and debtors unrelated to the Irish operation.\n' +
  '- IMS Trading, Escape Logistics, the other Raz companies, gym, personal discipline.\n' +
  '- The shelf company purchase — that belongs under Raz Companies, NOT under Royal Orchard.\n\n' +
  'If a section has nothing IN SCOPE to report, write "Nothing this week." Do NOT pad it with ' +
  'out-of-scope material to make the brief look fuller. A short honest brief beats a padded one.\n\n';

const PROMPT = E_SCOPE +
  'Generate today\'s brief for my call with E. Build it ONLY from real data in my app and ' +
  'knowledge store — never invent a project status, a number, or a commitment. Anything you ' +
  'cannot verify is written "UNKNOWN — confirm".\n\n' +
  'Sections, in this exact order:\n\n' +
  '1. DECISIONS NEEDED FROM E — NO LIMIT. List every open decision that is genuinely waiting ' +
  'on E, however many there are. This is the core of the brief and the reason the app exists — ' +
  'do not truncate it. Order by cost of delay, worst first. Each one: the decision, what it is ' +
  'blocking, how long it has been waiting, and my recommended answer. If there are genuinely ' +
  'none, write "None — do not manufacture one."\n\n' +
  '2. PER PROJECT: DONE / BLOCKED / NEXT — in-scope projects only. Max 3 bullets per heading ' +
  'per project. Skip any project with no movement rather than writing filler.\n\n' +
  '3. OPEN LOOPS BETWEEN US — promises and deliverables only, both directions: what I said I ' +
  'would do for E, and what E said he would do for me, with days outstanding and a flag on ' +
  'anything that has slipped more than once. This means COMMITMENTS AND ACTIONS ONLY. It does ' +
  'NOT mean money owed — no debt balances, no invoices, no BSK. If the commitments table is ' +
  'empty, say "Nothing logged — this is the gap" in one line and move on.\n\n' +
  '4. THE UNNAMED RISK — one real risk inside the E scope that nobody has raised on a call yet. ' +
  'Blunt. Statutory clocks, unconfirmed registrations and undated commitments all count. If you ' +
  'cannot see one in the data, say so rather than padding.\n\n' +
  'Close with CALL DISCIPLINE — exactly three lines:\n' +
  'Open with: [the single sentence I should lead the call with]\n' +
  'Do not: [the one thing I am most likely to do badly on this call]\n' +
  'Close with: [the specific confirmation I must get before hanging up]\n\n' +
  'Dense, no padding, no preamble. All money in £ (Irish figures in €), UK dates.';

function rest(env, path, init = {}) {
  return fetch(env.url.replace(/\/$/, '') + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey: env.key, Authorization: 'Bearer ' + env.key,
      'Content-Type': 'application/json', ...(init.headers || {}),
    },
  });
}

async function store(env, date, text) {
  const k = encodeURIComponent('ebrief:' + date);
  try {
    await rest(env, 'agent_memory?key=eq.' + k, { method: 'DELETE' });
    await rest(env, 'agent_memory', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ key: 'ebrief:' + date, value: text, category: 'ebrief' }]),
    });
  } catch (e) { /* best-effort */ }
}

export default async function handler(req, res) {
  const env = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  if (!env.url || !env.key) return res.status(500).json({ error: 'Missing env' });
  const today = londonToday();

  try {
    if (req.method === 'POST') {
      const text = req.body && req.body.text;
      if (!text) return res.status(400).json({ error: 'text required' });
      const date = (req.body && req.body.date) || today;
      await store(env, date, String(text).slice(0, 40000));
      return res.status(200).json({ ok: true, date });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (!(req.query && req.query.generate)) {
      // Return the most recent stored brief, today's or the latest before it.
      const r = await rest(env, 'agent_memory?category=eq.ebrief&select=key,value&order=key.desc&limit=1');
      if (r.ok) {
        const rows = await r.json();
        if (rows.length) {
          return res.status(200).json({ text: rows[0].value, date: (rows[0].key || '').split(':')[1] || '', stored: true });
        }
      }
      return res.status(200).json({ text: '', date: '', stored: false });
    }

    if (!env.anthropic) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
    const out = await runAgent({ messages: [{ role: 'user', content: PROMPT }], env, readOnly: true });

    // NEVER CACHE A FAILURE. brief.js has had this guard for a while; ebrief.js
    // did not, and on 2026-08-05 that let a broken 456-char reply get stored and
    // then served instantly all day — looking exactly like a working feature
    // with nothing to say. A real E brief is thousands of characters.
    const txt = (out.text || '').trim();
    const failed =
      /^\(stopped|^⚠/.test(txt) ||
      ['tool_cap', 'turn_cap', 'max_tokens', 'empty'].includes(out.stop_reason) ||
      txt.length < 400;
    if (!failed) await store(env, today, out.text);

    return res.status(200).json({
      text: out.text, date: today, stored: !failed, cached: !failed,
      degraded: failed || undefined, stop_reason: out.stop_reason, usage: out.usage,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'ebrief failed' });
  }
}
