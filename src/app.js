// 12 World — projects, potentials, expenses, invoices, reviews.

const $ = (s) => document.querySelector(s);
const list = $('#list');
const editor = $('#editor');
const form = $('#editor-form');
const reviewEditor = $('#review-editor');
const reviewForm = $('#review-form');
const invoiceEditor = $('#invoice-editor')
const invoiceForm = $('#invoice-form');
const monthSelect = $('#month-select');
const secondaryFilter = $('#secondary-filter');
const filterBar = $('#filter-bar');

let entries = [];
let reviews = [];
let invoices = [];
let tasks = [];
let tickets = [];
let debts = [];
let gymSessions = [];
let bodyMetrics = [];
let roadTrips = [];
let debtPayments = [];
let editingId = null;
let editingReviewId = null;
let editingInvoiceId = null;
let editingTaskId = null;
let editingTicketId = null;
let ticketKindView = 'personal';
let workView = 'tasks';
let editingWorkTaskId = null;
let editingWorkCompanyId = null;
let editingDebtId = null;
let selectedDebtForPayment = null;
let currentInvoiceSections = [];
let currentRecurrenceDays = new Set();
let selectedMonth = currentMonth();
let selectedDay = todayISO();
let selectedYear = new Date().getFullYear();
let activeTab = 'today';
let ticketTypeFilter = 'all';

const taskEditor = $('#task-editor');
const taskForm = $('#task-form');
const ticketEditor = $('#ticket-editor');
const ticketForm = $('#ticket-form');
const debtEditor = $('#debt-editor');
const debtForm = $('#debt-form');
const paymentEditor = $('#payment-editor');
const paymentForm = $('#payment-form');

