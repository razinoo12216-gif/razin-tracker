// api/nudge.js — generates a short, sharp push notification from live state and sends it.
// Called by GitHub Actions cron (not Vercel cron, to avoid plan cron limits).
//
//   GET /api/nudge?kind=morning   05:05 UTC  (06:05 BST)  — the day's one thing + what's overdue
//   GET /api/nudge?kind=midday    12:00 UTC  (13:00 BST)  — what's actually moved
//   GET /api/nudge?kind=evening   20:00 UTC  (21:00 BST)  — log the day, set tomorrow
//   &dry=1 to generate without sending.
//
// Push bodies must be SHORT — iOS truncates around 150-180 chars. The agent is told to
// write a notification, not a report. Full detail lives in the Brief tab.

import { runAgent } from '../lib/agentCore.js';

// REWRITTEN 2026-08-08. These used to be statements that told Razin what he had
// failed to log. He is out working and driving all day and is never going to stop to
// tick a box — a system that depends on that has already failed. So the nudges now
// ASK. His reply becomes the log, captured by the agent in chat. One question, five
// words to answer, one-handed, at a red light.
const PROMPTS = {
  morning:
    'Write a PUSH NOTIFICATION for Razin at 6am. Hard limit 160 characters. No greeting, no markdown, no emoji.\n' +
    'Format: ONE line naming the single most important WORK or MONEY thing today (a person to chase, a deal, ' +
    'a filing, a decision waiting on someone), then ONE short question he can answer in five words while driving ' +
    '— e.g. "Gym before 9 or after?".\n' +
    'Work first, discipline second. Never lead with what he failed to log. ' +
    'Reply with the notification text and NOTHING else — no preamble, no restating the brief, no label. ' +
    'Your entire reply is what appears on his lock screen.',
  midday:
    'Write a PUSH NOTIFICATION for Razin at 1pm. Hard limit 160 characters. No greeting, no markdown, no emoji.\n' +
    'Format: ONE line on the highest-value thing still unmoved today (money, a person, a deadline), then ONE ' +
    'short question — "Eaten yet, what?" or "Did E reply?" or "Gym still happening?".\n' +
    'He is mid-day and busy. Do not list. Do not scold. Ask something that helps him decide the next move. ' +
    'Reply with the notification text and NOTHING else — no preamble, no restating the brief, no label. ' +
    'Your entire reply is what appears on his lock screen.',
  evening:
    'Write a PUSH NOTIFICATION for Razin at 9pm. Hard limit 160 characters. No greeting, no markdown, no emoji.\n' +
    'Format: ONE line on what is genuinely still open for tomorrow (work or money), then ONE closing question ' +
    '— "Train today?" or "What moved today?" — so he can answer in a few words and have it logged for him.\n' +
    'Never present an empty log as failure; he simply has not told you yet, which is what the question is for. ' +
    'Reply with the notification text and NOTHING else — no preamble, no restating the brief, no label. ' +
    'Your entire reply is what appears on his lock screen.',
};

const TITLES = { morning: '12 World — today', midday: '12 World — midday check', evening: '12 World — close the day' };

export default async function handler(req, res) {
  const env = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  if (!env.url || !env.key || !env.anthropic) return res.status(500).json({ error: 'Missing env' });

  const kind = String((req.query && req.query.kind) || 'morning').toLowerCase();
  const prompt = PROMPTS[kind];
  if (!prompt) return res.status(400).json({ error: 'kind must be morning, midday or evening' });

  try {
    const out = await runAgent({ messages: [{ role: 'user', content: prompt }], env, readOnly: true, cheap: true });

    // Strip anything that looks like formatting and keep it notification-length.
    // Haiku (used here since 2026-08-05 for cost) tends to narrate its own brief
    // before answering — "One blunt line. Midday push: ..." — so strip the echo
    // and keep only what comes after the last scaffolding marker.
    let body = (out.text || '')
      .replace(/[*_`#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const echo = body.match(/^.*?\b(?:morning|midday|evening)\s+(?:push|nudge)\s*[:\-—]\s*/i);
    if (echo) body = body.slice(echo[0].length).trim();
    body = body
      .replace(/^(?:one\s+blunt\s+line|output only the notification text|notification)\s*[.:\-—]\s*/i, '')
      .trim();
    if (body.length > 220) body = body.slice(0, 217).trimEnd() + '…';
    if (!body) return res.status(500).json({ error: 'empty nudge' });

    if (req.query && req.query.dry) {
      return res.status(200).json({ kind, body, sent: 0, dry: true });
    }

    // Reuse the existing push pipeline rather than duplicating VAPID logic.
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const r = await fetch(`${proto}://${host}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: TITLES[kind], body, url: '/?tab=agent&sub=brief', tag: 'nudge-' + kind }),
    });
    const push = await r.json().catch(() => ({}));

    return res.status(200).json({ kind, body, push });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'nudge failed' });
  }
}
