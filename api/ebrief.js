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

const PROMPT =
  'Generate today\'s call brief for my daily call with my business partner "E". ' +
  'Build it ONLY from real data in my app and knowledge store — never invent a project status, ' +
  'a number, or a commitment. Anything you cannot verify is written "UNKNOWN — confirm".\n\n' +
  'Sections, in this exact order:\n' +
  '1. DECISIONS NEEDED FROM E — max 3. Each: the decision, the cost of delay, my recommended answer. ' +
  'If there are none, write "None — do not manufacture one."\n' +
  '2. PER PROJECT: DONE / BLOCKED / NEXT — max 3 bullets per section per project.\n' +
  '3. WHAT I OWE E — every commitment I made, delivered yes/no, flag anything slipped and how many times.\n' +
  '4. WHAT E OWES ME — every commitment E made, with days overdue. State it flatly.\n' +
  '5. MONEY — cash position, receivables to chase with days overdue, payables due this week.\n' +
  '6. THE UNNAMED RISK — one real risk nobody has raised on a call yet. Blunt. If you cannot see one ' +
  'in the data, say so rather than padding.\n\n' +
  'Close with CALL DISCIPLINE — exactly three lines:\n' +
  'Open with: [the single sentence I should lead the call with]\n' +
  'Do not: [the one thing I am most likely to do badly on this call]\n' +
  'Close with: [the specific confirmation I must get before hanging up]\n\n' +
  'Readable in under 90 seconds. Dense, no padding, no preamble. All money in £, UK dates.';

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
    await store(env, today, out.text);
    return res.status(200).json({ text: out.text, date: today, stored: false, usage: out.usage });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'ebrief failed' });
  }
}
