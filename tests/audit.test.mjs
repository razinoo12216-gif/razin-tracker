import { auditedWrite, revertAgentAction } from '../lib/audit.js';
import assert from 'node:assert';

// in-memory mock db + an op log to prove audit-before-write ordering
function mockDb() {
  const tables = { agent_actions: new Map() };
  const oplog = [];
  let seq = 1;
  const ensure = t => (tables[t] = tables[t] || new Map());
  return {
    tables, oplog,
    async selectOne(t, id) { return ensure(t).get(String(id)) || null; },
    async insert(t, row) { ensure(t); const id = row.id != null ? String(row.id) : 'gen' + (seq++); const full = { ...row, id }; tables[t].set(id, full); oplog.push(['insert', t, id]); return full; },
    async update(t, id, patch) { ensure(t); const cur = tables[t].get(String(id)) || {}; const full = { ...cur, ...patch, id: String(id) }; tables[t].set(String(id), full); oplog.push(['update', t, String(id)]); return full; },
    async del(t, id) { ensure(t); tables[t].delete(String(id)); oplog.push(['delete', t, String(id)]); return true; },
  };
}

let passed = 0;
const t = (name, fn) => { fn(); console.log('  ✓ ' + name); passed++; };

// 1. INSERT: audit row written BEFORE target insert; correct before/after
await (async () => {
  const db = mockDb();
  const { action, result } = await auditedWrite(db, { tool_name: 'createTask', table: 'tasks', op: 'insert', row: { id: 't1', title: 'Call E' }, reasoning: 'x', origin: 'chat' });
  const a = db.tables.agent_actions.get(action.id);
  assert.equal(a.before_json, null);
  assert.deepEqual(a.after_json, { id: 't1', title: 'Call E' });
  assert.equal(db.tables.tasks.get('t1').title, 'Call E');
  // ordering: the agent_actions insert must come before the tasks insert
  const ai = db.oplog.findIndex(o => o[1] === 'agent_actions');
  const ti = db.oplog.findIndex(o => o[1] === 'tasks');
  assert.ok(ai >= 0 && ti >= 0 && ai < ti, 'audit must be written before target write');
})().then(() => t('insert audits before writing', () => {}));

// 2. UPDATE: before=old, after=merged; revert restores old
await (async () => {
  const db = mockDb();
  db.tables.tasks = new Map([['t1', { id: 't1', title: 'Old', done: false }]]);
  const { action } = await auditedWrite(db, { tool_name: 'updateTask', table: 'tasks', op: 'update', id: 't1', row: { title: 'New' }, reasoning: 'x', origin: 'chat' });
  const a = db.tables.agent_actions.get(action.id);
  assert.deepEqual(a.before_json, { id: 't1', title: 'Old', done: false });
  assert.equal(a.after_json.title, 'New');
  assert.equal(db.tables.tasks.get('t1').title, 'New');
  await revertAgentAction(db, action.id);
  assert.equal(db.tables.tasks.get('t1').title, 'Old', 'revert restores prior title');
  assert.ok(db.tables.agent_actions.get(action.id).reverted_at, 'reverted_at set');
})().then(() => t('update audited + reverts to prior state', () => {}));

// 3. DELETE: revert re-creates the row
await (async () => {
  const db = mockDb();
  db.tables.tasks = new Map([['t1', { id: 't1', title: 'Keep' }]]);
  const { action } = await auditedWrite(db, { tool_name: 'x', table: 'tasks', op: 'delete', id: 't1', reasoning: 'x', origin: 'chat' });
  assert.equal(db.tables.tasks.get('t1'), undefined);
  await revertAgentAction(db, action.id);
  assert.equal(db.tables.tasks.get('t1').title, 'Keep', 'revert re-creates deleted row');
})().then(() => t('delete audited + revert re-creates', () => {}));

// 4. revert of an INSERT removes the row; double-revert throws
await (async () => {
  const db = mockDb();
  const { action } = await auditedWrite(db, { tool_name: 'x', table: 'tasks', op: 'insert', row: { id: 't9', title: 'Z' }, reasoning: 'x', origin: 'chat' });
  await revertAgentAction(db, action.id);
  assert.equal(db.tables.tasks.get('t9'), undefined, 'revert of insert removes row');
  let threw = false; try { await revertAgentAction(db, action.id); } catch (e) { threw = /already reverted/.test(e.message); }
  assert.ok(threw, 'double revert is blocked');
})().then(() => t('revert insert + double-revert guard', () => {}));

// 5. ledger revert posts a reversing correction (never deletes — append-only)
await (async () => {
  const db = mockDb();
  const { action } = await auditedWrite(db, { tool_name: 'logMoneyEntry', table: 'ledger', op: 'insert', row: { id: 'L1', amount: 3000, direction: 'in', description: 'Birmingham load' }, reasoning: 'x', origin: 'chat' });
  await revertAgentAction(db, action.id);
  assert.ok(db.tables.ledger.get('L1'), 'original ledger row still present (append-only)');
  const corr = [...db.tables.ledger.values()].find(r => r.entry_type === 'correction');
  assert.ok(corr && corr.direction === 'out' && corr.amount === 3000 && corr.corrects_id === 'L1', 'reversing correction posted');
})().then(() => t('ledger revert posts reversing correction', () => {}));

setTimeout(() => console.log('\n' + passed + '/5 audit-trail tests passed'), 50);