function todayISO() {
  // Local date only — avoids UTC drift (e.g. BST pushing the date back).
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function shiftISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
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
  { q: "Discipline equals freedom.", a: "Jocko Willink", e: "Freedom comes from non-negotiable routines, not spontaneity. Lock in gym, Fajr, and your first work task as immovable — the rest of the day opens up once your foundation is solid." },
  { q: "The pain you feel today will be the strength you feel tomorrow.", a: "Arnold Schwarzenegger", e: "Today's resistance builds tomorrow's capacity. The morning you least want to train or make calls is exactly when you must — that friction is the training." },
  { q: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", a: "Aristotle", e: "Your identity is built by daily actions, not intentions. Audit one behaviour you repeat daily — if it doesn't build you, replace it with something that does, starting today." },
  { q: "Discipline is choosing between what you want now and what you want most.", a: "Abraham Lincoln", e: "Every moment of temptation is a choice between your future self and current comfort. Before any low-ROI decision, ask: is this what I want most?" },
  { q: "Don't count the days. Make the days count.", a: "Muhammad Ali", e: "Quantity of days is irrelevant — quality of output is what compounds. End each day with one thing you moved forward. Make it non-zero." },
  { q: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius", e: "Consistency beats speed — slow progress is infinitely better than stopping. On your lowest days, do the minimum viable version: one set, one prayer, one task. Stay in the game." },
  { q: "First we make our habits, then our habits make us.", a: "John Dryden", e: "You are constructing your future self through your current habits. Identify your most destructive habit and replace it with one small constructive act for 30 days." },
  { q: "Every action you take is a vote for the type of person you wish to become.", a: "James Clear", e: "Your identity is the accumulation of choices, not a fixed trait. Before each action today, ask: would the person I want to be do this? Then act accordingly." },
  { q: "The successful warrior is the average man, with laser-like focus.", a: "Bruce Lee", e: "Exceptional results require ruthless concentration, not exceptional talent. Pick your one most important task and work it for 90 uninterrupted minutes today." },
  { q: "What you do every day matters more than what you do once in a while.", a: "Gretchen Rubin", e: "Irregular bursts of effort are cancelled out by consistent inaction. Install a non-negotiable daily minimum for gym, prayer, and work output — hit it every single day." },
  { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson", e: "Time passes regardless — the question is what you'll have built during it. When you feel the day is wasted, don't write it off — start one useful task now, even at 10pm." },
  { q: "Verily, with hardship comes ease.", a: "Quran 94:6", e: "This is Allah's direct promise — difficulty signals ease is coming, not that you are abandoned. Name the hardship specifically, make du'a about it, then act as if the ease is already on its way." },
  { q: "Do not lose hope, nor be sad.", a: "Quran 3:139", e: "Hopelessness is forbidden for a believer — Allah's plan is always better than your analysis. When things feel stagnant, recite this ayah, list three things still moving forward, and recommit." },
  { q: "Tie your camel first, then trust in Allah.", a: "Prophet Muhammad — peace be upon him", e: "Tawakkul is not passive — it requires you to exhaust your means first. Before making du'a for something, ask: have I tied my camel? Do the full work, then trust." },
  { q: "Whoever fears Allah, He will make a way out for them.", a: "Quran 65:2", e: "Taqwa means operating with God-consciousness in every deal, not just in prayer. In your next business interaction, ask: would I conduct this the same way knowing Allah is watching?" },
  { q: "Allah does not burden a soul beyond that it can bear.", a: "Quran 2:286", e: "Your current capacity is exactly what your current test requires. When you feel crushed, remember this difficulty was calibrated for you specifically. Make one move forward." },
  { q: "The strongest among you is the one who controls himself when angry.", a: "Prophet Muhammad — peace be upon him", e: "Emotional self-control is a higher form of strength than physical power. Next time frustration rises in a deal or conversation — pause, breathe, respond deliberately. Never react from emotion in business." },
  { q: "Whoever is patient will be granted patience.", a: "Prophet Muhammad — peace be upon him", e: "Sabr is a skill that strengthens through use — it's not just endurance, it attracts reward. Identify what is testing your patience most right now. Practise deliberate, conscious patience in it today." },
  { q: "The best among you are those who have the best character.", a: "Prophet Muhammad — peace be upon him", e: "Status before Allah is not about wealth — it's about how you treat people. In your next interaction — client, supplier, or family — lead with generosity of spirit before leading with results." },
  { q: "Whoever does not show mercy to people, Allah will not show mercy to him.", a: "Prophet Muhammad — peace be upon him", e: "Mercy is not weakness — it's a divine attribute that attracts barakah. With someone who has let you down today, choose mercy over retaliation. Watch what it opens." },
  { q: "Speak good or remain silent.", a: "Prophet Muhammad — peace be upon him", e: "Your words are either building something or destroying something — there is no neutral. Before any conversation today, ask: is what I'm about to say useful, honest, or kind? If not, stay silent." },
  { q: "Take account of yourselves before you are taken to account.", a: "Umar ibn al-Khattab (RA)", e: "Self-audit is a daily Islamic practice. Each night before sleep, spend 3 minutes: what did you do right, what slipped, what do you commit to tomorrow?" },
  { q: "Sell or be sold.", a: "Grant Cardone", e: "Every interaction is a transaction — if you're not closing, something is closing you: your fear, your laziness, your competition. Identify one sale you've been avoiding and contact that person today." },
  { q: "Be so good they can't ignore you.", a: "Steve Martin", e: "Visibility follows mastery — stop chasing attention and start building undeniable output. Invest one hour today into getting sharper at your highest-value skill." },
  { q: "Stay hungry. Stay foolish.", a: "Steve Jobs", e: "Complacency and arrogance kill growth — stay curious, driven, and willing to look like a beginner. Learn one new thing relevant to your business today. Stay in student mode." },
  { q: "The way to get started is to quit talking and begin doing.", a: "Walt Disney", e: "Planning without executing is comfort masquerading as progress. Take one idea you've been talking about and take one real-world step on it today: a call, a message, a number." },
  { q: "You will get all you want in life if you help enough other people get what they want.", a: "Zig Ziglar", e: "The most durable route to wealth is through genuine value creation. In your next sales conversation, focus entirely on the client's problem first. Make the pitch secondary to the understanding." },
  { q: "Comparison is the thief of joy.", a: "Theodore Roosevelt", e: "Another man's progress is irrelevant to your race — comparison only slows you. Next time you feel the pull to compare, redirect that energy to your own next action instead." },
  { q: "Don't be afraid to give up the good to go for the great.", a: "John D. Rockefeller", e: "Good enough blocks the exceptional — sometimes the comfortable path is the ceiling. Identify one 'good enough' situation in your business you've been tolerating and plan to move beyond it." },
  { q: "Quality is never an accident. It is the result of intelligent effort.", a: "John Ruskin", e: "Good outcomes are engineered, not stumbled into. Pick one deliverable today — a quote, a proposal, a message — and invest more care than the minimum required." },
  { q: "What gets measured gets managed.", a: "Peter Drucker", e: "You cannot improve what you don't track. Define one number in your business you're not currently measuring — revenue, leads, call attempts — and start tracking it today." },
  { q: "Diligence is the mother of good fortune.", a: "Benjamin Franklin", e: "Luck is sustained effort becoming visible — results follow work, not wishing. Choose one area where you've been half-committed and increase the effort level this week. Observe the shift." },
  { q: "The reward for work well done is the opportunity to do more.", a: "Jonas Salk", e: "Mastery and reputation open doors money and talk cannot. Complete one task today to a standard above what's expected — not for recognition, but to build the habit of excellence." },
  { q: "An ounce of action is worth a ton of theory.", a: "Friedrich Engels", e: "Analysis has diminishing returns — execution is where real knowledge lives. If you've been planning something for more than a week, take one real-world step on it today." },
  { q: "A goal without a plan is just a wish.", a: "Antoine de Saint-Exupéry", e: "Ambition without architecture is daydreaming. Pick one goal right now and write it with three specific next actions and a deadline — that's the difference between wishing and working." },
  { q: "Whether you think you can or you think you can't, you're right.", a: "Henry Ford", e: "Your beliefs set the ceiling before your effort gets a chance. Identify one area where your inner narrative is 'it won't work.' Challenge it by taking the action you've been avoiding." },
  { q: "Doubt kills more dreams than failure ever will.", a: "Suzy Kassem", e: "You recover from failed attempts. Inaction leaves you exactly where you started. Name one thing doubt has been blocking. Give yourself 48 hours to take the first step — doubt doesn't survive action." },
  { q: "He who has a why to live can bear almost any how.", a: "Friedrich Nietzsche", e: "Purpose is your most durable source of resilience. Write your why down today — the specific version. Why does rebuilding matter? Why does this business matter? Keep it visible." },
  { q: "The cave you fear to enter holds the treasure you seek.", a: "Joseph Campbell", e: "The exact thing you're avoiding is usually where your biggest growth lives. What call haven't you made, what conversation are you postponing? Do it today. The discomfort is the signal, not the warning." },
  { q: "If it is to be, it is up to me.", a: "William H. Johnsen", e: "No one is coming to fix your situation — you are the agent of your own recovery. Identify one problem you've been waiting for someone else to solve. Own it and take one action today." },
  { q: "We suffer more in imagination than in reality.", a: "Seneca", e: "Anticipation of difficulty is almost always worse than the difficulty itself. Name one thing you've been dreading. When you do it, compare the actual experience to your imagination. Build that evidence." },
  { q: "You have power over your mind — not outside events. Realize this, and you will find strength.", a: "Marcus Aurelius", e: "What happens to you matters less than how you respond to it. In any difficult situation today, separate what you control from what you don't. Focus entirely on your response." },
  { q: "What we do in life echoes in eternity.", a: "Marcus Aurelius", e: "Your daily choices accumulate into a legacy — small actions matter because they compound. Ask yourself this morning what today's version of you is building for. Let that drive your choices." },
  { q: "It always seems impossible until it's done.", a: "Nelson Mandela", e: "Impossibility is a perception problem. Think about something you've already done that once felt impossible. Use that as evidence your current 'impossible' is also temporary. Then act." },
  { q: "Hard times create strong men. Strong men create good times.", a: "G. Michael Hopf", e: "You are being forged right now — the difficulty is the training, not the punishment. Reframe your current setbacks as the specific training required to build the next version of you." },
  { q: "The world breaks everyone, and afterward, many are strong at the broken places.", a: "Ernest Hemingway", e: "Strength doesn't come from never breaking — it comes from how you rebuild. Identify one area where you've been broken but haven't fully rebuilt. Commit one action toward that repair today." },
  { q: "The best time to plant a tree was 20 years ago. The second best time is now.", a: "Chinese proverb", e: "Regret about the past is irrelevant — action in the present is the only variable you control. Stop lamenting what should have been. Name one thing you can start right now and begin." },
  { q: "Don't let yesterday take up too much of today.", a: "Will Rogers", e: "Guilt is only useful if it changes behaviour — otherwise it's just weight. Whatever you failed at yesterday, extract the lesson and release it. Today is clean." },
  { q: "You miss 100% of the shots you don't take.", a: "Wayne Gretzky", e: "The guaranteed failure is inaction. Make one bold move today you've been hesitating on — a pitch, an offer, a conversation. The worst result is a no, which is the same as not trying." },
  { q: "The expert in anything was once a beginner.", a: "Helen Hayes", e: "Everyone you admire was once incompetent — expertise is earned through repetition, not granted. Next time you feel inadequate, remember this and do one more rep: one more call, one more study session." },
  { q: "The man who moves a mountain begins by carrying away small stones.", a: "Confucius", e: "Large goals require small, consistent actions. Break your biggest current goal into the smallest possible next action. Do that one action today. The mountain doesn't care about your mood." },
  { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier", e: "Results are arithmetic — enough small daily actions, compounded over time, produce major outcomes. Identify your most important daily input and track it this week. Consistency over intensity." },
  { q: "Begin with the end in mind.", a: "Stephen Covey", e: "Without a clear destination, daily effort has no direction. Define exactly what success looks like for your most important current project. Work backwards from that end state to today's task." },
  { q: "Talent is cheaper than table salt. What separates the talented from the successful is a lot of hard work.", a: "Stephen King", e: "Natural ability is the starting line, not the finish line. Stop crediting others' success to talent. Credit it to their work rate — then match or exceed it." },
  { q: "When you have a choice and don't make it, that is in itself a choice.", a: "William James", e: "Indecision defaults to inaction, which has its own consequences. Identify one decision you've been postponing and give yourself 24 hours to make it. The cost of not deciding is usually higher." },
  { q: "Make peace with the fact that saying no often requires trading popularity for respect.", a: "Greg McKeown", e: "Every yes to the wrong thing is a no to the right thing — your time is finite. Identify one commitment or distraction draining your capacity and say no to it this week." },
  { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt", e: "Waiting for ideal conditions is a strategy for permanent inaction. Stop waiting for the right capital or moment. Act with what you have today — execution happens in imperfect environments." },
  { q: "The only person you are destined to become is the person you decide to be.", a: "Ralph Waldo Emerson", e: "Your future is not predetermined — it's constructed by your daily choices. Decide today who you are becoming. Say it out loud or write it down. Then make one decision consistent with that identity." },
  { q: "I have not failed. I've just found 10,000 ways that won't work.", a: "Thomas Edison", e: "Failure is data, not verdict — each setback refines your direction. Name one recent failure. Extract one specific lesson from it and apply that lesson to your next attempt." },
  { q: "Pressure is a privilege.", a: "Billie Jean King", e: "Pressure means you're in the game — people who feel none have nothing at stake. Reframe the pressure you're under as evidence that what you're pursuing matters. Use it as fuel, not fear." },
  { q: "Eat the frog first thing in the morning.", a: "Mark Twain", e: "Your hardest task should come first — willpower is highest before the day drains you. Identify your biggest avoided responsibility right now and do it first thing tomorrow, before anything else." },
  { q: "If you cannot do great things, do small things in a great way.", a: "Napoleon Hill", e: "Greatness of spirit doesn't require greatness of scale. Whatever the smallest task on your list is today, complete it with full attention and care. Build the habit of quality at every level." },
  { q: "Don't compare your beginning to someone else's middle.", a: "Tim Hiller", e: "You're seeing others' chapter 20 while you're on chapter 3 — the timeline is irrelevant, only the trajectory matters. Measure yourself against where you were 6 months ago, not someone else's position." },
  { q: "Action is the antidote to despair.", a: "Joan Baez", e: "Inactivity allows despair to expand — movement, even small movement, breaks the cycle. When you feel low or stuck, immediately do one physical or productive act. Movement changes state." },
  { q: "The only way to do great work is to love what you do.", a: "Steve Jobs", e: "Motivation is short-lived — build systems connecting your work to a purpose you actually care about. Identify the aspect of your work that matters most to you and put more of your time there." },
  { q: "Live as if you were to die tomorrow. Learn as if you were to live forever.", a: "Mahatma Gandhi", e: "Urgency in execution, patience in development. Treat today's hours as irreplaceable — act on what matters now. Also invest in one thing that builds your long-term capability, every day." },
];

function currentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function lastFridayISO() {
  // Returns the most recent Friday (today if today is Friday). Local date.
  const d = new Date();
  const diff = (d.getDay() - 5 + 7) % 7;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const [eRes, rRes, iRes, tRes, kRes, dRes, pRes, gRes, mRes, trRes]= await Promise.all([
    window.db.from('projects').select('*').order('created_at', { ascending: false }),
    window.db.from('reviews').select('*').order('week_of', { ascending: false }),
    window.db.from('invoices').select('*').order('month', { ascending: false }),
    window.db.from('tasks').select('*').order('created_at', { ascending: true }),
    window.db.from('tickets').select('*').order('date', { ascending: false }),
    window.db.from('debts').select('*').order('created_at', { ascending: false }),
    window.db.from('debt_payments').select('*').order('date', { ascending: false }),
    window.db.from('gym_sessions').select('*').order('date', { ascending: false }),
    window.db.from('body_metrics').select('*').order('date', { ascending: false }),
    window.db.from('road_trips').select('*').order('date', { ascending: false }),
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
  tickets = (kRes && !kRes.error) ? (kRes.data || []) : [];
  debts = (dRes && !dRes.error) ? (dRes.data || []) : [];
  debtPayments = (pRes && !pRes.error) ? (pRes.data || []) : [];
  gymSessions = (gRes && !gRes.error) ? (gRes.data || []) : [];
  bodyMetrics = (mRes && !mRes.error) ? (mRes.data || []) : [];
  roadTrips = (trRes && !trRes.error) ? (trRes.data ?? []) : [];
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
  if (activeTab === 'review' || activeTab === 'invoice' || activeTab === 'drive' || activeTab === 'today' || activeTab === 'ticket' || activeTab === 'debt') {
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
  if(!['today','drive','review','invoice','ticket','debt','health'].includes(activeTab))activeTab='today';
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
  const ticketCountEl = $('#tc-ticket');
  if (ticketCountEl) ticketCountEl.textContent = String(tickets.filter(t => (t.ticket_kind || 'personal') === 'personal').length);
  const debtCountEl = $('#tc-debt');
  if (debtCountEl) debtCountEl.textContent = String(debts.filter(d => d.status !== 'paid').length);

  // Hide/show header bits based on tab
  const totalsEl = document.querySelector('.totals');
  const monthSelEl = $('#month-select');
  const addBtnEl = $('#add-btn');
  const hideContext = activeTab === 'drive' || activeTab === 'today';
  if (totalsEl) totalsEl.style.display = hideContext ? 'none' : '';
  if (monthSelEl) monthSelEl.style.display = (hideContext || activeTab === 'ticket' || activeTab === 'debt') ? 'none' : '';
  if (addBtnEl) addBtnEl.style.display = activeTab === 'today' ? 'none' : '';

  if (activeTab === 'ticket') renderTicketTotals();
  if (activeTab === 'debt') renderDebtTotals();

  if (activeTab === 'today') return renderToday();
  if (activeTab === 'drive') return renderDrive();
  if (activeTab === 'review') return renderReviews();
  if (activeTab === 'invoice') return renderWork();
  if (activeTab === 'ticket') return renderTickets();
  if (activeTab === 'debt') return renderDebts();
  if (activeTab === 'potential') return renderPotentials(potentials);
  if (activeTab === 'gym') return renderGym();

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
      <p class="drive-explanation">${esc(q.e||'')}</p>
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

function recurrenceMatches(recurrence, dayISO) {
  if (!recurrence || recurrence === 'none') return false;
  const [y, m, d] = dayISO.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return recurrence.split(',').map(Number).includes(dow);
}

function buildDayTasks(dayISO) {
  const realTasks = tasks.filter((t) => t.day === dayISO);
  // Recurring templates that started on or before this day
  const templates = tasks.filter((t) =>
    t.recurrence && t.recurrence !== 'none' && t.day && t.day < dayISO
  );
  const virtualTasks = templates
    .filter((tpl) => recurrenceMatches(tpl.recurrence, dayISO))
    .filter((tpl) => !realTasks.some((r) => r.template_id === tpl.id))
    .map((tpl) => ({
      id: 'virtual:' + tpl.id + ':' + dayISO,
      day: dayISO,
      title: tpl.title,
      time: tpl.time || '',
      notes: tpl.notes || '',
      done: false,
      recurrence: tpl.recurrence,
      template_id: tpl.id,
      _virtual: true,
      created_at: tpl.created_at,
    }));
  return [...realTasks, ...virtualTasks];
}

function renderToday() {
  const dayTasks = buildDayTasks(selectedDay).sort(taskSort);
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
  const isRecurring = (t.recurrence && t.recurrence !== 'none') || t.template_id;
  const recurringIcon = isRecurring ? '<span class="task-recurring" title="Recurring">↻</span>' : '';
  return `
    <div class="task-row ${t.done ? 'done' : ''}" data-id="${esc(t.id)}">
      <button type="button" class="task-check" data-id="${esc(t.id)}" aria-label="Toggle done">${t.done ? '✓' : ''}</button>
      <div class="task-time">${timeHtml}</div>
      <div class="task-title">${esc(t.title)}${recurringIcon}</div>
    </div>`;
}

async function toggleTask(id) {
  // Virtual task: materialize as a real row with done=true
  if (id.startsWith('virtual:')) {
    const parts = id.split(':');
    const templateId = parts[1];
    const day = parts.slice(2).join(':');
    const tpl = tasks.find((x) => x.id === templateId);
    if (!tpl) return;
    const newId = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newTask = {
      id: newId,
      day,
      title: tpl.title,
      time: tpl.time || '',
      icon: tpl.icon || '',
      notes: tpl.notes || '',
      done: true,
      recurrence: 'none',
      template_id: tpl.id,
    };
    tasks.push({ ...newTask, created_at: new Date().toISOString() });
    render();
    const { error } = await window.db.from('tasks').insert(newTask);
    if (error) {
      tasks = tasks.filter((t) => t.id !== newId);
      render();
      alert('Update failed: ' + error.message);
    }
    return;
  }

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
  const dayTasks = buildDayTasks(selectedDay);
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
  const yesterdayTasks = tasks.filter((t) => t.day === yesterday && !t.done);
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

function setRecurrenceUI(str) {
  currentRecurrenceDays = new Set();
  if (str && str !== 'none') {
    str.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n)).forEach((n) => currentRecurrenceDays.add(n));
  }
  document.querySelectorAll('#task-form .day-toggle').forEach((btn) => {
    const d = parseInt(btn.dataset.day, 10);
    btn.classList.toggle('active', currentRecurrenceDays.has(d));
  });
}
function getRecurrenceStr() {
  if (currentRecurrenceDays.size === 0) return 'none';
  return [...currentRecurrenceDays].sort((a, b) => a - b).join(',');
}

function openTaskEditor(id) {
  editingTaskId = id || null;
  let t = null;
  if (id) {
    if (id.startsWith('virtual:')) {
      const tpl = tasks.find((x) => x.id === id.split(':')[1]);
      t = tpl ? { ...tpl, _virtualEdit: true, originalDay: selectedDay } : null;
    } else {
      t = tasks.find((x) => x.id === id);
    }
  }
  taskForm.reset();
  $('#task-editor-title').textContent = t ? 'Edit task' : 'New task';
  $('#task-delete-btn').style.display = t ? '' : 'none';
  if (t) {
    taskForm.title.value = t.title || '';
    taskForm.time.value = t.time || '';
    taskForm.notes.value = t.notes || '';
    setRecurrenceUI(t.recurrence || 'none');
  } else {
    setRecurrenceUI('none');
  }
  taskEditor.showModal();
  setTimeout(() => taskForm.title?.focus(), 50);
}

// Wire up day toggle buttons (idempotent — outside event handlers)
document.querySelectorAll('#task-form .day-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const d = parseInt(btn.dataset.day, 10);
    if (currentRecurrenceDays.has(d)) currentRecurrenceDays.delete(d);
    else currentRecurrenceDays.add(d);
    btn.classList.toggle('active', currentRecurrenceDays.has(d));
  });
});

document.querySelectorAll('#task-form .recurrence-quick-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    if (preset === 'off') currentRecurrenceDays = new Set();
    else if (preset === 'daily') currentRecurrenceDays = new Set([0, 1, 2, 3, 4, 5, 6]);
    else if (preset === 'weekdays') currentRecurrenceDays = new Set([1, 2, 3, 4, 5]);
    document.querySelectorAll('#task-form .day-toggle').forEach((b) => {
      const d = parseInt(b.dataset.day, 10);
      b.classList.toggle('active', currentRecurrenceDays.has(d));
    });
  });
});

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(taskForm);
  const payload = Object.fromEntries(fd.entries());
  if (!payload.title || !payload.title.trim()) return;
  payload.recurrence = getRecurrenceStr();

  // Virtual task save: materialize as a new row (only this day's occurrence)
  if (editingTaskId && editingTaskId.startsWith('virtual:')) {
    const parts = editingTaskId.split(':');
    const templateId = parts[1];
    const day = parts.slice(2).join(':');
    const newId = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newTask = {
      id: newId,
      day,
      title: payload.title,
      time: payload.time || '',
      notes: payload.notes || '',
      done: false,
      recurrence: 'none',
      template_id: templateId,
    };
    tasks.push({ ...newTask, created_at: new Date().toISOString() });
    render();
    const { error } = await window.db.from('tasks').insert(newTask);
    if (error) {
      tasks = tasks.filter((t) => t.id !== newId);
      render();
      alert('Save failed: ' + error.message);
    }
    taskEditor.close();
    return;
  }

  if (editingTaskId) {
    const t = tasks.find((x) => x.id === editingTaskId);
    if (t) Object.assign(t, payload);
    render();
    const { error } = await window.db.from('tasks').update(payload).eq('id', editingTaskId);
    if (error) alert('Save failed: ' + error.message);
  } else {
    // New task created via the editor (rare path; quickAddTask handles most)
    const newId = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newTask = {
      id: newId,
      day: selectedDay,
      title: payload.title,
      time: payload.time || '',
      notes: payload.notes || '',
      done: false,
      recurrence: payload.recurrence,
    };
    tasks.push({ ...newTask, created_at: new Date().toISOString() });
    render();
    const { error } = await window.db.from('tasks').insert(newTask);
    if (error) {
      tasks = tasks.filter((t) => t.id !== newId);
      render();
      alert('Save failed: ' + error.message);
    }
  }
  taskEditor.close();
});

