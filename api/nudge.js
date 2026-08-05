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

const PROMPTS = {
  morning:
    'Write a PUSH NOTIFICATION for Razin, right now, first thing in his morning. ' +
    'Hard limit 160 characters. No greeting, no sign-off, no markdown, no emoji. ' +
    'Name the single most important thing he must do today and the count of what is overdue. ' +
    'Be specific — a name, a number, a company. Uncomfortable thing first. ' +
    'Output ONLY the notification text.',
  midday:
    'Write a PUSH NOTIFICATION for Razin at midday. Hard limit 160 characters. ' +
    'No greeting, no markdown, no emoji. Check what has actually been ticked off today versus what was due. ' +
    'If nothing has moved, say so bluntly and name the one task to do next. ' +
    'If he has logged nothing in his discipline tracker today, call it. Output ONLY the notification text.',
  evening:
    'Write a PUSH NOTIFICATION for Razin at 9pm. Hard limit 160 characters. ' +
    'No greeting, no markdown, no emoji. State what closed today and what did not. ' +
    'Push him to log today (wake, fajr, gym, PMO, sleep, prayers) and to set tomorrow up now. ' +
    'Output ONLY the notification text.',
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
    const out = await runAgent({ messages: [{ role: 'user', content: prompt }], env, readOnly: true });

    // Strip anything that looks like formatting and keep it notification-length.
    let body = (out.text || '')
      .replace(/[*_`#>]/g, '')
      .replace(/\s+/g, ' ')
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
