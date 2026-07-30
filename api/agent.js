// api/agent.js — Operator Agent chat endpoint (Phase 2: READ-ONLY).
// POST { messages: [{role, content}] } -> { text, toolsUsed, usage }
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY (all already set in Vercel).
import { runAgent } from '../lib/agentCore.js';

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
  const messages = (req.body && req.body.messages) || [];
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages required' });
  try {
    const out = await runAgent({ messages: messages.slice(-20), env });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'agent error' });
  }
}