$('#task-cancel-btn').addEventListener('click', () => taskEditor.close());

$('#task-delete-btn').addEventListener('click', async () => {
  if (!editingTaskId) return;
  // Virtual: deleting means "stop this recurring task entirely"
  if (editingTaskId.startsWith('virtual:')) {
    const templateId = editingTaskId.split(':')[1];
    if (!confirm('This is a recurring task. Delete will stop it from showing on future days. Past completed instances stay. Proceed?')) return;
    tasks = tasks.filter((t) => t.id !== templateId);
    render();
    const { error } = await window.db.from('tasks').delete().eq('id', templateId);
    if (error) { alert('Delete failed: ' + error.message); loadAll(); }
    taskEditor.close();
    return;
  }
  const t = tasks.find((x) => x.id === editingTaskId);
  const isRecurringTemplate = t && t.recurrence && t.recurrence !== 'none';
  const msg = isRecurringTemplate
    ? 'This is a recurring task. Delete will stop it from showing on future days. Past completed instances stay. Proceed?'
    : 'Delete this task?';
  if (!confirm(msg)) return;
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

// ─── Tickets ────────────────────────────────────────────────

function ticketsInYear(year) {
  return tickets.filter((t) => t.date && t.date.startsWith(String(year)));
}

function renderTicketTotals() {
  clearTotalSpanClasses();
  const inYear = ticketsInYear(selectedYear);
  const kindInYear = inYear.filter(t => (t.ticket_kind || 'personal') === ticketKindView);
  if (ticketKindView === 'client') {
    setTotalsLabels(['Tickets', 'Revenue', 'Cost', 'Profit']);
    let revenue = 0, cost = 0;
    for (const t of kindInYear) { revenue += parseNum(t.client_revenue); cost += parseNum(t.guy_cost); }
    const profit = revenue - cost;
    $('#t-rev').textContent = String(kindInYear.length);
    $('#t-exp').textContent = fmt(revenue);
    const net = $('#t-net');
    net.textContent = fmt(cost);
    if (cost > 0) net.classList.add('neg');
    const savedEl = $('#t-count');
    savedEl.textContent = fmt(profit);
    if (profit > 0) savedEl.classList.add('pos');
  } else {
    setTotalsLabels(['Tickets', 'Face value', 'Paid', 'Saved']);
    let face = 0, paid = 0;
    for (const t of kindInYear) { face += parseNum(t.amount); paid += parseNum(t.paid); }
    const saved = face - paid;
    $('#t-rev').textContent = String(kindInYear.length);
    $('#t-exp').textContent = fmt(face);
    const net = $('#t-net');
    net.textContent = fmt(paid);
    if (paid > 0) net.classList.add('neg');
    const savedEl = $('#t-count');
    savedEl.textContent = fmt(saved);
    if (saved > 0) savedEl.classList.add('pos');
  }
}


function onTicketKindChange(kind) {
  const cf = $('#client-ticket-fields');
  const pf = $('#personal-ticket-fields');
  if (cf) cf.style.display = kind === 'client' ? '' : 'none';
  if (pf) pf.style.display = kind === 'personal' ? '' : 'none';
}

async function upsertTicketExpense(ticket) {
  if ((ticket.ticket_kind || 'personal') !== 'personal') return;
  if (!ticket.personal_paid) return;
  const month = (ticket.date || todayISO()).substring(0, 7);
  const label = 'Ticket – ' + (ticket.type || 'fine') + (ticket.pcn ? ' (' + ticket.pcn + ')' : '') + (ticket.borough ? ', ' + ticket.borough : '');
  const amount = parseNum(ticket.paid) || parseNum(ticket.amount) || 0;
  const existing = projects.find((p) => p.source_ticket_id === ticket.id && p.type === 'expense');
  if (existing) {
    Object.assign(existing, { name: label, expenses: amount, month });
    render();
    await window.db.from('projects').update({ name: label, expenses: amount, month }).eq('id', existing.id);
  } else {
    const nid = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2);
    const ne = { id: nid, type: 'expense', name: label, expenses: amount, month, source_ticket_id: ticket.id };
    projects.unshift({ ...ne, created_at: new Date().toISOString() });
    render();
    await window.db.from('projects').insert(ne);
  }
}

async function upsertTicketProject(ticket) {
  if (ticket.ticket_kind !== 'client') return;
  if (!ticket.client_paid || !ticket.work_done) return;
  const month = (ticket.date || todayISO()).substring(0, 7);
  const label = 'Client ticket – ' + (ticket.client_name || 'client') + ' (' + (ticket.type || 'fine') + ')';
  const existing = projects.find((p) => p.source_ticket_id === ticket.id && p.type === 'project');
  const data = { name: label, revenue: parseNum(ticket.client_revenue) || 0, expenses: parseNum(ticket.guy_cost) || 0, status: 'done', month, source_ticket_id: ticket.id };
  if (existing) {
    Object.assign(existing, data);
    render();
    await window.db.from('projects').update(data).eq('id', existing.id);
  } else {
    const nid = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2);
    const np = { id: nid, type: 'project', ...data };
    projects.unshift({ ...np, created_at: new Date().toISOString() });
    render();
    await window.db.from('projects').insert(np);
  }
}

function renderTickets() {
  const inYear = ticketsInYear(selectedYear);
  const kindInYear = inYear.filter(t => (t.ticket_kind || 'personal') === ticketKindView);
  let filtered = inYear;
  if (ticketTypeFilter !== 'all') filtered = filtered.filter((t) => t.type === ticketTypeFilter);
  filtered = filtered.filter((t) => (t.ticket_kind || 'personal') === ticketKindView);

  // Borough/Force tally grouped
  const tally = {};
  for (const t of filtered) {
    const key = (t.borough || 'Unknown').trim() || 'Unknown';
    if (!tally[key]) tally[key] = { count: 0, paid: 0 };
    tally[key].count += 1;
    tally[key].paid += parseNum(t.paid);
  }
  const tallyEntries = Object.entries(tally)
    .sort((a, b) => b[1].count - a[1].count);

  const isAdminFilter = ticketTypeFilter === 'admin';
  const isParkingFilter = ticketTypeFilter === 'parking';
  const isSpeedingFilter = ticketTypeFilter === 'speeding';
  const boroughLabel = isAdminFilter ? 'Name' : (isSpeedingFilter ? 'Police Force' : 'Borough');

  list.innerHTML = `
    <div class="tickets-page">
      <div class="ticket-type-filter ticket-kind-toggle" style="margin-bottom:10px">
        <button type="button" class="ticket-filter ticket-kind-btn${ticketKindView==='personal'?' active':''}" data-kind="personal" style="flex:1">My Tickets</button>
        <button type="button" class="ticket-filter ticket-kind-btn${ticketKindView==='client'?' active':''}" data-kind="client" style="flex:1">Client Tickets</button>
      </div>
      <div class="ticket-year-nav">
        <button type="button" class="day-nav" id="year-prev" aria-label="Previous year">←</button>
        <span class="ticket-year">${selectedYear}</span>
        <button type="button" class="day-nav" id="year-next" aria-label="Next year">→</button>
      </div>
      <div class="ticket-type-filter">
        <button type="button" class="ticket-filter ${ticketTypeFilter === 'all' ? 'active' : ''}" data-type="all">All <span class="tf-count">${kindInYear.length}</span></button>
        ${ticketKindView === 'personal' ? `<button type="button" class="ticket-filter ${ticketTypeFilter === 'parking' ? 'active' : ''}" data-type="parking">Parking <span class="tf-count">${kindInYear.filter((t) => t.type === 'parking').length}</span></button>
        <button type="button" class="ticket-filter ${ticketTypeFilter === 'speeding' ? 'active' : ''}" data-type="speeding">Speeding <span class="tf-count">${kindInYear.filter((t) => t.type === 'speeding').length}</span></button>` : `<button type="button" class="ticket-filter ${ticketTypeFilter === 'speeding' ? 'active' : ''}" data-type="speeding">Speeding <span class="tf-count">${kindInYear.filter((t) => t.type === 'speeding').length}</span></button>
        <button type="button" class="ticket-filter ${ticketTypeFilter === 'admin' ? 'active' : ''}" data-type="admin">Admin <span class="tf-count">${kindInYear.filter((t) => t.type === 'admin').length}</span></button>`}
      </div>
      ${tallyEntries.length > 0 ? `
        <div class="borough-tally">
          <div class="borough-tally-label">${esc(boroughLabel)} tally</div>
          <div class="borough-chips">
            ${tallyEntries.map(([name, info]) => `
              <div class="borough-chip">
                <span class="bc-name">${esc(name)}</span>
                <span class="bc-count">${info.count}</span>
                <span class="bc-paid">${fmt(info.paid)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="ticket-list">
        ${filtered.length === 0
          ? `<div class="empty">No ${ticketTypeFilter === 'all' ? '' : esc(ticketTypeFilter) + ' '}tickets in ${selectedYear}.</div>`
          : filtered.map(renderTicket).join('')}
      </div>
    </div>`;

  list.querySelectorAll('.ticket-kind-btn').forEach((btn) => {
    btn.addEventListener('click', () => { ticketKindView = btn.dataset.kind; ticketTypeFilter = 'all'; render(); });
  });
  $('#year-prev').addEventListener('click', () => { selectedYear -= 1; render(); });
  $('#year-next').addEventListener('click', () => { selectedYear += 1; render(); });
  list.querySelectorAll('.ticket-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      ticketTypeFilter = btn.dataset.type;
      render();
    });
  });
  list.querySelectorAll('.card.ticket').forEach((el) => {
    el.addEventListener('click', () => openTicketEditor(el.dataset.id));
  });
}

