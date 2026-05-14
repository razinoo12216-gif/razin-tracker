// Razin Book — projects, expenses, recurring entries, weekly reviews.

const $ = (s) => document.querySelector(s);
const list = $('#list');
const editor = $('#editor');
const form = $('#editor-form');
const reviewEditor = $('#review-editor');
const reviewForm = $('#review-form');
const monthSelect = $('#month-select');
const secondaryFilter = $('#secondary-filter');
const filterBar = $('#filter-bar');

let entries = [];
let reviews = [];
let editingId = null;
let editingReviewId = null;
let selectedMonth = currentMonth();
let activeTab = 'project';

const EXPENSE_CATEGORIES = ['Operations','Marketing','Subscriptions','Transport','Food','Stock','Wages','Rent / Bills','Tax','Personal','Other'];
const PROJECT_STATUSES = ['Active','Paused','Completed'];
const SCORE_FIELDS = ['score_prayer','score_gym','score_nopmo','score_focus','score_sleep'];

function currentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function lastSundayISO() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function monthLabel(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function shortMonthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function weekLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return 'Week of ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseNum(s) {
  if (s === null || s === undefined || s === '') return 0;
  const cleaned = String(s).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function fmt(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return sign + '£' + Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function matchesMonth(entry, month) {
  if (entry.recurring) {
    if (entry.month && entry.month > month) return false;
    if (entry.end_month && entry.end_month < month) return false;
    return true;
  }
  return entry.month === month;
}

async function loadAll() {
  if (!window.SUPABASE_CONFIGURED) {
    list.innerHTML = '<div class="empty error">Supabase keys not set.</div>';
    return;
  }
  const [eRes, rRes] = await Promise.all([
    window.db.from('projects').select('*').order('created_at', { ascending: false }),
    window.db.from('reviews').select('*').order('week_of', { ascending: false }),
  ]);
  if (eRes.error) {
    list.innerHTML = `<div class="empty error">Load failed: ${esc(eRes.error.message)}</div>`;
    return;
  }
  entries = (eRes.data || []).map((p) => ({
    ...p,
    month: p.month || currentMonth(),
    type: p.type || 'project',
    recurring: !!p.recurring,
  }));
  // Reviews table may not exist yet on first run; tolerate the error
  reviews = (rRes && !rRes.error) ? (rRes.data || []) : [];
  rebuildMonthSelect();
  rebuildSecondaryFilter();
  render();
}

function rebuildMonthSelect() {
  const months = new Set(entries.map((e) => e.month).filter(Boolean));
  months.add(currentMonth());
  const sorted = [...months].sort().reverse();
  if (!sorted.includes(selectedMonth)) selectedMonth = sorted[0] || currentMonth();
  monthSelect.innerHTML = sorted
    .map((m) => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${monthLabel(m)}</option>`)
    .join('');
}

function rebuildSecondaryFilter() {
  if (activeTab === 'review') {
    filterBar.style.display = 'none';
    return;
  }
  filterBar.style.display = '';
  if (activeTab === 'project') {
    secondaryFilter.innerHTML = '<option value="">All status</option>' +
      PROJECT_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
  } else {
    secondaryFilter.innerHTML = '<option value="">All categories</option>' +
      EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  }
}

function render() {
  // Compute month-scoped entries (for tab counts and totals)
  const inMonth = entries.filter((e) => matchesMonth(e, selectedMonth));
  const projectsInMonth = inMonth.filter((e) => e.type === 'project');
  const expensesInMonth = inMonth.filter((e) => e.type === 'expense');

  let totalRev = 0, totalExp = 0;
  for (const e of inMonth) {
    totalRev += parseNum(e.revenue);
    totalExp += parseNum(e.expenses);
  }
  $('#t-rev').textContent = fmt(totalRev);
  $('#t-exp').textContent = fmt(totalExp);
  const net = totalRev - totalExp;
  const netEl = $('#t-net');
  netEl.textContent = fmt(net);
  netEl.classList.toggle('neg', net < 0);
  netEl.classList.toggle('pos', net > 0);
  $('#t-count').textContent = String(inMonth.length);

  $('#tc-project').textContent = String(projectsInMonth.length);
  $('#tc-expense').textContent = String(expensesInMonth.length);
  $('#tc-review').textContent = String(reviews.length);

  if (activeTab === 'review') {
    renderReviews();
    return;
  }

  const q = $('#search').value.trim().toLowerCase();
  const sf = secondaryFilter.value;
  const currentList = activeTab === 'project' ? projectsInMonth : expensesInMonth;

  const filtered = currentList.filter((e) => {
    if (sf) {
      const compare = activeTab === 'project' ? e.status : e.category;
      if (compare !== sf) return false;
    }
    if (!q) return true;
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q) ||
      (e.people || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    const noun = activeTab === 'project' ? 'projects' : 'expenses';
    list.innerHTML =
      currentList.length === 0
        ? `<div class="empty">No ${noun} in ${esc(monthLabel(selectedMonth))} yet. Hit <strong>+ New</strong>.</div>`
        : '<div class="empty">No matches.</div>';
    return;
  }

  list.innerHTML = filtered
    .map((e) => (e.type === 'expense' ? renderExpense(e) : renderProject(e)))
    .join('');

  list.querySelectorAll('.card').forEach((el) => {
    el.addEventListener('click', () => openEditor(el.dataset.id));
  });
}

function recurringTag(e) {
  if (!e.recurring) return '';
  const range = e.end_month
    ? `↻ Monthly through ${esc(shortMonthLabel(e.end_month))}`
    : '↻ Monthly';
  return `<span class="recurring-tag">${range}</span>`;
}

function renderProject(p) {
  const rev = parseNum(p.revenue);
  const exp = parseNum(p.expenses);
  const pnet = rev - exp;
  const netClass = pnet < 0 ? 'neg' : pnet > 0 ? 'pos' : '';
  const hasMoney = rev || exp;
  return `
    <div class="card" data-id="${esc(p.id)}">
      <div class="card-head">
        <h3>${esc(p.name)} ${recurringTag(p)}</h3>
        <span class="status ${esc((p.status || '').toLowerCase())}">${esc(p.status || '')}</span>
      </div>
      <div class="card-grid">
        <div><label>Revenue</label><span>${rev ? fmt(rev) : '—'}</span></div>
        <div><label>Expenses</label><span>${exp ? fmt(exp) : '—'}</span></div>
        <div><label>Net</label><span class="${netClass}">${hasMoney ? fmt(pnet) : '—'}</span></div>
      </div>
      ${p.people ? `<div class="block"><label>People</label><p>${esc(p.people)}</p></div>` : ''}
      ${p.tasks ? `<div class="block"><label>Tasks</label><p>${esc(p.tasks)}</p></div>` : ''}
      ${p.notes ? `<div class="block"><label>Notes</label><p>${esc(p.notes)}</p></div>` : ''}
    </div>`;
}

function renderExpense(e) {
  const amt = parseNum(e.expenses);
  return `
    <div class="card expense" data-id="${esc(e.id)}">
      <div class="card-head">
        <h3>${esc(e.name)} ${recurringTag(e)}</h3>
        <span class="status category">${esc(e.category || 'Other')}</span>
      </div>
      <div class="expense-amount neg">${fmt(amt)}</div>
      ${e.notes ? `<div class="block"><label>Notes</label><p>${esc(e.notes)}</p></div>` : ''}
    </div>`;
}

function renderReviews() {
  if (reviews.length === 0) {
    list.innerHTML = '<div class="empty">No reviews yet. Hit <strong>+ New</strong> to write your first Sunday review.</div>';
    return;
  }
  list.innerHTML = reviews.map(renderReview).join('');
  list.querySelectorAll('.card.review').forEach((el) => {
    el.addEventListener('click', () => openReviewEditor(el.dataset.id));
  });
}

function renderReview(r) {
  const scores = SCORE_FIELDS.map((k) => Number(r[k]) || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgClass = avg >= 7 ? 'pos' : avg <= 4 ? 'neg' : 'mid';
  const winsLine = (r.wins || '').split('\n')[0].trim();
  const winsPreview = winsLine.length > 90 ? winsLine.slice(0, 90) + '…' : winsLine;
  return `
    <div class="card review" data-id="${esc(r.id)}">
      <div class="card-head">
        <h3>${esc(weekLabel(r.week_of))}</h3>
        <span class="review-score ${avgClass}">${avg.toFixed(1)}<small>/10</small></span>
      </div>
      ${winsPreview ? `<div class="review-snippet"><label>Wins</label><p>${esc(winsPreview)}</p></div>` : ''}
      <div class="review-scores">
        <span>Prayer ${scores[0]}</span>
        <span>Gym ${scores[1]}</span>
        <span>NoPMO ${scores[2]}</span>
        <span>Focus ${scores[3]}</span>
        <span>Sleep ${scores[4]}</span>
      </div>
    </div>`;
}

// ─── Entry editor ───────────────────────────────────────────

function applyTypeMode(type) {
  const isExpense = type === 'expense';
  const config = {
    'status': !isExpense,
    'category': isExpense,
    'project-money': !isExpense,
    'expense-amount': isExpense,
    'people': !isExpense,
    'tasks': !isExpense,
  };
  for (const [field, show] of Object.entries(config)) {
    document.querySelectorAll(`#editor-form [data-field="${field}"]`).forEach((el) => {
      el.style.display = show ? '' : 'none';
      el.querySelectorAll('input, select, textarea').forEach((input) => { input.disabled = !show; });
    });
  }
}

