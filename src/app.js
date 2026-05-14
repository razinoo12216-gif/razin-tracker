// Razin Projects — single-file vanilla JS app on top of Supabase.

const $ = (s) => document.querySelector(s);
const list = $('#list');
const editor = $('#editor');
const form = $('#editor-form');

let projects = [];
let editingId = null;

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
  projects = data || [];
  render();
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  const sf = $('#status-filter').value;
  const filtered = projects.filter((p) => {
    if (sf && p.status !== sf) return false;
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.people || '').toLowerCase().includes(q)
    );
  });

  $('#stat-total').textContent = projects.length;
  $('#stat-active').textContent = projects.filter((p) => p.status === 'Active').length;

  if (filtered.length === 0) {
    list.innerHTML =
      projects.length === 0
        ? '<div class="empty">No projects yet. Hit <strong>+ New</strong> to add one.</div>'
        : '<div class="empty">No matches.</div>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (p) => `
    <div class="card" data-id="${esc(p.id)}">
      <div class="card-head">
        <h3>${esc(p.name)}</h3>
        <span class="status ${esc((p.status || '').toLowerCase())}">${esc(p.status || '')}</span>
      </div>
      <div class="card-grid">
        <div><label>Revenue</label><span>${esc(p.revenue || '—')}</span></div>
        <div><label>Expenses</label><span>${esc(p.expenses || '—')}</span></div>
        <div><label>People</label><span class="trunc">${esc(p.people || '—')}</span></div>
      </div>
      ${p.tasks ? `<div class="block"><label>Tasks</label><p>${esc(p.tasks)}</p></div>` : ''}
      ${p.notes ? `<div class="block"><label>Notes</label><p>${esc(p.notes)}</p></div>` : ''}
    </div>`
    )
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
    for (const k of ['name', 'status', 'revenue', 'expenses', 'tasks', 'people', 'notes']) {
      if (form[k]) form[k].value = p[k] || '';
    }
  } else {
    form.status.value = 'Active';
  }
  editor.showModal();
  setTimeout(() => form.name?.focus(), 50);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.SUPABASE_CONFIGURED) return;

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

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

// Close on backdrop click
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