function renderTicket(t) {
  const amount = parseNum(t.amount);
  const paid = parseNum(t.paid);
  const saved = amount - paid;
  const typeLabel = t.type === 'speeding' ? 'Speeding' : t.type === 'admin' ? 'Admin' : 'Parking';
  const placeLabel = t.type === 'speeding' ? 'Force' : 'Borough';
  const dateLabel = t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  return `
    <div class="card ticket" data-id="${esc(t.id)}">
      <div class="card-head">
        <h3>${esc(t.ticket_kind === 'client' ? (t.client_name || 'Client') : (t.borough || '—'))}</h3>
        <span class="status ticket-${t.type || 'parking'}">${esc(typeLabel)}</span>
      </div>
      <div class="card-grid">
        <div><label>${esc(placeLabel)}</label><span>${esc(t.borough || '—')}</span></div>
        <div><label>Date</label><span>${esc(dateLabel)}</span></div>
        <div><label>PCN</label><span>${esc(t.pcn || '—')}</span></div>
      </div>
      ${t.ticket_kind === 'client' ? `<div class="card-grid">
        <div><label>Revenue</label><span class="${parseNum(t.client_revenue) > 0 ? 'pos' : ''}">${t.client_revenue ? fmt(parseNum(t.client_revenue)) : '—'}</span></div>
        <div><label>Cost</label><span class="${parseNum(t.guy_cost) > 0 ? 'neg' : ''}">${t.guy_cost ? fmt(parseNum(t.guy_cost)) : '—'}</span></div>
        <div><label>Profit</label><span class="${parseNum(t.client_revenue) - parseNum(t.guy_cost) > 0 ? 'pos' : ''}">${fmt(parseNum(t.client_revenue) - parseNum(t.guy_cost))}</span></div>
      </div>` : `<div class="card-grid">
        <div><label>Amount</label><span>${amount ? fmt(amount) : '—'}</span></div>
        <div><label>Paid</label><span class="${paid && paid < amount ? 'pos' : ''}">${paid ? fmt(paid) : '—'}</span></div>
        <div><label>Saved</label><span class="${saved > 0 ? 'pos' : ''}">${saved > 0 ? fmt(saved) : '—'}</span></div>
      </div>`}
      ${t.notes ? `<div class="block"><label>Notes</label><p>${esc(t.notes)}</p></div>` : ''}
      ${t.ticket_kind === 'client'
        ? `<div style='display:flex;gap:5px;padding:5px 10px;flex-wrap:wrap'><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:${t.client_paid?'#22c55e':'#d1d5db'};color:${t.client_paid?'#fff':'#555'}'>Client paid</span><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:${(t.guy_paid||parseFloat(t.guy_cost)>0)?'#22c55e':'#d1d5db'};color:${(t.guy_paid||parseFloat(t.guy_cost)>0)?'#fff':'#555'}'>Guy paid</span><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:${t.work_done?'#22c55e':'#d1d5db'};color:${t.work_done?'#fff':'#555'}'>Done</span></div>`
        : t.personal_paid ? `<div style='padding:4px 10px'><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:#22c55e;color:#fff'>Paid</span></div>` : ''}
    </div>`;
}

function openTicketEditor(id) {
  editingTicketId = id || null;
  const t = id ? tickets.find((x) => x.id === id) : null;
  ticketForm.reset();
  $('#ticket-editor-title').textContent = t ? 'Edit ticket' : 'New ticket';
  $('#ticket-delete-btn').style.display = t ? '' : 'none';
  if (t) {
    ticketForm.type.value = t.type || 'admin';
    ticketForm.date.value = t.date || todayISO();
    ticketForm.amount.value = t.amount || '';
    ticketForm.borough.value = t.borough || '';
    ticketForm.pcn.value = t.pcn || '';
    ticketForm.notes.value = t.notes || '';
    const kv = t.ticket_kind || 'personal';
    ticketForm.ticket_kind.value = kv;
    if (kv === 'personal') {
      ticketForm.paid.value = t.paid || '';
      ticketForm.personal_paid.checked = !!t.personal_paid;
    } else {
      ticketForm.client_name.value = t.client_name || '';
      ticketForm.client_revenue.value = t.client_revenue == null ? '' : t.client_revenue;
      ticketForm.guy_cost.value = t.guy_cost == null ? '' : t.guy_cost;
      ticketForm.client_paid.checked = !!t.client_paid;
      ticketForm.guy_paid.checked = !!t.guy_paid;
      ticketForm.work_done.checked = !!t.work_done;
    }
    onTicketKindChange(kv);
  } else {
    ticketForm.type.value = ticketKindView === 'client' ? (ticketTypeFilter === 'speeding' ? 'speeding' : 'admin') : (ticketTypeFilter === 'speeding' ? 'speeding' : 'parking');
    ticketForm.date.value = todayISO();
    ticketForm.ticket_kind.value = 'personal';
    onTicketKindChange('personal');
  }
  applyTicketBoroughLabel();
  var _isAdmin = (ticketForm.type && ticketForm.type.value === 'admin');
  ['admin-name-row','admin-address-row'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.style.display = _isAdmin ? 'block' : 'none';
  });
  if (ticketForm.admin_name) ticketForm.admin_name.value = (t && t.admin_name) || '';
  if (ticketForm.admin_address) ticketForm.admin_address.value = (t && t.admin_address) || '';
  ticketEditor.showModal();
  setTimeout(() => ticketForm.amount?.focus(), 50);
}

function applyTicketBoroughLabel() {
  const isSpeeding = ticketForm.type.value === 'speeding';
  const label = $('#ticket-borough-label');
  if (label && label.firstChild && label.firstChild.nodeType === 3) {
    label.firstChild.textContent = isSpeeding ? 'Police Force' : 'Borough';
  }
  const input = label?.querySelector('input');
  if (input) input.placeholder = isSpeeding ? 'Met Police, Essex Police, etc.' : 'Enfield, Islington, etc.';
}

$('#ticket-type-select')?.addEventListener('change', applyTicketBoroughLabel);
$('#ticket-kind-select')?.addEventListener('change', (e) => onTicketKindChange(e.target.value));

ticketForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(ticketForm);
  const payload = Object.fromEntries(fd.entries());
  if (!payload.date) payload.date = todayISO();
  for (const k of ['personal_paid','client_paid','guy_paid','work_done']) payload[k] = payload[k] === 'true';
  for (const k of ['amount','paid','client_revenue','guy_cost']) { if (payload[k] === '' || payload[k] === undefined) payload[k] = null; else { const n = parseFloat(payload[k]); payload[k] = isNaN(n) ? null : n; } }

  if (editingTicketId) {
    const t = tickets.find((x) => x.id === editingTicketId);
    if (t) Object.assign(t, payload);
    render();
    const { error } = await window.db.from('tickets').update(payload).eq('id', editingTicketId);
    if (error) alert('Save failed: ' + error.message);
    else { await upsertTicketExpense({ ...(t||{}), ...payload }); await upsertTicketProject({ ...(t||{}), ...payload }); }
  } else {
    const newId = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newTicket = { id: newId, ...payload };
    tickets.unshift({ ...newTicket, created_at: new Date().toISOString() });
    render();
    const { error } = await window.db.from('tickets').upsert(newTicket, { onConflict: 'id' });
    if (error) {
      tickets = tickets.filter((x) => x.id !== newId);
      render();
      alert('Save failed: ' + error.message);
    } else { await upsertTicketExpense(newTicket); await upsertTicketProject(newTicket); }
  }
  ticketEditor.close();
});

$('#ticket-cancel-btn').addEventListener('click', () => ticketEditor.close());

$('#ticket-delete-btn').addEventListener('click', async () => {
  if (!editingTicketId) return;
  if (!confirm('Delete this ticket?')) return;
  const id = editingTicketId;
  tickets = tickets.filter((x) => x.id !== id);
  render();
  const { error } = await window.db.from('tickets').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); loadAll(); }
  ticketEditor.close();
});

ticketEditor.addEventListener('click', (e) => {
  const rect = ticketEditor.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) ticketEditor.close();
});

// ─── Debts ──────────────────────────────────────────────────

const DEBT_TYPE_LABELS = {
  personal: 'Personal',
  bank: 'Bank',
  tax: 'Tax',
  family: 'Family',
  business: 'Business',
  other: 'Other',
};

function debtSort(a, b) {
  const aPaid = a.status === 'paid';
  const bPaid = b.status === 'paid';
  if (aPaid !== bPaid) return aPaid ? 1 : -1;
  const aFocus = a.priority === 'focus';
  const bFocus = b.priority === 'focus';
  if (aFocus !== bFocus) return aFocus ? -1 : 1;
  return parseNum(b.current_balance) - parseNum(a.current_balance);
}

function renderDebtTotals() {
  setTotalsLabels(['Total owed', 'Monthly out', 'Paid lifetime', 'Active']);
  clearTotalSpanClasses();
  const active = debts.filter((d) => d.status !== 'paid');
  const owed = active.reduce((s, d) => s + parseNum(d.current_balance), 0);
  const monthly = active.reduce((s, d) => s + parseNum(d.monthly_payment), 0);
  const paidLifetime = debts.reduce((s, d) => s + Math.max(0, parseNum(d.original_amount) - parseNum(d.current_balance)), 0);

  const owedEl = $('#t-rev');
  owedEl.textContent = fmt(owed);
  if (owed > 0) owedEl.classList.add('neg');

  $('#t-exp').textContent = fmt(monthly);

  const lifetime = $('#t-net');
  lifetime.textContent = fmt(paidLifetime);
  if (paidLifetime > 0) lifetime.classList.add('pos');

  $('#t-count').textContent = String(active.length);
}

function renderDebts() {
  const sorted = [...debts].sort(debtSort);
  const active = sorted.filter((d) => d.status !== 'paid');
  const paid = sorted.filter((d) => d.status === 'paid');
  const totalOwed = active.reduce((s, d) => s + parseNum(d.current_balance), 0);
  const totalMonthly = active.reduce((s, d) => s + parseNum(d.monthly_payment), 0);
  const monthsToFreedom = totalMonthly > 0 ? Math.ceil(totalOwed / totalMonthly) : null;

  list.innerHTML = `
    <div class="debts-page">
      ${active.length > 0 ? `
        <div class="debt-strategy">
          <div class="debt-strategy-line"><strong>${fmt(totalOwed)}</strong> across ${active.length} active debt${active.length !== 1 ? 's' : ''}</div>
          ${totalMonthly > 0 ? `<div class="debt-strategy-line">At ${fmt(totalMonthly)}/mo current pace → debt-free in <strong>~${monthsToFreedom} month${monthsToFreedom !== 1 ? 's' : ''}</strong> (${Math.ceil(monthsToFreedom / 12)} year${monthsToFreedom > 12 ? 's' : ''})</div>` : '<div class="debt-strategy-line muted">Set monthly payments on each debt to see projected payoff.</div>'}
        </div>
      ` : ''}
      <div class="debt-list">
        ${sorted.length === 0
          ? '<div class="empty">No debts logged. Hit <strong>+ New</strong> to add one. Track to kill.</div>'
          : sorted.map(renderDebt).join('')}
      </div>
      ${paid.length > 0 ? `<div class="debt-paid-celebration">${paid.length} debt${paid.length !== 1 ? 's' : ''} killed ✓</div>` : ''}
    </div>
  `;

  list.querySelectorAll('.card.debt').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.debt-pay-btn')) return;
      openDebtEditor(el.dataset.id);
    });
  });
  list.querySelectorAll('.debt-pay-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openPaymentEditor(btn.dataset.id); });
  });
}

function renderDebt(d) {
  const original = parseNum(d.original_amount);
  const current = parseNum(d.current_balance);
  const paid = Math.max(0, original - current);
  const progress = original > 0 ? Math.min(100, (paid / original) * 100) : 0;
  const monthly = parseNum(d.monthly_payment);
  const rate = parseNum(d.interest_rate);
  const isPaid = d.status === 'paid' || current <= 0;
  const isFocus = d.priority === 'focus' && !isPaid;
  const paymentCount = debtPayments.filter((p) => p.debt_id === d.id).length;
  const typeLabel = DEBT_TYPE_LABELS[d.type] || 'Other';
  const monthsLeft = monthly > 0 && current > 0 ? Math.ceil(current / monthly) : null;

  return `
    <div class="card debt ${isPaid ? 'paid' : ''} ${isFocus ? 'focus' : ''}" data-id="${esc(d.id)}">
      <div class="card-head">
        <h3>${isFocus ? '🎯 ' : ''}${esc(d.creditor)}${isPaid ? ' ✓' : ''}</h3>
        <span class="status debt-type-${d.type || 'other'}">${esc(typeLabel)}</span>
      </div>
      <div class="debt-balance">
        <div class="debt-balance-numbers">
          <span class="debt-current ${isPaid ? 'paid' : 'neg'}">${fmt(current)}</span>
          <span class="debt-of">of ${fmt(original)} ${original > 0 ? `· ${fmt(paid)} paid` : ''}</span>
        </div>
        <div class="debt-progress-bar"><div class="debt-progress-fill" style="width: ${progress.toFixed(1)}%"></div></div>
        <div class="debt-progress-text">${progress.toFixed(0)}% killed</div>
      </div>
      <div class="debt-meta">
        ${monthly ? `<span>£${monthly}/mo</span>` : ''}
        ${rate ? `<span>${rate}% APR</span>` : ''}
        ${monthsLeft ? `<span>~${monthsLeft} months left</span>` : ''}
        ${paymentCount > 0 ? `<span>${paymentCount} payment${paymentCount !== 1 ? 's' : ''}</span>` : ''}
      </div>
      ${!isPaid ? `<button type="button" class="debt-pay-btn" data-id="${esc(d.id)}">+ Log payment</button>` : ''}
    </div>
  `;
}

function openDebtEditor(id) {
  editingDebtId = id || null;
  const d = id ? debts.find((x) => x.id === id) : null;
  debtForm.reset();
  $('#debt-editor-title').textContent = d ? 'Edit debt' : 'New debt';
  $('#debt-delete-btn').style.display = d ? '' : 'none';
  if (d) {
    debtForm.creditor.value = d.creditor || '';
    debtForm.type.value = d.type || 'other';
    debtForm.status.value = d.status || 'active';
    debtForm.original_amount.value = d.original_amount || '';
    debtForm.current_balance.value = d.current_balance || '';
    debtForm.monthly_payment.value = d.monthly_payment || '';
    debtForm.interest_rate.value = d.interest_rate || '';
    debtForm.start_date.value = d.start_date || '';
    debtForm.due_date.value = d.due_date || '';
    debtForm.notes.value = d.notes || '';
    $('#debt-priority-check').checked = d.priority === 'focus';
    renderPaymentHistory(d.id);
  } else {
    debtForm.start_date.value = todayISO();
    $('#debt-priority-check').checked = false;
    $('#debt-payment-history').innerHTML = '';
  }
  debtEditor.showModal();
  setTimeout(() => debtForm.creditor?.focus(), 50);
}

function renderPaymentHistory(debtId) {
  const payments = debtPayments
    .filter((p) => p.debt_id === debtId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const container = $('#debt-payment-history');
  if (!container) return;
  if (payments.length === 0) {
    container.innerHTML = '<div class="debt-history-empty">No payments logged yet.</div>';
    return;
  }
  container.innerHTML = `
    <div class="debt-history">
      <div class="debt-history-label">Payment history (${payments.length})</div>
      ${payments.slice(0, 10).map((p) => `
        <div class="debt-history-row">
          <span>${esc(p.date || '—')}</span>
          <span>${fmt(parseNum(p.amount))}</span>
          ${p.notes ? `<span class="debt-history-notes">${esc(p.notes)}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

debtForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(debtForm);
  const payload = Object.fromEntries(fd.entries());
  payload.priority = fd.has('priority_focus') ? 'focus' : 'normal';
  delete payload.priority_focus;
  if (!payload.creditor || !payload.creditor.trim()) return;
  if (!payload.start_date) payload.start_date = null;
  if (!payload.due_date) payload.due_date = null;
  if (parseNum(payload.current_balance) <= 0) payload.status = 'paid';

  if (editingDebtId) {
    const d = debts.find((x) => x.id === editingDebtId);
    if (d) Object.assign(d, payload);
    render();
    const { error } = await window.db.from('debts').update(payload).eq('id', editingDebtId);
    if (error) alert('Save failed: ' + error.message);
  } else {
    const newId = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newDebt = { id: newId, ...payload };
    debts.unshift({ ...newDebt, created_at: new Date().toISOString() });
    render();
    const { error } = await window.db.from('debts').insert(newDebt);
    if (error) {
      debts = debts.filter((x) => x.id !== newId);
      render();
      alert('Save failed: ' + error.message);
    }
  }
  debtEditor.close();
});

