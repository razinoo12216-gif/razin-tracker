// 12 World — projects, expenses, recurring entries, weekly reviews, monthly invoices.

const $ = (s) => document.querySelector(s);
const list = $('#list');
const editor = $('#editor');
const form = $('#editor-form');
const reviewEditor = $('#review-editor');
const reviewForm = $('#review-form');
const invoiceEditor = $('#invoice-editor');
const invoiceForm = $('#invoice-form');
const monthSelect = $('#month-select');
const secondaryFilter = $('#secondary-filter');
const filterBar = $('#filter-bar');

let entries = [];
let reviews = [];
let invoices = [];
let editingId = null;
let editingReviewId = null;
let editingInvoiceId = null;
let currentInvoiceSections = [];
let selectedMonth = currentMonth();
let activeTab = 'project';

const EXPENSE_CATEGORIES = ['Operations','Marketing','Subscriptions','Transport','Food','Stock','Wages','Rent / Bills','Tax','Personal','Other'];
const PROJECT_STATUSES = ['Active','Paused','Completed'];
const SCORE_FIELDS = ['score_prayer','score_gym','score_nopmo','score_focus','score_sleep'];
const DEFAULT_INVOICE_SECTIONS = [
  { title: 'Admin', body: '', total: '' },
  { title: 'Travel', body: '', total: '' },
  { title: 'Expenses', body: '', total: '' },
  { title: 'Directorship', body: '', total: '' },
];

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
  const [eRes, rRes, iRes] = await Promise.all([
    window.db.from('projects').select('*').order('created_at', { ascending: false }),
    window.db.from('reviews').select('*').order('week_of', { ascending: false }),
    window.db.from('invoices').select('*').order('month', { ascending: false }),
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
  reviews = (rRes && !rRes.error) ? (rRes.data || []) : [];
  invoices = (iRes && !iRes.error) ? (iRes.data || []) : [];
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
  if (activeTab === 'review' || activeTab === 'invoice') {
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
  $('#tc-invoice').textContent = String(invoices.length);

  if (activeTab === 'review') return renderReviews();
  if (activeTab === 'invoice') return renderInvoices();

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

function renderInvoices() {
  if (invoices.length === 0) {
    list.innerHTML = '<div class="empty">No invoices yet. Hit <strong>+ New</strong> to draft this month.</div>';
    return;
  }
  list.innerHTML = invoices.map(renderInvoice).join('');
  list.querySelectorAll('.card.invoice').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn')) return;
      openInvoiceEditor(el.dataset.id);
    });
  });
  list.querySelectorAll('.card.invoice .copy-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const inv = invoices.find((x) => x.id === btn.dataset.id);
      if (!inv) return;
      await copyInvoiceText(formatInvoiceForCopy(inv), btn);
    });
  });
}

