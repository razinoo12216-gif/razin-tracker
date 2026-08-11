// api/brief.js — GET endpoint that produces the daily brief.
// GET so it can be pulled by a scheduled job, a phone shortcut, or a browser
// without needing to POST. No Chrome, no client, no credentials on the caller side.
//
//   GET /api/brief            -> { text, usage }   morning brief
//   GET /api/brief?kind=evening
//   GET /api/brief?kind=week
import { runAgent } from '../lib/agentCore.js';

// ADDED 2026-08-10. None of these prompts previously mentioned the knowledge store, so the
// briefs were built from Postgres tables only — which is precisely why Razin kept saying his
// Claude chats and his agent were not communicating. The store was alive (28 Cowork sessions,
// 118 chunks) and the searchKnowledge tool was available; nothing was telling the model to use
// it. Naming example search terms matters: a general "consult the knowledge store" gets skipped.
const KNOWLEDGE = 'Before you write anything, search my knowledge store. My working ' +
  'conversations are distilled into it, and a lot of what is actually live exists there and not ' +
  'in any table — deals in progress, what I promised someone, what I am blocked on. Call ' +
  'searchKnowledge at least THREE times with different terms first. Useful terms: "Primekey", ' +
  '"Royal Orchard", "RASNEST", "IMS", "Escape", "accountant", "E", plus anything the day\'s open ' +
  'tasks point at. If a result names something you have not searched, search that too.\n' +
  'Where the store and the app disagree, the more recent record wins and you say which you used. ' +
  'Where a search comes back empty, say so rather than presenting the app tables as the whole ' +
  'picture.\n\n';

const PROMPTS = {
  morning: KNOWLEDGE +
    'Produce my morning brief for today. Work in this order and keep the whole thing under 250 words:\n' +
    '1. The single most important thing I must do today, and why it is that one.\n' +
    '2. Anything overdue or due today — tasks, statutory filings, commitments, payments.\n' +
    '3. Money: who owes me and is ageing badly, what I owe that is due soon.\n' +
    '4. Discipline: what my logs actually show. If nothing is logged, say so plainly and tell me to log it — do not pretend it is a failure or a success.\n' +
    'Uncomfortable thing first. No greeting, no motivational filler, no sign-off. Use £ and UK dates.',
  evening: KNOWLEDGE +
    'Produce my evening review. Under 180 words:\n' +
    '1. What got closed out today according to my task list.\n' +
    '2. What did NOT move that I said would.\n' +
    '3. One thing to set up tonight so tomorrow starts clean.\n' +
    'Ask me directly whether today\'s discipline is logged. No filler.',
  week: KNOWLEDGE +
    'Produce my weekly review. Under 350 words: trajectory on money, commitments kept vs slipped, ' +
    'discipline logging rate, statutory deadlines inside 60 days, and the one structural change ' +
    'that would compound most over the next 90 days. Be blunt about what is drifting.',
  rasnest:
    // Rewritten 2026-08-08. Two changes: the Irish side is now covered properly by the
    // dedicated E brief, so duplicating it here just made this report long and split
    // Razin's attention. And the old "you have a hard tool cap, be efficient" warning
    // is gone — that was a workaround for a cap problem that no longer bites, and it
    // was making the report thinner than it needed to be.
    'Produce a full UK RASNEST operating report I can take straight into a conversation with my partners.\n\n' +
    'SCOPE — UK ONLY.\n' +
    'This report is about RASNEST Properties Limited: the UK lettings and management business ' +
    '(Bramble Close / Chalfont and the rest of the portfolio). Partners are Jibril, Almir and Saul. ' +
    'This side has NOTHING to do with E.\n' +
    'The Irish operation (Primekey Stays / RASNEST Ireland) has its own dedicated brief on the ' +
    '"Call · E" tab. Do NOT reproduce it here. If something on the Irish side genuinely blocks the UK ' +
    'business, give it ONE line and point me at the E brief. Otherwise leave it out entirely.\n\n' +
    'Never invent a figure. Anything you cannot verify is "UNKNOWN — confirm".\n\n' +
    'Structure it exactly like this:\n' +
    '1. HEADLINE — three lines: where UK RASNEST actually stands, the biggest risk, the biggest opportunity.\n' +
    '2. PORTFOLIO — each property: revenue, management fee rate, current state, open issues.\n' +
    '3. MONEY — fees earned, owed to RASNEST, owed by RASNEST, and any invoice or statement error you ' +
    'can detect. Flag undercharging explicitly — it is the most common way this business leaks.\n' +
    '4. COMPLIANCE & STATUTORY — UK filings with dates and days remaining.\n' +
    '5. DELEGATION BOARD — the single most useful section. For every open item, name who should own it. ' +
    'Jibril is the most operationally reliable (self-employed, flexible, has transport). Saul has said he ' +
    'cannot be heavily involved. Almir is least responsive. Anything not delegated defaults to me. ' +
    'Mark each item KEEP or HAND OFF and say why. Be honest about what I am hoarding that I should not be.\n' +
    '6. ACTIONS THIS WEEK — no limit, ranked by value, each with a named owner and a deadline. ' +
    'Do not truncate this to a round number; list what actually needs doing.\n\n' +
    'Dense, no padding, no preamble. Tables where comparative. Money in £, UK dates.',
};