$('#debt-cancel-btn').addEventListener('click', () => debtEditor.close());

$('#debt-delete-btn').addEventListener('click', async () => {
  if (!editingDebtId) return;
  if (!confirm('Delete this debt? Payment history will also be deleted.')) return;
  const id = editingDebtId;
  debts = debts.filter((x) => x.id !== id);
  debtPayments = debtPayments.filter((p) => p.debt_id !== id);
  render();
  const { error } = await window.db.from('debts').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); loadAll(); }
  debtEditor.close();
});

debtEditor.addEventListener('click', (e) => {
  const rect = debtEditor.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) debtEditor.close();
});

// ─── Payment logging ────────────────────────────────────────

function openPaymentEditor(debtId) {
  selectedDebtForPayment = debtId;
  const d = debts.find((x) => x.id === debtId);
  if (!d) return;
  paymentForm.reset();
  paymentForm.date.value = todayISO();
  const current = parseNum(d.current_balance);
  $('#payment-debt-info').innerHTML = `
    <div class="payment-debt-context">
      <strong>${esc(d.creditor)}</strong><br>
      Current balance: <strong class="neg">${fmt(current)}</strong>${d.monthly_payment ? ` · Usual: £${esc(d.monthly_payment)}/mo` : ''}
    </div>
  `;
  paymentEditor.showModal();
  setTimeout(() => paymentForm.amount?.focus(), 50);
}

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(paymentForm);
  const payload = Object.fromEntries(fd.entries());
  if (!selectedDebtForPayment) return;
  const d = debts.find((x) => x.id === selectedDebtForPayment);
  if (!d) return;

  const amt = parseNum(payload.amount);
  if (amt <= 0) { alert('Enter a payment amount.'); return; }
  const newBalance = Math.max(0, parseNum(d.current_balance) - amt);
  const newStatus = newBalance <= 0 ? 'paid' : 'active';

  const paymentId = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const newPayment = {
    id: paymentId,
    debt_id: d.id,
    amount: payload.amount,
    date: payload.date || todayISO(),
    notes: payload.notes || '',
  };
  debtPayments.unshift({ ...newPayment, created_at: new Date().toISOString() });
  d.current_balance = String(newBalance);
  d.status = newStatus;
  render();

  const [insRes, updRes] = await Promise.all([
    window.db.from('debt_payments').insert(newPayment),
    window.db.from('debts').update({ current_balance: d.current_balance, status: d.status }).eq('id', d.id),
  ]);
  if (insRes.error || updRes.error) {
    alert('Payment save partial failure. Reloading.');
    loadAll();
  } else if (newStatus === 'paid') {
    setTimeout(() => alert(`🎉 ${d.creditor} paid off. One less anchor.`), 100);
  }
  paymentEditor.close();
});

$('#payment-cancel-btn').addEventListener('click', () => paymentEditor.close());

paymentEditor.addEventListener('click', (e) => {
  const rect = paymentEditor.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) paymentEditor.close();
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

// PATCH A: updated renderWork — adds invoices dispatch
function renderWork() {
  const companies = entries.filter(e => e.type === 'work-company');
  const tasks     = entries.filter(e => e.type === 'work-task');
  if (workView === 'tasks')     renderWorkTasksView(tasks, companies);
  else if (workView === 'invoices') renderWorkInvoicesView();
  else if (workView === 'travel') return renderWorkTravelView();
  else renderWorkCompaniesView(companies);
}

// PATCH B: updated task toggle — 3 buttons
function renderWorkTasksView(tasks, companies) {
  const pending = tasks.filter(t => t.status !== 'done');
  const done    = tasks.filter(t => t.status === 'done');
  const toggle  = `<div class="ticket-type-filter"><button class="ticket-filter active" onclick="workView='tasks';renderWork()">Tasks</button><button class="ticket-filter" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button></div>`;
  if (tasks.length === 0) {
    list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkTaskEditor()">+ Task</button></div><div class="empty">No tasks yet. Hit <strong>+ Task</strong> to add one.</div>`;
    return;
  }
  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkTaskEditor()">+ Task</button></div>${pending.map(t => renderWorkTaskCard(t, companies)).join('')}${done.length ? `<div class="work-section-divider">Completed (${done.length})</div>${done.map(t => renderWorkTaskCard(t, companies)).join('')}` : ''}`;
}

// PATCH C: updated companies toggle — 3 buttons
function renderWorkCompaniesView(companies) {
  const toggle = `<div class="ticket-type-filter"><button class="ticket-filter" onclick="workView='tasks';renderWork()">Tasks</button><button class="ticket-filter active" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button></div>`;
  const chKey  = localStorage.getItem('ch_api_key') || '';
  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkCompanyEditor()">+ Company</button></div><div class="work-ch-bar"><span class="work-ch-label">CH API Key</span><input type="password" id="ch-key-input" value="${esc(chKey)}" placeholder="Your Companies House API key"/><button class="work-ch-save" onclick="saveCHKey()">Save</button></div>${companies.length === 0 ? '<div class="empty">No companies yet. Hit <strong>+ Company</strong> to add one.</div>' : ''}<div class="work-companies-grid">${companies.map(c => renderWorkCompanyCard(c)).join('')}</div>`;
}

// PATCH D: new invoices view
function renderWorkInvoicesView() {
  const toggle = `<div class="ticket-type-filter"><button class="ticket-filter" onclick="workView='tasks';renderWork()">Tasks</button><button class="ticket-filter" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter active" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button></div>`;
  if (invoices.length === 0) {
    list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openInvoiceEditor()">+ Invoice</button></div><div class="empty">No invoices yet. Hit <strong>+ Invoice</strong> to draft one.</div>`;
    return;
  }
  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openInvoiceEditor()">+ Invoice</button></div>${invoices.map(renderInvoiceCard).join('')}`;
}

function renderInvoiceCard(inv) {
  const sections = Array.isArray(inv.sections) ? inv.sections : [];
  const total = sections.reduce((s, sec) => s + (parseFloat(sec.total) || 0), 0);
  const month = inv.month ? inv.month.replace('-', ' / ') : '';
  const sectionsHtml = sections.filter(s => s.title || s.total).map(s =>
    `<div class="inv-section-row"><span class="inv-section-name">${esc(s.title||'')}</span><span class="inv-section-total">${s.total ? '£' + parseFloat(s.total).toLocaleString() : '—'}</span></div>`
  ).join('');
  return `<div class="card inv-card" onclick="openInvoiceEditor('${inv.id}')">
    <div class="inv-card-head">
      <span class="inv-card-title">${esc(inv.title || 'Untitled Invoice')}</span>
      <span class="inv-card-month">${month}</span>
    </div>
    ${sectionsHtml}
    <div class="inv-card-total"><span>Total</span><span class="inv-total-num">£${total.toLocaleString()}</span></div>
    <div class="inv-card-actions">
      <button class="work-btn-ghost inv-copy-btn" onclick="event.stopPropagation();copyInvoiceText('${inv.id}')">Copy text</button>
    </div>
  </div>`;
}

function renderWorkTaskCard(t, companies) {
  let meta = {};
  try { meta = JSON.parse(t.notes || '{}'); } catch (_) {}
  const company  = companies.find(c => c.id === meta.company_id);
  const co       = company ? esc(company.name) : '';
  const isDone   = t.status === 'done';
  const dueBadge = meta.due ? workDaysBadge(meta.due) : '';
  const priCls   = {high:'work-pri-high',medium:'work-pri-med',low:'work-pri-low'}[meta.priority] || 'work-pri-med';
  return `<div class="card work-task-card${isDone?' work-task-done':''}" onclick="openWorkTaskEditor('${t.id}')"><div class="work-task-row"><button class="work-check${isDone?' checked':''}" onclick="event.stopPropagation();toggleWorkTaskDone('${t.id}',${isDone})">${isDone?'&#10003;':''}</button><span class="work-task-name">${esc(t.name)}</span>${dueBadge}</div>${(co||meta.category||meta.priority)?`<div class="work-task-tags">${co?`<span class="work-tag">${co}</span>`:''} ${meta.category?`<span class="work-tag">${esc(meta.category)}</span>`:''} ${meta.priority?`<span class="work-tag ${priCls}">${esc(meta.priority)}</span>`:''}</div>`:''}</div>`;
}

function renderWorkCompanyCard(c) {
  let meta = {};
  try { meta = JSON.parse(c.notes || '{}'); } catch (_) {}
  const status = c.status || 'other';
  const col    = status === 'raz' ? 'var(--gold)' : status === 'partial' ? '#4A9EF5' : 'var(--border)';
  const owner  = {raz:'Raz',partial:'Partial',other:'Other'}[status] || 'Other';
  const accBdg = meta.accounts_due     ? workDaysBadge(meta.accounts_due)     : '<span class="work-na">—</span>';
  const conBdg = meta.confirmation_due ? workDaysBadge(meta.confirmation_due) : '<span class="work-na">—</span>';
  return `<div class="card work-company-card" style="border-left:3px solid ${col}" onclick="openWorkCompanyEditor('${c.id}')"><div class="work-co-head"><span class="work-co-name">${esc(c.name)}</span><span class="work-owner-badge" style="color:${col};border-color:${col}">${owner}</span></div>${meta.company_number?`<div class="work-ch-ref">CH: ${esc(meta.company_number)}</div>`:''}<div class="work-due-row"><span class="work-due-lbl">Accounts due</span>${accBdg}</div><div class="work-due-row"><span class="work-due-lbl">Conf. statement</span>${conBdg}</div></div>`;
}

function workDaysBadge(dateStr) {
  if (!dateStr) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dateStr); due.setHours(0,0,0,0);
  const diff  = Math.round((due - today) / 86400000);
  const lbl   = diff < 0 ? Math.abs(diff)+'d overdue' : diff === 0 ? 'Today' : diff+'d';
  const cls   = diff < 0 ? 'work-badge-overdue' : diff <= 7 ? 'work-badge-urgent' : diff <= 30 ? 'work-badge-soon' : 'work-badge-ok';
  return `<span class="work-days-badge ${cls}">${lbl}</span>`;
}