function applyRecurringMode(isRecurring) {
  const endLabel = document.querySelector('#editor-form [data-field="end-month"]');
  endLabel.style.display = isRecurring ? '' : 'none';
  endLabel.querySelectorAll('input').forEach((i) => { i.disabled = !isRecurring; });
}

function openEditor(id, defaultType) {
  editingId = id || null;
  const existing = id ? entries.find((x) => x.id === id) : null;
  const type = existing ? (existing.type || 'project') : (defaultType || activeTab);

  form.reset();
  form.type.value = type;
  applyTypeMode(type);

  const noun = type === 'expense' ? 'expense' : 'project';
  $('#editor-title').textContent = (existing ? 'Edit ' : 'New ') + noun;
  $('#delete-btn').style.display = existing ? '' : 'none';

  const recurringCheck = $('#recurring-check');
  if (existing) {
    for (const k of ['name', 'status', 'category', 'revenue', 'expenses', 'tasks', 'people', 'notes', 'month', 'end_month']) {
      if (form[k]) form[k].value = existing[k] || '';
    }
    recurringCheck.checked = !!existing.recurring;
    if (!form.month.value) form.month.value = currentMonth();
  } else {
    if (type === 'project') form.status.value = 'Active';
    if (type === 'expense') form.category.value = 'Operations';
    form.month.value = selectedMonth || currentMonth();
    recurringCheck.checked = false;
  }
  applyRecurringMode(recurringCheck.checked);

  editor.showModal();
  setTimeout(() => form.name?.focus(), 50);
}

