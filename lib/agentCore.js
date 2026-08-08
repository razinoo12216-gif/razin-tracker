// lib/agentCore.js — Operator Agent core (Phase 2.1: READ-ONLY, full-app coverage).
// One brain, called by the chat endpoint and (later) the scheduled jobs.
// Reads the whole operator state, runs a multi-turn Anthropic tool loop, returns text.
// No writes in this phase — write tools land in Phase 3 through lib/audit.js.
//
// v2.1 changes (2026-07-30) — fixes found after the first live test returned "(no reply)":
//  1. Reply extraction no longer fails silently. stop_reason is surfaced, max_tokens raised.
//  2. Generic whitelisted readTable/listTables tools — agent can now see all 29 tables,
//     not the 6 it had. Root cause of the "(no reply)" on "overview of my projects":
//     there was no projects tool, so it thrashed irrelevant tools and produced nothing.
//  3. Read errors surface into the snapshot instead of being swallowed by catch(e){}.
//  4. listTasks split into overdue / today / upcoming instead of 60 oldest-first rows.
//  5. Habit streaks report hit-rate + best streak, not just a current streak that
//     collapses to 0 the moment one day goes unlogged.
//  6. Receivables filtered numerically in JS (money is TEXT — "0.00" > "0" in Postgres).

import { makeDb, auditedWrite, revertAgentAction } from './audit.js';

const MODEL = 'claude-sonnet-5';
// Nudges are one-liners ("here is today's one thing") built from a couple of
// cheap reads. Sonnet is overkill and they run 3x/day forever, so they were
// ~$4/month of the bill on their own. Haiku handles them for roughly a tenth.
const CHEAP_MODEL = 'claude-haiku-4-5-20251001';
const MAX_WRITES_PER_RUN = 8; // guardrail: agent cannot mass-mutate in a single turn
const MAX_TOOL_TURNS = 12;
const MAX_TOOL_CALLS = 40; // deep reports (RASNEST, weekly review) legitimately need 25-35
const MAX_TOKENS = 4096;
const MAX_RESULT_CHARS = 4000; // cost guard: tool results are resent every loop turn