function renderInvoice(inv) {
  const sections = inv.sections || [];
  const grand = sections.reduce((sum, s) => sum + parseNum(s.total), 0);
  const monthLbl = monthLabel(inv.month);
  const title = inv.title || monthLbl;
  return `
    <div class="card invoice" data-id="${esc(inv.id)}">
      <div class="card-head">
        <h3>${esc(title)}</h3>
        <div class="invoice-head-right">
          <span class="invoice-total">${fmt(grand)}</span>
          <button type="button" class="copy-btn" data-id="${esc(inv.id)}">Copy</button>
        </div>
      </div>
      <div class="invoice-sections-preview">
        ${sections.filter((s) => s.title || s.total).map((s) => `
          <div class="invoice-line">
            <span>${esc(s.title || '—')}</span>
            <span>${fmt(parseNum(s.total))}</span>
          </div>
        `).join('')}
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

// ─── Invoice editor ─────────────────────────────────────────

function renderInvoiceSections() {
  const container = $('#invoice-sections');
  container.innerHTML = currentInvoiceSections.map((s, idx) => `
    <div class="invoice-section-row" data-idx="${idx}">
      <div class="invoice-section-head">
        <input class="section-title" placeholder="Section name" value="${esc(s.title || '')}" autocomplete="off" />
        <input class="section-total" type="number" step="0.01" placeholder="0" inputmode="decimal" value="${esc(s.total ?? '')}" />
        <button type="button" class="remove-section" aria-label="Remove section">×</button>
      </div>
      <textarea class="section-body" rows="4" placeholder="One line per item — type freely">${esc(s.body || '')}</textarea>
    </div>
  `).join('');

  container.querySelectorAll('.invoice-section-row').forEach((row) => {
    const idx = parseInt(row.dataset.idx, 10);
    row.querySelector('.section-title').addEventListener('input', (e) => {
      currentInvoiceSections[idx].title = e.target.value;
    });
    row.querySelector('.section-total').addEventListener('input', (e) => {
      currentInvoiceSections[idx].total = e.target.value;
      recomputeInvoiceGrandTotal();
    });
    row.querySelector('.section-body').addEventListener('input', (e) => {
      currentInvoiceSections[idx].body = e.target.value;
    });
    row.querySelector('.remove-section').addEventListener('click', () => {
      if (!confirm('Remove this section?')) return;
      currentInvoiceSections.splice(idx, 1);
      renderInvoiceSections();
      recomputeInvoiceGrandTotal();
    });
  });
}

function recomputeInvoiceGrandTotal() {
  const total = currentInvoiceSections.reduce((sum, s) => sum + parseNum(s.total), 0);
  $('#invoice-grand-total-value').textContent = fmt(total);
}

function defaultInvoiceTitle(ym) {
  const month = monthLabel(ym).split(' ')[0];
  return `${month} Invoice Clean`;
}

function openInvoiceEditor(id) {
  editingInvoiceId = id || null;
  const existing = id ? invoices.find((x) => x.id === id) : null;

  invoiceForm.reset();
  $('#invoice-title').textContent = existing ? 'Edit Invoice' : 'New Invoice';
  $('#invoice-delete-btn').style.display = existing ? '' : 'none';

  if (existing) {
    invoiceForm.month.value = existing.month || selectedMonth;
    invoiceForm.title.value = existing.title || '';
    invoiceForm.final_message.value = existing.final_message || '';
    invoiceForm.notes.value = existing.notes || '';
    currentInvoiceSections = Array.isArray(existing.sections) && existing.sections.length
      ? JSON.parse(JSON.stringify(existing.sections))
      : JSON.parse(JSON.stringify(DEFAULT_INVOICE_SECTIONS));
  } else {
    invoiceForm.month.value = selectedMonth || currentMonth();
    invoiceForm.title.value = defaultInvoiceTitle(invoiceForm.month.value);
    invoiceForm.final_message.value = '';
    invoiceForm.notes.value = '';
    currentInvoiceSections = JSON.parse(JSON.stringify(DEFAULT_INVOICE_SECTIONS));
  }

  renderInvoiceSections();
  recomputeInvoiceGrandTotal();
  invoiceEditor.showModal();
  setTimeout(() => invoiceForm.title?.focus(), 50);
}

invoiceForm.month.addEventListener('change', (e) => {
  // Update title to match month if user hasn't customised it
  const t = invoiceForm.title.value.trim();
  if (!t || /Invoice Clean$/.test(t)) {
    invoiceForm.title.value = defaultInvoiceTitle(e.target.value);
  }
});

$('#add-section-btn').addEventListener('click', () => {
  currentInvoiceSections.push({ title: '', body: '', total: '' });
  renderInvoiceSections();
  recomputeInvoiceGrandTotal();
});

invoiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.SUPABASE_CONFIGURED) return;

  const payload = {
    month: invoiceForm.month.value || currentMonth(),
    title: invoiceForm.title.value.trim(),
    sections: currentInvoiceSections,
    final_message: invoiceForm.final_message.value,
    notes: invoiceForm.notes.value,
  };

  const op = editingInvoiceId
    ? window.db.from('invoices').update(payload).eq('id', editingInvoiceId)
    : (() => {
        payload.id = (crypto.randomUUID && crypto.randomUUID()) ||
          Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        return window.db.from('invoices').insert(payload);
      })();

  const { error } = await op;
  if (error) return alert('Save failed: ' + error.message);

  invoiceEditor.close();
  loadAll();
});

$('#invoice-cancel-btn').addEventListener('click', () => invoiceEditor.close());

$('#invoice-delete-btn').addEventListener('click', async () => {
  if (!editingInvoiceId) return;
  if (!confirm('Delete this invoice? This cannot be undone.')) return;
  const { error } = await window.db.from('invoices').delete().eq('id', editingInvoiceId);
  if (error) return alert('Delete failed: ' + error.message);
  invoiceEditor.close();
  loadAll();
});

$('#invoice-copy-btn').addEventListener('click', async (e) => {
  const inv = {
    title: invoiceForm.title.value.trim(),
    month: invoiceForm.month.value,
    sections: currentInvoiceSections,
    final_message: invoiceForm.final_message.value,
  };
  await copyInvoiceText(formatInvoiceForCopy(inv), e.currentTarget);
});

function formatInvoiceForCopy(inv) {
  const lines = [];
  const title = (inv.title || '').trim();
  if (title) {
    lines.push(title.replace(/:\s*$/, '') + ': ');
    lines.push('');
  }

  const sections = inv.sections || [];
  for (const s of sections) {
    const sTitle = (s.title || '').trim();
    if (!sTitle) continue;
    const total = parseNum(s.total);
    const totalStr = Number.isInteger(total) ? String(total) : total.toFixed(2);
    lines.push(`${sTitle}: ${totalStr}`);
    const body = (s.body || '').trim();
    if (body) {
      lines.push(body);
    }
    lines.push('');
  }

  const grand = sections.reduce((sum, s) => sum + parseNum(s.total), 0);
  const grandStr = Number.isInteger(grand) ? String(grand) : grand.toFixed(2);
  lines.push(`Total: ${grandStr}`);

  const finalMsg = (inv.final_message || '').trim();
  if (finalMsg) lines.push(finalMsg);

  return lines.join('\n');
}

async function copyInvoiceText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = 'Copied ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1500);
  } catch (e) {
    // Fallback: legacy approach via hidden textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    const original = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = original; }, 1500);
  }
}

// ─── Wiring ─────────────────────────────────────────────────

$('#add-btn').addEventListener('click', () => {
  if (activeTab === 'review') openReviewEditor(null);
  else if (activeTab === 'invoice') openInvoiceEditor(null);
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

[editor, reviewEditor, invoiceEditor].forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    const rect = dlg.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dlg.close();
  });
});

loadAll();
