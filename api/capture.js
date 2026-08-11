// api/capture.js — one-line capture from Razin's phone.
//
//   POST { text: "gym done, fajr on time, told E I'd send the docs Tuesday" }
//     -> { text, actions, writes, usage }
//
// Why this exists (2026-08-10): the Agent Chat tab was removed, and with it the only route
// anything had into op_daily_logs / commitments / tasks. Razin will not sit in a chat thread —
// he is driving, working, out. This is a single text field and a Send button. He types a
// fragment, it becomes rows, he gets one line back. Then the briefs can actually see him.
//
// Deliberately NOT a chat: no history is accepted, so there is no thread to maintain and no
// way for this to grow into the thing that just got deleted. One fragment in, one receipt out.
//
// Runs on Haiku (cheap: true) with a 1024-token cap. Capture is classification plus a couple of
// tool calls — it does not need Sonnet, and the 4096-token blowout that killed the chat tab is
// structurally impossible at this size. ~£0.001 a call.
//
// Writes go through the same auditedWrite -> verifyActions -> receipt path as everything else,
// so every row comes back verified out of Postgres and is undoable via /api/agentUndo.
import { runAgent } from '../lib/agentCore.js';

const MAX_LEN = 1500;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const env = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  if (!env.url || !env.key || !env.anthropic) {
    return res.status(500).json({ error: 'Missing env (SUPABASE_URL / SUPABASE_SERVICE_KEY / ANTHROPIC_API_KEY)' });
  }

  const raw = (req.body && (req.body.text || req.body.note)) || '';
  const text = String(raw).trim().slice(0, MAX_LEN);
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const out = await runAgent({
      messages: [{ role: 'user', content: text }],
      env,
      mode: 'capture',
      cheap: true,
      maxTokens: 1024,
    });

    // Nothing written is a real outcome, not an error — but it must never look like a success.
    // The UI keys off wrote:false to keep his text in the box so a retry costs him no retyping.
    const wrote = !!(out.writes && out.writes.verified);
    return res.status(200).json({ ...out, wrote });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'capture error' });
  }
}