const N = (x) => { const n = parseFloat(String(x == null ? 0 : x).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

// Local (Europe/London) date — NOT toISOString(), which shifts the day back in BST.
function todayISO(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {});
  return `${p.year}-${p.month}-${p.day}`;
}
function daysBetween(a, b) { return Math.floor((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
function shiftDays(n) { const d = new Date(); d.setDate(d.getDate() - n); return todayISO(d); }

// ---------- table map: what the agent is allowed to read, and what each table is ----------
// Keys are the whitelist. Values are shown to the model so it knows where to look.
const TABLE_MAP = {
  tasks: 'Daily task list ("12 ticks" tab). day, title, time, done, recurrence, category, notes.',
  debts: 'Debts AND receivables in one table. type="receivable" means someone owes Razin; anything else is money he owes. current_balance=outstanding, original_amount=lifetime. Money is TEXT.',
  debt_payments: 'Payments logged against a debt. debt_id, amount (TEXT), date, notes.',
  projects: 'THE BIG ONE — 147 rows, five different things separated by the "type" column: type="work-company" (31 rows) = Razin\'s registered limited companies, all operational; type="project" (47) = client/work projects; type="expense" (37) = recurring costs; type="potential" (21) = leads not yet won; type="work-task" (11) = individual jobs. ALWAYS filter by type — never treat all 147 as one thing. Columns: name, status, revenue (TEXT), expenses (TEXT), month, type, category, recurring, end_month, last_contact, next_followup, converted, people, notes. WARNING: status values are inconsistent across types (Active/Completed/Won/Lead/Pitching/Negotiating/pending/done/partial/raz/other/null) — read them, do not assume.',
  knowledge: 'Long-form memory outside the structured tables: distilled Cowork chat history, exported claude.ai conversations, dropped documents. Use the searchKnowledge tool rather than reading this table raw.',
  op_projects: 'Operator Log project pipeline. name, status (Active/Stalled/Dead), next_action, updated_at.',
  op_daily_logs: 'Daily discipline, source of truth. date + booleans wake/fajr/gym/pmo/sleep/prayers (TRUE = the good outcome, e.g. pmo=true means CLEAN) + hours.',
  op_income: 'Operator Log income entries. date, stream, amount (numeric).',
  op_spend: 'Operator Log spend entries. date, description, amount (numeric).',
  op_debt: 'Single row (id=1) holding the headline debt balance.',
  op_partner_checks: 'Weekly accountability partner notes. week_label, note.',
  life_goals: 'Long-term goals (Life Progress tab). horizon 3m/6m/12m, domain, title, why, metric_label, start_value, current_value, target_value, manual_progress, deadline, status.',
  daily_targets: 'Recurring daily targets. title, domain, type check/count, target_count, active.',
  daily_logs: 'Completions of daily_targets. target_id, log_date, value.',
  weekly_targets: 'Recurring weekly targets. title, domain, target_count, active.',
  weekly_logs: 'Completions of weekly_targets. target_id, week_start, value.',
  gym_sessions: 'Gym training log.',
  body_metrics: 'Bodyweight / body measurements over time.',
  daily_macros: 'Daily food / macro tracking.',
  invoices: 'Invoices raised.',
  tickets: 'Tickets / admin items.',
  work_quotes: 'Saved pricing quotes from the Work tab. description, inputs (jsonb), floor, target, stretch.',
  income_entries: 'Income ledger entries.',
  reviews: 'Periodic self-reviews.',
  user_notes: 'Free-form notes.',
  commitments: 'Promises made or received. direction i_owe/owed_to_me, counterparty, description, due_on, status, slip_count, promised_on.',
  ledger: 'Append-only money ledger. amount, direction in/out.',
  agent_memory: 'Durable facts the agent has stored. key, value, category.',
  agent_actions: 'Audit trail of agent writes.',
  operator_profile: 'Razin\'s profile driving agent behaviour (id=1). goals, standards, tone, speak_to_me.',
  call_logs: 'Logged calls.',
};
const ALLOWED = Object.keys(TABLE_MAP);

// thin read helper over Supabase REST with the service key
function db(env) {
  const base = env.url.replace(/\/$/, '') + '/rest/v1/';
  const H = { apikey: env.key, Authorization: 'Bearer ' + env.key };
  return async (table, qs = '') => {
    const r = await fetch(base + table + (qs ? '?' + qs : ''), { headers: H });
    if (!r.ok) throw new Error('read ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return r.json();
  };
}

// ---------- read-only tools ----------
const TOOLS = [
  { name: 'listTables', description: 'List every table you can read and what each one holds. Use this FIRST whenever you are unsure where some information lives.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'readTable',
    description: 'Read rows from any allowed table. This is your general-purpose tool — use it for anything the specific tools below do not cover (projects, goals, gym, invoices, tickets, quotes, notes, etc). Returns real column names so you can see the shape.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name. Call listTables if unsure.' },
        columns: { type: 'string', description: 'IMPORTANT for cost: comma-separated columns you actually need, e.g. "name,status,revenue". Defaults to all columns, which is expensive — always narrow it when you know what you want.' },
        filter: { type: 'string', description: 'Optional PostgREST filter, e.g. "status=eq.active" or "done=eq.false". Omit for all rows.' },
        order: { type: 'string', description: 'Optional order, e.g. "created_at.desc".' },
        limit: { type: 'number', description: 'Max rows (default 25, hard cap 100). Keep it small.' },
      },
      required: ['table'],
    },
  },
  { name: 'getCashPosition', description: 'Snapshot of money: total debt owed, total owed to Razin, this-month income and spend.', input_schema: { type: 'object', properties: {} } },
  { name: 'getReceivables', description: 'People who owe Razin money and how long they have owed it.', input_schema: { type: 'object', properties: { overdue_days: { type: 'number', description: 'only those owed for at least this many days' } } } },
  { name: 'getPayablesDue', description: 'Debts and commitments Razin owes that fall due within N days.', input_schema: { type: 'object', properties: { within_days: { type: 'number' } } } },
  { name: 'getHabitStreaks', description: 'Daily discipline (Operator Log) over a recent window: per-item streaks, hit rate, and days actually logged.', input_schema: { type: 'object', properties: { days: { type: 'number', description: 'window size, default 14' } } } },
  { name: 'listCommitments', description: 'Open commitments. Optionally filter by direction (i_owe | owed_to_me).', input_schema: { type: 'object', properties: { direction: { type: 'string' } } } },
  { name: 'listTasks', description: 'Open tasks split into overdue / today / upcoming, so you can see what actually matters now.', input_schema: { type: 'object', properties: {} } },
  { name: 'searchMemory', description: 'Search durable facts stored about people, deals, preferences.', input_schema: { type: 'object', properties: { query: { type: 'string' } } } },
  { name: 'listCompanies', description: 'Razin\'s registered limited companies (projects where type="work-company"), all operational. Use this for anything about his companies rather than reading projects raw.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'searchKnowledge',
    description: 'Full-text search across Razin\'s wider history — past Cowork chats, exported Claude conversations, and documents he has dropped in. Use this when the answer is not in the structured tables: past decisions, what someone said, context on a deal, something he told you weeks ago.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms, e.g. "Bramble Close inventory" or "Maureen".' },
        category: { type: 'string', description: 'Optional filter: business, property, logistics, sourcing, finance, discipline, faith, personal.' },
        limit: { type: 'number', description: 'Max results (default 8, cap 25).' },
        full: { type: 'boolean', description: 'Return full content instead of just summaries. Expensive — only when the summary is not enough.' },
      },
      required: ['query'],
    },
  },

  // ---------- WRITE TOOLS: DISCIPLINE + COMMITMENTS (Phase 4, 2026-08-08) ----------
  // The reason these exist: Razin had 848 tasks, 151 projects, 10 daily targets and
  // 10 life goals — and ZERO rows in op_daily_logs, daily_logs, weekly_logs and
  // commitments. The agent could see everything he PLANNED and almost nothing he
  // actually DID, so every piece of advice it gave was necessarily generic.
  // Logging has to cost one sentence or it will never happen.
  {
    name: 'logDay',
    description: 'Log Razin\'s discipline for a day in one shot. Call this the moment he mentions doing (or missing) any of these, however casually — "fajr done, gym done", "missed fajr", "slept 6 hours", "clean today". Do not ask him to confirm first and do not ask for the fields he did not mention; log what he said and leave the rest untouched. TRUE always means the GOOD outcome, including pmo (pmo:true = clean).',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today. Use yesterday\'s date if he is clearly talking about yesterday.' },
        wake: { type: 'boolean', description: 'true = woke on time' },
        fajr: { type: 'boolean', description: 'true = prayed fajr on time' },
        gym: { type: 'boolean', description: 'true = trained' },
        pmo: { type: 'boolean', description: 'true = CLEAN (no porn/masturbation). Never invert this.' },
        sleep: { type: 'boolean', description: 'true = slept properly / on time' },
        prayers: { type: 'boolean', description: 'true = all 5 prayers on time' },
        hours: { type: 'number', description: 'Hours of focused work, if he says.' },
        reasoning: { type: 'string', description: 'One line for the audit trail.' },
      },
    },
  },
  {
    name: 'logTarget',
    description: 'Record progress against one of his named daily targets (Life Progress tab). Use when he mentions something that matches a target by name. Resolve the target by title — call listTargets first if you are not sure of the exact wording.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The daily target title, or close enough to match it.' },
        value: { type: 'number', description: 'For check targets use 1 (done) or 0 (not done). For count targets use the count. Defaults to 1.' },
        date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
        reasoning: { type: 'string', description: 'One line for the audit trail.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'listTargets',
    description: 'List his active daily and weekly targets with their ids and whether each is already logged today. Read-only. Call before logTarget when the wording is ambiguous.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'addCommitment',
    description: 'Record a promise. Use whenever Razin says he will do something for someone, or someone has said they will do something for him — especially with E, Marc, or any partner. This is the single biggest hole in his system: the commitments table is empty, so nothing he promises is tracked and nothing owed to him is chased. Capture it the moment it is said, with a person and a date. If he does not give a due date, ask for one in your reply AFTER recording it — do not refuse to record it.',
    input_schema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['i_owe', 'owed_to_me'], description: 'i_owe = Razin promised it. owed_to_me = someone promised Razin.' },
        counterparty: { type: 'string', description: 'Who. E, Marc, a client, a supplier.' },
        description: { type: 'string', description: 'The promise, concrete and checkable.' },
        due_on: { type: 'string', description: 'YYYY-MM-DD when it is due.' },
        promised_on: { type: 'string', description: 'YYYY-MM-DD when it was promised. Defaults to today.' },
        project: { type: 'string', description: 'Which venture it belongs to, e.g. "RASNEST Ireland", "Royal Orchard".' },
        reasoning: { type: 'string', description: 'One line for the audit trail.' },
      },
      required: ['direction', 'description'],
    },
  },
  {
    name: 'closeCommitment',
    description: 'Mark a commitment delivered or dropped. NEVER call this on your own judgement — only when Razin explicitly says it is done or no longer applies. Get the id from listCommitments first.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The commitment id.' },
        status: { type: 'string', enum: ['delivered', 'dropped'], description: 'delivered = it happened. dropped = abandoned.' },
        reasoning: { type: 'string', description: 'One line for the audit trail.' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'slipCommitment',
    description: 'Record that a commitment has slipped its date, incrementing the slip counter and optionally moving the due date. Use when a deadline passes or Razin pushes something back. The slip count is the point — it is how the pattern becomes visible instead of forgettable.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The commitment id.' },
        new_due_on: { type: 'string', description: 'YYYY-MM-DD new due date, if there is one.' },
        reasoning: { type: 'string', description: 'One line for the audit trail.' },
      },
      required: ['id'],
    },
  },

  // ---------- WRITE TOOLS (Phase 3, tasks group only) ----------
  {
    name: 'addTask',
    description: 'Add a task to the 12 ticks list. Use this whenever Razin says to add, remind, schedule, or put something on the list.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What the task is. Short and actionable.' },
        day: { type: 'string', description: 'Date YYYY-MM-DD. Defaults to today if omitted.' },
        time: { type: 'string', description: 'Optional HH:MM 24h.' },
        category: { type: 'string', description: 'Optional category.' },
        notes: { type: 'string', description: 'Optional detail.' },
        reasoning: { type: 'string', description: 'One line: why you are adding this. Recorded in the audit trail.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'tickTask',
    description: 'Mark a task done. Only ever call this when Razin says it is done — NEVER assume completion.',
    input_schema: { type: 'object', properties: { id: { type: 'string' }, reasoning: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'untickTask',
    description: 'Mark a task not done again (undo a tick).',
    input_schema: { type: 'object', properties: { id: { type: 'string' }, reasoning: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'editTask',
    description: 'Change a task\'s title, day, time, category or notes. Use for rescheduling.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' }, day: { type: 'string' }, time: { type: 'string' },
        category: { type: 'string' }, notes: { type: 'string' }, reasoning: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Permanently remove a task. DESTRUCTIVE — you must ask Razin to confirm in plain words first, and only then call this with confirmed=true. Prefer tickTask if the thing was actually done.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        confirmed: { type: 'boolean', description: 'Set true ONLY after Razin has explicitly confirmed this specific deletion in the conversation.' },
        reasoning: { type: 'string' },
      },
      required: ['id', 'confirmed'],
    },
  },
  {
    name: 'remember',
    description: 'Store a durable fact in the shared knowledge store so it survives this conversation AND is readable by Razin\'s other Claude projects. Use whenever he tells you something worth keeping: a decision, a number, a deadline, a person\'s position, a rate, a contact, how something works. Do NOT use it for passing chatter or for anything that belongs in a structured table (a task goes in addTask, not here).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short label, e.g. "Bramble Close — cleaner rate".' },
        fact: { type: 'string', description: 'The fact itself, written so it still makes sense in six months with no surrounding context. Include figures and dates explicitly.' },
        category: { type: 'string', description: 'One of: business, property, logistics, sourcing, finance, discipline, faith, personal.' },
        entities: { type: 'array', items: { type: 'string' }, description: 'People, companies or properties this concerns.' },
        occurred_on: { type: 'string', description: 'YYYY-MM-DD if the fact is tied to a date.' },
      },
      required: ['title', 'fact'],
    },
  },
  {
    name: 'undoLastWrite',
    description: 'Undo the most recent change you made. Call when Razin says undo, revert, or "put that back".',
    input_schema: { type: 'object', properties: {} },
  },
];