$('#recurring-check').addEventListener('change', (e) => applyRecurringMode(e.target.checked));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.SUPABASE_CONFIGURED) return;

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  payload.recurring = fd.has('recurring');
  if (!payload.month) payload.month = currentMonth();
  if (!payload.type) payload.type = 'project';
  if (!payload.end_month) payload.end_month = null;

  if (payload.type === 'expense') {
    payload.revenue = '';
    payload.status = '';
    payload.people = '';
    payload.tasks = '';
  } else {
    payload.category = '';
  }

  const op = editingId
    ? window.db.from('projects').update(payload).eq('id', editingId)
    : (() => {
        payload.id = (crypto.randomUUID && crypto.randomUUID()) ||
          Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        return window.db.from('projects').insert(payload);
      })();

  const { error } = await op;
  if (error) return alert('Save failed: ' + error.message);

  if (!payload.recurring) selectedMonth = payload.month;
  if (activeTab !== payload.type && (payload.type === 'project' || payload.type === 'expense')) {
    activeTab = payload.type;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
    rebuildSecondaryFilter();
  }
  editor.close();
  loadAll();
});

$('#cancel-btn').addEventListener('click', () => editor.close());

$('#delete-btn').addEventListener('click', async () => {
  if (!editingId) return;
  const target = entries.find((x) => x.id === editingId);
  const msg = target?.recurring
    ? 'Delete this recurring entry? It will disappear from EVERY month.'
    : 'Delete this entry? This cannot be undone.';
  if (!confirm(msg)) return;
  const { error } = await window.db.from('projects').delete().eq('id', editingId);
  if (error) return alert('Delete failed: ' + error.message);
  editor.close();
  loadAll();
});

