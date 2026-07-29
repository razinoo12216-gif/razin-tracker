// lib/audit.js — Operator Agent audit trail + revert.
// EVERY agent write goes through auditedWrite(): an agent_actions row is recorded
// BEFORE the target mutation is applied, capturing full before/after state.
// revertAgentAction() restores before_json. Used by the agent core (server-side).
//
// `db` is a thin Supabase-REST client (see makeDb) so the same code is unit-testable
// against an in-memory mock.

export function makeDb(url, serviceKey) {
  const base = url.replace(/\/$/, '') + '/rest/v1/';
  const H = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };
  return {
    async selectOne(table, id) {
      const r = await fetch(base + table + '?id=eq.' + encodeURIComponent(id) + '&limit=1', { headers: H });
      if (!r.ok) throw new Error('selectOne ' + table + ' ' + r.status);
      const rows = await r.json();
      return rows[0] || null;
    },
    async insert(table, row) {
      const r = await fetch(base + table, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify([row]) });
      if (!r.ok) throw new Error('insert ' + table + ' ' + r.status + ' ' + (await r.text()));
      return (await r.json())[0];
    },
    async update(table, id, patch) {
      const r = await fetch(base + table + '?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      if (!r.ok) throw new Error('update ' + table + ' ' + r.status + ' ' + (await r.text()));
      return (await r.json())[0];
    },
    async del(table, id) {
      const r = await fetch(base + table + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: H });
      if (!r.ok) throw new Error('delete ' + table + ' ' + r.status);
      return true;
    },
  };
}

// The one function all agent writes go through. Records audit BEFORE mutating.
export async function auditedWrite(db, { tool_name, table, op, id = null, row = null, reasoning, origin }) {
  if (!['insert', 'update', 'delete'].includes(op)) throw new Error('bad op: ' + op);
  const targetId = id != null ? String(id) : (row && row.id != null ? String(row.id) : null);

  let before = null;
  if (op !== 'insert' && targetId != null) before = await db.selectOne(table, targetId);
  const after = op === 'delete' ? null : (op === 'insert' ? row : { ...(before || {}), ...row });

  // 1) audit row FIRST — if this throws, no mutation happens
  const action = await db.insert('agent_actions', {
    tool_name, target_table: table, target_id: targetId,
    before_json: before, after_json: after, reasoning, origin,
  });

  // 2) then apply the write
  let result;
  if (op === 'insert') result = await db.insert(table, row);
  else if (op === 'update') result = await db.update(table, targetId, row);
  else result = await db.del(table, targetId);

  // backfill target_id for inserts that got a generated id
  if (op === 'insert' && result && result.id != null && targetId == null) {
    await db.update('agent_actions', action.id, { target_id: String(result.id) });
  }
  return { action, result };
}

// Restore before_json for a given agent_actions row. One undo control in the UI calls this.
export async function revertAgentAction(db, actionId) {
  const a = await db.selectOne('agent_actions', actionId);
  if (!a) throw new Error('action not found');
  if (a.reverted_at) throw new Error('already reverted');

  const t = a.target_table, id = a.target_id, before = a.before_json, after = a.after_json;
  if (t === 'ledger') {
    // ledger is append-only: revert = post a reversing correction, never delete
    if (after) {
      await db.insert('ledger', {
        entry_date: after.entry_date, amount: after.amount,
        direction: after.direction === 'in' ? 'out' : 'in',
        stream: after.stream, category: after.category,
        description: 'REVERSAL of ' + (after.description || id),
        entry_type: 'correction', corrects_id: id, created_by: 'agent',
      });
    }
  } else if (before == null) {
    await db.del(t, id);            // it was an insert → remove it
  } else if (after == null) {
    await db.insert(t, before);     // it was a delete → re-create it
  } else {
    await db.update(t, id, before); // it was an update → restore prior state
  }
  await db.update('agent_actions', actionId, { reverted_at: new Date().toISOString() });
  return true;
}
