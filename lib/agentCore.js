// lib/agentCore.js — Operator Agent core (Phase 2: READ-ONLY).
// One brain, called by the chat endpoint and (later) the scheduled jobs.
// Reads the whole operator state, runs a multi-turn Anthropic tool loop, returns text.
// No writes in this phase — write tools land in Phase 5 through lib/audit.js.

const MODEL = 'claude-sonnet-5';
const MAX_TOOL_TURNS = 8;
const N = (x) => { const n = parseFloat(String(x == null ? 0 : x).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const todayISO = () => new Date().toISOString().slice(0, 10);
function daysBetween(a, b) { return Math.floor((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

// thin read helper over Supabase REST with the service key
function db(env) {
  const base = env.url.replace(/\/$/, '') + '/rest/v1/';
  const H = { apikey: env.key, Authorization: 'Bearer ' + env.key };
  return async (table, qs = '') => {
    const r = await fetch(base + table + (qs ? '?' + qs : ''), { headers: H });
    if (!r.ok) throw new Error('read ' + table + ' ' + r.status);
    return r.json();
  };
}

// ---------- read-only tools ----------
const TOOLS = [
  { name: 'getCashPosition', description: 'Snapshot of money: total debt you owe, total owed to you, this-month income and spend.', input_schema: { type: 'object', properties: {} } },
  { name: 'getReceivables', description: 'People who owe you money and how many days overdue.', input_schema: { type: 'object', properties: { overdue_days: { type: 'number', description: 'only those overdue by at least this many days' } } } },
  { name: 'getPayablesDue', description: 'Debts and commitments you owe that are due within N days.', input_schema: { type: 'object', properties: { within_days: { type: 'number' } } } },
  { name: 'getHabitStreaks', description: 'Daily discipline (Operator Log) over the last 14 days: per-item and overall.', input_schema: { type: 'object', properties: {} } },
  { name: 'listCommitments', description: 'Open commitments. Optionally filter by direction (i_owe | owed_to_me).', input_schema: { type: 'object', properties: { direction: { type: 'string' } } } },
  { name: 'listTasks', description: 'Open (not done) tasks.', input_schema: { type: 'object', properties: {} } },
  { name: 'searchMemory', description: 'Search durable facts the agent has stored about people, deals, preferences.', input_schema: { type: 'object', properties: { query: { type: 'string' } } } },
];

async function execTool(read, name, input) {
  const t = todayISO(), ym = t.slice(0, 7);
  if (name === 'getCashPosition') {
    const debts = await read('debts', 'select=type,current_balance,status');
    const debtOwed = debts.filter(d => d.type !== 'receivable' && d.status !== 'paid').reduce((s, d) => s + N(d.current_balance), 0);
    const owedToYou = debts.filter(d => d.type === 'receivable' && N(d.current_balance) > 0).reduce((s, d) => s + N(d.current_balance), 0);
    let inc = 0, spd = 0;
    try { (await read('op_income', 'select=date,amount')).forEach(x => { if ((x.date || '').slice(0, 7) === ym) inc += N(x.amount); }); } catch (e) {}
    try { (await read('op_spend', 'select=date,amount')).forEach(x => { if ((x.date || '').slice(0, 7) === ym) spd += N(x.amount); }); } catch (e) {}
    let ledgerNet = null;
    try { const L = await read('ledger', 'select=amount,direction'); ledgerNet = L.reduce((s, r) => s + (r.direction === 'in' ? N(r.amount) : -N(r.amount)), 0); } catch (e) {}
    return { debt_you_owe: debtOwed, owed_to_you: owedToYou, income_this_month: inc, spend_this_month: spd, ledger_net: ledgerNet };
  }
  if (name === 'getReceivables') {
    const min = input.overdue_days || 0;
    const rows = await read('debts', 'type=eq.receivable&select=creditor,current_balance,start_date,created_at&current_balance=gt.0');
    return rows.map(r => { const since = r.start_date || (r.created_at || '').slice(0, 10); return { who: r.creditor, outstanding: N(r.current_balance), days_owed: since ? daysBetween(since, t) : null }; }).filter(r => (r.days_owed || 0) >= min).sort((a, b) => (b.days_owed || 0) - (a.days_owed || 0));
  }
  if (name === 'getPayablesDue') {
    const within = input.within_days == null ? 30 : input.within_days;
    const debts = await read('debts', 'type=neq.receivable&status=neq.paid&select=creditor,current_balance,due_date,monthly_payment');
    const dueDebts = debts.filter(d => d.due_date && daysBetween(t, d.due_date) <= within).map(d => ({ creditor: d.creditor, balance: N(d.current_balance), due: d.due_date, days: daysBetween(t, d.due_date) }));
    let commits = [];
    try { commits = (await read('commitments', "direction=eq.i_owe&status=eq.open&select=counterparty,description,due_on")).filter(c => c.due_on && daysBetween(t, c.due_on) <= within).map(c => ({ to: c.counterparty, what: c.description, due: c.due_on, days: daysBetween(t, c.due_on) })); } catch (e) {}
    return { debts_due: dueDebts, commitments_due: commits };
  }
  if (name === 'getHabitStreaks') {
    let logs = [];
    try { logs = await read('op_daily_logs', 'select=date,wake,fajr,gym,pmo,sleep,prayers,hours&order=date.desc&limit=20'); } catch (e) { return { note: 'no habit data yet' }; }
    const items = ['wake', 'fajr', 'gym', 'pmo', 'sleep', 'prayers'];
    const byDate = {}; logs.forEach(l => byDate[l.date] = l);
    const days = []; for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
    const hits = days.map(d => { const l = byDate[d]; return l ? items.reduce((s, k) => s + (l[k] === true ? 1 : 0), 0) : 0; });
    const streaks = {}; items.forEach(k => { let st = 0; for (const d of days) { const l = byDate[d]; if (l && l[k] === true) st++; else break; } streaks[k] = st; });
    return { last14_scores: hits, per_item_current_streak: streaks, days_5plus_last14: hits.filter(h => h >= 5).length };
  }
  if (name === 'listCommitments') {
    let qs = 'status=eq.open&select=direction,counterparty,description,due_on,slip_count,promised_on&order=due_on.asc';
    if (input.direction) qs = 'direction=eq.' + input.direction + '&' + qs;
    try { return await read('commitments', qs); } catch (e) { return { note: 'commitments table not set up yet' }; }
  }
  if (name === 'listTasks') {
    return await read('tasks', 'done=eq.false&select=title,day,time,category&order=day.asc&limit=60');
  }
  if (name === 'searchMemory') {
    const q = (input.query || '').trim();
    try { return await read('agent_memory', 'select=key,value,category' + (q ? '&or=(key.ilike.*' + encodeURIComponent(q) + '*,value.ilike.*' + encodeURIComponent(q) + '*)' : '')); } catch (e) { return []; }
  }
  return { error: 'unknown tool ' + name };
}

async function assembleContext(read) {
  let profile = {};
  try { profile = (await read('operator_profile', 'id=eq.1'))[0] || {}; } catch (e) {}
  let memory = [];
  try { memory = await read('agent_memory', 'select=key,value,category'); } catch (e) {}
  const snap = {};
  try { snap.cash = await execTool(read, 'getCashPosition', {}); } catch (e) {}
  try { const c = await read('commitments', 'status=eq.open&select=direction,slip_count'); snap.open_commitments = c.length; snap.i_owe_open = c.filter(x => x.direction === 'i_owe').length; snap.owed_to_me_open = c.filter(x => x.direction === 'owed_to_me').length; snap.total_slips = c.reduce((s, x) => s + (x.slip_count || 0), 0); } catch (e) {}
  try { snap.open_tasks = (await read('tasks', 'done=eq.false&select=id')).length; } catch (e) {}
  try { snap.today_habit = await execTool(read, 'getHabitStreaks', {}); } catch (e) {}

  const rules = [
    'You are READ-ONLY right now. You cannot create, change, or delete anything yet — write tools are being enabled in a later phase. If asked to change something, say plainly that write access is not enabled yet and offer to note it.',
    'Never invent a number. If data is missing, say "UNKNOWN — confirm", never guess.',
    'Never claim a commitment is delivered without explicit confirmation from Razin.',
    'Never reword or minimise a commitment or a slip to make things look better than they are.',
    'State the uncomfortable thing first. No flattery, no padding, no hedging. Be dense and specific.',
    'Use the tools to fetch exact figures rather than relying on the snapshot when precision matters.',
    'All money is British pounds (GBP). Always format money with £ — never $ or any other symbol. Use UK date format (e.g. 29 Jul 2026).',
  ];
  const system =
    'You are Razin’s embedded operator agent inside his personal operating-system app.\n\n' +
    'OPERATOR PROFILE (edited by Razin, this defines how you behave):\n' +
    'Goals: ' + (profile.goals || 'n/a') + '\n' +
    'Standards: ' + (profile.standards || 'n/a') + '\n' +
    'Tone: ' + (profile.tone || 'n/a') + '\n' +
    'How to speak to me: ' + (profile.speak_to_me || 'n/a') + '\n\n' +
    'DURABLE MEMORY:\n' + (memory.length ? memory.map(m => '- ' + m.key + ': ' + m.value + (m.category ? ' [' + m.category + ']' : '')).join('\n') : '- (none yet)') + '\n\n' +
    'CURRENT STATE SNAPSHOT (' + todayISO() + '):\n' + JSON.stringify(snap) + '\n\n' +
    'HARD RULES:\n' + rules.map(r => '- ' + r).join('\n');
  return system;
}

async function callAnthropic(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.anthropic, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + (await r.text()).slice(0, 300));
  return r.json();
}

export async function runAgent({ messages, env }) {
  const read = db(env);
  const system = await assembleContext(read);
  const convo = (messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));
  const toolsUsed = [];
  const usage = { input_tokens: 0, output_tokens: 0 };

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const resp = await callAnthropic(env, { model: MODEL, max_tokens: 1500, system, tools: TOOLS, messages: convo });
    if (resp.usage) { usage.input_tokens += resp.usage.input_tokens || 0; usage.output_tokens += resp.usage.output_tokens || 0; }
    const content = resp.content || [];
    const toolUses = content.filter(b => b.type === 'tool_use');
    if (resp.stop_reason === 'tool_use' && toolUses.length) {
      convo.push({ role: 'assistant', content });
      const results = [];
      for (const tu of toolUses) {
        toolsUsed.push(tu.name);
        let out; try { out = await execTool(read, tu.name, tu.input || {}); } catch (e) { out = { error: e.message }; }
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 6000) });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }
    const text = content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return { text: text || '(no reply)', toolsUsed, usage };
  }
  return { text: '(stopped — tool loop cap reached)', toolsUsed, usage };
}
