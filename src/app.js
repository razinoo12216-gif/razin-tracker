// Razin Projects — month-grouped tracker with running totals.

const $ = (s) => document.querySelector(s);
const list = $('#list');
const editor = $('#editor');
const form = $('#editor-form');
const monthSelect = $('#month-select');

let projects = [];
let editingId = null;
let selectedMonth = currentMonth();

function currentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
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
  const abs = Math.abs(v);
  return sign + '£' + abs.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );

async function load() {
  if (!window.SUPABASE_CONFIGURED) {
    list.innerHTML =
      '<div class="empty error">Supabase keys not set. Open <code>src/supabase.js</code> and paste your <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code>.</div>';
    return;
  }
  const { data, error } = await window.db
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    list.innerHTML = `<div class="empty error">Load failed: ${esc(error.message)}</div>`;
    return;
  }
  projects = (data || []).map((p) => ({ ...p, month: p.month || currentMonth() }));
  rebuildMonthSelect();
  render();
}

function rebuildMonthSelect() {
  const months = new Set(projects.map((p) => p.month).filter(Boolean));
  months.add(currentMonth());
  const sorted = [...months].sort().reverse();
  if (!sorted.includes(selectedMonth)) selectedMonth = sorted[0] || currentMonth();
  monthSelect.innerHTML = sorted
    .map((m) => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${monthLabel(m)}</option>`)
    .join('');
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  const sf = $('#status-filter').value;
  const inMonth = projects.filter((p) => p.month === selectedMonth);

  let totalRev = 0, totalExp = 0;
  for (const p of inMonth) {
    totalRev += parseNum(p.revenue);
    totalExp += parseNum(p.expenses);
  }
  $('#t-rev').textContent = fmt(totalRev);
  $('#t-exp').textContent = fmt(totalExp);
  const net = totalRev - totalExp;
  const netEl = $('#t-net');
  netEl.textContent = fmt(net);
  netEl.classList.toggle('neg', net < 0);
  netEl.classList.toggle('pos', net > 0);
  $('#t-count').textContent = String(inMonth.length);

  const filtered = inMonth.filter((p) => {
    if (sf && p.status !== sf) return false;
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.people || '').toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    list.innerHTML =
      inMonth.length === 0
        ? `<div class="empty">No projects in ${esc(monthLabel(selectedMonth))} yet. Hit <strong>+ New</strong>.</div>`
        : '<div class="empty">No matches in this month.</div>';
    return;
  }

  list.innerHTML = filtered
    .map((p) => {
      const rev = parseNum(p.revenue);
      const exp = parseNum(p.expenses);
      const pnet = rev - exp;
      const netClass = pnet < 0 ? 'neg' : pnet > 0 ? 'pos' : '';
      const hasMoney = rev || exp;
      return `
    <div class="card" data-id="${esc(p.id)}">
      <div class="card-head">
        <h3>${esc(p.name)}</h3>
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
    })
    .join('');

  list.querySelectorAll('.card').forEach((el) => {
    el.addEventListener('click', () => openEditor(el.dataset.id));
  });
}

function openEditor(id) {
  editingId = id || null;
  const p = id ? projects.find((x) => x.id === id) : null;
  $('#editor-title').textContent = p ? 'Edit project' : 'New project';
  $('#delete-btn').style.display = p ? '' : 'none';
  form.reset();
  if (p) {
    for (const k of ['name', 'status', 'revenue', 'expenses', 'tasks', 'people', 'notes', 'month']) {
      if (form[k]) form[k].value = p[k] || '';
    }
    if (!form.month.value) form.month.value = currentMonth();
  } else {
    form.status.value = 'Active';
    form.month.value = selectedMonth || currentMonth();
  }
  editor.showModal();
  setTimeout(() => form.name?.focus(), 50);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.SUPABASE_CONFIGURED) return;

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  if (!payload.month) payload.month = currentMonth();

  if (editingId) {
    const { error } = await window.db.from('projects').update(payload).eq('id', editingId);
    if (error) return alert('Save failed: ' + error.message);
  } else {
    payload.id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const { error } = await window.db.from('projects').insert(payload);
    if (error) return alert('Save failed: ' + error.message);
  }
  selectedMonth = payload.month;
  editor.close();
  load();
});

$('#cancel-btn').addEventListener('click', () => editor.close());

$('#delete-btn').addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const { error } = await window.db.from('projects').delete().eq('id', editingId);
  if (error) return alert('Delete failed: ' + error.message);
  editor.close();
  load();
});

$('#add-btn').addEventListener('click', () => openEditor(null));
$('#search').addEventListener('input', render);
$('#status-filter').addEventListener('change', render);
monthSelect.addEventListener('change', (e) => {
  selectedMonth = e.target.value;
  render();
});

editor.addEventListener('click', (e) => {
  const rect = editor.getBoundingClientRect();
  const inside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;
  if (!inside) editor.close();
});

load();