async function execTool(ctx, name, input) {
  const read = ctx.read;
  const t = todayISO(), ym = t.slice(0, 7);

  // ---------- writes ----------
  const WRITE_TOOLS = ['addTask', 'tickTask', 'untickTask', 'editTask', 'deleteTask', 'undoLastWrite', 'remember',
    'logDay', 'logTarget', 'addCommitment', 'closeCommitment', 'slipCommitment'];
  if (WRITE_TOOLS.includes(name)) {
    if (!ctx.wdb) return { error: 'write access not available in this context' };
    if (ctx.actions.length >= MAX_WRITES_PER_RUN) {
      return { error: 'write cap reached (' + MAX_WRITES_PER_RUN + ' per turn). Tell Razin what is left and let him confirm before continuing.' };
    }
    const origin = 'chat';

    if (name === 'undoLastWrite') {
      const recent = await read('agent_actions', 'reverted_at=is.null&select=id,tool_name,target_table,target_id&order=created_at.desc&limit=1');
      if (!recent.length) return { error: 'nothing to undo' };
      await revertAgentAction(ctx.wdb, recent[0].id);
      return { undone: recent[0].tool_name, action_id: recent[0].id, note: 'Reverted.' };
    }

    if (name === 'remember') {
      const title = String(input.title || '').trim();
      const fact = String(input.fact || '').trim();
      if (!title || !fact) return { error: 'title and fact required' };
      const row = {
        id: (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : 'k' + Date.now(),
        source: 'manual',
        source_id: 'agent-chat:' + t + ':' + Math.random().toString(36).slice(2, 8),
        chunk_index: 0,
        title: title.slice(0, 300),
        category: input.category || null,
        occurred_on: input.occurred_on || t,
        summary: fact.slice(0, 8000),
        entities: Array.isArray(input.entities) ? input.entities.slice(0, 40) : null,
      };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: 'remember', table: 'knowledge', op: 'insert', row,
        reasoning: 'Razin stated a durable fact', origin,
      });
      ctx.actions.push({ id: action.id, tool: 'remember', summary: 'Remembered: ' + title });
      return { saved: title, note: 'Stored in the shared knowledge store — readable from your other Claude projects too.', undo_action_id: action.id };
    }

    if (name === 'addTask') {
      const title = String(input.title || '').trim();
      if (!title) return { error: 'title required' };
      const row = {
        id: (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : 'a' + Date.now() + Math.random().toString(36).slice(2, 8),
        title,
        day: input.day || t,
        time: input.time || null,
        category: input.category || null,
        notes: input.notes || null,
        done: false,
      };
      const { action, result } = await auditedWrite(ctx.wdb, {
        tool_name: 'addTask', table: 'tasks', op: 'insert', row,
        reasoning: input.reasoning || 'Razin asked for it', origin,
      });
      ctx.actions.push({
        id: action.id, tool: 'addTask',
        summary: 'Added "' + title + '" for ' + fmtUK(row.day) + (row.time ? ' at ' + row.time : ''),
        where: row.day === t ? 'on today\u2019s 12 ticks list now' : 'dated ' + fmtUK(row.day) + ' \u2014 it will NOT show on today\u2019s list until then',
      });
      return { added: { id: result.id, title: result.title, day: result.day, time: result.time }, undo_action_id: action.id };
    }

    if (name === 'tickTask' || name === 'untickTask') {
      const done = name === 'tickTask';
      const before = await ctx.wdb.selectOne('tasks', input.id);
      if (!before) return { error: 'task not found: ' + input.id };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: name, table: 'tasks', op: 'update', id: input.id, row: { done },
        reasoning: input.reasoning || (done ? 'Razin said it is done' : 'Razin said it is not done'), origin,
      });
      ctx.actions.push({ id: action.id, tool: name, summary: (done ? 'Ticked' : 'Un-ticked') + ' "' + before.title + '"' });
      return { ok: true, task: before.title, done, undo_action_id: action.id };
    }

    if (name === 'editTask') {
      const before = await ctx.wdb.selectOne('tasks', input.id);
      if (!before) return { error: 'task not found: ' + input.id };
      const patch = {};
      ['title', 'day', 'time', 'category', 'notes'].forEach(k => { if (input[k] !== undefined) patch[k] = input[k]; });
      if (!Object.keys(patch).length) return { error: 'nothing to change' };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: 'editTask', table: 'tasks', op: 'update', id: input.id, row: patch,
        reasoning: input.reasoning || 'Razin asked for the change', origin,
      });
      ctx.actions.push({ id: action.id, tool: 'editTask', summary: 'Edited "' + before.title + '" (' + Object.keys(patch).join(', ') + ')' });
      return { ok: true, was: before.title, changed: patch, undo_action_id: action.id };
    }

    if (name === 'deleteTask') {
      if (input.confirmed !== true) {
        return { blocked: true, error: 'Deletion needs explicit confirmation. Ask Razin to confirm this specific task in plain words, then call again with confirmed=true.' };
      }
      const before = await ctx.wdb.selectOne('tasks', input.id);
      if (!before) return { error: 'task not found: ' + input.id };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: 'deleteTask', table: 'tasks', op: 'delete', id: input.id,
        reasoning: input.reasoning || 'Razin confirmed deletion', origin,
      });
      ctx.actions.push({ id: action.id, tool: 'deleteTask', summary: 'Deleted "' + before.title + '"' });
      return { ok: true, deleted: before.title, undo_action_id: action.id };
    }

    const uuid = () => (globalThis.crypto && globalThis.crypto.randomUUID)
      ? globalThis.crypto.randomUUID()
      : 'x' + Date.now() + Math.random().toString(36).slice(2, 8);

    if (name === 'logDay') {
      const date = input.date || t;
      const patch = {};
      ['wake', 'fajr', 'gym', 'pmo', 'sleep', 'prayers'].forEach(k => {
        if (input[k] !== undefined) patch[k] = !!input[k];
      });
      if (input.hours !== undefined) patch.hours = Number(input.hours) || 0;
      if (!Object.keys(patch).length) return { error: 'nothing to log — name at least one of wake, fajr, gym, pmo, sleep, prayers, hours' };

      const said = Object.entries(patch)
        .map(([k, v]) => (k === 'hours' ? v + 'h focus' : (v ? k : k + ' missed'))).join(', ');
      const existing = (await read('op_daily_logs', 'date=eq.' + encodeURIComponent(date) + '&select=*'))[0];

      if (existing) {
        const { action } = await auditedWrite(ctx.wdb, {
          tool_name: 'logDay', table: 'op_daily_logs', op: 'update', id: existing.id, row: patch,
          reasoning: input.reasoning || 'Razin reported his day', origin,
        });
        ctx.actions.push({ id: action.id, tool: 'logDay', summary: 'Logged ' + fmtUK(date) + ' — ' + said, where: 'Life Progress' });
        return { ok: true, date, logged: patch, note: 'Updated the existing log for that day.', undo_action_id: action.id };
      }
      const row = { id: uuid(), date, ...patch };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: 'logDay', table: 'op_daily_logs', op: 'insert', row,
        reasoning: input.reasoning || 'Razin reported his day', origin,
      });
      ctx.actions.push({ id: action.id, tool: 'logDay', summary: 'Logged ' + fmtUK(date) + ' — ' + said, where: 'Life Progress' });
      return { ok: true, date, logged: patch, first_log_for_that_day: true, undo_action_id: action.id };
    }

    if (name === 'logTarget') {
      const want = String(input.title || '').trim().toLowerCase();
      const targets = await read('daily_targets', 'active=eq.true&select=id,title,type,target_count');
      if (!targets.length) return { error: 'no active daily targets exist yet' };
      const hit = targets.find(x => (x.title || '').toLowerCase() === want)
        || targets.find(x => (x.title || '').toLowerCase().includes(want))
        || targets.find(x => want.includes((x.title || '').toLowerCase()));
      if (!hit) return { error: 'no target matches "' + input.title + '". Available: ' + targets.map(x => x.title).join(' | ') };

      const date = input.date || t;
      const value = input.value === undefined ? 1 : Number(input.value);
      const existing = (await read('daily_logs', 'target_id=eq.' + hit.id + '&log_date=eq.' + encodeURIComponent(date) + '&select=*'))[0];

      if (existing) {
        const { action } = await auditedWrite(ctx.wdb, {
          tool_name: 'logTarget', table: 'daily_logs', op: 'update', id: existing.id, row: { value },
          reasoning: input.reasoning || 'Razin reported progress', origin,
        });
        ctx.actions.push({ id: action.id, tool: 'logTarget', summary: 'Logged "' + hit.title + '" = ' + value + ' for ' + fmtUK(date), where: 'Life Progress' });
        return { ok: true, target: hit.title, value, date, undo_action_id: action.id };
      }
      const row = { id: uuid(), target_id: hit.id, log_date: date, value };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: 'logTarget', table: 'daily_logs', op: 'insert', row,
        reasoning: input.reasoning || 'Razin reported progress', origin,
      });
      ctx.actions.push({ id: action.id, tool: 'logTarget', summary: 'Logged "' + hit.title + '" = ' + value + ' for ' + fmtUK(date), where: 'Life Progress' });
      return { ok: true, target: hit.title, value, date, undo_action_id: action.id };
    }

    if (name === 'addCommitment') {
      const row = {
        id: uuid(),
        direction: input.direction,
        counterparty: input.counterparty || null,
        description: String(input.description || '').trim(),
        project: input.project || null,
        promised_on: input.promised_on || t,
        due_on: input.due_on || null,
        status: 'open',
        slip_count: 0,
        source: 'chat',
        created_by: 'agent',
      };
      if (!row.description) return { error: 'description required' };
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: 'addCommitment', table: 'commitments', op: 'insert', row,
        reasoning: input.reasoning || 'A promise was made', origin,
      });
      const who = row.counterparty || 'someone';
      const dir = row.direction === 'i_owe' ? 'You owe ' + who : who + ' owes you';
      ctx.actions.push({
        id: action.id, tool: 'addCommitment',
        summary: dir + ': ' + row.description + (row.due_on ? ' (due ' + fmtUK(row.due_on) + ')' : ''),
        where: row.due_on ? 'tracked' : 'NO DUE DATE — it will not chase itself',
      });
      return { ok: true, commitment: row.description, direction: row.direction, due_on: row.due_on, undo_action_id: action.id };
    }

    if (name === 'closeCommitment' || name === 'slipCommitment') {
      const before = await ctx.wdb.selectOne('commitments', input.id);
      if (!before) return { error: 'commitment not found: ' + input.id };
      let patch, summary;
      if (name === 'closeCommitment') {
        patch = { status: input.status, updated_at: new Date().toISOString() };
        summary = (input.status === 'delivered' ? 'Delivered' : 'Dropped') + ': ' + before.description;
      } else {
        patch = { slip_count: (before.slip_count || 0) + 1, status: 'open', updated_at: new Date().toISOString() };
        if (input.new_due_on) patch.due_on = input.new_due_on;
        summary = 'Slipped (' + patch.slip_count + 'x): ' + before.description + (input.new_due_on ? ' → ' + fmtUK(input.new_due_on) : '');
      }
      const { action } = await auditedWrite(ctx.wdb, {
        tool_name: name, table: 'commitments', op: 'update', id: input.id, row: patch,
        reasoning: input.reasoning || 'Razin updated a commitment', origin,
      });
      ctx.actions.push({ id: action.id, tool: name, summary });
      return { ok: true, was: before.description, changed: patch, undo_action_id: action.id };
    }

  }

  if (name === 'listTargets') {
    const [daily, weekly, logs] = await Promise.all([
      read('daily_targets', 'active=eq.true&select=id,title,domain,type,target_count'),
      read('weekly_targets', 'active=eq.true&select=id,title,domain,target_count'),
      read('daily_logs', 'log_date=eq.' + t + '&select=target_id,value'),
    ]);
    const done = new Set(logs.map(l => l.target_id));
    return {
      today: t,
      daily: daily.map(d => ({ ...d, logged_today: done.has(d.id) })),
      weekly,
      note: daily.length && !logs.length
        ? 'He has ' + daily.length + ' daily targets and has logged NOTHING today. That is missing data, not failure.'
        : undefined,
    };
  }

  if (name === 'listTables') return TABLE_MAP;

  if (name === 'readTable') {
    const table = String(input.table || '').trim();
    if (!ALLOWED.includes(table)) {
      return { error: 'table "' + table + '" is not readable', allowed: ALLOWED };
    }
    const limit = Math.min(Math.max(1, Number(input.limit) || 25), 100);
    const cols = String(input.columns || '').trim().replace(/\s+/g, '');
    const parts = ['select=' + (cols || '*'), 'limit=' + limit];
    if (input.filter) parts.push(String(input.filter).replace(/^[?&]+/, ''));
    if (input.order) parts.push('order=' + input.order);
    const rows = await read(table, parts.join('&'));
    return { table, row_count: rows.length, columns: rows.length ? Object.keys(rows[0]) : [], rows };
  }

  if (name === 'getCashPosition') {
    const errors = [];
    const debts = await read('debts', 'select=type,current_balance,status');
    const debtOwed = debts.filter(d => d.type !== 'receivable' && d.status !== 'paid').reduce((s, d) => s + N(d.current_balance), 0);
    const owedToYou = debts.filter(d => d.type === 'receivable' && N(d.current_balance) > 0).reduce((s, d) => s + N(d.current_balance), 0);
    let inc = 0, spd = 0;
    try { (await read('op_income', 'select=date,amount')).forEach(x => { if ((x.date || '').slice(0, 7) === ym) inc += N(x.amount); }); } catch (e) { errors.push('op_income: ' + e.message); }
    try { (await read('op_spend', 'select=date,amount')).forEach(x => { if ((x.date || '').slice(0, 7) === ym) spd += N(x.amount); }); } catch (e) { errors.push('op_spend: ' + e.message); }
    let ledgerNet = null;
    try { const L = await read('ledger', 'select=amount,direction'); ledgerNet = L.length ? L.reduce((s, r) => s + (r.direction === 'in' ? N(r.amount) : -N(r.amount)), 0) : null; } catch (e) { errors.push('ledger: ' + e.message); }
    const out = { debt_you_owe: debtOwed, owed_to_you: owedToYou, income_this_month: inc, spend_this_month: spd, ledger_net: ledgerNet, month: ym };
    if (errors.length) out._errors = errors;
    return out;
  }

  if (name === 'getReceivables') {
    const min = input.overdue_days || 0;
    // NOTE: current_balance is TEXT, so a Postgres gt.0 filter compares lexically. Filter in JS.
    const rows = await read('debts', 'type=eq.receivable&select=creditor,current_balance,original_amount,start_date,due_date,created_at');
    return rows
      .filter(r => N(r.current_balance) > 0)
      .map(r => {
        const since = r.start_date || (r.created_at || '').slice(0, 10);
        return {
          who: r.creditor,
          outstanding: N(r.current_balance),
          lifetime: N(r.original_amount),
          since: since || null,
          days_owed: since ? daysBetween(since, t) : null,
          due: r.due_date || null,
        };
      })
      .filter(r => (r.days_owed || 0) >= min)
      .sort((a, b) => (b.days_owed || 0) - (a.days_owed || 0));
  }

  if (name === 'getPayablesDue') {
    const within = input.within_days == null ? 30 : input.within_days;
    const debts = await read('debts', 'type=neq.receivable&status=neq.paid&select=creditor,current_balance,due_date,monthly_payment');
    const dueDebts = debts
      .filter(d => d.due_date && daysBetween(t, d.due_date) <= within)
      .map(d => ({ creditor: d.creditor, balance: N(d.current_balance), monthly_payment: N(d.monthly_payment), due: d.due_date, days_until_due: daysBetween(t, d.due_date) }))
      .sort((a, b) => a.days_until_due - b.days_until_due);
    let commits = [], err = null;
    try {
      commits = (await read('commitments', 'direction=eq.i_owe&status=eq.open&select=counterparty,description,due_on,slip_count'))
        .filter(c => c.due_on && daysBetween(t, c.due_on) <= within)
        .map(c => ({ to: c.counterparty, what: c.description, due: c.due_on, days_until_due: daysBetween(t, c.due_on), slips: c.slip_count || 0 }));
    } catch (e) { err = e.message; }
    const out = { debts_due: dueDebts, commitments_due: commits };
    if (err) out._errors = ['commitments: ' + err];
    return out;
  }

  if (name === 'getHabitStreaks') {
    const win = Math.min(Math.max(1, Number(input.days) || 14), 90);
    let logs;
    try { logs = await read('op_daily_logs', 'select=date,wake,fajr,gym,pmo,sleep,prayers,hours&order=date.desc&limit=' + (win + 10)); }
    catch (e) { return { error: 'could not read op_daily_logs: ' + e.message }; }
    const items = ['wake', 'fajr', 'gym', 'pmo', 'sleep', 'prayers'];
    const byDate = {}; logs.forEach(l => byDate[l.date] = l);
    const days = []; for (let i = 0; i < win; i++) days.push(shiftDays(i));
    const logged = days.filter(d => byDate[d]).length;
    const scores = days.map(d => { const l = byDate[d]; return l ? items.reduce((s, k) => s + (l[k] === true ? 1 : 0), 0) : null; });

    const per = {};
    items.forEach(k => {
      let cur = 0, best = 0, run = 0, hits = 0;
      days.forEach((d, i) => {
        const l = byDate[d];
        const hit = !!(l && l[k] === true);
        if (hit) hits++;
        if (i === 0 || cur === i) { if (hit) cur = i + 1; }
      });
      // best run over the window, oldest -> newest
      [...days].reverse().forEach(d => {
        const l = byDate[d];
        if (l && l[k] === true) { run++; best = Math.max(best, run); } else run = 0;
      });
      per[k] = { current_streak: cur, best_streak_in_window: best, hits, hit_rate: days.length ? Math.round((hits / days.length) * 100) + '%' : '0%' };
    });

    return {
      window_days: win,
      days_logged: logged,
      days_not_logged: win - logged,
      note: logged === 0 ? 'NOTHING logged in this window — the zeros mean no data, not necessarily a missed habit. Say so plainly.' : undefined,
      scores_newest_first: scores,
      days_5plus: scores.filter(s => s !== null && s >= 5).length,
      per_item: per,
    };
  }

  if (name === 'listCommitments') {
    let qs = 'status=eq.open&select=direction,counterparty,description,due_on,slip_count,promised_on&order=due_on.asc';
    if (input.direction) qs = 'direction=eq.' + input.direction + '&' + qs;
    try { return await read('commitments', qs); } catch (e) { return { error: 'commitments read failed: ' + e.message }; }
  }

  if (name === 'listTasks') {
    const rows = await read('tasks', 'done=eq.false&select=id,title,day,time,category,notes&order=day.asc&limit=200');
    const overdue = [], today = [], upcoming = [], undated = [];
    rows.forEach(r => {
      if (!r.day) return undated.push(r);
      if (r.day < t) overdue.push(r);
      else if (r.day === t) today.push(r);
      else upcoming.push(r);
    });
    return {
      today_date: t,
      counts: { overdue: overdue.length, today: today.length, upcoming: upcoming.length, undated: undated.length },
      overdue: overdue.slice(-25),
      today,
      upcoming: upcoming.slice(0, 25),
      undated: undated.slice(0, 15),
    };
  }

  if (name === 'listCompanies') {
    const rows = await read('projects', 'type=eq.work-company&select=name,status,category,revenue,expenses,month,last_contact,next_followup,notes&order=name.asc&limit=100');
    return {
      count: rows.length,
      note: 'All operational registered companies. Money fields are TEXT — parse before summing.',
      companies: rows.map(r => ({
        name: r.name, status: r.status, category: r.category,
        revenue: N(r.revenue) || null, expenses: N(r.expenses) || null,
        last_contact: r.last_contact || null, next_followup: r.next_followup || null,
        notes: (r.notes || '').slice(0, 200) || null,
      })),
    };
  }

  if (name === 'searchKnowledge') {
    const q = String(input.query || '').trim();
    if (!q) return { error: 'query required' };
    const limit = Math.min(Math.max(1, Number(input.limit) || 8), 25);
    const cols = input.full
      ? 'title,category,occurred_on,summary,content,source,entities'
      : 'title,category,occurred_on,summary,source,entities';
    // websearch_to_tsquery handles natural phrases and is forgiving of punctuation.
    const terms = encodeURIComponent(q.replace(/[()&|!:*']/g, ' ').trim());
    let qs = 'select=' + cols + '&tsv=wfts.' + terms + '&limit=' + limit + '&order=occurred_on.desc';
    if (input.category) qs += '&category=eq.' + encodeURIComponent(input.category);
    try {
      const rows = await read('knowledge', qs);
      if (!rows.length) return { query: q, hits: 0, note: 'Nothing found. The knowledge store may not be populated yet — say so rather than assuming the thing never happened.' };
      return { query: q, hits: rows.length, results: rows };
    } catch (e) {
      return { error: 'knowledge search failed: ' + e.message, note: 'If the table does not exist, the knowledge store has not been set up yet — tell Razin, do not claim there is no history.' };
    }
  }

  if (name === 'searchMemory') {
    const q = (input.query || '').trim();
    try {
      return await read('agent_memory', 'select=key,value,category' + (q ? '&or=(key.ilike.*' + encodeURIComponent(q) + '*,value.ilike.*' + encodeURIComponent(q) + '*)' : ''));
    } catch (e) { return { error: 'agent_memory read failed: ' + e.message }; }
  }

  return { error: 'unknown tool ' + name };
}

async function assembleContext(ctx) {
  const read = ctx.read;
  const errors = [];
  const grab = async (label, fn, fallback) => {
    try { return await fn(); } catch (e) { errors.push(label + ': ' + e.message); return fallback; }
  };

  const profile = (await grab('operator_profile', async () => (await read('operator_profile', 'id=eq.1'))[0], {})) || {};
  const memory = await grab('agent_memory', () => read('agent_memory', 'select=key,value,category'), []);

  const snap = {};
  snap.cash = await grab('cash', () => execTool(ctx, 'getCashPosition', {}), null);
  snap.habits = await grab('habits', () => execTool(ctx, 'getHabitStreaks', {}), null);
  await grab('commitments', async () => {
    const c = await read('commitments', 'status=eq.open&select=direction,slip_count');
    snap.open_commitments = c.length;
    snap.i_owe_open = c.filter(x => x.direction === 'i_owe').length;
    snap.owed_to_me_open = c.filter(x => x.direction === 'owed_to_me').length;
    snap.total_slips = c.reduce((s, x) => s + (x.slip_count || 0), 0);
  }, null);
  await grab('tasks', async () => { snap.open_tasks = (await read('tasks', 'done=eq.false&select=id')).length; }, null);
  await grab('projects', async () => {
    const p = await read('projects', 'select=id,status');
    snap.projects_total = p.length;
  }, null);
  await grab('life_goals', async () => {
    const g = await read('life_goals', 'select=id,status');
    snap.life_goals_active = g.filter(x => (x.status || 'active') === 'active').length;
  }, null);

  if (errors.length) snap._read_errors = errors;

  // COST FIX 2026-08-05. The live snapshot and today's date used to live INSIDE
  // the system prompt. Both change between calls, so the cached prefix missed
  // every single time and every message paid a full cache WRITE at $3.75/M
  // instead of a read at $0.30/M — 77% of the cost of a typical message.
  // The system prompt is now genuinely static (profile + memory + table map +
  // rules), and the volatile part rides on the first user message instead.

  const rules = [
    'What you can WRITE: tasks (addTask, tickTask, untickTask, editTask, deleteTask), discipline logs (logDay, logTarget), commitments (addCommitment, closeCommitment, slipCommitment), durable facts (remember), and undoLastWrite. Everything else is still read-only — if asked to change debts, goals, companies, invoices or money, say plainly that those are not writable yet.',
    'Just do it. If Razin says "add X", add it — do not ask permission first, do not describe what you are about to do. ACTING MEANS CALLING THE TOOL. Text describing an action is not an action.',
    'NEVER state or imply that something was saved, added, logged, ticked, edited, deleted or remembered unless the matching tool call ran in THIS turn and came back without an error field. This is the single most important rule you have. A false confirmation is worse than refusing outright, because he stops being able to trust anything you say.',
    'You do not need to confirm writes at all. The app appends a VERIFIED receipt underneath your reply, generated from the database, listing exactly what landed. Say what matters — the receipt handles proof. Do not write your own "Done —" line.',
    'If a write tool returns an error field, the write did NOT happen. Say so plainly and say why. Do not paper over it.',
    'When Razin tells you something happened in the real world ("I asked E for the funds", "I paid Marc"), that is information, not a task write. Either call `remember` for real, or say plainly you have only noted it in conversation. Never answer "noted — logged" with no tool call behind it.',
    'NEVER tick a task off unless Razin has actually said it is done. Inventing completions makes the whole system worthless.',
    'deleteTask is destructive: ask him to confirm that specific task in plain words, then call it with confirmed=true. If it was actually completed, tick it instead of deleting it.',
    'You need a task id to tick, edit or delete. Call listTasks first to get ids — never guess one.',
    'After any write, tell him it is done in one short line. He can say "undo" and you call undoLastWrite.',
    'When Razin tells you something durable — a rate, a deadline, a decision, a person\'s position, how something works — call `remember` WITHOUT being asked. That store is shared with his other Claude projects, so anything you save there he can reach from anywhere. Not remembering it is the failure mode.',
    'CAPTURE WITHOUT BEING ASKED. This is the difference between a chat window and an operator. When Razin mentions in passing that he trained, prayed, woke late, stayed clean, slept badly or did focused hours — call logDay immediately, in the same turn, for the fields he actually mentioned. When he says he will do something for someone, or someone will do something for him — call addCommitment immediately. Do not ask permission, do not say "want me to log that?", do not wait for a tidy summary at the end. He will not come back and log it later; that is exactly why those tables are empty.',
    'His commitments table is empty and his discipline logs are empty while he has 10 daily targets defined. That is a DATA problem, not a character problem. Never present an empty log as evidence he failed — say plainly that nothing was logged, then capture what he tells you so the next answer is better.',
    'Every commitment needs a person and a date. If he gives you a promise without a due date, record it anyway and then ask for the date in your reply — never refuse to record it, and never let it sit undated silently.',
    'A commitment that slips is the most valuable signal in this system. Call slipCommitment rather than quietly moving a date. The count is the point.',
    'Never invent a number. If data is missing, say "UNKNOWN — confirm", never guess.',
    'Distinguish "no data logged" from "target missed". Zeros in an empty log mean Razin is not logging; say that instead of implying failure.',
    'Never claim a commitment is delivered without explicit confirmation from Razin.',
    'Never reword or minimise a commitment or a slip to make things look better than they are.',
    'State the uncomfortable thing first. No flattery, no padding, no hedging. Be dense and specific.',
    'If you do not know where something lives, call listTables then readTable. Do NOT answer "I cannot see that" without checking first.',
    'searchKnowledge is the AUTHORITY on anything Razin has previously told you — prices, floor prices, contacts, suppliers, deadlines, contract terms, decisions. Before you say "UNKNOWN" about any such thing you MUST have searched it with the key nouns, and if the first search is empty you MUST try a second phrasing. An empty structured table (work_quotes, commitments, ledger) is NOT evidence a fact does not exist — most of his history lives in the knowledge store, not in those tables. Answering UNKNOWN when the answer was one search away is a serious failure.',
    'Use the tools to fetch exact figures rather than relying on the snapshot when precision matters.',
    'If a tool returns an _errors or error field, tell Razin the read failed — do not silently report zero.',
    'All money is British pounds (GBP). Always format money with £ — never $ or any other symbol. Use UK date format (e.g. 29 Jul 2026).',
    'Always end with a reply in words. Never return an empty message.',
  ];

  const volatile =
    'CURRENT STATE SNAPSHOT (' + todayISO() + '):\n' + JSON.stringify(snap) +
    '\n\nToday is ' + todayISO() + ' (Europe/London).';

  const system = (
    'You are Razin’s embedded operator agent inside his personal operating-system app, "12 World".\n\n' +
    'OPERATOR PROFILE (edited by Razin, this defines how you behave):\n' +
    'Goals: ' + (profile.goals || 'n/a') + '\n' +
    'Standards: ' + (profile.standards || 'n/a') + '\n' +
    'Tone: ' + (profile.tone || 'n/a') + '\n' +
    'How to speak to me: ' + (profile.speak_to_me || 'n/a') + '\n\n' +
    'DURABLE MEMORY:\n' + (memory.length ? memory.map(m => '- ' + m.key + ': ' + m.value + (m.category ? ' [' + m.category + ']' : '')).join('\n') : '- (none yet)') + '\n\n' +
    'DATA YOU CAN READ (use readTable for anything not covered by a specific tool):\n' +
    Object.entries(TABLE_MAP).map(([k, v]) => '- ' + k + ': ' + v).join('\n') + '\n\n' +
    'HARD RULES:\n' + rules.map(r => '- ' + r).join('\n')
  );

  return { system, volatile };
}

// Prompt caching. The system prompt is static and the conversation prefix only ever grows,
// so we set two cache breakpoints per request: one after the system prompt, one on the last
// content block. Cache reads bill at ~0.1x, which is the difference between this agent
// costing ~£0.20 a message and ~£0.03. Breakpoints are applied to COPIES so we never
// accumulate more than the 4 allowed.
function withCache(system, convo) {
  const sys = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  const msgs = convo.map(m => ({ ...m }));
  const last = msgs[msgs.length - 1];
  if (last) {
    if (typeof last.content === 'string') {
      last.content = [{ type: 'text', text: last.content, cache_control: { type: 'ephemeral' } }];
    } else if (Array.isArray(last.content) && last.content.length) {
      const blocks = last.content.map(b => ({ ...b }));
      const i = blocks.length - 1;
      blocks[i] = { ...blocks[i], cache_control: { type: 'ephemeral' } };
      last.content = blocks;
    }
  }
  return { sys, msgs };
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

// "check" mode — fast accountability gut-checks ("shall I eat this?", "can I take tonight off?").
// Same brain and same data, but answers in two lines against today rather than writing a report.
const CHECK_DIRECTIVE = '\n\nMODE: QUICK CHECK.\n' +
  'Razin is asking for a fast judgement call, not analysis. Rules for this reply:\n' +
  '- Lead with a straight verdict: YES, NO, or NOT YET. First word of the reply.\n' +
  '- Then at most two short lines of reason, anchored to TODAY — what is overdue, what he committed to, ' +
  'what time it is, what he has or has not logged. Reference the actual data, not general principles.\n' +
  '- Under 60 words total. No headings, no bullet lists, no preamble.\n' +
  '- If the honest answer is that he is avoiding something, say that.\n' +
  '- If it is genuinely fine, say YES cleanly and do not manufacture a caveat. He is rebuilding, not on trial.\n' +
  '- Only use tools if you actually need a figure. Speed matters more than completeness here.';


// ============================================================================
// TRUST LAYER (2026-08-04) — the agent is no longer allowed to say a write
// happened. Every claim is checked against the database before the reply ships.
//
// Three gates:
//   1. verifyActions()  — re-reads every audited write from Postgres. An action
//      only counts if the row is actually there (or actually gone, for deletes).
//   2. claimsWrite()    — detects "Done / added / logged / ticked / saved" style
//      language in the model's prose.
//   3. If (2) fires and (1) is empty, the model gets ONE forced correction turn.
//      If it still claims falsely, the reply ships with a NOTHING WAS WRITTEN
//      banner. The receipt at the bottom is generated by this file, not by the
//      model, so it cannot be hallucinated.
// ============================================================================

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtUK(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return String(iso || '');
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return Number(d) + ' ' + MONTHS[Number(m) - 1] + ' ' + y;
}

// High-precision claim patterns. REWRITTEN 2026-08-05 after the first version
// false-positived on ~30% of ordinary read-only text and wrecked the briefs.
//
// The lesson: a broad verb match is useless here. This app is ABOUT tasks, so
// "were added", "is logged", "was updated" appear constantly in legitimate
// read answers. A 4,000-token brief tripped it every single time.
//
// So: match only the agent asserting IT just performed an operation — first
// person, or a reply that OPENS with a confirmation. Passive and third-person
// constructions are deliberately not matched.
const CLAIM_PATTERNS = [
  /^\s*(?:✅\s*)?done[\s]*[—–:-]/i,                       // "Done — added X"
  /^\s*(?:✅\s*)?done[.!]?\s*$/i,                          // bare "Done."
  /^\s*noted\s*[—–:-]\s*(?:logged|saved|stored|remembered|added)/i,
  /^\s*confirmed\b[^.\n]{0,60}\b(?:added|logged|ticked|saved|deleted|created)\b/i,
  /\bI(?:'ve|’ve|\s+have)?\s+(?:just\s+)?(?:added|logged|ticked|un-?ticked|saved|stored|remembered|deleted|removed|created|scheduled)\b/i,
  /^\s*(?:added|logged|ticked|un-?ticked|saved|stored|remembered|deleted|removed|created|updated|edited)\s*[:—–-]/im,
  /^\s*(?:added|logged|ticked|un-?ticked|saved|stored|remembered|deleted|removed|created|updated|edited)\s+(?:it|that|this|the|your|a|an|to\s+your|"|“|\*\*)/im,
  /\b(?:added|put)\s+(?:it|that|this)\s+(?:to|on)\s+your\s+(?:list|tasks|task\s+list)\b/i,
  /\bit'?s\s+(?:now\s+)?(?:on|in)\s+your\s+(?:list|task\s+list)\b/i,
  /\btask\s+added\b/i,
];

export function claimsWrite(text) {
  if (!text) return false;
  const t = String(text);
  // Never let the code-generated receipt trip the detector that generates it.
  const body = t.split('———')[0];
  return CLAIM_PATTERNS.some(re => re.test(body));
}

// Re-read every audited write straight out of Postgres. Nothing is trusted from
// memory — if the row is not there, the write did not happen.
async function verifyActions(ctx) {
  const out = [];
  for (const a of ctx.actions || []) {
    let verified = false, detail = '';
    try {
      const act = await ctx.wdb.selectOne('agent_actions', a.id);
      if (!act) { detail = 'no audit row'; }
      else if (!act.target_table || act.target_id == null) { detail = 'no target recorded'; }
      else {
        const row = await ctx.wdb.selectOne(act.target_table, act.target_id);
        if (a.tool === 'deleteTask') { verified = !row; if (!verified) detail = 'row still present'; }
        else { verified = !!row; if (!verified) detail = 'row not found'; }
      }
    } catch (e) { detail = e.message; }
    out.push({ ...a, verified, verify_note: verified ? '' : detail });
  }
  return out;
}

// The receipt is written by CODE from verified database state. The model never
// touches it. If it is not in the receipt, it did not happen.
function buildReceipt(checked) {
  if (!checked.length) return '';
  const lines = checked.map(a => {
    if (!a.verified) return '❌ NOT SAVED — ' + (a.summary || a.tool) + (a.verify_note ? ' (' + a.verify_note + ')' : '');
    return '✅ ' + (a.summary || a.tool) + (a.where ? ' — ' + a.where : '');
  });
  return '\n\n———\nVERIFIED IN THE DATABASE JUST NOW:\n' + lines.join('\n');
}

// REWRITTEN 2026-08-05. The first version said "this is not from Razin, do not
// mention it to him" — which is structurally indistinguishable from a prompt
// injection, and the agent rightly refused to comply and told Razin about it.
// It was correct to. Never ask the agent to hide something from its own user.
const CORRECTION_PROMPT =
  'AUTOMATED WRITE CHECK — generated by the 12 World app itself, not typed by Razin.\n' +
  'Your last reply reads as a confirmation that you changed his data, but no write ' +
  'tool ran this turn, so nothing was saved.\n' +
  '- If he asked for a change: make the tool call now, this turn, then answer.\n' +
  '- If he did not ask for one, or the thing is not a task: answer again without any ' +
  'wording that implies something was saved. If he told you a durable fact worth ' +
  'keeping, call `remember` for real rather than saying "logged".\n' +
  'This check is not secret. You may tell Razin it happened if it is relevant.';

// Single exit point so every return path carries verified actions + a real receipt.
async function finish(ctx, { text, toolsUsed, usage, stop_reason }) {
  const checked = await verifyActions(ctx);
  const real = checked.filter(a => a.verified);
  let out = text || '';
  // Read-only runs (briefs, reports) are never gated — there is nothing to claim.
  if (!ctx.readOnly && !checked.length && claimsWrite(out)) {
    out = '⚠️ Heads up: this reply reads like a confirmation, but no write reached the ' +
          'database this turn. If you asked for something to be saved, it is NOT done — ' +
          'ask again and watch for a ✅ below the message.\n\n' + out;
  }
  out += buildReceipt(checked);
  return {
    text: out, toolsUsed, usage, actions: checked, stop_reason,
    writes: { attempted: checked.length, verified: real.length },
  };
}

// readOnly=true is used by every REPORT path (brief, ebrief, nudge). Those are
// summaries — they have no business writing, and running them under the write
// gate is what destroyed the E brief on 2026-08-05: a long report always
// contains completion language, so the gate fired on every single run.
// maxTokens is per-call since 2026-08-07. The default 4096 truncated the E brief
// the moment the decisions list stopped being capped at 3 — stop_reason came back
// max_tokens, the cache guard correctly refused to store a cut-off brief, and it
// then regenerated (87s) on every single open.
export async function runAgent({ messages, env, mode, readOnly = false, cheap = false, maxTokens }) {
  const outCap = maxTokens || MAX_TOKENS;
  const read = db(env);
  const ctx = { read, wdb: readOnly ? null : makeDb(env.url, env.key), actions: [], readOnly };
  const { system: baseSystem, volatile } = await assembleContext(ctx);
  let system = baseSystem;
  if (mode === 'check') system += CHECK_DIRECTIVE;
  if (readOnly) system += '\n\nMODE: READ-ONLY REPORT. You have no write tools this run. ' +
    'Do not offer to add, tick or save anything, and do not imply you have. ' +
    'Summarise and advise only. If something should be written, say Razin can ask you in Chat.';
  const convo = (messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));
  // Volatile state goes here, AFTER the cached system prefix, so live numbers
  // never invalidate the cache. Still read before anything the model says.
  if (convo.length) convo[0].content = volatile + '\n\n---\n\n' + convo[0].content;
  else convo.push({ role: 'user', content: volatile });
  const toolsUsed = [];
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
  let lastStop = null;
  let corrections = 0; // forced self-corrections used (trust layer)
  const WRITE_TOOL_NAMES = ['addTask','tickTask','untickTask','editTask','deleteTask','undoLastWrite','remember',
    'logDay','logTarget','addCommitment','closeCommitment','slipCommitment'];
  const activeTools = readOnly ? TOOLS.filter(t => !WRITE_TOOL_NAMES.includes(t.name)) : TOOLS;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const { sys, msgs } = withCache(system, convo);
    const resp = await callAnthropic(env, { model: cheap ? CHEAP_MODEL : MODEL, max_tokens: outCap, system: sys, tools: activeTools, messages: msgs });
    if (resp.usage) {
      usage.input_tokens += resp.usage.input_tokens || 0;
      usage.output_tokens += resp.usage.output_tokens || 0;
      usage.cache_read_tokens += resp.usage.cache_read_input_tokens || 0;
      usage.cache_write_tokens += resp.usage.cache_creation_input_tokens || 0;
    }
    lastStop = resp.stop_reason;
    const content = resp.content || [];
    const toolUses = content.filter(b => b.type === 'tool_use');
    const text = content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

    if (toolUses.length && resp.stop_reason === 'tool_use') {
      if (toolsUsed.length + toolUses.length > MAX_TOOL_CALLS) {
        return await finish(ctx, { text: (text ? text + '\n\n' : '') + '(stopped — hit the ' + MAX_TOOL_CALLS + ' tool-call cap. Narrow the question.)', toolsUsed, usage, stop_reason: 'tool_cap' });
      }
      convo.push({ role: 'assistant', content });
      const results = [];
      for (const tu of toolUses) {
        toolsUsed.push(tu.name);
        let out;
        try { out = await execTool(ctx, tu.name, tu.input || {}); }
        catch (e) { out = { error: e.message }; }
        const payload = JSON.stringify(out);
        results.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: payload.length > MAX_RESULT_CHARS
            ? payload.slice(0, MAX_RESULT_CHARS) + '\n…[truncated — narrow your columns/limit and read again if you need more]'
            : payload,
        });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }

    if (text) {
      // TRUST GATE: if the prose claims a change but nothing was actually written,
      // send it back once to either do it for real or retract. Never ship a lie
      // that looks like a confirmation.
      if (!readOnly && !ctx.actions.length && corrections < 1 && claimsWrite(text)) {
        corrections++;
        convo.push({ role: 'assistant', content: text });
        convo.push({ role: 'user', content: CORRECTION_PROMPT });
        continue;
      }
      return await finish(ctx, { text, toolsUsed, usage, stop_reason: resp.stop_reason });
    }

    // No text came back. Do NOT silently return "(no reply)" — say what actually happened.
    if (resp.stop_reason === 'max_tokens') {
      return await finish(ctx, { text: '⚠️ The reply was cut off before any text was produced (hit the ' + outCap + '-token output cap). Ask a narrower question.', toolsUsed, usage, stop_reason: 'max_tokens' });
    }
    return await finish(ctx, {
      text: '⚠️ The model returned no text (stop_reason: ' + (resp.stop_reason || 'unknown') + ', blocks: ' + (content.map(b => b.type).join(',') || 'none') + '). This is a bug, not an empty answer — tell Razin.',
      toolsUsed, usage, stop_reason: resp.stop_reason || 'empty',
    });
  }
  return await finish(ctx, { text: '⚠️ Stopped — hit the ' + MAX_TOOL_TURNS + '-turn tool loop cap without finishing. Last stop_reason: ' + lastStop + '.', toolsUsed, usage, stop_reason: 'turn_cap' });
}