function saveCHKey() {
  const val = (document.getElementById('ch-key-input') || {}).value || '';
  localStorage.setItem('ch_api_key', val.trim());
  const btn = document.querySelector('.work-ch-save');
  if (btn) { btn.textContent = 'Saved!'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
}

async function lookupCH(num) {
  const key = localStorage.getItem('ch_api_key') || '';
  if (!key) { alert('Add your Companies House API key first (visible in the Companies view).'); return null; }
  try {
    const res = await fetch('/api/ch?n=' + encodeURIComponent(num.trim()), {
      headers: { 'x-ch-key': key }
    });
    if (!res.ok) { alert('Company not found (HTTP ' + res.status + ')'); return null; }
    return await res.json();
  } catch (err) { alert('CH lookup failed: ' + err.message); return null; }
}

function openWorkTaskEditor(id) {
  editingWorkTaskId = id || null;
  const companies = entries.filter(e => e.type === 'work-company');
  const t = id ? entries.find(e => e.id === id) : null;
  let meta = {};
  try { meta = JSON.parse((t && t.notes) || '{}'); } catch (_) {}
  const coOpts = companies.map(c => `<option value="${c.id}"${meta.company_id===c.id?' selected':''}>${esc(c.name)}</option>`).join('');
  showWorkModal(`<h3 class="work-modal-title">${t ? 'Edit Task' : 'New Task'}</h3><form id="work-task-form"><label class="work-lbl">Description</label><textarea class="work-input" name="name" required rows="3" placeholder="What needs to be done?">${t ? esc(t.name) : ''}</textarea><label class="work-lbl">Company</label><select class="work-input" name="company_id"><option value="">— None —</option>${coOpts}</select><div class="work-row-2"><div><label class="work-lbl">Category</label><input class="work-input" name="category" value="${esc(meta.category||'')}" placeholder="e.g. Accounts, Legal"/></div><div><label class="work-lbl">Priority</label><select class="work-input" name="priority"><option value="high"${meta.priority==='high'?' selected':''}>High</option><option value="medium"${meta.priority==='medium'||!meta.priority?' selected':''}>Medium</option><option value="low"${meta.priority==='low'?' selected':''}>Low</option></select></div></div><label class="work-lbl">Due Date</label><input class="work-input" type="date" name="due" value="${meta.due||''}"/><label class="work-lbl">Notes</label><textarea class="work-input" name="task_notes" rows="2" placeholder="Additional notes...">${esc(meta.notes||'')}</textarea><div class="work-modal-actions">${t?`<button type="button" class="work-btn-danger" onclick="deleteWorkItem('${t.id}','task')">Delete</button>`:'<span></span>'}<div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary" id="work-task-submit">Save</button></div></div></form>`);
  document.getElementById('work-task-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const name = (fd.get('name')||'').trim(); if (!name) return;
    const notes = JSON.stringify({ company_id: fd.get('company_id')||null, category: (fd.get('category')||'').trim(), priority: fd.get('priority'), due: fd.get('due')||null, notes: (fd.get('task_notes')||'').trim() });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const payload = { id, name, type: 'work-task', status: (t && t.status) || 'pending', notes };
    document.getElementById('work-task-submit').disabled = true;
    if (editingWorkTaskId) { await window.db.from('projects').update(payload).eq('id', editingWorkTaskId); }
    else { await window.db.from('projects').insert(payload); }
    closeWorkModal(); await loadAll();
  });
}

function openWorkCompanyEditor(id) {
  editingWorkCompanyId = id || null;
  const c = id ? entries.find(e => e.id === id) : null;
  let meta = {};
  try { meta = JSON.parse((c && c.notes) || '{}'); } catch (_) {}
  showWorkModal(`<h3 class="work-modal-title">${c ? 'Edit Company' : 'New Company'}</h3><form id="work-company-form"><label class="work-lbl">Company Name</label><input class="work-input" name="name" required value="${c?esc(c.name):''}" placeholder="Company Ltd"/><label class="work-lbl">Ownership</label><select class="work-input" name="status"><option value="raz"${(c&&c.status)==='raz'?' selected':''}>Raz (Mine)</option><option value="partial"${(c&&c.status)==='partial'?' selected':''}>Partial</option><option value="other"${!c||(c&&c.status)==='other'?' selected':''}>Other</option></select><label class="work-lbl">Companies House Number</label><div class="work-ch-lookup-row"><input class="work-input" name="company_number" id="work-ch-num" value="${esc(meta.company_number||'')}" placeholder="e.g. 12345678"/><button type="button" class="work-btn-ghost" onclick="doWorkCHLookup()">Look up</button></div><div class="work-row-2"><div><label class="work-lbl">Accounts Due</label><input class="work-input" type="date" name="accounts_due" id="work-accounts-due" value="${meta.accounts_due||''}"/></div><div><label class="work-lbl">Conf. Statement Due</label><input class="work-input" type="date" name="confirmation_due" id="work-confirm-due" value="${meta.confirmation_due||''}"/></div></div><label class="work-lbl">Notes</label><textarea class="work-input" name="company_notes" rows="2">${esc(meta.notes||'')}</textarea><div class="work-modal-actions">${c?`<button type="button" class="work-btn-danger" onclick="deleteWorkItem('${c.id}','company')">Delete</button>`:'<span></span>'}<div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary" id="work-co-submit">Save</button></div></div></form>`);
  document.getElementById('work-company-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const name = (fd.get('name')||'').trim(); if (!name) return;
    const notes = JSON.stringify({ company_number: (fd.get('company_number')||'').trim(), accounts_due: fd.get('accounts_due')||null, confirmation_due: fd.get('confirmation_due')||null, notes: (fd.get('company_notes')||'').trim() });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const payload = { id, name, type: 'work-company', status: fd.get('status'), notes };
    document.getElementById('work-co-submit').disabled = true;
    if (editingWorkCompanyId) { await window.db.from('projects').update(payload).eq('id', editingWorkCompanyId); }
    else { await window.db.from('projects').insert(payload); }
    closeWorkModal(); await loadAll();
  });
}

async function doWorkCHLookup() {
  const num = (document.getElementById('work-ch-num').value||'').trim();
  if (!num) { alert('Enter a company number first.'); return; }
  const btn = document.querySelector('.work-ch-lookup-row .work-btn-ghost');
  if (btn) btn.textContent = 'Looking up…';
  const data = await lookupCH(num);
  if (btn) btn.textContent = 'Look up';
  if (!data) return;
  const accDue = data.accounts && data.accounts.next_due;
  const conDue = data.confirmation_statement && data.confirmation_statement.next_due;
  if (accDue) document.getElementById('work-accounts-due').value = accDue;
  if (conDue) document.getElementById('work-confirm-due').value = conDue;
  const ni = document.querySelector('#work-company-form input[name="name"]');
  if (ni && !ni.value && data.company_name) ni.value = data.company_name;
  alert('Filled from Companies House' + (data.company_name ? ': ' + data.company_name : '') + '.');
}

function showWorkModal(html) {
  let ov = document.getElementById('work-modal-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'work-modal-overlay';
    ov.className = 'work-modal-overlay';
    ov.addEventListener('click', e => { if (e.target === ov) closeWorkModal(); });
    document.body.appendChild(ov);
  }
  ov.innerHTML = '<div id="work-modal" class="work-modal">' + html + '</div>';
  ov.style.display = 'flex';
}

function closeWorkModal() {
  const ov = document.getElementById('work-modal-overlay');
  if (ov) ov.style.display = 'none';
}

async function toggleWorkTaskDone(id, isDone) {
  const ns = isDone ? 'pending' : 'done';
  entries.forEach(e => { if (e.id === id) e.status = ns; });
  render();
  await window.db.from('projects').update({ status: ns }).eq('id', id);
}

async function deleteWorkItem(id, type) {
  if (!confirm('Delete this ' + type + '?')) return;
  closeWorkModal();
  entries = entries.filter(e => e.id !== id);
  render();
  await window.db.from('projects').delete().eq('id', id);
}

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
      const _inputEls = form.querySelectorAll('[name="' + k + '"]');
        const _inputEl = Array.from(_inputEls).find(e => {
          const sec = e.closest('[data-field]');
          return !sec || sec.style.display !== 'none';
        }) || _inputEls[0];
        if (_inputEl) _inputEl.value = (existing[k] == null ? '' : existing[k]);
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
  else if (activeTab === 'ticket') openTicketEditor(null);
  else if (activeTab === 'debt') openDebtEditor(null);
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


// ─── GYM ────────────────────────────────────────────────────────────────────