// The brief takes ~20s to generate, which is uncomfortably close to the 30s ceiling most
// schedulers and fetch clients impose. So we cache each day's brief in agent_memory and
// let a cron warm it before Razin is awake. A cached read comes back in well under a second.
const londonToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

function memKey(kind) { return 'brief:' + kind + ':' + londonToday(); }

async function readCache(env, kind) {
  const r = await fetch(env.url.replace(/\/$/, '') + '/rest/v1/agent_memory?key=eq.' +
    encodeURIComponent(memKey(kind)) + '&select=value&limit=1',
    { headers: { apikey: env.key, Authorization: 'Bearer ' + env.key } });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows.length ? rows[0].value : null;
}

// agent_memory.key has no unique constraint, so upsert-on-conflict is not available.
// Delete-then-insert keeps exactly one cached row per kind per day without needing DDL.
async function writeCache(env, kind, text) {
  const base = env.url.replace(/\/$/, '') + '/rest/v1/agent_memory';
  const H = { apikey: env.key, Authorization: 'Bearer ' + env.key, 'Content-Type': 'application/json' };
  const k = encodeURIComponent(memKey(kind));
  try {
    await fetch(base + '?key=eq.' + k, { method: 'DELETE', headers: H });
    await fetch(base, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ key: memKey(kind), value: text, category: 'brief' }]),
    });
  } catch (e) { /* cache write is best-effort — never fail the brief over it */ }
}

export default async function handler(req, res) {
  const env = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  if (!env.url || !env.key || !env.anthropic) {
    return res.status(500).json({ error: 'Missing env' });
  }
  const kind = String((req.query && req.query.kind) || 'morning').toLowerCase();
  const prompt = PROMPTS[kind];
  if (!prompt) return res.status(400).json({ error: 'kind must be morning, evening or week' });

  const wantsText = req.query && req.query.format === 'text';
  const refresh = req.query && req.query.refresh;

  try {
    if (!refresh) {
      const cached = await readCache(env, kind).catch(() => null);
      if (cached) {
        if (wantsText) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.status(200).send(cached);
        }
        return res.status(200).json({ kind, text: cached, cached: true });
      }
    }

    const out = await runAgent({ messages: [{ role: 'user', content: prompt }], env, readOnly: true, maxTokens: 8000 });

    // NEVER cache a failure. A capped or truncated run once got cached and then served
    // instantly all day, which looks exactly like a working feature that has nothing to say.
    const failed = /^\(stopped|^⚠/.test((out.text || '').trim()) ||
      ['tool_cap', 'turn_cap', 'max_tokens', 'empty'].includes(out.stop_reason);
    if (!failed) await writeCache(env, kind, out.text);
    if (wantsText) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(out.text);
    }
    return res.status(200).json({ kind, text: out.text, cached: false, toolsUsed: out.toolsUsed, usage: out.usage });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'brief failed' });
  }
}
