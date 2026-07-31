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
};

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

  try {
    const out = await runAgent({ messages: [{ role: 'user', content: prompt }], env });
    if (req.query && req.query.format === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(out.text);
    }
    return res.status(200).json({ kind, text: out.text, toolsUsed: out.toolsUsed, usage: out.usage });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'brief failed' });
  }
}