function gymStreaks() {
  if (!gymSessions.length) return { current: 0, longest: 0 };
  const dates = [...new Set(gymSessions.map(function(s) { return s.date; }))].sort();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastDate = dates[dates.length - 1];
  let current = 0;
  if (lastDate === today || lastDate === yesterday) {
    let streak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
      if (diff === 1) { streak++; } else { break; }
    }
    current = streak;
  }
  let longest = 0, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
    if (diff === 1) { cur++; if (cur > longest) longest = cur; } else { cur = 1; }
  }
  if (dates.length) longest = Math.max(longest, current, 1);
  return { current: current, longest: longest };
}

function renderGym() {
  const typeColors = { push: '#ef4444', pull: '#3b82f6', legs: '#8b5cf6', cardio: '#f97316', full: '#10b981', other: '#6b7280' };
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);
  const streaks = gymStreaks();
  const thisMonth = gymSessions.filter(function(s) { return s.date && s.date.startsWith(monthStr); }).length;
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const monStr = mon.toISOString().slice(0, 10);
  const completedCount = gymSessions.filter(function(s) { return s.completed !== false; }).length;
  const completionPct = gymSessions.length ? Math.round(completedCount / gymSessions.length * 100) : 0;

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const adjustedFirst = firstDow === 0 ? 6 : firstDow - 1;
  const gymDates = new Set(gymSessions.map(function(s) { return s.date; }));
  let heatCells = '';
  for (let i = 0; i < adjustedFirst; i++) { heatCells += '<div class="gym-heat-cell empty"></div>'; }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    let cls = 'gym-heat-cell';
    if (ds === todayStr) { cls += ' today'; }
    else if (ds > todayStr) { cls += ' future'; }
    else if (gymDates.has(ds)) { cls += ' trained'; }
    heatCells += '<div class="' + cls + '" title="' + ds + '"><span class="gym-cal-num">' + d + '</span></div>';
  }

  const recent = gymSessions.slice().sort(function(a, b) { return b.date > a.date ? 1 : -1; }).slice(0, 10);
  let sessionCardsHtml = '';
  for (let i = 0; i < recent.length; i++) {
    const s = recent[i];
    const col = typeColors[s.type] || typeColors.other;
    const dur = s.duration ? s.duration + 'm' : '';
    const done = s.completed !== false;
    const tickCls = done ? 'gym-session-tick done' : 'gym-session-tick';
    const tickChar = done ? '&#10003;' : '&#9675;';
    sessionCardsHtml += '<div class="gym-session-card" data-id="' + s.id + '">';
    sessionCardsHtml += '<div class="' + tickCls + '">' + tickChar + '</div>';
    sessionCardsHtml += '<div class="gym-session-type" style="background:' + col + '22;color:' + col + '">' + (s.type || 'session') + '</div>';
    sessionCardsHtml += '<div class="gym-session-info">';
    sessionCardsHtml += '<div class="gym-session-date">' + shortDate(s.date) + (dur ? ' &middot; ' + dur : '') + '</div>';
    if (s.notes) { sessionCardsHtml += '<div class="gym-session-notes">' + esc(s.notes) + '</div>'; }
    sessionCardsHtml += '</div></div>';
  }

  const lastMetric = bodyMetrics.length ? bodyMetrics[0] : null;
  const prevMetric = bodyMetrics.length > 1 ? bodyMetrics[1] : null;
  let weightTrend = '';
  let fatTrend = '';
  if (lastMetric && prevMetric) {
    const wDiff = (parseFloat(lastMetric.weight_kg) - parseFloat(prevMetric.weight_kg)).toFixed(1);
    weightTrend = parseFloat(wDiff) > 0 ? ' <span style="color:#ef4444">+' + wDiff + 'kg</span>' : ' <span style="color:#10b981">' + wDiff + 'kg</span>';
    if (lastMetric.body_fat_pct && prevMetric.body_fat_pct) {
      const fDiff = (parseFloat(lastMetric.body_fat_pct) - parseFloat(prevMetric.body_fat_pct)).toFixed(1);
      fatTrend = parseFloat(fDiff) > 0 ? ' <span style="color:#ef4444">+' + fDiff + '%</span>' : ' <span style="color:#10b981">' + fDiff + '%</span>';
    }
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const calTitle = monthNames[month] + ' ' + year;

  let html = '';
  html += '<div class="section-header"><h2>Gym</h2><button class="add-btn" onclick="openGymEditor(null)">+ Log Session</button></div>';
  html += '<div class="gym-header">';
  html += '<div class="gym-stat"><div class="gym-stat-val">' + thisMonth + '</div><div class="gym-stat-lbl">This Month</div></div>';
  html += '<div class="gym-stat"><div class="gym-stat-val">' + streaks.current + '</div><div class="gym-stat-lbl">Streak</div></div>';
  html += '<div class="gym-stat"><div class="gym-stat-val">' + streaks.longest + '</div><div class="gym-stat-lbl">Best Streak</div></div>';
  html += '<div class="gym-stat"><div class="gym-stat-val">' + completionPct + '%</div><div class="gym-stat-lbl">Completion</div></div>';
  html += '</div>';
  html += '<div class="gym-cal-header-row"><span class="gym-cal-lbl">' + calTitle + '</span></div>';
  html += '<div class="gym-heatmap">';
  html += '<div class="gym-cal-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>';
  html += '<div class="gym-cal-grid">' + heatCells + '</div>';
  html += '</div>';
  html += '<div class="gym-metrics-row">';
  html += '<div class="gym-metric-card">';
  html += '<div class="gym-metric-val">' + (lastMetric && lastMetric.weight_kg ? lastMetric.weight_kg + 'kg' : '--') + '</div>';
  html += '<div class="gym-metric-lbl">Weight' + weightTrend + '</div>';
  html += '<button class="gym-metric-btn" onclick="openBodyMetricEditor()">Log</button>';
  html += '</div>';
  html += '<div class="gym-metric-card">';
  html += '<div class="gym-metric-val">' + (lastMetric && lastMetric.body_fat_pct ? lastMetric.body_fat_pct + '%' : '--') + '</div>';
  html += '<div class="gym-metric-lbl">Body Fat' + fatTrend + '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div id="gym-session-list">';
  html += sessionCardsHtml || '<div class="empty-state">No sessions yet. Log your first!</div>';
  html += '</div>';
  document.getElementById('list').innerHTML = html;

  const list = document.getElementById('gym-session-list');
  if (list) {
    list.addEventListener('click', function(e) {
      const card = e.target.closest('[data-id]');
      if (card) { openGymEditor(card.dataset.id); }
    });
  }
}

function openGymEditor(id) {
  const dlg = document.getElementById('gym-editor');
  const form = document.getElementById('gym-form');
  form.reset();
  document.getElementById('gym-editor-title').textContent = id ? 'Edit Session' : 'Log Session';
  document.getElementById('gym-session-id').value = id || '';
  document.getElementById('gym-delete-btn').style.display = id ? 'inline-block' : 'none';
  if (id) {
    const s = gymSessions.find(function(x) { return String(x.id) === String(id); });
    if (s) {
      if (form.elements['type']) { form.elements['type'].value = s.type || 'push'; }
      if (form.elements['date']) { form.elements['date'].value = s.date || ''; }
      if (form.elements['duration']) { form.elements['duration'].value = s.duration || ''; }
      if (form.elements['notes']) { form.elements['notes'].value = s.notes || ''; }
      const cb = form.elements['completed'];
      if (cb) { cb.checked = s.completed !== false; }
    }
  } else {
    if (form.elements['date']) { form.elements['date'].value = new Date().toISOString().slice(0, 10); }
    const cb = form.elements['completed'];
    if (cb) { cb.checked = true; }
  }
  dlg.showModal();
}

function openBodyMetricEditor() {
  const dlg = document.getElementById('body-metric-editor');
  if (dlg) {
    const dateEl = document.getElementById('bm-date');
    if (dateEl) { dateEl.value = new Date().toISOString().slice(0, 10); }
    dlg.showModal();
  }
}

document.querySelectorAll('.dur-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const durInput = document.getElementById('gym-duration');
    if (durInput) { durInput.value = btn.dataset.val; }
    document.querySelectorAll('.dur-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

document.getElementById('gym-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const id = document.getElementById('gym-session-id').value;
  const cb = form.elements['completed'];
  const payload = {
    type: form.elements['type'] ? form.elements['type'].value : 'other',
    date: form.elements['date'] ? form.elements['date'].value : new Date().toISOString().slice(0, 10),
    duration: form.elements['duration'] && form.elements['duration'].value ? parseInt(form.elements['duration'].value) : null,
    notes: form.elements['notes'] ? (form.elements['notes'].value.trim() || null) : null,
    completed: cb ? cb.checked : true
  };
  if (id) {
    await window.db.from('gym_sessions').update(payload).eq('id', id);
  } else {
    await window.db.from('gym_sessions').insert(payload);
  }
  document.getElementById('gym-editor').close();
  await loadAll();
  renderGym();
});

document.getElementById('gym-delete-btn').addEventListener('click', async function() {
  const id = document.getElementById('gym-session-id').value;
  if (!id) { return; }
  if (!confirm('Delete this session?')) { return; }
  await window.db.from('gym_sessions').delete().eq('id', id);
  document.getElementById('gym-editor').close();
  await loadAll();
  renderGym();
});

document.getElementById('gym-cancel-btn').addEventListener('click', function() {
  document.getElementById('gym-editor').close();
});

var bmForm = document.getElementById('body-metric-form');
if (bmForm) {
  bmForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      date: form.elements['date'] ? form.elements['date'].value : new Date().toISOString().slice(0, 10),
      weight_kg: form.elements['weight_kg'] && form.elements['weight_kg'].value ? parseFloat(form.elements['weight_kg'].value) : null,
      body_fat_pct: form.elements['body_fat_pct'] && form.elements['body_fat_pct'].value ? parseFloat(form.elements['body_fat_pct'].value) : null,
      notes: form.elements['notes'] ? (form.elements['notes'].value.trim() || null) : null
    };
    await window.db.from('body_metrics').insert(payload);
    document.getElementById('body-metric-editor').close();
    await loadAll();
    renderGym();
  });
  var bmCancel = document.getElementById('bm-cancel-btn');
  if (bmCancel) {
    bmCancel.addEventListener('click', function() {
      document.getElementById('body-metric-editor').close();
    });
  }

function renderWorkTravelView() {
  renderTravel();
  var list = document.getElementById('list');
  var nav = '<div class="ticket-type-filter">' +
    '<button class="ticket-filter" onclick="workView=\'tasks\';renderWork()">Tasks</button>' +
    '<button class="ticket-filter" onclick="workView=\'companies\';renderWork()">Companies</button>' +
    '<button class="ticket-filter active" onclick="workView=\'travel\';renderWork()">Travel</button>' +
    '<button class="ticket-filter" onclick="workView=\'invoices\';renderWork()">Invoices</button>' +
    '</div>';
  list.insertAdjacentHTML('afterbegin', nav);
}

