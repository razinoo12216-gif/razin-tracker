// api/agentUndo.js — reverse a single agent write.
// POST { actionId } -> { ok: true }
// Backs the "undo" button rendered next to every change the agent makes.
import { makeDb, revertAgentAction } from '../lib/audit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Missing SUPABASE_URL / SUPABASE_SERVICE_KEY' });

  const actionId = req.body && req.body.actionId;
  if (!actionId) return res.status(400).json({ error: 'actionId required' });

  try {
    await revertAgentAction(makeDb(url, key), actionId);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'revert failed' });
  }
}