// ─── Review editor ──────────────────────────────────────────

function openReviewEditor(id) {
  editingReviewId = id || null;
  const existing = id ? reviews.find((r) => r.id === id) : null;

  reviewForm.reset();
  $('#review-title').textContent = existing ? 'Edit Sunday Review' : 'New Sunday Review';
  $('#review-delete-btn').style.display = existing ? '' : 'none';

  if (existing) {
    for (const k of ['week_of','wins','losses','lessons','avoided','broken_word','money_in','money_out','priorities','gratitudes','dua','notes', ...SCORE_FIELDS]) {
      if (reviewForm[k]) reviewForm[k].value = existing[k] ?? '';
    }
  } else {
    reviewForm.week_of.value = lastSundayISO();
    SCORE_FIELDS.forEach((f) => { if (reviewForm[f]) reviewForm[f].value = ''; });
  }

  reviewEditor.showModal();
  setTimeout(() => reviewForm.wins?.focus(), 50);
}

reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.SUPABASE_CONFIGURED) return;

  const fd = new FormData(reviewForm);
  const payload = Object.fromEntries(fd.entries());
  // Coerce score fields to integers
  for (const k of SCORE_FIELDS) {
    const v = parseInt(payload[k], 10);
    payload[k] = isNaN(v) ? 0 : Math.max(0, Math.min(10, v));
  }

  const op = editingReviewId
    ? window.db.from('reviews').update(payload).eq('id', editingReviewId)
    : (() => {
        payload.id = (crypto.randomUUID && crypto.randomUUID()) ||
          Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        return window.db.from('reviews').insert(payload);
      })();

  const { error } = await op;
  if (error) return alert('Save failed: ' + error.message);

  reviewEditor.close();
  loadAll();
});

$('#review-cancel-btn').addEventListener('click', () => reviewEditor.close());

$('#review-delete-btn').addEventListener('click', async () => {
  if (!editingReviewId) return;
  if (!confirm('Delete this review? This cannot be undone.')) return;
  const { error } = await window.db.from('reviews').delete().eq('id', editingReviewId);
  if (error) return alert('Delete failed: ' + error.message);
  reviewEditor.close();
  loadAll();
});

// ─── Wiring ─────────────────────────────────────────────────

$('#add-btn').addEventListener('click', () => {
  if (activeTab === 'review') openReviewEditor(null);
  else openEditor(null, activeTab);
});

$('#search').addEventListener('input', render);
secondaryFilter.addEventListener('change', render);

monthSelect.addEventListener('change', (e) => {
  selectedMonth = e.target.value;
  render();
});

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    rebuildSecondaryFilter();
    render();
  });
});

[editor, reviewEditor].forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    const rect = dlg.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dlg.close();
  });
});

loadAll();