function renderTravel() {
  var list = document.getElementById('list');
  var s = {
    hourlyRate: parseFloat(localStorage.getItem('tr_hr') || '25'),
    petrolPrice: parseFloat(localStorage.getItem('tr_pp') || '1.55'),
    mpg: parseFloat(localStorage.getItem('tr_mpg') || '35'),
    wearRate: parseFloat(localStorage.getItem('tr_wr') || '0.45'),
  };
  window._ttm = {};
  window._tct = {};
  for (var t of roadTrips) window._ttm[t.id] = t;
  var byMonth = {};
  for (var t of roadTrips) {
    var k = t.date.substring(0, 7);
    if (!byMonth[k]) byMonth[k] = [];
    byMonth[k].push(t);
  }
  var months = Object.keys(byMonth).sort().reverse();
  months.forEach(function(m) {
    var trips = byMonth[m].slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    window._tct[m] = trips.map(function(t) {
      return t.postcode + ' â £' + parseFloat(t.total_cost).toFixed(2) + ' (' + t.date + ')';
    }).join('\n');
  });
  var monthHtml = months.map(function(m) {
    var trips = byMonth[m].slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    var total = trips.reduce(function(acc, t) { return acc + parseFloat(t.total_cost || 0); }, 0);
    var label = new Date(m + '-02').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    var tripRows = trips.map(function(t) {
      return '<div onclick="openTripEditor(window._ttm[\'' + t.id + '\'])" style="display:flex;align-items:center;padding:11px 16px;border-bottom:1px solid #111;cursor:pointer;gap:12px">'
        + '<span style="font-weight:600;color:#fff;min-width:100px">' + t.postcode + '</span>'
        + '<span style="color:#666;font-size:13px;flex:1">' + t.miles + ' mi &middot; ' + t.hours + 'h</span>'
        + '<span style="color:#666;font-size:12px">' + t.date + '</span>'
        + '<span style="color:#c9a84c;font-weight:700;min-width:65px;text-align:right">&pound;' + parseFloat(t.total_cost).toFixed(2) + '</span>'
        + '</div>';
    }).join('');
    return '<div style="background:#1a1a1a;border-radius:10px;margin-bottom:12px;overflow:hidden">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #2a2a2a">'
      + '<span style="color:#c9a84c;font-weight:600">' + label + '</span>'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<span style="color:#fff;font-weight:700">&pound;' + total.toFixed(2) + '</span>'
      + '<button onclick="copyMonthText(\'' + m + '\')" style="padding:4px 10px;background:#2a2a2a;color:#aaa;border:1px solid #444;border-radius:5px;cursor:pointer;font-size:12px">Copy</button>'
      + '</div></div>'
      + tripRows
      + '</div>';
  }).join('');
  var inp = function(id, lbl, val) {
    return '<label style="font-size:12px;color:#888">' + lbl + '<input id="' + id + '" type="number" step="any" value="' + val + '" style="display:block;width:100%;padding:7px;margin-top:4px;background:#222;border:1px solid #333;border-radius:6px;color:#fff;box-sizing:border-box"></label>';
  };
  list.innerHTML = '<div style="padding:16px;max-width:720px;margin:0 auto">'
    + '<div style="background:#1a1a1a;border-radius:10px;padding:16px;margin-bottom:14px">'
    + '<div style="color:#c9a84c;font-weight:600;margin-bottom:12px">Settings</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    + inp('tr-hourly', 'Hourly rate (£)', s.hourlyRate)
    + inp('tr-petrol', 'Petrol (£/litre)', s.petrolPrice)
    + inp('tr-mpg', 'MPG', s.mpg)
    + inp('tr-wear', 'Wear &amp; tear (£/mile)', s.wearRate)
    + '</div>'
    + '<button onclick="saveTravelSettings()" style="padding:7px 16px;background:#c9a84c;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600">Save Settings</button>'
    + '</div>'
    + '<div style="background:#1a1a1a;border-radius:10px;padding:16px;margin-bottom:14px">'
    + '<div style="color:#c9a84c;font-weight:600;margin-bottom:12px">Quick Calculator</div>'
    + '<div style="display:flex;gap:10px;margin-bottom:10px">'
    + '<input id="tr-calc-miles" type="number" placeholder="Miles" oninput="updateTravelCalc()" style="flex:1;padding:8px;background:#222;border:1px solid #333;border-radius:6px;color:#fff">'
    + '<input id="tr-calc-hours" type="number" placeholder="Hours" oninput="updateTravelCalc()" style="flex:1;padding:8px;background:#222;border:1px solid #333;border-radius:6px;color:#fff">'
    + '</div>'
    + '<div id="tr-calc-result" style="font-size:13px;color:#c9a84c;padding:8px;background:#222;border-radius:6px;min-height:34px;line-height:1.6"></div>'
    + '</div>'
    + (function(){var tot=roadTrips.reduce(function(a,t){var mi=parseFloat(t.miles)||0,hr=parseFloat(t.hours)||0,rate=parseFloat(t.hourly_rate)||s.hourlyRate,mg=parseFloat(t.mpg)||s.mpg,pp=parseFloat(t.petrol_price)||s.petrolPrice;return{mi:a.mi+mi,rev:a.rev+hr*rate,exp:a.exp+mi/mg*4.546*pp,cnt:a.cnt+1};},{mi:0,rev:0,exp:0,cnt:0});var q=function(l,v){return'<div style="background:#1a1a1a;border-radius:8px;padding:12px;text-align:center"><div style="color:#c9a84c;font-size:11px;font-weight:600;margin-bottom:4px">'+l+'</div><div style="color:#fff;font-size:18px;font-weight:700">'+v+'</div></div>';};return'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">'+q('REVENUE','£'+tot.rev.toFixed(0))+q('EXPENSES','£'+tot.exp.toFixed(0))+q('JOBS',String(tot.cnt))+q('MILES',tot.mi.toFixed(1))+'</div>';})()
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<span style="color:#fff;font-weight:600;font-size:16px">Road Trips</span>'
    + '<button onclick="openTripEditor(null)" style="padding:7px 16px;background:#c9a84c;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600">+ Log Trip</button>'
    + '</div>'
    + (months.length === 0 ? '<p style="color:#555;text-align:center;padding:40px">No trips yet.</p>' : monthHtml)
    + '</div>';
}

function updateTravelCalc() {
  var miles = parseFloat(document.getElementById('tr-calc-miles').value) || 0;
  var hours = parseFloat(document.getElementById('tr-calc-hours').value) || 0;
  var hr = parseFloat(localStorage.getItem('tr_hr') || '25');
  var pp = parseFloat(localStorage.getItem('tr_pp') || '1.55');
  var mpg = parseFloat(localStorage.getItem('tr_mpg') || '35');
  var wr = parseFloat(localStorage.getItem('tr_wr') || '0.45');
  var labour = hours * hr;
  var petrol = (miles / mpg) * 4.546 * pp;
  var wear = miles * wr;
  var total = labour + petrol + wear;
  var el = document.getElementById('tr-calc-result');
  if (el) el.innerHTML = (miles || hours) ? 'Labour: &pound;' + labour.toFixed(2) + ' &nbsp;|&nbsp; Petrol: &pound;' + petrol.toFixed(2) + ' &nbsp;|&nbsp; W&amp;T: &pound;' + wear.toFixed(2) + ' &nbsp;|&nbsp; <strong style="color:#fff">Total: &pound;' + total.toFixed(2) + '</strong>' : '';
}

function saveTravelSettings() {
  localStorage.setItem('tr_hr', document.getElementById('tr-hourly').value);
  localStorage.setItem('tr_pp', document.getElementById('tr-petrol').value);
  localStorage.setItem('tr_mpg', document.getElementById('tr-mpg').value);
  localStorage.setItem('tr_wr', document.getElementById('tr-wear').value);
  renderTravel();
}

function copyMonthText(m) {
  navigator.clipboard.writeText(window._tct[m]);
}

function openTripEditor(trip) {
  var s = {
    hr: parseFloat(localStorage.getItem('tr_hr') || '25'),
    pp: parseFloat(localStorage.getItem('tr_pp') || '1.55'),
    mpg: parseFloat(localStorage.getItem('tr_mpg') || '35'),
    wr: parseFloat(localStorage.getItem('tr_wr') || '0.45'),
  };
  document.getElementById('trip-editor').showModal();
  document.getElementById('trip-editor-title').textContent = trip ? 'Edit Trip' : 'Log Trip';
  document.getElementById('trip-id').value = trip ? trip.id : '';
  document.getElementById('trip-date').value = trip ? trip.date : new Date().toISOString().split('T')[0];
  document.getElementById('trip-postcode').value = trip ? trip.postcode : '';
  document.getElementById('trip-miles').value = trip ? trip.miles : '';
  document.getElementById('trip-hours').value = trip ? trip.hours : '';
  document.getElementById('trip-hourly-r').value = trip ? trip.hourly_rate : s.hr;
  document.getElementById('trip-petrol-p').value = trip ? trip.petrol_price : s.pp;
  document.getElementById('trip-mpg-v').value = trip ? trip.mpg : s.mpg;
  document.getElementById('trip-wear-v').value = trip ? trip.wear_rate : s.wr;
  document.getElementById('trip-notes').value = trip ? (trip.notes || '') : '';
  document.getElementById('trip-delete-btn').style.display = trip ? '' : 'none';
  updateTripCalcPreview();
}

function updateTripCalcPreview() {
  var mel = document.getElementById('trip-miles');
  var hel = document.getElementById('trip-hours');
  var miles = mel ? parseFloat(mel.value) || 0 : 0;
  var hours = hel ? parseFloat(hel.value) || 0 : 0;
  var hrel = document.getElementById('trip-hourly-r');
  var ppel = document.getElementById('trip-petrol-p');
  var mpgel = document.getElementById('trip-mpg-v');
  var wrel = document.getElementById('trip-wear-v');
  var hr = hrel ? parseFloat(hrel.value) || 25 : 25;
  var pp = ppel ? parseFloat(ppel.value) || 1.55 : 1.55;
  var mpg = mpgel ? parseFloat(mpgel.value) || 35 : 35;
  var wr = wrel ? parseFloat(wrel.value) || 0.45 : 0.45;
  var labour = hours * hr;
  var petrol = (miles / mpg) * 4.546 * pp;
  var wear = miles * wr;
  var total = labour + petrol + wear;
  var el = document.getElementById('trip-cost-preview');
  if (el) el.innerHTML = (miles || hours) ? 'Labour: &pound;' + labour.toFixed(2) + ' | Petrol: &pound;' + petrol.toFixed(2) + ' | W&amp;T: &pound;' + wear.toFixed(2) + ' | <strong>Total: &pound;' + total.toFixed(2) + '</strong>' : '';
}

async function saveTripEditor() {
  var id = document.getElementById('trip-id').value;
  var miles = parseFloat(document.getElementById('trip-miles').value) || 0;
  var hours = parseFloat(document.getElementById('trip-hours').value) || 0;
  var hr = parseFloat(document.getElementById('trip-hourly-r').value) || 25;
  var pp = parseFloat(document.getElementById('trip-petrol-p').value) || 1.55;
  var mpg = parseFloat(document.getElementById('trip-mpg-v').value) || 35;
  var wr = parseFloat(document.getElementById('trip-wear-v').value) || 0.45;
  var labour = hours * hr;
  var petrol = (miles / mpg) * 4.546 * pp;
  var wear = miles * wr;
  var total = labour + petrol + wear;
  var data = {
    date: document.getElementById('trip-date').value,
    postcode: document.getElementById('trip-postcode').value.toUpperCase().trim(),
    miles: miles, hours: hours,
    hourly_rate: hr, petrol_price: pp, mpg: mpg, wear_rate: wr,
    total_cost: +total.toFixed(2),
    notes: document.getElementById('trip-notes').value.trim(),
  };
  if (id) {
    await window.db.from('road_trips').update(data).eq('id', id);
  } else {
    await window.db.from('road_trips').insert(data);
  }
  document.getElementById('trip-editor').close();
  await loadAll();
  activeTab = 'invoice'; workView = 'travel';
  render();
}

async function deleteTripEditor() {
  var id = document.getElementById('trip-id').value;
  if (!id || !confirm('Delete this trip?')) return;
  await window.db.from('road_trips').delete().eq('id', id);
  document.getElementById('trip-editor').close();
  await loadAll();
  activeTab = 'invoice'; workView = 'travel';
  render();
}
}


async function lookupTripPostcode() {
  var pc = (document.getElementById('trip-postcode').value || '').trim().replace(/\s+/g,'').toUpperCase();
  if (pc.length < 3) return;
  var milesEl = document.getElementById('trip-miles');
  if (milesEl.dataset.manualMiles === '1') return;
  try {
    var r = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pc));
    var j = await r.json();
    if (!j.result) return;
    var homeLat = 51.6178, homeLng = -0.1757;
    var destLat = j.result.latitude, destLng = j.result.longitude;
    var osrm = 'https://router.project-osrm.org/route/v1/driving/' +
      homeLng + ',' + homeLat + ';' + destLng + ',' + destLat + '?overview=false';
    var ro = await fetch(osrm);
    var jo = await ro.json();
    if (!jo.routes || !jo.routes[0]) return;
    var miles = Math.round(jo.routes[0].distance / 1609.344 * 2 * 10) / 10;
    milesEl.value = miles;
    updateTripCalcPreview();
  } catch(e) {}
}
