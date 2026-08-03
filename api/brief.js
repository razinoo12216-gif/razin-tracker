// api/brief.js — GET endpoint that produces the daily brief.
// GET so it can be pulled by a scheduled job, a phone shortcut, or a browser
// without needing to POST. No Chrome, no client, no credentials on the caller side.
//
//   GET /api/brief            -> { text, usage }   morning brief
//   GET /api/brief?kind=evening
//   GET /api/brief?kind=week
import { runAgent } from '../lib/agentCore.js';

const PROMPTS = {
  morning:
    'Produce my morning brief for today. Work in this order and keep the whole thing under 250 words:\n' +
    '1. The single most important thing I must do today, and why it is that one.\n' +
    '2. Anything overdue or due today — tasks, statutory filings, commitments, payments.\n' +
    '3. Money: who owes me and is ageing badly, what I owe that is due soon.\n' +
    '4. Discipline: what my logs actually show. If nothing is logged, say so plainly and tell me to log it — do not pretend it is a failure or a success.\n' +
    'Uncomfortable thing first. No greeting, no motivational filler, no sign-off. Use £ and UK dates.',
  evening:
    'Produce my evening review. Under 180 words:\n' +
    '1. What got closed out today according to my task list.\n' +
    '2. What did NOT move that I said would.\n' +
    '3. One thing to set up tonight so tomorrow starts clean.\n' +
    'Ask me directly whether today\'s discipline is logged. No filler.',
  week:
    'Produce my weekly review. Under 350 words: trajectory on money, commitments kept vs slipped, ' +
    'discipline logging rate, statutory deadlines inside 60 days, and the one structural change ' +
    'that would compound most over the next 90 days. Be blunt about what is drifting.',
  rasnest:
    'Produce a full RASNEST operating report I can take straight into a conversation with my partners.\n\n' +
    'CRITICAL — keep the two sides separate and never merge them:\n' +
    '- UK RASNEST (RASNEST Properties Limited — Bramble Close/Chalfont, UK lettings and management). ' +
    'Partners are Jibril, Almir and Saul. This side has NOTHING to do with E.\n' +
    '- IRISH RASNEST (Primekey Stays and the Irish entities). This side IS the venture with E.\n\n' +
    'BE EFFICIENT WITH TOOLS — you have a hard cap. Plan: ONE searchKnowledge for "RASNEST", ONE for ' +
    '"Primekey Ireland", ONE listCompanies, ONE listTasks, and readTable on projects/debts with narrow ' +
    'columns. That is enough. Do not run a separate search per property or per person. If something is ' +
    'still missing after that, write "UNKNOWN — confirm" and move on rather than burning calls hunting.\n' +
    'Never invent a figure.\n\n' +
    'Structure it exactly like this:\n' +
    '1. HEADLINE — three lines: where RASNEST actually stands, the biggest risk, the biggest opportunity.\n' +
    '2. PORTFOLIO — each property: revenue, management fee rate, current state, open issues.\n' +
    '3. MONEY — fees earned, anything owed to RASNEST, anything RASNEST owes, and any invoice or ' +
    'statement error you can detect. Flag undercharging explicitly.\n' +
    '4. COMPLIANCE & STATUTORY — UK and Irish, with dates and days remaining. Separate the two clearly.\n' +
    '5. DELEGATION BOARD — the single most useful section. For every open item, name who should own it ' +
    '(Jibril is the most operationally reliable — self-employed, flexible, has transport; Saul has said ' +
    'he cannot be heavily involved; Almir is least responsive; anything I have not delegated defaults to me). ' +
    'Mark each item KEEP or HAND OFF and say why. Be honest about what I am hoarding that I should not be.\n' +
    '6. IRELAND / E — status of the Irish side only, and what needs raising with E.\n' +
    '7. TOP 5 ACTIONS THIS WEEK — ranked, each with an owner and a deadline.\n\n' +
    'Dense, no padding, no preamble. Tables where comparative. All UK money in £, Irish in €. UK dates.',
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

    const out = await runAgent({ messages: [{ role: 'user', content: prompt }], env });

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
