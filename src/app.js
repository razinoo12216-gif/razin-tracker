// 12 World — projects, potentials, expenses, invoices, reviews.

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
let tasks = [];
let editingId = null;
let editingReviewId = null;
let editingInvoiceId = null;
let editingTaskId = null;
let currentInvoiceSections = [];
let selectedMonth = currentMonth();
let selectedDay = todayISO();
let activeTab = 'today';

const taskEditor = $('#task-editor');
const taskForm = $('#task-form');

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function shiftISO(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const EXPENSE_CATEGORIES = ['Operations','Marketing','Subscriptions','Transport','Food','Stock','Wages','Rent / Bills','Tax','Personal','Other'];
const PROJECT_STATUSES = ['Active','Paused','Completed'];
const POTENTIAL_STATUSES = ['Lead','Pitching','Negotiating','Waiting on Green','Won','Lost'];
const SCORE_FIELDS = ['score_prayer','score_gym','score_nopmo','score_focus','score_sleep'];
const DEFAULT_INVOICE_SECTIONS = [
  { title: 'Admin', body: '', total: '' },
  { title: 'Travel', body: '', total: '' },
  { title: 'Expenses', body: '', total: '' },
  { title: 'Directorship', body: '', total: '' },
];

const QUOTES = [
  { q: "Discipline equals freedom.", a: "Jocko Willink" },
  { q: "The pain you feel today will be the strength you feel tomorrow.", a: "Arnold Schwarzenegger" },
  { q: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", a: "Aristotle" },
  { q: "Discipline is choosing between what you want now and what you want most.", a: "Abraham Lincoln" },
  { q: "Don't count the days. Make the days count.", a: "Muhammad Ali" },
  { q: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius" },
  { q: "First we make our habits, then our habits make us.", a: "John Dryden" },
  { q: "Every action you take is a vote for the type of person you wish to become.", a: "James Clear" },
  { q: "The successful warrior is the average man, with laser-like focus.", a: "Bruce Lee" },
  { q: "What you do every day matters more than what you do once in a while.", a: "Gretchen Rubin" },
  { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson" },
  { q: "Verily, with hardship comes ease.", a: "Quran 94:6" },
  { q: "Do not lose hope, nor be sad.", a: "Quran 3:139" },
  { q: "Tie your camel first, then trust in Allah.", a: "Prophet Muhammad ﷺ" },
  { q: "Whoever fears Allah, He will make a way out for them.", a: "Quran 65:2" },
  { q: "Allah does not burden a soul beyond that it can bear.", a: "Quran 2:286" },
  { q: "The strongest among you is the one who controls himself when angry.", a: "Prophet Muhammad ﷺ" },
  { q: "Whoever is patient will be granted patience.", a: "Prophet Muhammad ﷺ" },
  { q: "The best among you are those who have the best character.", a: "Prophet Muhammad ﷺ" },
  { q: "Whoever does not show mercy to people, Allah will not show mercy to him.", a: "Prophet Muhammad ﷺ" },
  { q: "Speak good or remain silent.", a: "Prophet Muhammad ﷺ" },
  { q: "Take account of yourselves before you are taken to account.", a: "Umar ibn al-Khattab (RA)" },
  { q: "Sell or be sold.", a: "Grant Cardone" },
  { q: "Be so good they can't ignore you.", a: "Steve Martin" },
  { q: "Stay hungry. Stay foolish.", a: "Steve Jobs" },
  { q: "The way to get started is to quit talking and begin doing.", a: "Walt Disney" },
  { q: "You will get all you want in life if you help enough other people get what they want.", a: "Zig Ziglar" },
  { q: "Comparison is the thief of joy.", a: "Theodore Roosevelt" },
  { q: "Don't be afraid to give up the good to go for the great.", a: "John D. Rockefeller" },
  { q: "Quality is never an accident. It is the result of intelligent effort.", a: "John Ruskin" },
  { q: "What gets measured gets managed.", a: "Peter Drucker" },
  { q: "Diligence is the mother of good fortune.", a: "Benjamin Franklin" },
  { q: "The reward for work well done is the opportunity to do more.", a: "Jonas Salk" },
  { q: "An ounce of action is worth a ton of theory.", a: "Friedrich Engels" },
  { q: "A goal without a plan is just a wish.", a: "Antoine de Saint-Exupéry" },
  { q: "Whether you think you can or you think you can't, you're right.", a: "Henry Ford" },
  { q: "Doubt kills more dreams than failure ever will.", a: "Suzy Kassem" },
  { q: "He who has a why to live can bear almost any how.", a: "Friedrich Nietzsche" },
  { q: "The cave you fear to enter holds the treasure you seek.", a: "Joseph Campbell" },
  { q: "If it is to be, it is up to me.", a: "William H. Johnsen" },
  { q: "We suffer more in imagination than in reality.", a: "Seneca" },
  { q: "You have power over your mind — not outside events. Realize this, and you will find strength.", a: "Marcus Aurelius" },
  { q: "What we do in life echoes in eternity.", a: "Marcus Aurelius" },
  { q: "It always seems impossible until it's done.", a: "Nelson Mandela" },
  { q: "Hard times create strong men. Strong men create good times.", a: "G. Michael Hopf" },
  { q: "The world breaks everyone, and afterward, many are strong at the broken places.", a: "Ernest Hemingway" },
  { q: "The best time to plant a tree was 20 years ago. The second best time is now.", a: "Chinese proverb" },
  { q: "Don't let yesterday take up too much of today.", a: "Will Rogers" },
  { q: "You miss 100% of the shots you don't take.", a: "Wayne Gretzky" },
  { q: "The expert in anything was once a beginner.", a: "Helen Hayes" },
  { q: "The man who moves a mountain begins by carrying away small stones.", a: "Confucius" },
  { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
  { q: "Begin with the end in mind.", a: "Stephen Covey" },
  { q: "Talent is cheaper than table salt. What separates the talented from the successful is a lot of hard work.", a: "Stephen King" },
  { q: "When you have a choice and don't make it, that is in itself a choice.", a: "William James" },
  { q: "Make peace with the fact that saying no often requires trading popularity for respect.", a: "Greg McKeown" },
  { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
  { q: "The only person you are destined to become is the person you decide to be.", a: "Ralph Waldo Emerson" },
  { q: "I have not failed. I've just found 10,000 ways that won't work.", a: "Thomas Edison" },
  { q: "Pressure is a privilege.", a: "Billie Jean King" },
  { q: "Eat the frog first thing in the morning.", a: "Mark Twain" },
  { q: "If you cannot do great things, do small things in a great way.", a: "Napoleon Hill" },
  { q: "Don't compare your beginning to someone else's middle.", a: "Tim Hiller" },
  { q: "Action is the antidote to despair.", a: "Joan Baez" },
  { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
  { q: "Live as if you were to die tomorrow. Learn as if you were to live forever.", a: "Mahatma Gandhi" },
];

function currentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function lastFridayISO() {
  // Returns the most recent Friday (today if today is Friday).
  const d = new Date();
  const diff = (d.getDay() - 5 + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  return 'Week ending ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
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

function isStalePotential(p) {
  if (!p || p.status === 'Won' || p.status === 'Lost') return false;
  const today = todayISO();
  if (p.next_followup && p.next_followup < today) return true;
  if (p.last_contact) {
    if (daysBetween(p.last_contact, today) > 14) return true;
  } else if (p.created_at) {
    const createdISO = p.created_at.slice(0, 10);
    if (daysBetween(createdISO, today) > 7) return true;
  }
  return false;
}

async function loadAll() {
  if (!window.SUPABASE_CONFIGURED) {
    list.innerHTML = '<div class="empty error">Supabase keys not set.</div>';
    return;
  }
  const [eRes, rRes, iRes, tRes] = await Promise.all([
    window.db.from('projects').select('*').order('created_at', { ascending: false }),
    window.db.from('reviews').select('*').order('week_of', { ascending: false }),
    window.db.from('invoices').select('*').order('month', { ascending: false }),
    window.db.from('tasks').select('*').order('created_at', { ascending: true }),
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
  tasks = (tRes && !tRes.error) ? (tRes.data || []) : [];
  rebuildMonthSelect();
  rebuildSecondaryFilter();
  render();
}

function rebuildMonthSelect() {
  const months = new Set(entries.filter(e => e.type !== 'potential').map((e) => e.month).filter(Boolean));
  months.add(currentMonth());
  const sorted = [...months].sort().reverse();
  if (!sorted.includes(selectedMonth)) selectedMonth = sorted[0] || currentMonth();
  monthSelect.innerHTML = sorted
    .map((m) => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${monthLabel(m)}</option>`)
    .join('');
}

function rebuildSecondaryFilter() {
  if (activeTab === 'review' || activeTab === 'invoice' || activeTab === 'drive' || activeTab === 'today') {
    filterBar.style.display = 'none';
    return;
  }
  filterBar.style.display = '';
  if (activeTab === 'project') {
    secondaryFilter.innerHTML = '<option value="">All status</option>' +
      PROJECT_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
  } else if (activeTab === 'potential') {
    secondaryFilter.innerHTML = '<option value="">All stages</option>' +
      POTENTIAL_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
  } else {
    secondaryFilter.innerHTML = '<option value="">All categories</option>' +
      EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  }
}

function setTotalsLabels(labels) {
  const els = document.querySelectorAll('.totals-item label');
  els.forEach((el, i) => { if (labels[i] !== undefined) el.textContent = labels[i]; });
}

function clearTotalSpanClasses() {
  ['#t-rev', '#t-exp', '#t-net', '#t-count'].forEach((s) => {
    const el = $(s);
    if (el) el.className = '';
  });
}

function renderMoneyTotals(inMonth) {
  setTotalsLabels(['Revenue', 'Expenses', 'Net', 'Entries']);
  clearTotalSpanClasses();
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
}

function renderPotentialTotals(potentials) {
  setTotalsLabels(['Pipeline', 'Active', 'Stale', 'Won']);
  clearTotalSpanClasses();
  const active = potentials.filter((p) => p.status !== 'Won' && p.status !== 'Lost');
  const pipelineSum = active.reduce((sum, p) => sum + parseNum(p.revenue), 0);
  const wonSum = potentials
    .filter((p) => p.status === 'Won')
    .reduce((sum, p) => sum + parseNum(p.revenue), 0);
  const staleCount = potentials.filter(isStalePotential).length;

  const rev = $('#t-rev');
  rev.textContent = fmt(pipelineSum);
  rev.classList.add('pipeline');

  $('#t-exp').textContent = String(active.length);

  const stale = $('#t-net');
  stale.textContent = String(staleCount);
  if (staleCount > 0) stale.classList.add('amber');

  const won = $('#t-count');
  won.textContent = fmt(wonSum);
  if (wonSum > 0) won.classList.add('pos');
}

function render() {
  // Month-scoped entries (projects/expenses use month, potentials/reviews/invoices ignore)
  const moneyEntries = entries.filter((e) => e.type !== 'potential');
  const inMonth = moneyEntries.filter((e) => matchesMonth(e, selectedMonth));
  const projectsInMonth = inMonth.filter((e) => e.type === 'project');
  const expensesInMonth = inMonth.filter((e) => e.type === 'expense');
  const potentials = entries.filter((e) => e.type === 'potential');

  if (activeTab === 'potential') {
    renderPotentialTotals(potentials);
  } else {
    renderMoneyTotals(inMonth);
  }

  $('#tc-project').textContent = String(projectsInMonth.length);
  $('#tc-expense').textContent = String(expensesInMonth.length);
  $('#tc-potential').textContent = String(potentials.filter(p => p.status !== 'Won' && p.status !== 'Lost').length);
  $('#tc-review').textContent = String(reviews.length);
  $('#tc-invoice').textContent = String(invoices.length);

  // Hide/show header bits based on tab
  const totalsEl = document.querySelector('.totals');
  const monthSelEl = $('#month-select');
  const addBtnEl = $('#add-btn');
  const hideContext = activeTab === 'drive' || activeTab === 'today';
  if (totalsEl) totalsEl.style.display = hideContext ? 'none' : '';
  if (monthSelEl) monthSelEl.style.display = hideContext ? 'none' : '';
  if (addBtnEl) addBtnEl.style.display = activeTab === 'today' ? 'none' : '';

  if (activeTab === 'today') return renderToday();
  if (activeTab === 'drive') return renderDrive();
  if (activeTab === 'review') return renderReviews();
  if (activeTab === 'invoice') return renderInvoices();
  if (activeTab === 'potential') return renderPotentials(potentials);

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

function renderPotentials(potentials) {
  const q = $('#search').value.trim().toLowerCase();
  const sf = secondaryFilter.value;
  const filtered = potentials.filter((p) => {
    if (sf && p.status !== sf) return false;
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.people || '').toLowerCase().includes(q)
    );
  });

  // Stable sort: stale first, then by status priority, then by next_followup soonest
  const statusOrder = { Lead: 1, Pitching: 2, Negotiating: 3, 'Waiting on Green': 4, Won: 5, Lost: 6 };
  filtered.sort((a, b) => {
    const sA = isStalePotential(a) ? 0 : statusOrder[a.status] || 7;
    const sB = isStalePotential(b) ? 0 : statusOrder[b.status] || 7;
    if (sA !== sB) return sA - sB;
    const nA = a.next_followup || '9999-12-31';
    const nB = b.next_followup || '9999-12-31';
    return nA.localeCompare(nB);
  });

  if (filtered.length === 0) {
    list.innerHTML = potentials.length === 0
      ? '<div class="empty">Chop list is empty. Hit <strong>+ New</strong> to log a deal you want to chase.</div>'
      : '<div class="empty">No matches.</div>';
    return;
  }

  list.innerHTML = filtered.map(renderPotential).join('');
  list.querySelectorAll('.card.potential').forEach((el) => {
    el.addEventListener('click', () => openEditor(el.dataset.id));
  });
}

function renderPotential(p) {
  const value = parseNum(p.revenue);
  const stale = isStalePotential(p);
  const statusClass = (p.status || 'Lead').toLowerCase().replace(/\s+/g, '-');
  const tags = [];
  if (stale) tags.push('<span class="stale-tag">⚠ Stale</span>');
  if (p.converted) tags.push('<span class="converted-tag">✓ In Projects</span>');
  return `
    <div class="card potential ${stale ? 'stale' : ''}" data-id="${esc(p.id)}">
      <div class="card-head">
        <h3>${esc(p.name)} ${tags.join(' ')}</h3>
        <span class="status potential-status ${statusClass}">${esc(p.status || 'Lead')}</span>
      </div>
      <div class="card-grid">
        <div><label>Est. value</label><span>${value ? fmt(value) : '—'}</span></div>
        <div><label>Last contact</label><span>${p.last_contact ? esc(shortDate(p.last_contact)) : '—'}</span></div>
        <div><label>Next follow-up</label><span class="${stale && p.next_followup ? 'neg' : ''}">${p.next_followup ? esc(shortDate(p.next_followup)) : '—'}</span></div>
      </div>
      ${p.people ? `<div class="block"><label>Source / contacts</label><p>${esc(p.people)}</p></div>` : ''}
      ${p.notes ? `<div class="block"><label>Notes</label><p>${esc(p.notes)}</p></div>` : ''}
    </div>`;
}

function dayOfYear() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function renderDrive() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const idx = ((dayOfYear() % QUOTES.length) + QUOTES.length) % QUOTES.length;
  const q = QUOTES[idx];
  list.innerHTML = `
    <div class="drive-page">
      <div class="drive-date">${esc(dateStr)}</div>
      <blockquote class="drive-quote">${esc(q.q)}</blockquote>
      <div class="drive-author">— ${esc(q.a)}</div>
      <div class="drive-prompt">What does this look like in your day today?</div>
    </div>`;
}

function taskSort(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const at = a.time || '99:99';
  const bt = b.time || '99:99';
  if (at !== bt) return at.localeCompare(bt);
  return (a.created_at || '').localeCompare(b.created_at || '');
}

function formatDayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  const t = todayISO();
  let prefix = '';
  if (iso === t) prefix = 'Today · ';
  else if (iso === shiftISO(t, -1)) prefix = 'Yesterday · ';
  else if (iso === shiftISO(t, 1)) prefix = 'Tomorrow · ';
  return prefix + d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderToday() {
  const dayTasks = tasks.filter((t) => t.day === selectedDay).sort(taskSort);
  const done = dayTasks.filter((t) => t.done).length;
  const total = dayTasks.length;
  const isToday = selectedDay === todayISO();
  const dateLabel = formatDayLabel(selectedDay);

  list.innerHTML = `
    <div class="today-page">
      <div class="today-header">
        <h2 class="today-date">${esc(dateLabel)}</h2>
        <div class="today-progress">${total > 0 ? `${done} of ${total} done` : 'No tasks yet'}</div>
        <div class="today-nav">
          <button type="button" class="day-nav" id="day-prev" aria-label="Previous day">←</button>
          <button type="button" class="day-nav today-btn" id="day-today">${isToday ? 'Today' : 'Jump to today'}</button>
          <button type="button" class="day-nav" id="day-next" aria-label="Next day">→</button>
        </div>
      </div>
      <div class="today-list">
        ${dayTasks.length === 0 ? `<div class="today-empty">Empty list. Add your first task below, or tap "Copy yesterday".</div>` : ''}
        ${dayTasks.map(renderTask).join('')}
      </div>
      <div class="task-add-bar">
        <input id="task-quick-input" type="text" placeholder="Add task…" autocomplete="off" />
        <input id="task-quick-time" type="time" />
        <button id="task-quick-btn" type="button">Add</button>
      </div>
      <div class="today-actions">
        <button type="button" class="ghost" id="copy-yesterday-btn">Copy yesterday's tasks</button>
      </div>
    </div>`;

  $('#day-prev').addEventListener('click', () => { selectedDay = shiftISO(selectedDay, -1); render(); });
  $('#day-next').addEventListener('click', () => { selectedDay = shiftISO(selectedDay, 1); render(); });
  $('#day-today').addEventListener('click', () => { selectedDay = todayISO(); render(); });

  list.querySelectorAll('.task-check').forEach((el) => {
    el.addEventListener('click', (e) => { e.stopPropagation(); toggleTask(el.dataset.id); });
  });
  list.querySelectorAll('.task-row').forEach((el) => {
    el.addEventListener('click', () => openTaskEditor(el.dataset.id));
  });

  $('#task-quick-btn').addEventListener('click', quickAddTask);
  const quickInput = $('#task-quick-input');
  quickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); quickAddTask(); }
  });
  $('#copy-yesterday-btn').addEventListener('click', copyYesterdayTasks);
}

function renderTask(t) {
  const timeHtml = t.time ? esc(t.time) : '';
  return `
    <div class="task-row ${t.done ? 'done' : ''}" data-id="${esc(t.id)}">
      <button type="button" class="task-check" data-id="${esc(t.id)}" aria-label="Toggle done">${t.done ? '✓' : ''}</button>
      <div class="task-time">${timeHtml}</div>
      <div class="task-title">${esc(t.title)}</div>
    </div>`;
}

async function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  const newDone = !t.done;
  t.done = newDone;
  const row = list.querySelector(`.task-row[data-id="${CSS.escape(id)}"]`);
  if (row) {
    row.classList.toggle('done', newDone);
    const check = row.querySelector('.task-check');
    if (check) check.textContent = newDone ? '✓' : '';
  }
  const dayTasks = tasks.filter((x) => x.day === selectedDay);
  const done = dayTasks.filter((x) => x.done).length;
  const progressEl = list.querySelector('.today-progress');
  if (progressEl) progressEl.textContent = dayTasks.length > 0 ? `${done} of ${dayTasks.length} done` : 'No tasks yet';

  const { error } = await window.db.from('tasks').update({ done: newDone }).eq('id', id);
  if (error) { t.done = !newDone; alert('Update failed: ' + error.message); render(); }
}

async function quickAddTask() {
  const titleInput = $('#task-quick-input');
  const timeInput = $('#task-quick-time');
  const title = titleInput.value.trim();
  if (!title) return;
  const time = timeInput.value || '';
  const id = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const newTask = { id, day: selectedDay, title, time, icon: '', notes: '', done: false };
  tasks.push({ ...newTask, created_at: new Date().toISOString() });
  titleInput.value = '';
  timeInput.value = '';
  render();
  setTimeout(() => $('#task-quick-input')?.focus(), 30);

  const { error } = await window.db.from('tasks').insert(newTask);
  if (error) {
    tasks = tasks.filter((t) => t.id !== id);
    render();
    alert('Add failed: ' + error.message);
  }
}

async function copyYesterdayTasks() {
  const yesterday = shiftISO(selectedDay, -1);
  const yesterdayTasks = tasks.filter((t) => t.day === yesterday);
  if (yesterdayTasks.length === 0) {
    alert("Nothing to copy from " + formatDayLabel(yesterday).replace(/ ·.*/, '') + ".");
    return;
  }
  const copies = yesterdayTasks.map((t) => ({
    id: (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    day: selectedDay,
    title: t.title,
    time: t.time || '',
    icon: t.icon || '',
    notes: t.notes || '',
    done: false,
  }));
  const { data, error } = await window.db.from('tasks').insert(copies).select();
  if (error) return alert('Copy failed: ' + error.message);
  for (const t of (data || copies)) tasks.push({ ...t, created_at: t.created_at || new Date().toISOString() });
  render();
}

function openTaskEditor(id) {
  editingTaskId = id || null;
  const t = id ? tasks.find((x) => x.id === id) : null;
  taskForm.reset();
  $('#task-editor-title').textContent = t ? 'Edit task' : 'New task';
  $('#task-delete-btn').style.display = t ? '' : 'none';
  if (t) {
    taskForm.title.value = t.title || '';
    taskForm.time.value = t.time || '';
    taskForm.notes.value = t.notes || '';
  }
  taskEditor.showModal();
  setTimeout(() => taskForm.title?.focus(), 50);
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingTaskId) { taskEditor.close(); return; }
  const fd = new FormData(taskForm);
  const payload = Object.fromEntries(fd.entries());
  if (!payload.title.trim()) return;
  const t = tasks.find((x) => x.id === editingTaskId);
  if (t) Object.assign(t, payload);
  render();
  const { error } = await window.db.from('tasks').update(payload).eq('id', editingTaskId);
  if (error) alert('Save failed: ' + error.message);
  taskEditor.close();
});

$('#task-cancel-btn').addEventListener('click', () => taskEditor.close());

$('#task-delete-btn').addEventListener('click', async () => {
  if (!editingTaskId) return;
  if (!confirm('Delete this task?')) return;
  const id = editingTaskId;
  tasks = tasks.filter((t) => t.id !== id);
  render();
  const { error } = await window.db.from('tasks').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); loadAll(); }
  taskEditor.close();
});

taskEditor.addEventListener('click', (e) => {
  const rect = taskEditor.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) taskEditor.close();
});

function renderReviews() {
  if (reviews.length === 0) {
    list.innerHTML = '<div class="empty">No recaps yet. Hit <strong>+ New</strong> to write your first weekly recap.</div>';
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
  const isProject = type === 'project';
  const isExpense = type === 'expense';
  const isPotential = type === 'potential';

  const config = {
    'status': isProject || isPotential,
    'category': isExpense,
    'project-money': isProject,
    'expense-amount': isExpense,
    'potential-money': isPotential,
    'potential-dates': isPotential,
    'recurring-block': !isPotential,
    'people': !isExpense,
    'tasks': isProject,
  };

  for (const [field, show] of Object.entries(config)) {
    document.querySelectorAll(`#editor-form [data-field="${field}"]`).forEach((el) => {
      el.style.display = show ? '' : 'none';
      el.querySelectorAll('input, select, textarea').forEach((input) => { input.disabled = !show; });
    });
  }

  // Swap status options
  const statusSel = form.querySelector('select[name="status"]');
  if (statusSel) {
    const current = statusSel.value;
    if (isPotential) {
      statusSel.innerHTML = POTENTIAL_STATUSES.map((s) => `<option>${esc(s)}</option>`).join('');
    } else if (isProject) {
      statusSel.innerHTML = PROJECT_STATUSES.map((s) => `<option>${esc(s)}</option>`).join('');
    }
    if (current && [...statusSel.options].some((o) => o.value === current)) statusSel.value = current;
  }

  // Rename "People" → "Source / contacts" for potentials
  const peopleLabel = document.querySelector('#editor-form [data-field="people"]');
  if (peopleLabel && peopleLabel.firstChild && peopleLabel.firstChild.nodeType === 3) {
    peopleLabel.firstChild.textContent = isPotential ? 'Source / contacts' : 'People';
  }

  updateConvertVisibility();
}

function updateConvertVisibility() {
  // Convert button removed — auto-conversion handled on save
  const btn = $('#convert-btn');
  if (btn) btn.style.display = 'none';
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

  const nouns = { project: 'project', expense: 'expense', potential: 'chop' };
  const noun = nouns[type] || 'entry';
  $('#editor-title').textContent = (existing ? 'Edit ' : 'New ') + noun;
  $('#delete-btn').style.display = existing ? '' : 'none';

  const recurringCheck = $('#recurring-check');
  if (existing) {
    for (const k of ['name', 'status', 'category', 'revenue', 'expenses', 'tasks', 'people', 'notes', 'month', 'end_month', 'last_contact', 'next_followup']) {
      if (form[k]) form[k].value = existing[k] || '';
    }
    recurringCheck.checked = !!existing.recurring;
    if (!form.month.value) form.month.value = currentMonth();
  } else {
    if (type === 'project') form.status.value = 'Active';
    if (type === 'potential') form.status.value = 'Lead';
    if (type === 'expense') form.category.value = 'Operations';
    form.month.value = selectedMonth || currentMonth();
    recurringCheck.checked = false;
  }
  applyRecurringMode(recurringCheck.checked);
  updateConvertVisibility();

  editor.showModal();
  setTimeout(() => form.name?.focus(), 50);
}

$('#recurring-check').addEventListener('change', (e) => applyRecurringMode(e.target.checked));
form.querySelector('select[name="status"]').addEventListener('change', updateConvertVisibility);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.SUPABASE_CONFIGURED) return;

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  payload.recurring = fd.has('recurring');
  if (!payload.month) payload.month = currentMonth();
  if (!payload.type) payload.type = 'project';
  if (!payload.end_month) payload.end_month = null;
  if (!payload.last_contact) payload.last_contact = null;
  if (!payload.next_followup) payload.next_followup = null;

  if (payload.type === 'expense') {
    payload.revenue = '';
    payload.status = '';
    payload.people = '';
    payload.tasks = '';
    payload.last_contact = null;
    payload.next_followup = null;
  } else if (payload.type === 'potential') {
    payload.category = '';
    payload.tasks = '';
    payload.recurring = false;
    payload.end_month = null;
  } else {
    payload.category = '';
    payload.last_contact = null;
    payload.next_followup = null;
  }

  // Auto-create linked project when a potential is marked Won (only once)
  let autoCreatedProject = false;
  if (payload.type === 'potential' && payload.status === 'Won') {
    const existing = editingId ? entries.find((x) => x.id === editingId) : null;
    const alreadyConverted = existing && existing.converted;
    if (!alreadyConverted) {
      const projectPayload = {
        id: (crypto.randomUUID && crypto.randomUUID()) ||
          Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        type: 'project',
        name: payload.name,
        status: 'Active',
        revenue: payload.revenue || '',
        expenses: payload.expenses || '',
        people: payload.people || '',
        notes: payload.notes || '',
        month: currentMonth(),
        recurring: false,
        converted: false,
      };
      const projRes = await window.db.from('projects').insert(projectPayload);
      if (projRes.error) {
        alert("Saved potential, but couldn't auto-create project: " + projRes.error.message);
      } else {
        payload.converted = true;
        autoCreatedProject = true;
      }
    }
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

  if (autoCreatedProject) {
    setTimeout(() => alert('Won → also added to Projects tab.'), 100);
  }

  if (payload.type !== 'potential' && !payload.recurring) selectedMonth = payload.month;
  if (activeTab !== payload.type) {
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

// Convert button removed in favour of auto-conversion on save when status='Won'

// ─── Review editor ──────────────────────────────────────────

function openReviewEditor(id) {
  editingReviewId = id || null;
  const existing = id ? reviews.find((r) => r.id === id) : null;

  reviewForm.reset();
  $('#review-title').textContent = existing ? 'Edit Weekly Recap' : 'New Weekly Recap';
  $('#review-delete-btn').style.display = existing ? '' : 'none';

  if (existing) {
    for (const k of ['week_of','wins','losses','lessons','avoided','broken_word','money_in','money_out','priorities','gratitudes','dua','notes', ...SCORE_FIELDS]) {
      if (reviewForm[k]) reviewForm[k].value = existing[k] ?? '';
    }
  } else {
    reviewForm.week_of.value = lastFridayISO();
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
  if (!confirm('Delete this recap? This cannot be undone.')) return;
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
    if (body) lines.push(body);
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
