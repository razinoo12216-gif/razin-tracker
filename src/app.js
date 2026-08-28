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
let dailyMacros = [];
let receivables = [];
let userNotes = [];
let pots = [];
let potSettings = { bank_balance: 0 };
const MACRO_TARGETS = {protein:180, carbs:280, fats:70, calories:2500};
let bodyMetrics = [];
let roadTrips = [];
let debtPayments = [];
let editingId = null;
let editingReviewId = null;
let editingInvoiceId = null;
let editingTaskId = null;
let editingTicketId = null;
let ticketKindView = 'personal';
let workView = 'companies';
let editingWorkTaskId = null;
let editingWorkCompanyId = null;
let editingDebtId = null;
let selectedDebtForPayment = null;
let currentInvoiceSections = [];
let currentRecurrenceDays = new Set()
let currentMonthlyMode=false;
let currentMonthlyDay=1;;
let selectedMonth = currentMonth();
let selectedDay = todayISO();
let selectedYear = new Date().getFullYear();
let activeTab = 'today';
let incomeEntries = [];
let incomeView = 'month';
let incomeRef = todayISO();
let lifeGoals = [];
let dailyTargets = [];
let dailyLogs = [];
let weeklyTargets = [];
let weeklyLogs = [];
let lifeSubTab = 'goals';
let lifeDay = todayISO();
let workQuotes = [];
let opDailyLogs = [];
let opDebt = null;
let opIncome = [];
let opSpend = [];
let opProjects = [];
let opPartner = [];
let opSubTab = 'daily';
let agentMessages = [];
let agentBusy = false;
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
  { q: "The pain you feel today will be the strength you feel tomorrow.", a: "Arnold Schwarzenegger", e: "Today\'s resistance builds tomorrow's capacity. The morning you least want to train or make calls is exactly when you must — that friction is the training." },
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

function saveLocalBackup() {
  try {
    var KEY = '12w_backup_good';
    var prev = {};
    try { prev = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    var sets = { entries: entries, tasks: tasks, tickets: tickets, debts: debts, receivables: receivables, debtPayments: debtPayments, reviews: reviews, invoices: invoices, gymSessions: gymSessions, bodyMetrics: bodyMetrics, roadTrips: roadTrips, dailyMacros: dailyMacros, userNotes: userNotes };
    Object.keys(sets).forEach(function (k) { var a = sets[k]; if (Array.isArray(a) && a.length > 0) prev[k] = a; });
    prev.ts = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(prev));
  } catch (e) {}
}

var _BACKUP_TABLE_MAP = { entries: 'projects', tasks: 'tasks', tickets: 'tickets', debts: 'debts', receivables: 'debts', debtPayments: 'debt_payments', reviews: 'reviews', invoices: 'invoices', gymSessions: 'gym_sessions', bodyMetrics: 'body_metrics', roadTrips: 'road_trips', dailyMacros: 'daily_macros', userNotes: 'user_notes' };

async function restore12World(which) {
  var backup = {};
  try { backup = JSON.parse(localStorage.getItem('12w_backup_good') || '{}'); } catch (e) { alert('No backup found on this device.'); return; }
  var names = which ? [which] : Object.keys(_BACKUP_TABLE_MAP);
  var restored = 0;
  for (var n = 0; n < names.length; n++) {
    var name = names[n];
    var rows = backup[name];
    if (!Array.isArray(rows) || !rows.length) continue;
    var table = _BACKUP_TABLE_MAP[name];
    var existingIds = {};
    try { var cur = await window.db.from(table).select('id'); if (cur.error) continue; (cur.data || []).forEach(function (r) { existingIds[r.id] = true; }); } catch (e) { continue; }
    var missing = rows.filter(function (r) { return r && r.id != null && !existingIds[r.id]; });
    if (!missing.length) continue;
    try { var res = await window.db.from(table).insert(missing); if (!res.error) restored += missing.length; } catch (e) {}
  }
  await loadAll();
  alert(restored > 0 ? ('Restored ' + restored + ' entries from your device backup.') : 'Nothing to restore.');
}

async function checkBackupRestore() {
  try {
    var backup = JSON.parse(localStorage.getItem('12w_backup_good') || '{}');
    var lostRecv = (!receivables || receivables.length === 0) && backup.receivables && backup.receivables.length > 0;
    var lostDebts = (!debts || debts.length === 0) && backup.debts && backup.debts.length > 0;
    if ((lostRecv || lostDebts) && !window._bkRetried) {
      window._bkRetried = true;
      try { if (window.db.auth && window.db.auth.refreshSession) { await window.db.auth.refreshSession(); } } catch (e) {}
      await loadAll();
    }
  } catch (e) {}
}

async function loadAll() {
  if (!window.SUPABASE_CONFIGURED) {
    list.innerHTML = '<div class="empty error">Supabase keys not set.</div>';
    return;
  }
  // Blank + £0 is indistinguishable from a broken app. Say what is happening.
  if (list && !list.innerHTML.trim()) list.innerHTML = '<div class="empty">Loading your data…</div>';
  // Fetches a whole table in 1000-row pages. Returns the same {data, error} shape
  // as a normal supabase-js query so callers do not need special handling.
  async function selectAllRows(table, orderCol, ascending) {
    const PAGE = 1000, MAX_PAGES = 25;   // 25k rows is far beyond anything here
    let all = [];
    for (let p = 0; p < MAX_PAGES; p++) {
      let q = window.db.from(table).select('*').range(p * PAGE, (p + 1) * PAGE - 1);
      if (orderCol) q = q.order(orderCol, { ascending: !!ascending });
      const { data, error } = await q;
      if (error) return { data: null, error };
      all = all.concat(data || []);
      if (!data || data.length < PAGE) break;   // short page = last page
    }
    return { data: all, error: null };
  }
  const [eRes, rRes, iRes, tRes, kRes, dRes, pRes, gRes, mRes, trRes]= await Promise.all([
    window.db.from('projects').select('*').order('created_at', { ascending: false }),
    window.db.from('reviews').select('*').order('week_of', { ascending: false }),
    window.db.from('invoices').select('*').order('month', { ascending: false }),
    // PAGINATED — DO NOT put this back to a plain select('*').
    // PostgREST caps a single request at 1000 rows. This query is ordered OLDEST
    // FIRST, so once the table passed 1000 the app was loading the 1000 oldest
    // tasks and silently dropping every newer one. Razin added tasks, the INSERT
    // succeeded, and they vanished on reload — "nothing I add is saving"
    // (2026-08-27, table was at 1000+). Any table that can exceed 1000 rows needs
    // selectAllRows(), not select('*').
    selectAllRows('tasks', 'created_at', true),
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
  // ── PARALLEL TRAILING LOADS ──────────────────────────────────────────────
  // These 22 reads used to run one after another, each awaiting the last. On a
  // nano Postgres instance that is 5-15 seconds of blank screen showing £0
  // totals, which Razin reasonably read as "the app is broken" (2026-08-27).
  // None of them depend on each other, so they now go out in a single wave.
  // Errors stay swallowed per-query exactly as the old try/catch did — one dead
  // or RLS-blocked table must never take the whole load down.
  const grab = (q, assign) => Promise.resolve(q)
    .then(r => { if (r && !r.error) assign(r.data); })
    .catch(() => {});
  await Promise.all([
    grab(window.db.from('daily_macros').select('*').order('date',{ascending:false}), d => dailyMacros = d || []),
    grab(window.db.from('debts').select('*').or('type.eq.receivable,type.is.null').order('created_at',{ascending:false}), d => receivables = d || []),
    grab(window.db.from('user_notes').select('*').order('created_at',{ascending:false}), d => userNotes = d || []),
    grab(window.db.from('pots').select('*').order('priority',{ascending:true}), d => pots = d || []),
    grab(window.db.from('pot_settings').select('*').eq('id',1).single(), d => { if (d) potSettings = d; }),
    grab(window.db.from('income_entries').select('*').order('date',{ascending:false}), d => incomeEntries = d || []),
    grab(window.db.from('life_goals').select('*').order('sort_order',{ascending:true}), d => lifeGoals = d || []),
    grab(window.db.from('daily_targets').select('*').order('sort_order',{ascending:true}), d => dailyTargets = d || []),
    grab(window.db.from('daily_logs').select('*'), d => dailyLogs = d || []),
    grab(window.db.from('weekly_targets').select('*').order('sort_order',{ascending:true}), d => weeklyTargets = d || []),
    grab(window.db.from('weekly_logs').select('*'), d => weeklyLogs = d || []),
    grab(window.db.from('work_quotes').select('*').order('created_at',{ascending:false}), d => workQuotes = d || []),
    grab(window.db.from('debt_settings').select('*').eq('id',1).single(), d => { if (d) window._debtSettings = d; }),
    // Contacts arrive as ciphertext. Nothing is decrypted until a passphrase is entered.
    grab(window.db.from('contacts').select('*').order('created_at',{ascending:false}), d => contacts = d || []),
    grab(window.db.from('contacts_meta').select('*').eq('id',1).single(), d => contactsMeta = d || null),
    grab(window.db.from('op_daily_logs').select('*').order('date',{ascending:false}), d => opDailyLogs = d || []),
    grab(window.db.from('op_debt').select('*').eq('id',1).single(), d => { if (d) opDebt = d; }),
    grab(window.db.from('op_income').select('*').order('date',{ascending:false}), d => opIncome = d || []),
    grab(window.db.from('op_spend').select('*').order('date',{ascending:false}), d => opSpend = d || []),
    grab(window.db.from('op_projects').select('*'), d => opProjects = d || []),
    grab(window.db.from('op_partner_checks').select('*').order('week_label',{ascending:false}), d => opPartner = d || []),
    grab(window.db.from('coach_messages').select('*').order('created_at',{ascending:true}), d => agentMessages = (d||[]).map(m => ({role:m.role, content:m.content}))),
  ]);
  render(); // re-render once trailing loads (pots, receivables, notes, macros) are in — fixes stale header/sections on first load
  try { saveLocalBackup(); } catch(_e) {}
  try { checkBackupRestore(); } catch(_e) {}
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
  // Contacts has its own search box and must not show the global filter bar.
  if (activeTab === 'review' || activeTab === 'invoice' || activeTab === 'drive' || activeTab === 'today' || activeTab === 'ticket' || activeTab === 'debt' || activeTab === 'contacts') {
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

function renderProjectTotals(projects) {
  setTotalsLabels(['Revenue', 'Job expenses', 'Net', 'Projects']);
  clearTotalSpanClasses();
  let rev = 0, exp = 0;
  for (const p of projects) { rev += parseNum(p.revenue); exp += parseNum(p.expenses); }
  $('#t-rev').textContent = fmt(rev);
  $('#t-exp').textContent = fmt(exp);
  const net = rev - exp;
  const netEl = $('#t-net');
  netEl.textContent = fmt(net);
  netEl.classList.toggle('neg', net < 0);
  netEl.classList.toggle('pos', net > 0);
  $('#t-count').textContent = String(projects.length);
}

function renderExpenseTotals(projects, expenses) {
  setTotalsLabels(['Profit', 'Monthly expenses', 'Net', 'Entries']);
  clearTotalSpanClasses();
  let projRev = 0, projExp = 0;
  for (const p of projects) { projRev += parseNum(p.revenue); projExp += parseNum(p.expenses); }
  const projectNet = projRev - projExp;
  let monthly = 0;
  for (const e of expenses) { monthly += parseNum(e.expenses); }
  const net = projectNet - monthly;
  const profitEl = $('#t-rev');
  profitEl.textContent = fmt(projectNet);
  profitEl.classList.toggle('neg', projectNet < 0);
  profitEl.classList.toggle('pos', projectNet > 0);
  $('#t-exp').textContent = fmt(monthly);
  const netEl = $('#t-net');
  netEl.textContent = fmt(net);
  netEl.classList.toggle('neg', net < 0);
  netEl.classList.toggle('pos', net > 0);
  $('#t-count').textContent = String(expenses.length);
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
  // Operator Log removed 2026-07-30 — dead feature, never logged against. renderOperator()
  // is left in place but unreachable so nothing else that referenced it breaks.
  if(activeTab==='operator')activeTab='today';
  // ⚠️ ADDING A TAB? IT MUST GO IN THIS LIST TOO.
  // Anything not listed is silently rewritten to 'today', so a new tab renders the
  // 12 Ticks page and looks like a broken route. Cost an hour on 'contacts' (2026-08-17):
  // the button existed, the render branch existed, and this line quietly undid both.
  if(!['today','drive','review','invoice','ticket','debt','gym','project','potential','expense','notes','contacts','pots','income','life','agent'].includes(activeTab))activeTab='today';
  // Month-scoped: expenses use month filter; projects are ongoing (not month-scoped)
  const moneyEntries = entries.filter((e) => e.type !== 'potential');
  const inMonth = moneyEntries.filter((e) => matchesMonth(e, selectedMonth));
  const projectsInMonth = entries.filter((e) => e.type === 'project' && matchesMonth(e, selectedMonth));
  const expensesInMonth = inMonth.filter((e) => e.type === 'expense');
  const potentials = entries.filter((e) => e.type === 'potential');

  if (activeTab === 'potential') {
    renderPotentialTotals(potentials);
  } else if (activeTab === 'project') {
    renderProjectTotals(projectsInMonth);
  } else if (activeTab === 'expense') {
    renderExpenseTotals(projectsInMonth, expensesInMonth);
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
  if (debtCountEl) debtCountEl.textContent = String(debts.filter(d => d.type !== 'receivable' && d.status !== 'paid').length);
  const potCountEl = $('#tc-pots');
  if (potCountEl) potCountEl.textContent = String((pots || []).filter(p => !p.archived).length);
  const incCountEl = $('#tc-income');
  if (incCountEl) incCountEl.textContent = String((incomeEntries || []).length);
  const lifeCountEl = $('#tc-life');
  if (lifeCountEl) lifeCountEl.textContent = String((lifeGoals || []).filter(g => g.status !== 'done').length);
  const opCountEl = $('#tc-operator');
  if (opCountEl) { const _ol = (opDailyLogs||[]).find(l=>l.date===todayISO()); opCountEl.textContent = String(_ol?OP_DAILY_ITEMS.reduce((s,it)=>s+(_ol[it[0]]===true?1:0),0):0); }

  // Hide/show header bits based on tab
  const totalsEl = document.querySelector('.totals');
  const monthSelEl = $('#month-select');
  const addBtnEl = $('#add-btn');
  const hideContext = activeTab === 'drive' || activeTab === 'today' || activeTab === 'contacts';
  if (totalsEl) totalsEl.style.display = (hideContext || activeTab === 'income' || activeTab === 'life' || activeTab === 'operator' || activeTab === 'agent') ? 'none' : '';
  if (monthSelEl) monthSelEl.style.display = (hideContext || activeTab === 'ticket' || activeTab === 'debt' || activeTab === 'pots' || activeTab === 'income' || activeTab === 'life' || activeTab === 'operator' || activeTab === 'agent') ? 'none' : '';
  if (addBtnEl) addBtnEl.style.display = (activeTab === 'today' || activeTab === 'contacts' || activeTab === 'pots' || activeTab === 'income' || activeTab === 'life' || activeTab === 'operator' || activeTab === 'agent') ? 'none' : '';

  if (activeTab === 'ticket') renderTicketTotals();
  if (activeTab === 'debt') renderDebtTotals();
  if (activeTab === 'pots') renderPotTotals();

  if (activeTab === 'pots') return renderPots();
  if (activeTab === 'income') return renderIncome();
  if (activeTab === 'life') return renderLife();
  if (activeTab === 'operator') return renderOperator();
  if (activeTab === 'agent') return renderAgent();
  if (activeTab === 'today') return renderToday();
  if (activeTab === 'drive') return renderDrive();
  if (activeTab === 'review') return renderReviews();
  if (activeTab === 'invoice') return renderWork();
  if (activeTab === 'ticket') return renderTickets();
  if (activeTab === 'debt') return renderDebts();
  if (activeTab === 'potential') return renderPotentials(potentials);
  if (activeTab === 'gym') return renderGym();
  if (activeTab === 'notes') return renderNotes();
  if (activeTab === 'contacts') return renderContacts();

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
  if (recurrence.startsWith('monthly-')) {
    var dayNum = parseInt(dayISO.split('-')[2], 10);
    return dayNum === parseInt(recurrence.split('-')[1], 10);
  }
  var rParts = dayISO.split('-');
  var dow = new Date(parseInt(rParts[0], 10), parseInt(rParts[1], 10) - 1, parseInt(rParts[2], 10)).getDay();
  return recurrence.split(/[ ,]+/).map(Number).includes(dow);
}

function buildDayTasks(dayISO) {
  const realTasks = tasks.filter((t) => t.day === dayISO);
  // Recurring templates that started on or before this day
  const templates = tasks.filter((t) =>
    t.recurrence && t.recurrence !== 'none' && t.day && t.day < dayISO
  );
  const _seen = new Set(realTasks.map((r) => (r.title || '') + '|' + (r.time || '')));
  const virtualTasks = templates
    .filter((tpl) => recurrenceMatches(tpl.recurrence, dayISO))
    .filter((tpl) => !realTasks.some((r) => r.template_id === tpl.id))
    .filter((tpl) => { const _k = (tpl.title || '') + '|' + (tpl.time || ''); if (_seen.has(_k)) return false; _seen.add(_k); return true; })
    .map((tpl) => ({
      id: 'virtual:' + tpl.id + ':' + dayISO,
      day: dayISO,
      title: tpl.title,
      category: tpl.category || '',
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

/* ─── QUICK CAPTURE ────────────────────────────────────────────────────────────
 * Added 2026-08-10, replacing the removed Agent Chat as the only way anything gets
 * logged. Razin will not sit in a chat thread — he is driving, working, out. One box,
 * one Send, one line back. POSTs to /api/capture, which runs on Haiku and writes
 * through the same audited/verified path as everything else.
 *
 * Draft lives in a var, not the DOM: render() rebuilds innerHTML on every tab switch
 * and was silently binning typed text. Same bug that bit the agent input.
 * ──────────────────────────────────────────────────────────────────────────── */
var captureState = captureState || { loading:false, reply:'', actions:[], err:null, wrote:null };
var captureDraft = captureDraft || '';

function saveCaptureDraft(){
  const t=document.getElementById('cap-input'); if(t) captureDraft=t.value;
}

async function sendCapture(){
  const ta=document.getElementById('cap-input');
  const t=((ta?ta.value:captureDraft)||'').trim();
  if(!t || captureState.loading) return;
  captureDraft=t;
  captureState.loading=true; captureState.err=null; captureState.reply=''; captureState.actions=[]; captureState.wrote=null;
  render();
  try{
    const r=await fetch('/api/capture',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text:t})});
    const d=await r.json();
    if(!r.ok||d.error){ captureState.err=d.error||('HTTP '+r.status); }
    else{
      captureState.reply=d.text||'';
      captureState.actions=d.actions||[];
      captureState.wrote=!!d.wrote;
      if(d.usage) window._agLastUsage=d.usage;
    }
  }catch(e){ captureState.err=e.message; }
  captureState.loading=false;
  // Clear the box ONLY once a row came back verified out of Postgres. If nothing was
  // written his words stay where they are, so a retry costs him no retyping.
  if(captureState.wrote){ captureDraft=''; await loadAll(); }
  else render();
}

function renderCaptureBox(){
  const acts=(captureState.actions||[]).filter(a=>a.verified).map(a=>
    `<div class="cap-act"><span class="cap-ok">✓</span><span>${esc(a.summary||a.tool)}</span></div>`).join('');
  const bad=(captureState.actions||[]).some(a=>a.verified===false);
  let out='';
  if(captureState.loading) out=`<div class="cap-out cap-wait">Writing it down…</div>`;
  else if(captureState.err) out=`<div class="cap-out cap-bad">⚠ ${esc(captureState.err)} — your text is still in the box.</div>`;
  else if(captureState.reply||acts){
    const warn=(captureState.wrote===false)?`<div class="cap-bad">Nothing reached the database — text kept so you can resend.</div>`:'';
    out=`<div class="cap-out">${warn}${acts}${bad?`<div class="cap-bad">Some of that did not save.</div>`:''}<div class="cap-reply">${esc(String(captureState.reply).split('\n')[0])}</div></div>`;
  }
  return `<div class="cap-wrap">
      <textarea id="cap-input" class="cap-input" rows="2" placeholder="Gym done, fajr on time, told E I'd send the docs Tuesday…" ${captureState.loading?'disabled':''} oninput="saveCaptureDraft()">${esc(captureDraft)}</textarea>
      <button class="cap-send" onclick="sendCapture()" ${captureState.loading?'disabled':''}>Log it</button>
      ${out}
    </div>`;
}


/* ─── TODAY'S TICKS on 12 Ticks (2026-08-27) ──────────────────────────────────
 * The daily targets already lived on Life Progress, but Razin opens 12 Ticks
 * every morning and asked for something he can "open my phone and tick off".
 * Same daily_targets / daily_logs rows, same streaks — just surfaced where his
 * thumb already is. Always acts on TODAY, never the day he happens to be
 * browsing, so a tick can never land on the wrong date.
 * ─────────────────────────────────────────────────────────────────────────── */
function tickToday(id){ lifeDay = todayISO(); toggleDailyCheck(id); }
function tickTodayCount(ev, id, d){ lifeDay = todayISO(); adjustDailyCount(ev, id, d); }

function renderDailyStrip(){
  const day = todayISO();
  const ad = (dailyTargets||[]).filter(t => t.active !== false)
    .sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
  if (!ad.length) return '';
  const met = ad.filter(t => dailyMet(t, day)).length;

  const groups = {};
  ad.forEach(t => { const d = t.domain || 'Other'; (groups[d] = groups[d] || []).push(t); });

  const blocks = Object.keys(groups).map(dom => {
    const items = groups[dom].map(t => {
      const eff = dailyEffective(t, day), isMet = dailyMet(t, day), streak = dailyStreak(t);
      const flame = streak > 1 ? `<span class="dt-streak">${streak}</span>` : '';
      if (t.type === 'count' && !eff.auto) {
        return `<div class="dt-item${isMet?' on':''}">
            <span class="dt-name">${esc(t.title)}</span>
            <span class="dt-count">
              <button class="dt-cbtn" onclick="tickTodayCount(event,'${t.id}',-1)">−</button>
              <span class="dt-cval">${eff.v}/${t.target_count||1}</span>
              <button class="dt-cbtn" onclick="tickTodayCount(event,'${t.id}',1)">+</button>
            </span>${flame}
          </div>`;
      }
      if (eff.auto) {
        return `<div class="dt-item dt-auto${isMet?' on':''}">
            <span class="dt-box">${isMet?'✓':''}</span>
            <span class="dt-name">${esc(t.title)}</span>${flame}
          </div>`;
      }
      return `<button type="button" class="dt-item dt-tap${isMet?' on':''}" onclick="tickToday('${t.id}')">
          <span class="dt-box">${isMet?'✓':''}</span>
          <span class="dt-name">${esc(t.title)}</span>${flame}
        </button>`;
    }).join('');
    return `<div class="dt-group"><div class="dt-dom">${esc(dom)}</div><div class="dt-grid">${items}</div></div>`;
  }).join('');

  return `<div class="dt-wrap">
      <div class="dt-head">
        <span class="dt-title">Today</span>
        <span class="dt-score${met===ad.length?' all':''}">${met}/${ad.length}</span>
      </div>
      ${blocks}
    </div>`;
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
        <button onclick="openPlannerModal()" style="display:flex;align-items:center;gap:6px;padding:7px 16px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:0.82rem;font-weight:700;letter-spacing:.02em;margin-top:8px">&#9889; Plan My Day</button>
        <button id="notif-btn" onclick="requestNotificationPermission()" style="display:flex;align-items:center;gap:6px;padding:7px 16px;background:#1e293b;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:20px;cursor:pointer;font-size:0.82rem;font-weight:700;letter-spacing:.02em;margin-top:8px" onclick="requestNotificationPermission()">🔔 Notifications</button>
        <div class="today-nav">
          <button type="button" class="day-nav" id="day-prev" aria-label="Previous day">←</button>
          <button type="button" class="day-nav today-btn" id="day-today">${isToday ? 'Today' : 'Jump to today'}</button>
          <button type="button" class="day-nav" id="day-next" aria-label="Next day">→</button>
          <input type="date" id="day-picker" value="${esc(selectedDay)}" aria-label="Pick a date" style="background:#1e293b;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:5px 10px;font-size:0.8rem;color-scheme:dark;cursor:pointer;margin-top:6px" />
        </div>
      </div>
      ${renderCaptureBox()}
      ${renderDailyStrip()}
      <div class="task-search-bar" style="margin:10px 0;">
        <input id="task-search" type="text" placeholder="\u{1F50D} Search all tasks across every day\u2026" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 14px;background:#10151c;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:12px;font-size:0.9rem" />
        <div id="task-search-results" style="margin-top:6px;"></div>
      </div>
      <div class="today-list">
        ${dayTasks.length === 0 ? `<div class="today-empty">Empty list. Add your first task below, or tap "Copy yesterday".</div>` : ''}
        ${dayTasks.map(renderTask).join('')}
      </div>
      <div class="task-add-bar">
        <input id="task-quick-input" type="text" placeholder="Add task…" autocomplete="off" />
        <input id="task-quick-time" type="time" />
        <select id="task-quick-cat" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:0.82rem;"><option value="admin">Admin</option><option value="deep-work">Deep Work</option><option value="call">Call</option><option value="finance">Finance</option><option value="errand">Errand</option><option value="travel">Travel</option><option value="personal">Personal</option><option value="reminders">Reminders</option><option value="meeting">Meeting</option></select>
        <button id="task-quick-btn" type="button">Add</button>
      </div>
      <div class="today-actions">
        <button type="button" class="ghost" id="copy-yesterday-btn">Copy yesterday's tasks</button>
      </div>
    </div>`;

  $('#day-prev').addEventListener('click', () => { selectedDay = shiftISO(selectedDay, -1); render(); });
  $('#day-next').addEventListener('click', () => { selectedDay = shiftISO(selectedDay, 1); render(); });
  $('#day-today').addEventListener('click', () => { selectedDay = todayISO(); render(); });
  { const _dp = $('#day-picker'); if (_dp) _dp.addEventListener('change', (e) => { if (e.target.value) { selectedDay = e.target.value; render(); } }); }
  {
    const _tsd = (iso) => { if (!iso) return 'repeats'; const p = iso.split('-'); const dd = new Date(+p[0], +p[1]-1, +p[2]); const W=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return W[dd.getDay()]+' '+(+p[2])+' '+M[dd.getMonth()]+' '+p[0]; };
    const _ts = $('#task-search');
    if (_ts) _ts.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const box = $('#task-search-results');
      if (!box) return;
      if (!q) { box.innerHTML = ''; return; }
      const seen = new Set();
      const matches = tasks.filter((t) => {
        if (!(t.title || '').toLowerCase().includes(q)) return false;
        const k = (t.title || '') + '|' + (t.day || '') + '|' + (t.time || '');
        if (seen.has(k)) return false; seen.add(k); return true;
      }).slice(0, 40);
      if (!matches.length) { box.innerHTML = '<div style="padding:8px 4px;color:#8a93a3;font-size:0.85rem">No matching tasks</div>'; return; }
      box.innerHTML = matches.map((t) => {
        const rec = t.recurrence && t.recurrence !== 'none';
        const dateLabel = rec ? 'repeats' : _tsd(t.day);
        const jumpDay = rec ? todayISO() : (t.day || '');
        const doneCss = t.done ? 'opacity:0.5;text-decoration:line-through;' : '';
        const time = t.time ? (esc(t.time) + ' \u00b7 ') : '';
        return '<div class="ts-result" data-day="' + esc(jumpDay) + '" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;background:#10151c;border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:5px;cursor:pointer;' + doneCss + '">'
          + '<span style="font-weight:600;font-size:0.88rem">' + esc(t.title) + '</span>'
          + '<span style="white-space:nowrap;color:#7c8696;font-size:0.78rem">' + time + dateLabel + '</span>'
          + '</div>';
      }).join('');
      box.querySelectorAll('.ts-result').forEach((el) => el.addEventListener('click', () => {
        const day = el.getAttribute('data-day');
        if (day) { selectedDay = day; render(); }
      }));
    });
  }

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
  const isMeeting = (t.category || '').toLowerCase() === 'meeting';
  const catSlug = t.category ? t.category.toLowerCase().replace(/\s+/g, '-') : '';
  const catBadge = t.category ? `<span class="task-cat-badge cat-${esc(catSlug)}">${esc(t.category)}</span>` : '';
  return `
    <div class="task-row ${t.done ? 'done' : ''}${isMeeting ? ' task-row--meeting' : ''}" data-id="${esc(t.id)}">
      <button type="button" class="task-check" data-id="${esc(t.id)}" aria-label="Toggle done">${t.done ? '✓' : ''}</button>
      <div class="task-time">${timeHtml}</div>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}${recurringIcon}</div>
        ${catBadge}
        ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ''}
      </div>
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
  const catInput = $('#task-quick-cat');
  const title = titleInput.value.trim();
  if (!title) return;
  const time = timeInput.value || '';
  const id = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const newTask = { id, day: selectedDay, title, time, icon: '', notes: '', done: false, category: catInput ? catInput.value : 'admin' };
  tasks.push({ ...newTask, created_at: new Date().toISOString() });
  titleInput.value = '';
  timeInput.value = ''; if(catInput) catInput.value='admin';
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
  currentMonthlyMode = false;
  var mp = document.getElementById('task-monthly-picker');
  if (str && str.startsWith('monthly-')) {
    currentMonthlyMode = true;
    currentMonthlyDay = parseInt(str.split('-')[1], 10) || 1;
    currentRecurrenceDays = new Set();
    document.querySelectorAll('#task-form .day-toggle').forEach(function(b) { b.classList.remove('active'); });
    if (mp) mp.style.display = 'block';
    var mdi = document.getElementById('task-month-day');
    if (mdi) mdi.value = currentMonthlyDay;
    return;
  }
  if (mp) mp.style.display = 'none';
  currentRecurrenceDays = (!str || str === 'none') ? new Set() : new Set(str.split(' ').map(Number));
  document.querySelectorAll('#task-form .day-toggle').forEach(function(b) {
    b.classList.toggle('active', currentRecurrenceDays.has(parseInt(b.dataset.day, 10)));
  });
}

function getRecurrenceStr() {
  if (currentMonthlyMode) {
    var mi = document.getElementById('task-month-day');
    if (mi) currentMonthlyDay = parseInt(mi.value, 10) || 1;
    return 'monthly-' + currentMonthlyDay;
  }
  if (currentRecurrenceDays.size === 0) return 'none';
  return [...currentRecurrenceDays].sort(function(a,b){return a-b;}).join(' ');
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
    var catEl=document.getElementById('task-category');
    if(catEl) catEl.value=(t&&t.category)?t.category:'admin';
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

document.querySelectorAll('#task-form .recurrence-quick-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var p = btn.dataset.preset;
    currentMonthlyMode = false;
    var mp = document.getElementById('task-monthly-picker');
    if (p==='off') currentRecurrenceDays=new Set();
    else if(p==='daily') currentRecurrenceDays=new Set([0,1,2,3,4,5,6]);
    else if(p==='weekdays') currentRecurrenceDays=new Set([1,2,3,4,5]);
    else if(p==='weekly') { currentRecurrenceDays=new Set(); }
    else if(p==='monthly') {
      currentMonthlyMode=true; currentRecurrenceDays=new Set();
      if(mp) mp.style.display='block';
      document.querySelectorAll('#task-form .day-toggle').forEach(function(b){b.classList.remove('active');});
      return;
    }
    if(mp) mp.style.display='none';
    document.querySelectorAll('#task-form .day-toggle').forEach(function(b){
      b.classList.toggle('active', currentRecurrenceDays.has(parseInt(b.dataset.day,10)));
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
      category: payload.category||'admin',
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
      category: payload.category||'admin',
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
  const existing = entries.find((p) => p.source_ticket_id === ticket.id && p.type === 'expense');
  if (existing) {
    Object.assign(existing, { name: label, expenses: amount, month });
    render();
    await window.db.from('projects').update({ name: label, expenses: amount, month }).eq('id', existing.id);
  } else {
    const nid = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2);
    const ne = { id: nid, type: 'expense', name: label, expenses: amount, month, source_ticket_id: ticket.id };
    entries.unshift({ ...ne, created_at: new Date().toISOString() });
    render();
    await window.db.from('projects').insert(ne);
  }
}

async function upsertTicketProject(ticket) {
  if (ticket.ticket_kind !== 'client') return;
  if (!ticket.client_paid || !ticket.work_done) return;
  const month = (ticket.date || todayISO()).substring(0, 7);
  const label = 'Client ticket – ' + (ticket.client_name || 'client') + ' (' + (ticket.type || 'fine') + ')';
  const existing = entries.find((p) => p.source_ticket_id === ticket.id && p.type === 'project');
  const data = { name: label, revenue: parseNum(ticket.client_revenue) || 0, expenses: parseNum(ticket.guy_cost) || 0, status: 'done', month, source_ticket_id: ticket.id };
  if (existing) {
    Object.assign(existing, data);
    render();
    await window.db.from('projects').update(data).eq('id', existing.id);
  } else {
    const nid = (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2);
    const np = { id: nid, type: 'project', ...data };
    entries.unshift({ ...np, created_at: new Date().toISOString() });
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
  if (t.type === 'admin') {
    var kindLabel = t.admin_kind === 'admin' ? 'Admin Ticket' : 'My Ticket';
    return `<div class="card ticket" data-id="${esc(t.id)}"><div class="card-head"><h3>${esc(t.admin_name || '—')}</h3><span class="status ticket-admin">Admin</span></div><div class="card-grid"><div><label>Reference</label><span>${esc(t.pcn || '—')}</span></div><div><label>Date</label><span>${esc(t.date || '—')}</span></div><div><label>Address</label><span>${esc(t.admin_address || '—')}</span></div><div><label>Ticket</label><span>${esc(kindLabel)}</span></div></div></div>`;
  }
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
        ? `<div style='display:flex;gap:5px;padding:5px 10px;flex-wrap:wrap'><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:${t.client_paid?'#22c55e':'#d1d5db'};color:${t.client_paid?'#fff':'#555'}'>Client paid</span><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:${(t.guy_paid||parseFloat(t.guy_cost)>0)?'#22c55e':'#d1d5db'};color:${(t.guy_paid||parseFloat(t.guy_cost)>0)?'#fff':'#555'}'>Guy paid</span><span style='font-size:.72rem;padding:2px 8px;border-radius:10px;background:${t.personal_paid?'#22c55e':'#d1d5db'};color:${t.personal_paid?'#fff':'#555'}'>Done</span></div>`
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
      ticketForm.personal_paid.checked = !!t.personal_paid;
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
  ['admin-name-row','admin-address-row','admin-kind-row'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.style.display = _isAdmin ? 'block' : 'none';
  });
  var _ntf = document.getElementById('non-admin-ticket-fields');
  if (_ntf) _ntf.style.display = _isAdmin ? 'none' : 'block';
  if (ticketForm.admin_name) ticketForm.admin_name.value = (t && t.admin_name) || '';
  if (ticketForm.admin_address) ticketForm.admin_address.value = (t && t.admin_address) || '';
  if (ticketForm.admin_kind) ticketForm.admin_kind.value = (t && t.admin_kind) || 'mine';
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
  for (const k of ['personal_paid','client_paid','guy_paid']) payload[k] = !!(payload[k]);
  for (const k of ['amount','paid','client_revenue','guy_cost']) { if (payload[k] === '' || payload[k] === undefined) payload[k] = null; else { const n = parseFloat(payload[k]); payload[k] = isNaN(n) ? null : n; } }

  ticketEditor.close();
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
  // Once a queue order exists it IS the display order — the list should read top
  // to bottom in the sequence he actually pays them. Falls back to focus-then-size.
  const ao = a.payoff_order == null || a.payoff_order === '' ? null : parseNum(a.payoff_order);
  const bo = b.payoff_order == null || b.payoff_order === '' ? null : parseNum(b.payoff_order);
  if (ao != null || bo != null) {
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
  }
  const aFocus = a.priority === 'focus';
  const bFocus = b.priority === 'focus';
  if (aFocus !== bFocus) return aFocus ? -1 : 1;
  return parseNum(b.current_balance) - parseNum(a.current_balance);
}

function _fmtDay(iso){ return iso ? new Date(iso+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'date not logged'; }
function elapsedSince(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); const days=Math.floor((Date.now()-d.getTime())/86400000); if(days<0) return 'not started'; if(days===0) return 'today'; if(days<14) return days+' day'+(days!==1?'s':''); if(days<70){ const w=Math.round(days/7); return w+' week'+(w!==1?'s':''); } const m=Math.round(days/30.44); if(m<24) return m+' month'+(m!==1?'s':''); const y=(days/365).toFixed(1); return y+' years'; }
function debtSettledDate(d){ const ds=(debtPayments||[]).filter(p=>p.debt_id===d.id).map(p=>p.date).filter(Boolean).sort(); return ds.length?ds[ds.length-1]:null; }
function receivableSettledDate(r){ try{ const ps=(JSON.parse(r.notes||'{}').payments)||[]; const ds=ps.map(x=>x.date).filter(Boolean).sort(); return ds.length?ds[ds.length-1]:null; }catch(e){ return null; } }

function renderDebtTotals() {
  clearTotalSpanClasses();
  if (window._debtView === 'owed') {
    setTotalsLabels(['Owed to me', 'Collected', 'Lifetime', 'Owing']);
    const act = (receivables || []).filter((r) => r.status !== 'paid');
    const outstanding = act.reduce((s, r) => s + parseNum(r.current_balance), 0);
    const collected = act.reduce((s, r) => s + Math.max(0, parseNum(r.original_amount) - parseNum(r.current_balance)), 0);
    const lifetime = act.reduce((s, r) => s + parseNum(r.original_amount), 0);
    const owingCount = act.filter((r) => parseNum(r.current_balance) > 0).length;

    const owedEl = $('#t-rev');
    owedEl.textContent = fmt(outstanding);
    if (outstanding > 0) owedEl.classList.add('pos');

    $('#t-exp').textContent = fmt(collected);

    $('#t-net').textContent = fmt(lifetime);

    $('#t-count').textContent = String(owingCount);
  } else {
    setTotalsLabels(['Total owed', 'Monthly out', 'Paid lifetime', 'Active']);
    const myDebts = debts.filter((d) => d.type !== 'receivable');
    const active = myDebts.filter((d) => d.status !== 'paid');
    const owed = active.reduce((s, d) => s + parseNum(d.current_balance), 0);
    const monthly = active.reduce((s, d) => s + parseNum(d.monthly_payment), 0);
    const paidLifetime = myDebts.reduce((s, d) => s + Math.max(0, parseNum(d.original_amount) - parseNum(d.current_balance)), 0);

    const owedEl = $('#t-rev');
    owedEl.textContent = fmt(owed);
    if (owed > 0) owedEl.classList.add('neg');

    $('#t-exp').textContent = fmt(monthly);

    const lifetime = $('#t-net');
    lifetime.textContent = fmt(paidLifetime);
    if (paidLifetime > 0) lifetime.classList.add('pos');

    $('#t-count').textContent = String(active.length);
  }
}

function renderReceivablesSection() {
  const act = receivables || [];
  if (!act.length) {
    return '<div class="empty-state"><p>No one owes you yet.</p><button class="add-btn" onclick="openReceivableEditor(null)">+ Add</button></div>';
  }
  const activeR = act.filter(r => parseNum(r.current_balance) > 0);
  const settledR = act.filter(r => parseNum(r.current_balance) <= 0);
  const totalOwed = act.reduce((s,r) => s + parseNum(r.current_balance), 0);
  const totalOrig = act.reduce((s,r) => s + parseNum(r.original_amount), 0);
  const totalCollected = Math.max(0, totalOrig - totalOwed);
  const summary = `<div class="debt-summary-card"><span class="debt-summary-total">${fmt(totalOwed)}</span> outstanding across ${activeR.length} entr${activeR.length===1?'y':'ies'}<br><span style="color:#34d399">£${totalCollected.toFixed(2)} collected so far</span></div>`;
  const cardFor = (r) => {
    const name = r.creditor || 'Unknown';
    const startISO = r.start_date || (r.created_at||'').slice(0,10);
    const orig = parseNum(r.original_amount);
    const remaining = parseNum(r.current_balance != null ? r.current_balance : orig);
    const collected = Math.max(0, orig - remaining);
    const pct = orig > 0 ? Math.min(100, (collected / orig) * 100) : 0;
    const isSettled = remaining <= 0;
    var rNotes = {}; try { rNotes = JSON.parse(r.notes || '{}'); } catch(_) {}
    const rPayments = Array.isArray(rNotes.payments) ? rNotes.payments : [];
    const lastPay = rPayments.length > 0 ? rPayments[rPayments.length - 1] : null;
    return `<div class="card debt ${isSettled ? 'paid' : ''}" onclick="openReceivableEditor('${r.id}')" style="cursor:pointer">
      <div class="card-head">
        <h3>${esc(name)}${isSettled ? ' ✓' : ''}</h3>
        <span class="status" style="background:rgba(52,211,153,0.15);color:#34d399;border-color:rgba(52,211,153,0.3)">OWES YOU</span>
      </div>
      <div class="debt-balance">
        <div class="debt-balance-numbers">
          <span class="debt-current" style="color:#34d399">${fmt(remaining)}</span>
          <span class="debt-of">of ${fmt(orig)}${orig > 0 ? ' · £' + collected.toFixed(2) + ' collected' : ''}</span>
        </div>
        <div class="debt-progress-bar"><div class="debt-progress-fill" style="width:${pct.toFixed(1)}%;background:linear-gradient(90deg,#34d399,#10b981)"></div></div>
        <div class="debt-progress-text">${pct.toFixed(0)}% collected</div>
      </div>
      ${startISO ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:8px">${isSettled?'Was owed':'Owing'} ${elapsedSince(startISO)} · since ${_fmtDay(startISO)}</div>` : ''}
      ${rPayments.length > 0 ? `<div class="debt-meta"><span>${rPayments.length} payment${rPayments.length !== 1 ? 's' : ''}</span>${lastPay ? `<span>Last: ${lastPay.date}</span>` : ''}</div>` : ''}
      ${!isSettled ? `<button type="button" class="debt-pay-btn" style="background:rgba(52,211,153,0.12);color:#34d399;border:1px solid rgba(52,211,153,0.25)" onclick="event.stopPropagation();logReceivablePayment('${r.id}')">+ Log payment received</button>` : `<div class="debt-settled-line">Settled ${_fmtDay(receivableSettledDate(r))}</div>`}
    </div>`;
  };
  const activeCards = activeR.map(cardFor).join('') || '<div class="life-empty-sm" style="padding:10px 2px">Nothing outstanding right now.</div>';
  const settledCards = settledR.length ? `<div class="debt-settled-group"><div class="debt-settled-head">Settled · ${settledR.length}</div>${settledR.map(cardFor).join('')}</div>` : '';
  return summary + activeCards + settledCards + '<button class="add-btn" style="margin-top:12px" onclick="openReceivableEditor(null)">+ Add</button>';
}
function openReceivableEditor(id) {
  var existing = id ? (receivables || []).find(function(r) { return String(r.id) === String(id); }) : null;
  window._rvEditId = id || null;
  var overlay = document.createElement('div');
  overlay.id = 'rv-dlg';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)';
  overlay.innerHTML =
    '<div style="width:400px;max-width:92vw;background:#181c28;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.08)">' +
      '<div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:18px 20px;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-weight:700;font-size:1rem;color:#fff;letter-spacing:.01em">' + (id ? '✏️ Edit — Owes Me' : '+ New — Owes Me') + '</span>' +
        '<button id="rv-close" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center">×</button>' +
      '</div>' +
      '<div style="padding:22px 20px 18px">' +
        '<label style="display:block;font-size:0.75rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Who owes you?</label>' +
        '<input id="rv-name" style="width:100%;box-sizing:border-box;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:11px 13px;color:#fff;font-size:0.95rem;outline:none;margin-bottom:14px" placeholder="Name or note..." />' +
        '<label style="display:block;font-size:0.75rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Amount (£)</label>' +
        '<input id="rv-amount" type="number" step="0.01" min="0" style="width:100%;box-sizing:border-box;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:11px 13px;color:#fff;font-size:0.95rem;outline:none;margin-bottom:18px" placeholder="0.00" />' +
        '<label style="display:block;font-size:0.75rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Date started (owed since)</label>' +
        '<input id="rv-start" type="date" style="width:100%;box-sizing:border-box;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:11px 13px;color:#fff;font-size:0.95rem;outline:none;margin-bottom:18px" />' +
        '<div id="rv-history" style="margin-bottom:16px"></div>' +
        '<div id="rv-btns" style="display:flex;gap:10px"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('rv-close').onclick = function() { overlay.remove(); };
  var btns = document.getElementById('rv-btns');
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary'; saveBtn.style.flex = '1'; saveBtn.textContent = 'Save';
  saveBtn.onclick = saveReceivableEditor; btns.appendChild(saveBtn);
  if (id) {
    var delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Delete';
    delBtn.onclick = function() { deleteReceivable(id); }; btns.appendChild(delBtn);
  }
  document.getElementById('rv-start').value = existing ? (existing.start_date || (existing.created_at||'').slice(0,10) || '') : todayISO();
  if (existing) {
    document.getElementById('rv-name').value = existing.creditor || '';
    document.getElementById('rv-amount').value = existing.original_amount || '';
    var _rvN = {}; try { _rvN = JSON.parse(existing.notes || '{}'); } catch(e) {}
    var _pays = (Array.isArray(_rvN.payments) ? _rvN.payments : []).slice().sort(function(a,b){ return String(b.date||'').localeCompare(String(a.date||'')); });
    var _coll = _pays.reduce(function(s,p){ return s + (parseFloat(p.amount)||0); }, 0);
    var _rem = parseFloat(existing.current_balance != null ? existing.current_balance : existing.original_amount) || 0;
    var _hist = document.getElementById('rv-history');
    if (_hist) {
      if (_pays.length) {
        _hist.innerHTML = '<label style="display:block;font-size:0.75rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Payments received (' + _pays.length + ') \u00b7 \u00a3' + _coll.toFixed(2) + ' in \u00b7 \u00a3' + _rem.toFixed(2) + ' left</label>' +
          '<div style="max-height:170px;overflow-y:auto;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px">' +
          _pays.map(function(p){ return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem"><span style="color:rgba(255,255,255,0.6)">' + (p.date || '\u2014') + '</span><span style="color:#34d399;font-weight:600">\u00a3' + ((parseFloat(p.amount)||0).toFixed(2)) + '</span></div>'; }).join('') +
          '</div>';
      } else {
        _hist.innerHTML = '<div style="font-size:0.8rem;color:rgba(255,255,255,0.4);padding:2px 0 6px">No payments logged yet \u2014 use \u201c+ Log payment received\u201d on the card.</div>';
      }
    }
  }
}
async function saveReceivableEditor() {
  var name = (document.getElementById('rv-name') || {}).value || '';
  var amount = parseFloat((document.getElementById('rv-amount') || {}).value) || 0;
  if (!name || !amount) { alert('Name and amount are required.'); return; }
  var id = window._rvEditId;
  var payload = { creditor: name, original_amount: amount, current_balance: amount, type: 'receivable', status: 'active' };
  payload.start_date = (document.getElementById('rv-start') || {}).value || null;
  if (id) {
    var existing2 = (receivables || []).find(function(r) { return String(r.id) === String(id); });
    var origAmt = existing2 ? parseFloat(existing2.original_amount) : amount;
    var curBal = existing2 ? parseFloat(existing2.current_balance != null ? existing2.current_balance : origAmt) : amount;
    payload.current_balance = Math.max(0, amount - (origAmt - curBal));
    delete payload.type; delete payload.status;
  }
  if (!id) payload.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  var res = id ? await window.db.from('debts').update(payload).eq('id', id) : await window.db.from('debts').insert([payload]);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  var dlg = document.getElementById('rv-dlg'); if (dlg) dlg.remove();
  await loadAll(); renderDebts();
}
async function deleteReceivable(id) {
  if (!confirm('Delete this entry?')) return;
  await window.db.from('debts').delete().eq('id', id);
  var dlg = document.getElementById('rv-dlg'); if (dlg) dlg.remove();
  await loadAll(); renderDebts();
}
async function logReceivablePayment(id) {
  var existing = (receivables || []).find(function(r) { return String(r.id) === String(id); });
  if (!existing) return;
  var amt = prompt('Payment received (£)?');
  if (!amt) return;
  var payment = parseFloat(amt);
  if (isNaN(payment) || payment <= 0) { alert('Invalid amount'); return; }
  var newBal = Math.max(0, parseFloat(existing.current_balance != null ? existing.current_balance : existing.original_amount) - payment);
  var notesObj = {}; try { notesObj = JSON.parse(existing.notes || '{}'); } catch(_) {}
  if (!Array.isArray(notesObj.payments)) notesObj.payments = [];
  notesObj.payments.push({ date: new Date().toISOString().split('T')[0], amount: payment });
  var res = await window.db.from('debts').update({ current_balance: newBal, notes: JSON.stringify(notesObj) }).eq('id', id);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  await loadAll(); renderDebts();
}
function renderDebts() {
  const sorted = [...debts].filter((d) => d.type !== 'receivable').sort(debtSort);
  const active = sorted.filter((d) => d.status !== 'paid');
  const paid = sorted.filter((d) => d.status === 'paid');
  const totalOwed = active.reduce((s, d) => s + parseNum(d.current_balance), 0);
  const totalMonthly = active.reduce((s, d) => s + parseNum(d.monthly_payment), 0);
  const monthsToFreedom = totalMonthly > 0 ? Math.ceil(totalOwed / totalMonthly) : null;

  // One simulation for the whole tab, cached so each card reads its own slice
  // rather than recomputing. The old header line divided total balance by total
  // monthly, which assumes every debt is paid in parallel forever — always
  // optimistic. This is the real schedule, pot rollover included.
  const sched = debtSchedule();
  window._debtSchedCache = sched;
  const planned = active.filter(d => sched.byId[d.id] && sched.byId[d.id].rows.length);
  const unplanned = sched.unplanned;
  const lastClear = sched.clearMonth;
  const potLine = sched.budget > 0 && sched.start
    ? `<div class="debt-strategy-line">Shared pot <strong>${fmt(sched.budget)}/mo</strong> from ${esc(invoiceMonthLabel(sched.start))}, in queue order<button type="button" class="debt-pot-btn" onclick="openPotBudgetEditor()">change</button></div>`
    : `<div class="debt-strategy-line muted">No shared pot set.<button type="button" class="debt-pot-btn" onclick="openPotBudgetEditor()">set one</button></div>`;

  list.innerHTML = `
    <div class="debts-page">
      ${active.length > 0 ? `
        <div class="debt-strategy">
          <div class="debt-strategy-line"><strong>${fmt(totalOwed)}</strong> across ${active.length} active debt${active.length !== 1 ? 's' : ''}</div>
          ${lastClear ? `<div class="debt-strategy-line debt-free-line">Debt-free <strong>${esc(invoiceMonthLabel(lastClear))}</strong></div>` : ''}
          ${unplanned > 0.005 ? `<div class="debt-strategy-line"><span class="debt-plan-short">${fmt(unplanned)} with no plan yet</span></div>` : ''}
          ${potLine}
        </div>
      ` : ''}
      <div class="debt-list">
        ${sorted.length === 0
          ? '<div class="empty">No debts logged. Hit <strong>+ New</strong> to add one. Track to kill.</div>'
          : active.map(renderDebt).join('')}
      </div>
      ${paid.length > 0 ? `<div class="debt-settled-group"><div class="debt-settled-head">Settled · ${paid.length} killed ✓</div>${paid.map(renderDebt).join('')}</div>` : ''}
    </div>
  `;

  list.querySelectorAll('.card.debt').forEach((el) => {
    el.addEventListener('click', (e) => {
      // The plan block is interactive — a stray click there must not open the debt editor.
      if (e.target.closest('.debt-pay-btn') || e.target.closest('.debt-plan')) return;
      openDebtEditor(el.dataset.id);
    });
  });
  list.querySelectorAll('.debt-pay-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openPaymentEditor(btn.dataset.id); });
  });
  list.querySelectorAll('.debt-plan-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openPlanEditor(btn.dataset.planId); });
  });
  // Sub-tabs
  var _dv = window._debtView || 'debts';
  var _dpEl = list.querySelector('.debts-page');
  if (_dpEl) {
    var _stEl = list.querySelector('.debt-subtabs');
    if (!_stEl) {
      _stEl = document.createElement('div');
      _stEl.style.cssText = 'display:flex;gap:8px;margin-bottom:18px;';
      _dpEl.parentNode.insertBefore(_stEl, _dpEl);
    }
    _stEl.innerHTML = '';
    [['My Debts','debts'],['Owes Me','owed']].forEach(function(pair) {
      var btn = document.createElement('button');
      btn.textContent = pair[0];
      btn.style.cssText = 'flex:1;padding:9px 0;border:none;border-radius:10px;font-size:0.9rem;font-weight:600;cursor:pointer;letter-spacing:0.01em;' +
        (_dv === pair[1] ? 'background:#7c6cfc;color:#fff;' : 'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);');
      btn.onclick = (function(v){ return function(){ window._debtView=v; renderDebtTotals(); renderDebts(); }; })(pair[1]);
      _stEl.appendChild(btn);
    });
    var _rvEl = list.querySelector('.receivables-section');
    if (!_rvEl) {
      _rvEl = document.createElement('div');
      _rvEl.className = 'receivables-section';
      _dpEl.parentNode.appendChild(_rvEl);
    }
    _rvEl.innerHTML = renderReceivablesSection();
    _dpEl.style.display = _dv === 'debts' ? '' : 'none';
    _rvEl.style.display = _dv === 'owed' ? '' : 'none';
  }
}
/* ─── DEBT PAYOFF PLANS ───────────────────────────────────────────────────────
 * Each debt carries an ordered list of steps in debts.plan (jsonb). Three kinds:
 *   invoice  — a named invoice pays a chunk of it
 *   oneoff   — any other lump
 *   monthly  — a standing amount per month from a start month
 * Monthly steps with months=null run until the balance is dead, so the projection
 * answers the only question that matters: which month does this one disappear.
 * Needs debt_plans_setup.sql. Reads degrade to "no plan yet" without it.
 * ─────────────────────────────────────────────────────────────────────────── */
function debtPlanSteps(d) { return Array.isArray(d && d.plan) ? d.plan : []; }

function addMonthsISO(ym, n) {
  const p = String(ym || '').split('-');
  if (p.length < 2) return String(ym || '');
  let y = Number(p[0]), m = Number(p[1]) - 1 + Number(n || 0);
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return y + '-' + String(m + 1).padStart(2, '0');
}

/* ── THE SHARED POT (waterfall) ───────────────────────────────────────────────
 * Razin's real behaviour, 2026-08-10: once the plane is dead he puts a single
 * £1,000/month at the debts and works a queue — Iwoca, Amex, Macbook, Monzo, Apu.
 *
 * That is NOT five per-debt monthly payments. The whole pot hits the debt at the
 * front of the queue, and the month it dies the leftover rolls straight onto the
 * next one. Per-debt monthly steps cannot express "£810 of December's £1,000",
 * so the schedule is simulated month by month across every debt at once.
 *
 * Config lives in debt_settings (single row): monthly_budget + start_month.
 * Queue position is debts.payoff_order. Invoice/one-off chunks stay earmarked to
 * their own debt and are applied in their own month, before the pot moves.
 * ─────────────────────────────────────────────────────────────────────────── */
var DEBT_HORIZON_MONTHS = 240;   // 20 years. A plan that runs past this is not a plan.

function debtSettings() {
  const s = window._debtSettings || {};
  return { monthly_budget: parseNum(s.monthly_budget), start_month: s.start_month || null };
}

// One engine for the whole tab. Returns { byId, clearMonth, unplanned, budget, start }.
// byId[debtId] = { balance, rows, remaining, clearMonth, committed }
function debtSchedule() {
  const cfg = debtSettings();
  const live = (debts || [])
    .filter(d => d.type !== 'receivable' && d.status !== 'paid' && parseNum(d.current_balance) > 0);

  const st = live.map(d => ({
    id: d.id,
    balance: parseNum(d.current_balance),
    bal: parseNum(d.current_balance),
    order: d.payoff_order == null || d.payoff_order === '' ? 9999 : parseNum(d.payoff_order),
    chunks: debtPlanSteps(d).filter(s => s.kind !== 'monthly' && parseNum(s.amount) > 0),
    own: debtPlanSteps(d).filter(s => s.kind === 'monthly' && parseNum(s.amount) > 0),
    rows: [], pot: null, clearMonth: null,
  })).sort((a, b) => a.order - b.order || b.bal - a.bal);

  // Start at the earliest thing that happens: any chunk, any per-debt monthly, or
  // the pot's own start month.
  const marks = [];
  st.forEach(x => {
    x.chunks.forEach(c => { if (c.from) marks.push(c.from); });
    x.own.forEach(o => { if (o.from) marks.push(o.from); });
  });
  if (cfg.start_month) marks.push(cfg.start_month);
  if (!marks.length) {
    const byId = {};
    st.forEach(x => { byId[x.id] = { balance: x.balance, rows: [], remaining: x.balance, clearMonth: null, committed: 0 }; });
    return { byId, clearMonth: null, unplanned: st.reduce((s, x) => s + x.balance, 0), budget: cfg.monthly_budget, start: null };
  }
  const start = marks.sort()[0];

  for (let m = 0; m < DEBT_HORIZON_MONTHS; m++) {
    if (st.every(x => x.bal <= 0.005)) break;
    const ym = addMonthsISO(start, m);

    // 1. Earmarked money lands on its own debt first.
    st.forEach(x => {
      if (x.bal <= 0.005) return;
      x.chunks.filter(c => c.from === ym).forEach(c => {
        const applied = Math.min(parseNum(c.amount), x.bal);
        if (applied <= 0) return;
        x.bal -= applied;
        x.rows.push({ kind: c.kind || 'oneoff', source: c.source, from: ym, to: ym, applied, remaining: Math.max(0, x.bal) });
        if (x.bal <= 0.005 && !x.clearMonth) x.clearMonth = ym;
      });
    });

    // 2. Any per-debt standing payment he keeps outside the pot.
    st.forEach(x => {
      if (x.bal <= 0.005) return;
      x.own.forEach(o => {
        if (!o.from || String(ym) < String(o.from)) return;
        const elapsed = monthsBetween(o.from, ym);
        if (o.months && elapsed >= parseNum(o.months)) return;
        const applied = Math.min(parseNum(o.amount), x.bal);
        if (applied <= 0) return;
        x.bal -= applied;
        const key = 'own:' + (o.id || o.source);
        const prev = x.rows.find(r => r.key === key);
        if (prev) { prev.applied += applied; prev.n += 1; prev.to = ym; prev.remaining = Math.max(0, x.bal); }
        else x.rows.push({ key, kind: 'monthly', source: o.source, per: parseNum(o.amount), n: 1, from: ym, to: ym, applied, remaining: Math.max(0, x.bal) });
        if (x.bal <= 0.005 && !x.clearMonth) x.clearMonth = ym;
      });
    });

    // 3. The shared pot, strictly in queue order, rolling over as each dies.
    if (cfg.monthly_budget > 0 && cfg.start_month && String(ym) >= String(cfg.start_month)) {
      let left = cfg.monthly_budget;
      for (const x of st) {
        if (left <= 0.005) break;
        if (x.bal <= 0.005) continue;
        const applied = Math.min(left, x.bal);
        x.bal -= applied; left -= applied;
        if (!x.pot) {
          x.pot = { kind: 'pot', source: 'Shared pot', from: ym, to: ym, applied, n: 1, remaining: Math.max(0, x.bal) };
          x.rows.push(x.pot);
        } else {
          x.pot.applied += applied; x.pot.n += 1; x.pot.to = ym; x.pot.remaining = Math.max(0, x.bal);
        }
        if (x.bal <= 0.005 && !x.clearMonth) x.clearMonth = ym;
      }
    }
  }

  const byId = {};
  st.forEach(x => {
    byId[x.id] = {
      balance: x.balance, rows: x.rows, remaining: Math.max(0, x.bal),
      clearMonth: x.bal <= 0.005 ? x.clearMonth : null,
      committed: x.balance - Math.max(0, x.bal),
    };
  });
  const unplanned = st.reduce((s, x) => s + Math.max(0, x.bal), 0);
  // st.every() on an empty board is vacuously true, and .pop() on an empty array
  // is undefined — so an empty debt list would report a clear date of `undefined`.
  // Coerce to null so callers only ever see a month string or null.
  const allClear = st.length > 0 && st.every(x => x.bal <= 0.005);
  const clearMonth = allClear ? (st.map(x => x.clearMonth).filter(Boolean).sort().pop() || null) : null;
  return { byId, clearMonth, unplanned, budget: cfg.monthly_budget, start: cfg.start_month };
}

function monthsBetween(a, b) {
  const pa = String(a || '').split('-'), pb = String(b || '').split('-');
  if (pa.length < 2 || pb.length < 2) return 0;
  return (Number(pb[0]) - Number(pa[0])) * 12 + (Number(pb[1]) - Number(pa[1]));
}

// Kept for a single debt in isolation (no pot). The card uses debtSchedule().
function debtProjection(d) {
  const balance = parseNum(d.current_balance);
  const steps = debtPlanSteps(d)
    .filter(s => s && parseNum(s.amount) > 0)
    .slice()
    .sort((a, b) => String(a.from || '9999-99').localeCompare(String(b.from || '9999-99')));
  let remaining = balance;
  const rows = [];
  for (const s of steps) {
    if (remaining <= 0.005) break;
    const amt = parseNum(s.amount);
    if (s.kind === 'monthly') {
      const need = Math.ceil((remaining - 0.005) / amt);
      const n = s.months ? Math.min(parseNum(s.months), need) : need;
      if (n <= 0) continue;
      const applied = Math.min(amt * n, remaining);
      remaining -= applied;
      rows.push({
        kind: 'monthly', source: s.source, per: amt, n,
        from: s.from, to: addMonthsISO(s.from, n - 1),
        applied, remaining: Math.max(0, remaining), done: !!s.done,
      });
    } else {
      const applied = Math.min(amt, remaining);
      remaining -= applied;
      rows.push({
        kind: s.kind || 'oneoff', source: s.source, applied,
        from: s.from, to: s.from, remaining: Math.max(0, remaining), done: !!s.done,
      });
    }
  }
  remaining = Math.max(0, remaining);
  const last = rows.length ? rows[rows.length - 1].to : null;
  return {
    balance, rows, remaining,
    committed: balance - remaining,
    clearMonth: remaining <= 0.005 ? last : null,
  };
}

function renderDebtPlan(d) {
  const sched = window._debtSchedCache;
  const p = (sched && sched.byId && sched.byId[d.id]) || debtProjection(d);
  if (!p.rows.length) {
    return `<div class="debt-plan debt-plan-empty">
        <button type="button" class="debt-plan-btn" data-plan-id="${esc(d.id)}">+ Add a plan</button>
      </div>`;
  }
  const lines = p.rows.map(r => {
    const spread = (r.kind === 'monthly' || r.kind === 'pot') && r.to !== r.from;
    const when = spread
      ? `${invoiceMonthLabel(r.from)} → ${invoiceMonthLabel(r.to)}`
      : invoiceMonthLabel(r.from);
    const what = r.kind === 'pot'
      ? `${fmt(r.applied)} over ${r.n} mo`
      : r.kind === 'monthly'
        ? `${fmt(r.per)}/mo × ${r.n}`
        : fmt(r.applied);
    return `<div class="debt-plan-row${r.done ? ' done' : ''}${r.kind === 'pot' ? ' pot' : ''}">
        <span class="debt-plan-when">${esc(when)}</span>
        <span class="debt-plan-src">${esc(r.source || (r.kind === 'monthly' ? 'Monthly payment' : 'Payment'))}</span>
        <span class="debt-plan-amt">${esc(what)}</span>
        <span class="debt-plan-left">${r.remaining <= 0.005 ? 'clear' : fmt(r.remaining) + ' left'}</span>
      </div>`;
  }).join('');
  const head = p.clearMonth
    ? `<span class="debt-plan-clear">Clear by ${esc(invoiceMonthLabel(p.clearMonth))}</span>`
    : `<span class="debt-plan-short">${fmt(p.remaining)} unplanned</span>`;
  return `<div class="debt-plan">
      <div class="debt-plan-head">
        <span class="debt-plan-title">Plan</span>${head}
        <button type="button" class="debt-plan-btn" data-plan-id="${esc(d.id)}">Edit</button>
      </div>
      ${lines}
    </div>`;
}

/* ── shared pot editor: the amount, the start month, and the queue order ── */
function openPotBudgetEditor() {
  const cfg = debtSettings();
  window._potDraft = {
    monthly_budget: cfg.monthly_budget || '',
    start_month: cfg.start_month || '',
    queue: (debts || [])
      .filter(d => d.type !== 'receivable' && d.status !== 'paid' && parseNum(d.current_balance) > 0)
      .map(d => ({ id: d.id, creditor: d.creditor, bal: parseNum(d.current_balance),
                   order: d.payoff_order == null || d.payoff_order === '' ? 9999 : parseNum(d.payoff_order) }))
      .sort((a, b) => a.order - b.order || b.bal - a.bal),
  };
  renderPotQueue();
  const dlg = document.getElementById('pot-budget-editor');
  if (dlg && dlg.showModal) dlg.showModal();
}

function potMove(i, dir) {
  const q = window._potDraft.queue;
  const j = i + dir;
  if (j < 0 || j >= q.length) return;
  const t = q[i]; q[i] = q[j]; q[j] = t;
  renderPotQueue();
}
function potFieldChange(f, v) { window._potDraft[f] = v; renderPotQueue(); }

function renderPotQueue() {
  const d = window._potDraft;
  const amt = document.getElementById('pot-amount');
  const mon = document.getElementById('pot-start');
  if (amt && amt.value !== String(d.monthly_budget)) amt.value = d.monthly_budget;
  if (mon && mon.value !== String(d.start_month)) mon.value = d.start_month;
  const wrap = document.getElementById('pot-queue');
  if (!wrap) return;
  wrap.innerHTML = d.queue.map((x, i) => `
    <div class="pot-q-row">
      <span class="pot-q-num">${i + 1}</span>
      <span class="pot-q-name">${esc(x.creditor || '')}</span>
      <span class="pot-q-bal">${fmt(x.bal)}</span>
      <button type="button" onclick="potMove(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
      <button type="button" onclick="potMove(${i},1)" ${i === d.queue.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
    </div>`).join('');
  // Live answer to the only question: when does this finish.
  const prev = document.getElementById('pot-preview');
  if (prev) {
    const saved = window._debtSettings, savedOrders = (debts || []).map(x => x.payoff_order);
    window._debtSettings = { monthly_budget: parseNum(d.monthly_budget), start_month: d.start_month || null };
    d.queue.forEach((x, i) => { const row = debts.find(r => r.id === x.id); if (row) row.payoff_order = i + 1; });
    const s = debtSchedule();
    window._debtSettings = saved;
    (debts || []).forEach((x, i) => { x.payoff_order = savedOrders[i]; });
    prev.innerHTML = s.clearMonth
      ? `<span class="plan-ok">Everything clear by ${esc(invoiceMonthLabel(s.clearMonth))}</span>`
      : `<span class="plan-short">${fmt(s.unplanned)} never gets paid at this rate</span>`;
  }
}

async function savePotBudget() {
  const d = window._potDraft;
  if (!d || !window.SUPABASE_CONFIGURED) return;
  const budget = parseNum(d.monthly_budget);
  const start = d.start_month || null;
  if (budget > 0 && !start) { alert('Pick the month the pot starts.'); return; }
  const s = await window.db.from('debt_settings')
    .upsert({ id: 1, monthly_budget: budget, start_month: start }).select();
  if (s.error) {
    const missing = /debt_settings|column/i.test(s.error.message || '');
    alert(missing
      ? 'The shared pot is not set up yet.\n\nRun debt_plans_setup.sql in the Supabase SQL editor, then try again.'
      : 'Could not save: ' + s.error.message);
    return;
  }
  for (let i = 0; i < d.queue.length; i++) {
    const r = await window.db.from('debts').update({ payoff_order: i + 1 }).eq('id', d.queue[i].id);
    if (r.error) { alert('Saved the pot, but the queue order failed: ' + r.error.message); break; }
  }
  const dlg = document.getElementById('pot-budget-editor');
  if (dlg && dlg.close) dlg.close();
  await loadAll();
}

/* ── plan editor ── */
function openPlanEditor(id) {
  const d = debts.find(x => x.id === id);
  if (!d) return;
  window._planDebtId = id;
  window._planDraft = debtPlanSteps(d).map(s => ({
    id: s.id || ('s' + Math.random().toString(36).slice(2, 8)),
    kind: s.kind || 'oneoff', source: s.source || '', amount: s.amount,
    from: s.from || currentMonth(), months: s.months == null ? '' : s.months,
    done: !!s.done, note: s.note || '',
  }));
  const t = document.getElementById('plan-editor-title');
  if (t) t.textContent = 'Plan — ' + (d.creditor || 'debt');
  const sub = document.getElementById('plan-editor-sub');
  if (sub) sub.textContent = fmt(parseNum(d.current_balance)) + ' outstanding';
  renderPlanRows();
  const dlg = document.getElementById('plan-editor');
  if (dlg && dlg.showModal) dlg.showModal();
}

function planAddStep() {
  (window._planDraft = window._planDraft || []).push({
    id: 's' + Math.random().toString(36).slice(2, 8),
    kind: 'invoice', source: '', amount: '', from: currentMonth(), months: '', done: false, note: '',
  });
  renderPlanRows();
}
function planRemoveStep(i) {
  (window._planDraft || []).splice(i, 1);
  renderPlanRows();
}
function planFieldChange(i, field, val) {
  const s = (window._planDraft || [])[i];
  if (!s) return;
  s[field] = val;
  if (field === 'kind') renderPlanRows();   // months only applies to monthly
  else planUpdatePreview();
}

function renderPlanRows() {
  const wrap = document.getElementById('plan-rows');
  if (!wrap) return;
  const draft = window._planDraft || [];
  // Invoice titles offered as a datalist so the source matches what he actually raised.
  const opts = (invoices || []).map(i => `<option value="${esc(i.title || '')}"></option>`).join('');
  wrap.innerHTML = draft.map((s, i) => `
    <div class="plan-row">
      <select onchange="planFieldChange(${i},'kind',this.value)">
        <option value="invoice"${s.kind === 'invoice' ? ' selected' : ''}>From an invoice</option>
        <option value="monthly"${s.kind === 'monthly' ? ' selected' : ''}>Monthly payment</option>
        <option value="oneoff"${s.kind === 'oneoff' ? ' selected' : ''}>One-off lump</option>
      </select>
      <input list="plan-invoice-list" placeholder="${s.kind === 'monthly' ? 'Label, e.g. standing order' : 'Where it comes from'}"
             value="${esc(s.source || '')}" oninput="planFieldChange(${i},'source',this.value)" />
      <div class="plan-row-nums">
        <input type="number" step="0.01" inputmode="decimal" placeholder="${s.kind === 'monthly' ? '£ per month' : '£ amount'}"
               value="${s.amount === '' || s.amount == null ? '' : esc(String(s.amount))}" oninput="planFieldChange(${i},'amount',this.value)" />
        <input type="month" value="${esc(s.from || '')}" onchange="planFieldChange(${i},'from',this.value)" />
        ${s.kind === 'monthly'
          ? `<input type="number" min="1" step="1" placeholder="months (blank = until clear)" value="${s.months === '' || s.months == null ? '' : esc(String(s.months))}" oninput="planFieldChange(${i},'months',this.value)" />`
          : ''}
      </div>
      <button type="button" class="plan-row-del" onclick="planRemoveStep(${i})" aria-label="Remove step">✕</button>
    </div>`).join('') +
    `<datalist id="plan-invoice-list">${opts}</datalist>` +
    (draft.length ? '' : '<div class="empty">No steps yet. Add the first one below.</div>');
  planUpdatePreview();
}

// Live projection while he edits, so a plan that does not actually cover the debt
// is obvious before he saves it rather than after.
function planUpdatePreview() {
  const el = document.getElementById('plan-preview');
  if (!el) return;
  const d = debts.find(x => x.id === window._planDebtId);
  if (!d) return;
  const p = debtProjection({ current_balance: d.current_balance, plan: planCleanDraft() });
  el.innerHTML = p.rows.length
    ? (p.clearMonth
        ? `<span class="plan-ok">Clears ${esc(invoiceMonthLabel(p.clearMonth))}</span> · ${fmt(p.committed)} of ${fmt(p.balance)} planned`
        : `<span class="plan-short">${fmt(p.remaining)} still unplanned</span> · ${fmt(p.committed)} of ${fmt(p.balance)} covered`)
    : '<span class="muted">Nothing planned yet.</span>';
}

function planCleanDraft() {
  return (window._planDraft || []).map(s => ({
    id: s.id,
    kind: s.kind || 'oneoff',
    source: (s.source || '').trim(),
    amount: parseNum(s.amount),
    from: s.from || currentMonth(),
    months: s.kind === 'monthly' && s.months !== '' && s.months != null ? parseNum(s.months) : null,
    done: !!s.done,
    note: s.note || '',
  })).filter(s => s.amount > 0);
}

async function savePlan() {
  const id = window._planDebtId;
  if (!id || !window.SUPABASE_CONFIGURED) return;
  const plan = planCleanDraft();
  const { error } = await window.db.from('debts').update({ plan }).eq('id', id);
  if (error) {
    const missing = /column .*plan/i.test(error.message || '');
    alert(missing
      ? 'Debt plans are not set up yet.\n\nRun debt_plans_setup.sql in the Supabase SQL editor, then try again.'
      : 'Could not save the plan: ' + error.message);
    return;
  }
  const dlg = document.getElementById('plan-editor');
  if (dlg && dlg.close) dlg.close();
  await loadAll();
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
      ${isPaid ? `<div class="debt-settled-line">Settled ${_fmtDay(debtSettledDate(d))}</div>` : renderDebtPlan(d)}
      ${isPaid ? '' : `<button type="button" class="debt-pay-btn" data-id="${esc(d.id)}">+ Log payment</button>`}
      ${(d.notes && !d.notes.trim().startsWith('{')) ? `<div class="card-notes">${esc(d.notes)}</div>` : ''}
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
  if (window._receivableMode) {
    var _rFd = new FormData(debtForm);
    var _rPay = Object.fromEntries(_rFd.entries());
    if (!_rPay.creditor || !_rPay.creditor.trim()) { window._receivableMode = false; return; }
    var _rvId = editingDebtId;
    if (_rvId) {
      await window.db.from('debts').update({creditor:_rPay.creditor,original_amount:parseNum(_rPay.original_amount)||0,current_balance:parseNum(_rPay.current_balance)||0,notes:_rPay.notes||null,status:_rPay.status||'active',type:'receivable'}).eq('id',_rvId);
      var _ri = receivables.findIndex(function(x){ return x.id===_rvId; });
      if (_ri>=0) receivables[_ri] = Object.assign({},receivables[_ri],{creditor:_rPay.creditor,original_amount:parseNum(_rPay.original_amount)||0,current_balance:parseNum(_rPay.current_balance)||0,notes:_rPay.notes||null,status:_rPay.status||'active'});
    } else {
      var _ins = await window.db.from('debts').insert({creditor:_rPay.creditor,original_amount:parseNum(_rPay.original_amount)||0,current_balance:parseNum(_rPay.current_balance)||0,notes:_rPay.notes||null,status:_rPay.status||'active',type:'receivable'}).select().single();
      if (_ins && _ins.data) receivables.push(_ins.data);
    }
    window._receivableMode = false;
    debtEditor.close();
    renderDebts();
    return;
  }
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

$('#debt-cancel-btn').addEventListener('click', () => { window._receivableMode = false; debtEditor.close(); });

$('#debt-delete-btn').addEventListener('click', async () => {
  if (window._receivableMode) {
    if (!editingDebtId) { window._receivableMode = false; return; }
    if (!confirm('Delete this receivable?')) return;
    var _dId = editingDebtId;
    receivables = receivables.filter(function(x){ return x.id !== _dId; });
    await window.db.from('debts').delete().eq('id', _dId);
    window._receivableMode = false;
    debtEditor.close();
    renderDebts();
    return;
  }
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
  if (!inside) { window._receivableMode = false; debtEditor.close(); }
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
      ${r.notes && r.notes.trim() ? `<div class="review-snippet"><label>Notes</label><p>${esc(r.notes.trim())}</p></div>` : ''}
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
  else if (workView === 'pricing') return renderWorkPricingView();
  else renderWorkCompaniesView(companies);
}

// PATCH B: updated task toggle — 3 buttons
function renderWorkTasksView(tasks, companies) {
  const pending = tasks.filter(t => t.status !== 'done');
  const done    = tasks.filter(t => t.status === 'done');
  const toggle  = `<div class="ticket-type-filter"><button class="ticket-filter active" onclick="workView='tasks';renderWork()">Tasks</button><button class="ticket-filter" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button><button class="ticket-filter" onclick="workView='pricing';renderWork()">Pricing</button></div>`;
  if (tasks.length === 0) {
    list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkTaskEditor()">+ Task</button></div><div class="empty">No tasks yet. Hit <strong>+ Task</strong> to add one.</div>`;
    return;
  }
  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkTaskEditor()">+ Task</button></div>${pending.map(t => renderWorkTaskCard(t, companies)).join('')}${done.length ? `<div class="work-section-divider">Completed (${done.length})</div>${done.map(t => renderWorkTaskCard(t, companies)).join('')}` : ''}`;
}

// PATCH C: updated companies toggle — 3 buttons
function renderWorkCompaniesView(companies) {
  const toggle = `<div class="ticket-type-filter"><button class="ticket-filter active" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button><button class="ticket-filter" onclick="workView='pricing';renderWork()">Pricing</button></div>`;
  const chKey  = localStorage.getItem('ch_api_key') || '';
  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkCompanyEditor()">+ Company</button></div><div class="work-ch-bar"><span class="work-ch-label">CH API Key</span><input type="password" id="ch-key-input" value="${esc(chKey)}" placeholder="Your Companies House API key"/><button class="work-ch-save" onclick="saveCHKey()">Save</button></div>${companies.length === 0 ? '<div class="empty">No companies yet. Hit <strong>+ Company</strong> to add one.</div>' : ''}<div class="work-companies-grid">${companies.map(c => renderWorkCompanyCard(c)).join('')}</div>`;
}

// PATCH D: new invoices view
function renderWorkInvoicesView() {
  const toggle = `<div class="ticket-type-filter"><button class="ticket-filter" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter active" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button><button class="ticket-filter" onclick="workView='pricing';renderWork()">Pricing</button></div>`;
  if (invoices.length === 0) {
    list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openInvoiceEditor()">+ Invoice</button></div><div class="empty">No invoices yet. Hit <strong>+ Invoice</strong> to draft one.</div>`;
    return;
  }

  // THREE states, not two. An invoice whose sections have no totals yet is a DRAFT —
  // the shell exists but it has not been costed. Counting it as money outstanding
  // makes the headline lie twice over: it inflates the invoice count while adding
  // nothing to the figure. Drafts get their own block so they read as a to-do.
  const paid   = invoices.filter(invoiceIsPaid);
  const unpaid = invoices.filter(i => !invoiceIsPaid(i));
  const active = unpaid.filter(i => invoiceTotal(i) > 0);
  const drafts = unpaid.filter(i => invoiceTotal(i) <= 0);

  const activeTotal = active.reduce((s, i) => s + invoiceTotal(i), 0);
  const paidTotal   = paid.reduce((s, i) => s + invoiceTotal(i), 0);

  // "since the first invoice" — earliest month across ALL invoices, not just the
  // paid ones, so the figure doesn't jump backwards when an old one gets marked.
  const months = invoices.map(i => i.month).filter(Boolean).sort();
  const since = months.length ? invoiceMonthLabel(months[0]) : '';

  const sortByMonthDesc = (a, b) => String(b.month || '').localeCompare(String(a.month || ''));
  const sortByPaidDesc  = (a, b) => String(b.paid_on || b.month || '').localeCompare(String(a.paid_on || a.month || ''));

  const draftNote = drafts.length ? ` · ${drafts.length} draft${drafts.length === 1 ? '' : 's'} not costed` : '';

  const band = `<div class="inv-summary">
      <div class="inv-stat">
        <label>Earning power</label>
        <span class="inv-stat-num">${money0(activeTotal)}</span>
        <em>${active.length} invoice${active.length === 1 ? '' : 's'} outstanding${draftNote}</em>
      </div>
      <div class="inv-stat inv-stat-paid">
        <label>Paid to date</label>
        <span class="inv-stat-num">${money0(paidTotal)}</span>
        <em>${paid.length} settled${since ? ' since ' + esc(since) : ''}</em>
      </div>
    </div>`;

  const activeBlock = active.length
    ? `<div class="work-section-divider">Outstanding — ${money0(activeTotal)}</div>${active.sort(sortByMonthDesc).map(renderInvoiceCard).join('')}`
    : `<div class="work-section-divider">Outstanding</div><div class="empty">${paid.length ? 'Nothing outstanding. Everything costed has been paid.' : 'Nothing costed yet — fill in the section totals below.'}</div>`;

  const draftBlock = drafts.length
    ? `<div class="work-section-divider">Not costed yet — ${drafts.length}</div>${drafts.sort(sortByMonthDesc).map(renderInvoiceCard).join('')}`
    : '';

  const paidBlock = paid.length
    ? `<div class="work-section-divider">Paid — ${money0(paidTotal)}</div>${paid.sort(sortByPaidDesc).map(renderInvoiceCard).join('')}`
    : '';

  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openInvoiceEditor()">+ Invoice</button></div>${band}${activeBlock}${draftBlock}${paidBlock}`;
}

/* ─── INVOICE MONEY ───────────────────────────────────────────────────────────
 * An invoice's value is the sum of its section totals — there is no total column,
 * so it is derived everywhere. One helper so the cards and the summary band can
 * never disagree with each other.
 * ─────────────────────────────────────────────────────────────────────────── */
function invoiceTotal(inv) {
  const sections = Array.isArray(inv && inv.sections) ? inv.sections : [];
  return sections.reduce((s, sec) => s + (parseFloat(sec.total) || 0), 0);
}
function invoiceIsPaid(inv) { return !!(inv && inv.paid); }
function money0(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

// "2026-08" -> "Aug 2026". Invoices store month as an <input type="month"> value.
function invoiceMonthLabel(m) {
  if (!m) return '';
  const parts = String(m).split('-');
  if (parts.length < 2) return String(m);
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  if (isNaN(d)) return String(m);
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(d);
}

// "2026-08-10" -> "10 Aug 2026". Parsed as parts, not via new Date(str), so it
// cannot drift a day on a BST/UTC boundary.
function fmtUKDate(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  if (p.length !== 3) return String(iso);
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  if (isNaN(d)) return String(iso);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

async function toggleInvoicePaid(id, nowPaid) {
  if (!window.SUPABASE_CONFIGURED) return;
  const patch = nowPaid
    ? { paid: true, paid_on: todayISO() }
    : { paid: false, paid_on: null };
  const { error } = await window.db.from('invoices').update(patch).eq('id', id);
  if (error) {
    // The paid/paid_on columns arrive with invoices_paid_setup.sql. Reads cope
    // without them (undefined reads as unpaid); writes cannot. Say which file.
    const missing = /column .*(paid)/i.test(error.message || '');
    alert(missing
      ? 'Paid tracking is not set up yet.\n\nRun invoices_paid_setup.sql in the Supabase SQL editor, then try again.'
      : 'Could not update: ' + error.message);
    return;
  }
  await loadAll();
}

function renderInvoiceCard(inv) {
  const sections = Array.isArray(inv.sections) ? inv.sections : [];
  const total = invoiceTotal(inv);
  const paid = invoiceIsPaid(inv);
  const month = inv.month ? inv.month.replace('-', ' / ') : '';
  const sectionsHtml = sections.filter(s => s.title || s.total).map(s =>
    `<div class="inv-section-row"><span class="inv-section-name">${esc(s.title||'')}</span><span class="inv-section-total">${s.total ? '£' + parseFloat(s.total).toLocaleString() : '—'}</span></div>`
  ).join('');
  // A shell with no section totals is a draft, not a £0 invoice. Say so, and don't
  // offer "Mark paid" — marking an uncosted invoice paid would bury it at £0.
  const isDraft = !paid && total <= 0;
  return `<div class="card inv-card${paid ? ' inv-card-paid' : ''}${isDraft ? ' inv-card-draft' : ''}" onclick="openInvoiceEditor('${inv.id}')">
    <div class="inv-card-head">
      <span class="inv-card-title">${esc(inv.title || 'Untitled Invoice')}</span>
      <span class="inv-card-month">${month}</span>
    </div>
    ${sectionsHtml}
    ${isDraft
      ? `<div class="inv-card-total"><span>Total</span><span class="inv-draft-chip">Not costed yet</span></div>`
      : `<div class="inv-card-total"><span>Total</span><span class="inv-total-num">£${total.toLocaleString()}</span></div>`}
    ${paid && inv.paid_on ? `<div class="inv-paid-stamp">Paid ${esc(fmtUKDate(inv.paid_on))}</div>` : ''}
    ${inv.notes ? `<div class="card-notes">${esc(inv.notes)}</div>` : ''}
    <div class="inv-card-actions">
      <button class="work-btn-ghost inv-copy-btn" onclick="event.stopPropagation();copyInvoiceText('${inv.id}')">Copy text</button>
      ${isDraft
        ? `<button class="work-btn-ghost" onclick="event.stopPropagation();openInvoiceEditor('${inv.id}')">Add amounts</button>`
        : `<button class="work-btn-ghost inv-paid-btn${paid ? ' on' : ''}" onclick="event.stopPropagation();toggleInvoicePaid('${inv.id}',${paid ? 'false' : 'true'})">${paid ? 'Mark unpaid' : 'Mark paid'}</button>`}
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
  return `<div class="card work-task-card${isDone?' work-task-done':''}" onclick="openWorkTaskEditor('${t.id}')"><div class="work-task-row"><button class="work-check${isDone?' checked':''}" onclick="event.stopPropagation();toggleWorkTaskDone('${t.id}',${isDone})">${isDone?'&#10003;':''}</button><span class="work-task-name">${esc(t.name)}</span>${dueBadge}</div>${(co||meta.category||meta.priority)?`<div class="work-task-tags">${co?`<span class="work-tag">${co}</span>`:''} ${meta.category?`<span class="work-tag">${esc(meta.category)}</span>`:''} ${meta.priority?`<span class="work-tag ${priCls}">${esc(meta.priority)}</span>`:''}</div>`:''}${meta.notes?`<div class="work-card-notes">${esc(meta.notes)}</div>`:''}</div>`;
}

function renderWorkCompanyCard(c) {
  let meta = {};
  try { meta = JSON.parse(c.notes || '{}'); } catch (_) {}
  const status = c.status || 'other';
  const col    = status === 'raz' ? 'var(--gold)' : status === 'partial' ? '#4A9EF5' : 'var(--border)';
  const owner  = {raz:'Raz',partial:'Partial',other:'Other'}[status] || 'Other';
  const accBdg = meta.accounts_due     ? workDaysBadge(meta.accounts_due)     : '<span class="work-na">—</span>';
  const conBdg = meta.confirmation_due ? workDaysBadge(meta.confirmation_due) : '<span class="work-na">—</span>';
  const renBdg = meta.office_renewal   ? workDaysBadge(meta.office_renewal)   : '<span class="work-na">—</span>';
  return `<div class="card work-company-card" style="border-left:3px solid ${col}" onclick="openWorkCompanyEditor('${c.id}')"><div class="work-co-head"><span class="work-co-name">${esc(c.name)}</span><span class="work-owner-badge" style="color:${col};border-color:${col}">${owner}</span></div>${meta.company_number?`<div class="work-ch-ref">CH: ${esc(meta.company_number)}</div>`:''}<div class="work-due-row"><span class="work-due-lbl">Accounts due</span>${accBdg}</div><div class="work-due-row"><span class="work-due-lbl">Conf. statement</span>${conBdg}</div><div class="work-due-row"><span class="work-due-lbl">Office renewal</span>${renBdg}</div>${meta.registered_office?`<div class="work-office"><span class="work-office-lbl">Registered office</span>${esc(meta.registered_office)}</div>`:''}${meta.office_renewal?`<button type="button" class="work-btn-ghost work-renew-btn" onclick="event.stopPropagation();markOfficeRenewed('${c.id}')">Mark renewed</button>`:''}${meta.office_renewed_on?`<div class="work-renewed-on">last renewed ${esc(fmtUKDate(meta.office_renewed_on))}</div>`:''}${meta.rent?`<div class="work-due-row"><span class="work-due-lbl">Rent</span><span class="work-days-badge work-badge-ok">£${esc(String(meta.rent))}</span></div>`:``}${meta.salary?`<div class="work-due-row"><span class="work-due-lbl">Salary</span><span class="work-days-badge work-badge-ok">£${esc(String(meta.salary))}</span></div>`:``}${meta.notes?`<div class="work-card-notes">${esc(meta.notes)}</div>`:``}</div>`;
}

/* ─── COMPANY OFFICE RENEWALS (2026-08-27) ────────────────────────────────────
 * Registered office services renew annually and are easy to miss — miss one and
 * the company loses its registered address, which is a filing problem, not just
 * an admin one. Stored in the same JSON blob in projects.notes as the rest of the
 * company meta, so this needed no migration.
 *   registered_office   — the address itself
 *   office_renewal      — next renewal due date
 *   office_renewed_on   — when he last ticked it
 * ─────────────────────────────────────────────────────────────────────────── */
function addYearISO(iso, n) {
  const p = String(iso || '').slice(0, 10).split('-');
  if (p.length !== 3) return iso;
  const y = Number(p[0]) + (n || 1);
  const m = Number(p[1]);
  let day = Number(p[2]);
  const daysInMonth = new Date(y, m, 0).getDate();   // 29 Feb -> 28 Feb next year
  if (day > daysInMonth) day = daysInMonth;
  return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

async function markOfficeRenewed(id) {
  const c = entries.find(e => e.id === id);
  if (!c) return;
  let meta = {};
  try { meta = JSON.parse(c.notes || '{}'); } catch (e) { meta = {}; }
  // Roll forward from the due date, not from today — renewing three days late
  // must not shift every future renewal three days later.
  const base = meta.office_renewal || todayISO();
  const next = addYearISO(base, 1);
  if (!confirm('Mark renewed?\n\nNext renewal moves to ' + fmtUKDate(next) + '.')) return;
  meta.office_renewal = next;
  meta.office_renewed_on = todayISO();
  const res = await window.db.from('projects').update({ notes: JSON.stringify(meta) }).eq('id', id);
  if (res.error) { alert('Could not update: ' + res.error.message); return; }
  await loadAll();
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
  showWorkModal(`<h3 class="work-modal-title">${c ? 'Edit Company' : 'New Company'}</h3><form id="work-company-form"><label class="work-lbl">Company Name</label><input class="work-input" name="name" required value="${c?esc(c.name):''}" placeholder="Company Ltd"/><label class="work-lbl">Ownership</label><select class="work-input" name="status"><option value="raz"${(c&&c.status)==='raz'?' selected':''}>Raz (Mine)</option><option value="partial"${(c&&c.status)==='partial'?' selected':''}>Partial</option><option value="other"${!c||(c&&c.status)==='other'?' selected':''}>Other</option></select><label class="work-lbl">Companies House Number</label><div class="work-ch-lookup-row"><input class="work-input" name="company_number" id="work-ch-num" value="${esc(meta.company_number||'')}" placeholder="e.g. 12345678"/><button type="button" class="work-btn-ghost" onclick="doWorkCHLookup()">Look up</button></div><div class="work-row-2"><div><label class="work-lbl">Accounts Due</label><input class="work-input" type="date" name="accounts_due" id="work-accounts-due" value="${meta.accounts_due||''}"/></div><div><label class="work-lbl">Conf. Statement Due</label><input class="work-input" type="date" name="confirmation_due" id="work-confirm-due" value="${meta.confirmation_due||''}"/></div></div><div class="work-row-2"><div><label class="work-lbl">Office Renewal Due</label><input class="work-input" type="date" name="office_renewal" value="${meta.office_renewal||''}"/></div><div><label class="work-lbl">Last Renewed</label><input class="work-input" type="date" name="office_renewed_on" value="${meta.office_renewed_on||''}"/></div></div><label class="work-lbl">Registered Office Address</label><textarea class="work-input" name="registered_office" rows="2" placeholder="e.g. 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ">${esc(meta.registered_office||'')}</textarea><div class="work-row-2"><div><label class="work-lbl">Monthly Rent (£)</label><input class="work-input" type="number" name="rent" value="${meta.rent||''}" placeholder="0"/></div><div><label class="work-lbl">Monthly Salary (£)</label><input class="work-input" type="number" name="salary" value="${meta.salary||''}" placeholder="0"/></div></div><label class="work-lbl">Notes</label><textarea class="work-input" name="company_notes" rows="2">${esc(meta.notes||'')}</textarea><div class="work-modal-actions">${c?`<button type="button" class="work-btn-danger" onclick="deleteWorkItem('${c.id}','company')">Delete</button>`:'<span></span>'}<div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary" id="work-co-submit">Save</button></div></div></form>`);
  document.getElementById('work-company-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const name = (fd.get('name')||'').trim(); if (!name) return;
    const notes = JSON.stringify({ company_number: (fd.get('company_number')||'').trim(), accounts_due: fd.get('accounts_due')||null, confirmation_due: fd.get('confirmation_due')||null, rent: (fd.get('rent')||'').trim()||null, salary: (fd.get('salary')||'').trim()||null, registered_office: (fd.get('registered_office')||'').trim(), office_renewal: fd.get('office_renewal')||null, office_renewed_on: fd.get('office_renewed_on')||null, notes: (fd.get('company_notes')||'').trim() });
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
  // Registered office comes straight from Companies House, same as the dates.
  // The RENEWAL date deliberately does not — that is a private registered-office
  // service (MYCO and the like) billing annually, and CH holds no record of it.
  const roEl = document.querySelector('#work-company-form textarea[name="registered_office"]');
  const ro = data.registered_office_address;
  let roText = '';
  if (roEl && ro) {
    roText = [ro.care_of, ro.po_box, ro.address_line_1, ro.address_line_2,
              ro.locality, ro.region, ro.postal_code, ro.country]
             .map(x => (x || '').trim()).filter(Boolean).join(', ');
    if (roText) roEl.value = roText;
  }
  alert('Filled from Companies House' + (data.company_name ? ': ' + data.company_name : '') + '.'
    + (roText ? '\n\nRegistered office: ' + roText : '')
    + '\n\nOffice renewal date is not held by Companies House — set it by hand.');
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
  else if (activeTab === 'pots') openPotEditor(null);
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

// Boot. When the real Supabase login is live, index.html sets window._twGate = true
// before this file parses and calls _twBoot() once getSession() resolves. If the
// session resolved first, _twSession is already set and we boot here. Both covered.
//
// _twGate is the compatibility shim: with no gate present (the current index.html,
// or a stale cached one) app.js self-boots exactly as it always did. Without this,
// pairing a new app.js with an old index.html gives a permanently blank app.
window._twBoot = function () {
  if (window._twBooted) return;
  window._twBooted = true;
  loadAll();
};
if (window._twSession || !window._twGate) window._twBoot();


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

function gymShiftDate(delta) {
  var base = window._gymViewDate || new Date().toISOString().slice(0,10);
  var d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  window._gymViewDate = d.toISOString().slice(0,10);
  renderGym();
}
function renderSessionsList() {
  if (!gymSessions || !gymSessions.length) return '<p class="gym-sessions-empty">No sessions logged yet</p>';
  var q = "'";
  var tl = {weights:'Weights',cardio:'Cardio',hiit:'HIIT',sport:'Sport',other:'Other'};
  return gymSessions.slice(0,15).map(function(s) {
    var type = tl[s.type] || (s.type ? s.type.charAt(0).toUpperCase()+s.type.slice(1) : 'Session');
    var dur = s.duration ? s.duration + 'm' : '';
    var musc = s.muscles ? s.muscles.split(',').slice(0,3).map(function(m){var t=m.trim();return t.charAt(0).toUpperCase()+t.slice(1);}).join(', ') : '';
    var meta = [s.date, dur, musc].filter(Boolean).join(' · ');
    return '<div class="gym-session-row">' +
      '<div class="gym-session-info"><span class="gym-session-badge">'+type+'</span>' +
      '<span class="gym-session-meta">'+meta+'</span></div>' +
      '<button class="gym-session-edit-btn" onclick="openGymEditor('+q+s.id+q+')">Edit</button>' +
    '</div>';
  }).join('');
}
function renderGym() {
  const typeColors = { push:'#ef4444', pull:'#f97316', legs:'#22c55e', upper:'#a78bfa', lower:'#ec4899', full:'#14b8a6', cardio:'#3b82f6', hiit:'#8b5cf6', sport:'#f59e0b', weights:'#ef4444', other:'#6b7280' };
  const typeLabels = { push:'Push', pull:'Pull', legs:'Legs', upper:'Upper', lower:'Lower', full:'Full Body', cardio:'Cardio', hiit:'HIIT', sport:'Sport', weights:'Weights', other:'Other' };
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = selectedMonth || now.toISOString().slice(0, 7);
  const parts = monthStr.split('-');
  const yr = parseInt(parts[0]); const mo = parseInt(parts[1]);

  const monthSessions = gymSessions.filter(s => s.date && s.date.startsWith(monthStr));
  const sessionByDate = {};
  gymSessions.forEach(s => { if (s.date) sessionByDate[s.date] = s; });
  const macrosByDate = {};
  dailyMacros.forEach(function(m){ if(m.date){ if(!macrosByDate[m.date])macrosByDate[m.date]=[]; macrosByDate[m.date].push(m); }});

  let streak = 0;
  const sd = new Date(todayStr);
  if (!sessionByDate[todayStr]) sd.setDate(sd.getDate()-1);
  while (true) { const ds = sd.toISOString().slice(0,10); if (!sessionByDate[ds]) break; streak++; sd.setDate(sd.getDate()-1); }

  const sortedDates = gymSessions.filter(s=>s.date).map(s=>s.date).sort();
  let bestStreak = 0, curStreak = 0, prevDate = null;
  sortedDates.forEach(d => {
    if (!prevDate) { curStreak = 1; }
    else { const diff = (new Date(d) - new Date(prevDate)) / 86400000; curStreak = diff === 1 ? curStreak+1 : 1; }
    bestStreak = Math.max(bestStreak, curStreak); prevDate = d;
  });

  const daysInMonth = new Date(yr, mo, 0).getDate();
  const completionPct = daysInMonth ? Math.round((monthSessions.length / daysInMonth) * 100) : 0;

  const firstDay = new Date(yr, mo-1, 1).getDay();
  const startOffset = (firstDay + 6) % 7;

  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += '<div class="gym-cal-cell empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = yr + '-' + String(mo).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    const sess = sessionByDate[ds];
    const isToday = ds === todayStr;
    const tColor = sess ? (typeColors[sess.type] || typeColors.other) : '';
    const tLabel = sess ? (sess.type || 'other').slice(0,2).toUpperCase() : '';
    const clickFn = sess
      ? `openGymEditor('${sess.id}')`
      : `openGymEditor(null);setTimeout(function(){var f=document.getElementById('gym-form');if(f&&f.date)f.date.value='${ds}';},50)`;
    cells += `<div class="gym-cal-cell${isToday?' today':''}" onclick="${clickFn}" title="${sess?(sess.type||'')+' '+ds:ds}">`;
    cells += `<span class="gym-cal-num">${day}</span>`;
    if (sess) cells += `<span class="gym-cal-pip" style="background:${tColor}">${tLabel}</span>`;
    if (sess && sess.muscles) cells += '<span class="gym-cal-muscles">' + sess.muscles.split(',').slice(0,3).map(function(m){var t=m.trim();return t.charAt(0).toUpperCase()+t.slice(1);}).join(', ') + '</span>';
    if (macrosByDate[ds] && macrosByDate[ds].length) cells += '<span class="gym-cal-mac">M</span>';
    cells += '</div>';
  }

  const monthLabel = new Date(yr, mo-1, 1).toLocaleString('default', {month:'long', year:'numeric'});
  const legendHtml = Object.keys(typeColors).map(k =>
    `<span class="gym-legend-item"><span class="gym-legend-dot" style="background:${typeColors[k]}"></span>${typeLabels[k]}</span>`
  ).join('');

  window._gymViewDate = (window._gymViewDate && window._gymViewDate <= todayStr) ? window._gymViewDate : todayStr;
  const gymViewDate = window._gymViewDate;
  const todayEntries = dailyMacros.filter(m => m && m.date === gymViewDate);
  const todayTotals = todayEntries.reduce(function(acc,m){return{p:acc.p+(m.protein||0),c:acc.c+(m.carbs||0),f:acc.f+(m.fats||0)};},{p:0,c:0,f:0});
  const macroHtml = true
  ? '<div class="gym-macro-targets">'
    + '<div class="gym-macro-row"><span class="gym-macro-label">Protein</span><span class="gym-macro-val">'+Math.round(todayTotals.p)+'g / ' + MACRO_TARGETS.protein + 'g</span><div class="gym-macro-bar"><div class="gym-macro-fill" style="width:'+Math.min(100,+(todayTotals.p/180*100).toFixed(1))+'%"></div></div></div>'
    + '<div class="gym-macro-row"><span class="gym-macro-label">Carbs</span><span class="gym-macro-val">'+Math.round(todayTotals.c)+'g / ' + MACRO_TARGETS.carbs   + 'g</span><div class="gym-macro-bar"><div class="gym-macro-fill" style="width:'+Math.min(100,+(todayTotals.c/280*100).toFixed(1))+'%"></div></div></div>'
    + '<div class="gym-macro-row"><span class="gym-macro-label">Fats</span><span class="gym-macro-val">'+Math.round(todayTotals.f)+'g / ' + MACRO_TARGETS.fats    + 'g</span><div class="gym-macro-bar"><div class="gym-macro-fill" style="width:'+Math.min(100,+(todayTotals.f/70*100).toFixed(1))+'%"></div></div></div>'
    + '</div>'
    + todayEntries.map(function(m){
        return '<div class="gym-macros-entry">'
          + '<span>Protein: '+Math.round(m.protein||0)+'g · Carbs: '+Math.round(m.carbs||0)+'g · Fats: '+Math.round(m.fats||0)+'g'+(m.calories?' · '+Math.round(m.calories)+'kcal':'')+'</span>'
          + '<button class="ghost" onclick="openMacrosEditor(\'' + m.date + '\',\'' + m.id + '\')" >Edit</button>'
          + '</div>';
      }).join('')
  : '<p class="gym-macros-empty">Nothing logged today</p>';
  list.innerHTML = `
    <div class="section-header"><h2>Gym</h2><button class="add-btn" onclick="openGymEditor(null)">+ Log Session</button></div>
    <div class="gym-stats-row">
      <div class="gym-stat"><div class="gym-stat-val">${monthSessions.length}</div><div class="gym-stat-lbl">This Month</div></div>
      <div class="gym-stat"><div class="gym-stat-val">${streak}</div><div class="gym-stat-lbl">Streak</div></div>
      <div class="gym-stat"><div class="gym-stat-val">${bestStreak}</div><div class="gym-stat-lbl">Best</div></div>
      <div class="gym-stat"><div class="gym-stat-val">${completionPct}%</div><div class="gym-stat-lbl">Completion</div></div>
    </div>
    <div class="gym-calendar">
      <div class="gym-cal-month">${monthLabel}</div>
      <div class="gym-cal-header"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      <div class="gym-cal-grid">${cells}</div>
    </div>
    <div class="gym-legend">${legendHtml}</div>
    <div class="gym-macros-section"><div class="gym-macros-hdr"><button class="gym-date-nav" onclick="gymShiftDate(-1)">&#8592;</button><span class="gym-macros-title">${gymViewDate}</span><button class="gym-date-nav" onclick="gymShiftDate(1)">&#8594;</button><button class="add-btn" onclick="openMacrosEditor('${gymViewDate}')">+ Log</button></div>${macroHtml}</div></div>
    
  `;
}

function addExerciseRow(name, sets, reps, weight) {
  const list = document.getElementById('gym-exercises-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'gym-ex-row';
  row.innerHTML = `
    <input class="gym-ex-name" type="text" placeholder="Exercise" value="${name||''}" />
    <input class="gym-ex-sets" type="number" placeholder="3" value="${sets||''}" min="1" inputmode="numeric" />
    <input class="gym-ex-reps" type="number" placeholder="10" value="${reps||''}" min="1" inputmode="numeric" />
    <input class="gym-ex-weight" type="number" placeholder="kg" value="${weight||''}" min="0" step="0.5" inputmode="decimal" />
    <button type="button" class="gym-ex-remove" onclick="this.parentElement.remove()">&#x2715;</button>
  `;
  list.appendChild(row);
}
function getExercises() {
  const rows = document.querySelectorAll('#gym-exercises-list .gym-ex-row');
  const result = [];
  rows.forEach(row => {
    const name = row.querySelector('.gym-ex-name').value.trim();
    if (!name) return;
    result.push({ name, sets: parseInt(row.querySelector('.gym-ex-sets').value)||null, reps: parseInt(row.querySelector('.gym-ex-reps').value)||null, weight: parseFloat(row.querySelector('.gym-ex-weight').value)||null });
  });
  return result;
}
function renderGymSessionsList(sessions) {
  if (!sessions || !sessions.length) return '<p class="gym-empty">No sessions logged yet.</p>';
  var tc = { push:'#ef4444', pull:'#f97316', legs:'#22c55e', upper:'#a78bfa', lower:'#ec4899', full:'#14b8a6', cardio:'#3b82f6', hiit:'#8b5cf6', sport:'#f59e0b', weights:'#ef4444', other:'#6b7280' };
  var tl = { push:'Push', pull:'Pull', legs:'Legs', upper:'Upper', lower:'Lower', full:'Full Body', cardio:'Cardio', hiit:'HIIT', sport:'Sport', weights:'Weights', other:'Other' };
  var recent = sessions.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,10);
  return recent.map(function(s) {
    var color = tc[s.type] || '#6b7280';
    var label = tl[s.type] || s.type;
    var exArr = Array.isArray(s.exercises) ? s.exercises : (s.exercises ? (function(){try{return JSON.parse(s.exercises);}catch(e){return [];}})() : []);
    var exHtml = exArr.length ? '<div class="gym-sc-exercises">' + exArr.map(function(e){return '<span class="gym-ex-chip">' + e.name + (e.sets ? ' ' + e.sets + '×' + (e.reps||'?') : '') + (e.weight ? ' @' + e.weight + 'kg' : '') + '</span>';}).join('') + '</div>' : '';
    var muscleHtml = s.muscles ? '<div class="gym-sc-muscles">' + s.muscles.split(',').map(function(m){return '<span class="muscle-chip">' + m.trim() + '</span>';}).join('') + '</div>' : '';
    var bwHtml = s.bodyweight ? '<span class="gym-sc-bw">⚖️ ' + s.bodyweight + 'kg</span>' : '';
    var notesHtml = s.notes ? '<div class="gym-sc-notes">' + s.notes + '</div>' : '';
    return '<div class="gym-session-card" data-sid="' + s.id + '" onclick="openGymEditor(this.dataset.sid)">' +
      '<div class="gym-sc-top">' +
        '<span class="gym-sc-date">' + s.date + '</span>' +
        '<span class="gym-sc-type" style="background:' + color + '">' + label + '</span>' +
        '<span class="gym-sc-dur">' + (s.duration||'?') + ' min</span>' +
        bwHtml +
      '</div>' + muscleHtml + exHtml + notesHtml + '</div>';
  }).join('');
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
    const _mv = document.getElementById('gym-muscles-val');
    document.querySelectorAll('#muscle-btns .muscle-btn').forEach(b => b.classList.remove('active'));
    if (s && s.muscles && _mv) {
      const _mArr = s.muscles.split(',').map(s=>s.trim());
      document.querySelectorAll('#muscle-btns .muscle-btn').forEach(b => { if(_mArr.includes(b.dataset.m)) b.classList.add('active'); });
      _mv.value = s.muscles;
    } else if (_mv) { _mv.value = ''; }
      const cb = form.elements['completed'];
      if (cb) { cb.checked = s.completed !== false; }
    }
  } else {
    if (form.elements['date']) { form.elements['date'].value = new Date().toISOString().slice(0, 10); }
    const cb = form.elements['completed'];
    if (cb) { cb.checked = true; }
  
    // Populate bodyweight + exercises
    const _bwEl = document.getElementById('gym-bodyweight');
    if (_bwEl) _bwEl.value = '';
    const _exList = document.getElementById('gym-exercises-list');
    if (_exList) {
      _exList.innerHTML = '';
      const _exArr = [];
    }
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
    if (durInput) { durInput.value = btn.dataset.mins; }
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
    completed: cb ? cb.checked : true,
    muscles: (document.getElementById('gym-muscles-val') || {}).value || '',
    bodyweight: form.elements['bodyweight'] ? (parseFloat(form.elements['bodyweight'].value) || null) : null,
    exercises: getExercises()
  };
    const _mv = document.getElementById('gym-muscles-val'); if (_mv && _mv.value) payload.muscles = _mv.value;
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

// Muscle button toggle (event delegation)
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('muscle-btn')) {
    e.target.classList.toggle('active');
    const active = [...document.querySelectorAll('#muscle-btns .muscle-btn.active')].map(b => b.dataset.m);
    const mv = document.getElementById('gym-muscles-val');
    if (mv) mv.value = active.join(',');
  }
});

// Macros editor
async function openMacrosEditor(dateStr, editId) {
  const f = document.getElementById('macros-form');
  const dlg = document.getElementById('macros-editor');
  if (!f || !dlg) return;
  f.reset();
  var _ex = editId ? dailyMacros.find(function(m){return m.id===editId;}) : null;
  document.getElementById('macros-id').value = _ex ? (_ex.id||'') : '';
  document.getElementById('macros-date').value = _ex ? (_ex.date||dateStr) : dateStr;
  if (_ex) { var _pi=f.querySelector('[name="protein"]'); if(_pi)_pi.value=_ex.protein||''; var _ci=f.querySelector('[name="carbs"]'); if(_ci)_ci.value=_ex.carbs||''; var _fi=f.querySelector('[name="fats"]'); if(_fi)_fi.value=_ex.fats||''; var _cali=f.querySelector('[name="calories"]'); if(_cali)_cali.value=_ex.calories||''; }
  dlg.showModal();
}
window.openMacrosEditor = openMacrosEditor;

const _mForm = document.getElementById('macros-form');
if (_mForm) _mForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const f = e.target;
  const editId = document.getElementById('macros-id') ? document.getElementById('macros-id').value : '';
  const rec = {
    date: document.getElementById('macros-date').value,
    protein: parseFloat(f.protein.value) || 0,
    carbs: parseFloat(f.carbs.value) || 0,
    fats: parseFloat(f.fats.value) || 0,
    calories: parseFloat(f.calories.value) || null,
  };
  if (editId) {
    await window.db.from('daily_macros').update(rec).eq('id', editId);
    dailyMacros = dailyMacros.map(function(m){ return m.id===editId ? Object.assign({},m,rec) : m; });
  } else {
    const {data:_nd} = await window.db.from('daily_macros').insert(rec).select().single();
    if (_nd) { dailyMacros.unshift(_nd); } else { dailyMacros.unshift(Object.assign({id:Date.now()+'',created_at:new Date().toISOString()},rec)); }
  }
  document.getElementById('macros-editor').close();
  renderGym();
});

function renderWorkTravelView() {
  renderTravel();
  var list = document.getElementById('list');
  var nav = '<div class="ticket-type-filter">' +
    '<button class="ticket-filter" onclick="workView=\'companies\';renderWork()">Companies</button>' +
    '<button class="ticket-filter active" onclick="workView=\'travel\';renderWork()">Travel</button>' +
    '<button class="ticket-filter" onclick="workView=\'invoices\';renderWork()">Invoices</button>' +
    '<button class="ticket-filter" onclick="workView=\'pricing\';renderWork()">Pricing</button>' +
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
      var tNotes = t.notes ? '<div style="color:#888;font-size:12px;padding:0 16px 9px;white-space:pre-wrap;line-height:1.35">' + esc(t.notes) + '</div>' : '';
      return '<div onclick="openTripEditor(window._ttm[\'' + t.id + '\'])" style="border-bottom:1px solid #111;cursor:pointer">'
        + '<div style="display:flex;align-items:center;padding:11px 16px;gap:12px">'
        + '<span style="font-weight:600;color:#fff;min-width:100px">' + t.postcode + '</span>'
        + '<span style="color:#666;font-size:13px;flex:1">' + t.miles + ' mi &middot; ' + t.hours + 'h</span>'
        + '<span style="color:#666;font-size:12px">' + t.date + '</span>'
        + '<span style="color:#c9a84c;font-weight:700;min-width:65px;text-align:right">&pound;' + parseFloat(t.total_cost).toFixed(2) + '</span>'
        + '</div>' + tNotes
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
  window.saveTripEditor = saveTripEditor;
  window.deleteTripEditor = deleteTripEditor;
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


// ── NOTES TAB ──────────────────────────────────────────────
const NOTE_CATS = ['Business','Personal','Finance','Ideas','Other'];
const NOTE_CAT_COLORS = {Business:'#7c3aed',Personal:'#2563eb',Finance:'#059669',Ideas:'#d97706',Other:'#6b7280'};
let _activeNoteCat = 'All';

function renderNotes() {
  const filtered = _activeNoteCat === 'All' ? userNotes : userNotes.filter(n => n.category === _activeNoteCat);
  const allCats = ['All', ...NOTE_CATS];

  const catBar = allCats.map(c => {
    const active = c === _activeNoteCat;
    const col = c === 'All' ? '#374151' : NOTE_CAT_COLORS[c];
    return `<button onclick="window._activeNoteCat='${c}';renderNotes()" style="padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.8rem;font-weight:600;transition:all .15s;${active ? 'background:'+col+';color:#fff;' : 'background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6);'}">${c}</button>`;
  }).join('');

  const cards = filtered.length ? filtered.map(n => {
    const col = NOTE_CAT_COLORS[n.category] || NOTE_CAT_COLORS.Other;
    const preview = n.content ? esc(n.content).substring(0,120).replace(/\n/g,'<br>') + (n.content.length > 120 ? '…' : '') : '';
    return `<div class="card" onclick="openNoteEditor('${n.id}')" style="cursor:pointer;border-left:3px solid ${col};transition:transform .1s" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
        <strong style="font-size:0.95rem;line-height:1.3">${esc(n.title)}</strong>
        <span style="background:${col};color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:12px;white-space:nowrap;flex-shrink:0">${esc(n.category||'Other')}</span>
      </div>
      ${preview ? `<p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:0.82rem;line-height:1.5">${preview}</p>` : ''}
      <div style="font-size:0.72rem;color:rgba(255,255,255,0.3)">${shortDate(n.updated_at||n.created_at)}</div>
    </div>`;
  }).join('') : '<div class="empty-state"><p>No notes here yet.</p></div>';

  list.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">${catBar}</div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="add-btn" onclick="openNoteEditor(null)">+ New Note</button>
    </div>
    <div class="card-grid">${cards}</div>
  `;
}

function openNoteEditor(id) {
  const existing = id ? userNotes.find(n => String(n.id) === String(id)) : null;
  const old = document.getElementById('note-dlg'); if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'note-dlg';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)';

  const catOpts = NOTE_CATS.map(c => `<option value="${c}"${(existing?.category||'Other')===c?' selected':''}>${c}</option>`).join('');
  const inputStyle = 'width:100%;box-sizing:border-box;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#fff;font-size:0.92rem;outline:none;margin-bottom:14px';
  const labelStyle = 'display:block;font-size:0.73rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px';

  overlay.innerHTML =
    '<div style="width:520px;max-width:94vw;max-height:88vh;overflow-y:auto;background:#181c28;border-radius:16px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 24px 64px rgba(0,0,0,0.7)">' +
      '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:18px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:1">' +
        '<span style="font-weight:700;font-size:1rem;color:#fff">' + (existing ? 'Edit Note' : '+ New Note') + '</span>' +
        '<button id="note-close" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1.1rem">&#215;</button>' +
      '</div>' +
      '<div style="padding:22px 20px 18px">' +
        '<label style="' + labelStyle + '">Title</label>' +
        '<input id="note-title" style="' + inputStyle + '" placeholder="Note title..." value="' + (existing ? esc(existing.title) : '') + '">' +
        '<label style="' + labelStyle + '">Category</label>' +
        '<select id="note-cat" style="' + inputStyle + '">' + catOpts + '</select>' +
        '<label style="' + labelStyle + '">Content</label>' +
        '<textarea id="note-content" rows="9" style="' + inputStyle + 'resize:vertical" placeholder="Write your note...">' + (existing ? esc(existing.content||'') : '') + '</textarea>' +
        '<div style="display:flex;gap:10px">' +
          '<button id="note-save" style="flex:1;padding:11px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.95rem">Save</button>' +
          (existing ? '<button id="note-del" style="padding:11px 18px;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:8px;font-weight:600;cursor:pointer">Delete</button>' : '') +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.getElementById('note-close').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('note-save').onclick = async function() {
    const title = (document.getElementById('note-title')||{}).value?.trim();
    const category = (document.getElementById('note-cat')||{}).value || 'Other';
    const content = (document.getElementById('note-content')||{}).value || '';
    if (!title) { alert('Title is required.'); return; }
    const now = new Date().toISOString();
    const payload = {title, category, content, updated_at: now};
    let res;
    if (id) {
      res = await window.db.from('user_notes').update(payload).eq('id', id);
    } else {
      payload.created_at = now;
      res = await window.db.from('user_notes').insert([payload]);
    }
    if (res.error) { alert('Save failed: ' + res.error.message); return; }
    overlay.remove();
    try { const {data:_nts} = await window.db.from('user_notes').select('*').order('created_at',{ascending:false}); userNotes = _nts || []; } catch(_e) {}
    renderNotes();
  };

  if (existing) {
    document.getElementById('note-del').onclick = async function() {
      if (!confirm('Delete this note?')) return;
      await window.db.from('user_notes').delete().eq('id', id);
      overlay.remove();
      try { const {data:_nts} = await window.db.from('user_notes').select('*').order('created_at',{ascending:false}); userNotes = _nts || []; } catch(_e) {}
      renderNotes();
    };
  }
}


// ── AI DAY PLANNER ─────────────────────────────────────────
function showUncatModal(uncatTasks) {
  const oldDlg = document.getElementById('uncat-dlg'); if (oldDlg) oldDlg.remove();
  const overlay = document.createElement('div');
  overlay.id = 'uncat-dlg';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const catOptions = [['admin','Admin'],['deep-work','Deep Work'],['call','Call'],['finance','Finance'],['errand','Errand'],['travel','Travel'],['personal','Personal'],['reminders','Reminders']];
  const optHtml = catOptions.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  const rowsHtml = uncatTasks.map(t=>'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><span style="flex:1;font-size:0.9rem;color:var(--text);">'+t.title+'</span><select data-tid="'+t.id+'" style="padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2,#2a2a2a);color:var(--text);font-size:0.82rem;">'+optHtml+'</select></div>').join('');
  overlay.innerHTML = '<div style="background:var(--surface);border-radius:16px;padding:24px 24px 20px;max-width:460px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);"><h3 style="margin:0 0 6px;font-size:1.05rem;color:var(--text);">Categorise before planning</h3><p style="margin:0 0 16px;font-size:0.83rem;color:var(--text-muted,#999);">'+uncatTasks.length+' task'+(uncatTasks.length>1?'s':'')+' without a category — set them so your plan is accurate.</p>'+rowsHtml+'<div style="display:flex;gap:10px;margin-top:16px;"><button id="uncat-confirm" style="flex:1;padding:10px;border-radius:10px;background:var(--accent,#6c63ff);color:#fff;border:none;cursor:pointer;font-weight:600;font-size:0.9rem;">Done — Generate Plan</button><button id="uncat-skip" style="padding:10px 14px;border-radius:10px;background:var(--surface-2,#333);color:var(--text);border:none;cursor:pointer;font-size:0.9rem;">Skip</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('uncat-confirm').addEventListener('click', async () => {
    const sels = overlay.querySelectorAll('select[data-tid]');
    for (const sel of sels) {
      const task = tasks.find(t => t.id === sel.dataset.tid);
      if (task) {
        task.category = sel.value;
        await window.db.from('tasks').update({ category: sel.value }).eq('id', task.id);
      }
    }
    overlay.remove();
    openPlannerModal();
  });
  document.getElementById('uncat-skip').addEventListener('click', () => { overlay.remove(); openPlannerModal(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); } });
}

async function openPlannerModal() {
  const old = document.getElementById("planner-dlg"); if (old) old.remove();
  // --- UNCAT CHECK ---
  const _todayTasks = buildDayTasks(todayISO());
  const _uncatTasks = _todayTasks.filter(t => !t.category || t.category === '');
  if (_uncatTasks.length > 0) { showUncatModal(_uncatTasks); return; }
  // --- END CHECK ---
  const overlay = document.createElement("div");
  overlay.id = "planner-dlg";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(6px);padding:16px;box-sizing:border-box";
  overlay.innerHTML = `<div id="planner-card" style="width:100%;max-width:640px;max-height:92vh;overflow-y:auto;background:#0f1319;border-radius:18px;box-shadow:0 32px 80px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.07)">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:22px 24px;border-radius:18px 18px 0 0;position:sticky;top:0;z-index:2">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:-.01em">&#9889; AI Day Planner</div>
          <div id="planner-status" style="font-size:0.82rem;color:rgba(255,255,255,0.65);margin-top:3px">Building your schedule with prayer times...</div>
        </div>
        <button onclick="document.getElementById('planner-dlg').remove()" style="background:rgba(255,255,255,0.12);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center">&#x2715;</button>
      </div>
    </div>
    <div id="planner-body" style="padding:20px 24px"></div>
  </div>`;
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  const tasks = (entries || []).filter(e => !e.done && (e.date === todayISO() || !e.date)).slice(0, 12).map(e => ({
    title: e.title || "",
    priority: e.priority || "",
    duration: e.duration || "",
    location: e.location || "",
    notes: e.notes || ""
  }));

  try {
    const resp = await fetch("/api/plan-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: (function(){ var dayT = (typeof buildDayTasks === 'function' ? buildDayTasks(todayISO()) : []).filter(function(t){return !t.done;}); if (!dayT.length) dayT = tasks.filter(function(t){return !t.done;}).slice(0,30); return dayT.map(function(t){return {title:t.title, priority:t.priority||'normal', notes:t.notes||''};});})(), date: todayISO() })
    });
    if (!resp.ok) throw new Error("API error " + resp.status);
    const data = await resp.json();

    const prayers = data.prayers || {};
    const schedule = data.schedule || [];

    const typeConfig = {
      prayer:   { color: "#34d399", icon: "🕌" },
      gym:      { color: "#f87171", icon: "💪" },
      work:     { color: "#60a5fa", icon: "💼" },
      admin:    { color: "#a78bfa", icon: "📋" },
      travel:   { color: "#fbbf24", icon: "🚗" },
      break:    { color: "#94a3b8", icon: "☕" },
      personal: { color: "#f472b6", icon: "🌿" }
    };

    const prayerNames = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];
    const prayerBar = `<div style="margin-bottom:20px">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:10px">Prayer Times</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
        ${prayerNames.map(p => `<div style="background:#1a2035;border-radius:10px;padding:10px 6px;text-align:center;border:1px solid rgba(52,211,153,0.15)">
          <div style="font-size:0.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#34d399;margin-bottom:4px">${p}</div>
          <div style="font-size:0.9rem;font-weight:700;color:#fff">${prayers[p] || "--"}</div>
        </div>`).join("")}
      </div>
    </div>`;

    const today = new Date();
    const dateLabel = `<div style="font-size:0.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:10px">
      ${today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
    </div>`;

    const blocks = schedule.map(block => {
      const cfg = typeConfig[block.type] || { color: "#6b7280", icon: "📌" };
      const timeStr = block.end ? block.time + " – " + block.end : block.time;
      return `<div style="display:flex;align-items:stretch;gap:0;margin-bottom:8px;border-radius:12px;overflow:hidden;background:${cfg.color}18">
        <div style="width:4px;background:${cfg.color};flex-shrink:0"></div>
        <div style="padding:14px 18px;flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.1rem">${cfg.icon}</span>
            <span style="font-size:0.97rem;font-weight:600;color:#f1f5f9">${block.label}</span>
          </div>
          <div style="font-size:0.8rem;color:#64748b;margin-top:4px">${timeStr}</div>
        </div>
      </div>`;
    }).join("");

    const prayerCount = schedule.filter(b => b.type === "prayer").length;
    const footer = `<div style="font-size:0.75rem;color:#475569;text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
      ${schedule.length} time blocks · ${prayerCount} prayers scheduled
    </div>`;

    document.getElementById("planner-body").innerHTML = prayerBar + dateLabel + blocks + footer;
    document.getElementById("planner-status").textContent = "Ready — " + today.toLocaleDateString("en-GB", { weekday: "long" });
  } catch (err) {
    document.getElementById("planner-body").innerHTML = `<div style="color:#f87171;padding:20px;text-align:center">
      <div style="font-size:1.5rem;margin-bottom:8px">&#9888;</div>
      <div>Error: ${err.message}</div>
    </div>`;
    document.getElementById("planner-status").textContent = "Failed to load";
  }
}

// Web-push client config (public key is safe to expose). These were referenced
// in subscribePush() but never defined, which silently broke all new subscriptions.
const VAPID_PUBLIC_KEY = 'BCnB_hxXxjnesi55cjR6P_ghPaoAyEn_-6p-b1UuRjxpAF0TMEt0BFnRVIi_eWpa2bzVoeVs4Pr54vDOz-PJvp8';
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('[SW] registered', reg.scope);

    const updateBtn = () => {
      const btn = document.getElementById('notif-btn');
      if (btn) { btn.textContent = '\u2714 Notifications On'; btn.style.background = '#059669'; btn.disabled = true; }
    };

    if (Notification.permission === 'granted') {
      await subscribePush(reg);
      updateBtn();
    } else if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await subscribePush(reg);
        updateBtn();
      }
    }
    // 'denied' — skip silently
  } catch (e) {
    console.warn('[SW] registration failed:', e);
  }
}

async function subscribePush(reg) {
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    });
    return sub;
  } catch (e) {
    console.warn('[Push] subscribe failed:', e);
    return null;
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) { alert('Notifications not supported in this browser.'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { alert('Notification permission denied. Enable it in browser settings.'); return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await subscribePush(reg);
  if (sub) {
    // Update button to show enabled
    var btn = document.getElementById('notif-btn');
    if (btn) { btn.textContent = '\u2714 Notifications On'; btn.style.background = '#059669'; btn.disabled = true; }
  }
}

// Register SW on load
registerPush();


// ─── POTS (money allocation / envelopes) ───────────────────────────────
// Priority-waterfall allocation reconciled to a real bank balance.
// pots[]  and  potSettings  are loaded in loadAll().

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function potActive() {
  return (pots || []).filter((p) => !p.archived)
    .sort((a, b) => (a.priority - b.priority) || (a.sort_order - b.sort_order));
}

function potDebtMonthly() {
  return (debts || [])
    .filter((d) => d.type !== 'receivable' && d.status !== 'paid')
    .reduce((s, d) => s + parseNum(d.monthly_payment), 0);
}

function potMonthlyTarget(p) {
  if (p.kind !== 'monthly') return 0;
  return p.auto_debt ? potDebtMonthly() : parseNum(p.monthly);
}

function potAllocated() {
  return potActive().reduce((s, p) => s + parseNum(p.balance), 0);
}
function potBank() { return parseNum((potSettings || {}).bank_balance); }
function potUnallocated() { return round2(potBank() - potAllocated()); }

function potSubtitle(p) {
  if (p.kind === 'percent') {
    const pct = parseNum(p.rate) * 100;
    return (Number.isInteger(pct) ? pct : pct.toFixed(1)) + '% of income';
  }
  if (p.kind === 'monthly') {
    return fmt(potMonthlyTarget(p)) + ' / mo' + (p.auto_debt ? ' · auto from debts' : '');
  }
  return 'Goal ' + fmt(parseNum(p.target));
}

function potProgressPct(p) {
  if (p.kind === 'goal') { const t = parseNum(p.target); return t > 0 ? Math.min(100, parseNum(p.balance) / t * 100) : 0; }
  if (p.kind === 'monthly') { const m = potMonthlyTarget(p); return m > 0 ? Math.min(100, parseNum(p.balance) / m * 100) : 0; }
  return null; // percent pots accumulate without a cap
}

// Want = how much this pot would take from an allocation of `amount`.
function potWant(p, amount) {
  if (p.kind === 'percent') return round2(amount * parseNum(p.rate));
  if (p.kind === 'monthly') return Math.max(0, round2(potMonthlyTarget(p) - parseNum(p.balance)));
  return Math.max(0, round2(parseNum(p.target) - parseNum(p.balance))); // goal
}

// Run the priority waterfall over `amount`. skimPercent=true treats it as new
// income (Tax/Zakat skim off the top); false = distributing spare cash.
function runWaterfall(amount, skimPercent) {
  amount = round2(amount);
  let remaining = amount;
  const lines = [];
  for (const p of potActive()) {
    let want;
    if (p.kind === 'percent') {
      if (!skimPercent) continue;
      want = round2(amount * parseNum(p.rate)); // % of gross income
    } else {
      want = potWant(p, amount);
    }
    const amt = round2(Math.min(want, remaining));
    if (amt > 0) {
      remaining = round2(remaining - amt);
      lines.push({ id: p.id, name: p.name, emoji: p.emoji, amt: amt, newBal: round2(parseNum(p.balance) + amt) });
    }
  }
  return { lines: lines, leftover: round2(remaining) };
}

async function applyAllocation(lines) {
  if (!lines || !lines.length) return;
  await Promise.all(lines.map((l) => window.db.from('pots').update({ balance: l.newBal }).eq('id', l.id)));
  await loadAll();
}

// ── Totals header ──
function renderPotTotals() {
  clearTotalSpanClasses();
  setTotalsLabels(['Bank balance', 'Allocated', 'Safe to spend', 'Pots']);
  const bank = potBank();
  const allocated = potAllocated();
  const safe = round2(bank - allocated);
  $('#t-rev').textContent = fmt(bank);
  $('#t-exp').textContent = fmt(allocated);
  const safeEl = $('#t-net');
  safeEl.textContent = fmt(safe);
  safeEl.classList.add(safe < 0 ? 'neg' : 'pos');
  $('#t-count').textContent = String(potActive().length);
}

// ── Main page ──
function renderPots() {
  if (!window.SUPABASE_CONFIGURED) return;
  const active = potActive();
  const bank = potBank();
  const allocated = potAllocated();
  const unalloc = round2(bank - allocated);
  const over = unalloc < 0;

  const reconcile = `
    <div class="pot-reconcile">
      <div class="pot-recon-row">
        <div class="pot-recon-cell">
          <span class="pot-recon-label">In the bank</span>
          <span class="pot-recon-val">${fmt(bank)}</span>
        </div>
        <div class="pot-recon-cell">
          <span class="pot-recon-label">Earmarked</span>
          <span class="pot-recon-val">${fmt(allocated)}</span>
        </div>
        <div class="pot-recon-cell">
          <span class="pot-recon-label">${over ? 'Over-allocated' : 'Free to assign'}</span>
          <span class="pot-recon-val ${over ? 'neg' : 'pos'}">${fmt(unalloc)}</span>
        </div>
      </div>
      ${over ? `<div class="pot-warn">⚠ Your pots claim ${fmt(-unalloc)} more than you hold. Top your balance up or trim a pot.</div>` : ''}
      <div class="pot-actions">
        <button class="pot-btn-primary" onclick="openAllocateModal()">⚡ Allocate</button>
        <button class="pot-btn-ghost" onclick="updateBankBalance()">Update balance</button>
        <button class="pot-btn-ghost" onclick="openPotEditor(null)">+ New pot</button>
      </div>
    </div>`;

  const cards = active.length
    ? active.map(renderPotCard).join('')
    : '<div class="empty">No pots yet. Run the SQL setup, then refresh — or hit <strong>+ New pot</strong>.</div>';

  list.innerHTML = `<div class="pots-page">${reconcile}<div class="pot-list">${cards}</div></div>`;
}

function renderPotCard(p) {
  const bal = parseNum(p.balance);
  const pct = potProgressPct(p);
  const col = p.color || '#7c6cfc';
  let goalLine = '';
  if (p.kind === 'goal') {
    const t = parseNum(p.target);
    const left = Math.max(0, round2(t - bal));
    goalLine = left > 0 ? `${fmt(left)} to go` : 'Funded ✓';
  } else if (p.kind === 'monthly') {
    const m = potMonthlyTarget(p);
    const left = Math.max(0, round2(m - bal));
    goalLine = m > 0 ? (left > 0 ? `${fmt(left)} left this month` : "This month's set-aside is covered ✓") : 'Set a monthly amount';
  } else {
    goalLine = 'Accumulating';
  }
  const bar = pct === null ? '' :
    `<div class="pot-bar"><div class="pot-bar-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div></div>`;
  return `
    <div class="card pot-card" onclick="openPotEditor('${p.id}')" style="cursor:pointer;border-left:3px solid ${col}">
      <div class="pot-card-top">
        <div class="pot-card-id">
          <span class="pot-emoji">${esc(p.emoji || '💰')}</span>
          <div>
            <h3>${esc(p.name)}</h3>
            <span class="pot-sub">${esc(potSubtitle(p))}</span>
          </div>
        </div>
        <span class="pot-bal">${fmt(bal)}</span>
      </div>
      ${bar}
      <div class="pot-card-foot">
        <span class="pot-goal-line">${goalLine}</span>
        <span class="pot-mini-btns">
          <button class="pot-mini" onclick="event.stopPropagation();potTopUp('${p.id}')">+ Add</button>
          <button class="pot-mini" onclick="event.stopPropagation();potWithdraw('${p.id}')">− Take out</button>
        </span>
      </div>
    </div>`;
}

// ── Bank balance ──
async function updateBankBalance() {
  const cur = potBank();
  const v = prompt('Total cash in your account right now (£):', cur ? String(cur) : '');
  if (v === null) return;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  if (isNaN(n)) { alert('Enter a number.'); return; }
  const res = await window.db.from('pot_settings').update({ bank_balance: round2(n), updated_at: new Date().toISOString() }).eq('id', 1);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  await loadAll();
}

// ── Top up / withdraw a single pot ──
async function potTopUp(id) {
  const p = (pots || []).find((x) => String(x.id) === String(id));
  if (!p) return;
  const v = prompt('Add to "' + p.name + '" (£):');
  if (v === null) return;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  if (isNaN(n) || n <= 0) { alert('Enter a positive amount.'); return; }
  const res = await window.db.from('pots').update({ balance: round2(parseNum(p.balance) + n) }).eq('id', id);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  await loadAll();
}
async function potWithdraw(id) {
  const p = (pots || []).find((x) => String(x.id) === String(id));
  if (!p) return;
  const v = prompt('Take out of "' + p.name + '" (£):\n(use when you actually pay it out — e.g. paid HMRC, gave zakat, made a debt payment)');
  if (v === null) return;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  if (isNaN(n) || n <= 0) { alert('Enter a positive amount.'); return; }
  const res = await window.db.from('pots').update({ balance: round2(Math.max(0, parseNum(p.balance) - n)) }).eq('id', id);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  await loadAll();
}

// ── Allocate modal (waterfall with live preview) ──
function openAllocateModal() {
  const unalloc = Math.max(0, potUnallocated());
  const overlay = document.createElement('div');
  overlay.id = 'alloc-dlg';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)';
  overlay.innerHTML =
    '<div style="width:420px;max-width:92vw;background:#181c28;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.08)">' +
      '<div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:18px 20px;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-weight:700;font-size:1rem;color:#fff">⚡ Allocate money</span>' +
        '<button id="alloc-close" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1.1rem">×</button>' +
      '</div>' +
      '<div style="padding:20px">' +
        '<label style="display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Amount to allocate (£)</label>' +
        '<input id="alloc-amt" type="number" step="0.01" min="0" value="' + (unalloc || '') + '" style="width:100%;box-sizing:border-box;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:11px 13px;color:#fff;font-size:1.05rem;outline:none;margin-bottom:14px" placeholder="0.00" />' +
        '<label style="display:flex;align-items:center;gap:9px;cursor:pointer;margin-bottom:16px;color:rgba(255,255,255,0.8);font-size:0.9rem">' +
          '<input id="alloc-income" type="checkbox" checked style="width:17px;height:17px;accent-color:#7c6cfc" /> This is new income — skim Tax & Zakat off the top' +
        '</label>' +
        '<div style="font-size:0.72rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Where it goes</div>' +
        '<div id="alloc-preview" style="background:#0f1319;border-radius:10px;padding:6px 4px;max-height:230px;overflow:auto"></div>' +
        '<div id="alloc-btns" style="display:flex;gap:10px;margin-top:16px"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('alloc-close').onclick = function () { overlay.remove(); };

  function refresh() {
    const amt = parseFloat((document.getElementById('alloc-amt') || {}).value) || 0;
    const income = document.getElementById('alloc-income').checked;
    const res = runWaterfall(amt, income);
    const rows = res.lines.map(function (l) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.05)">' +
        '<span style="color:#fff;font-size:0.9rem">' + esc(l.emoji || '💰') + ' ' + esc(l.name) + '</span>' +
        '<span style="color:#34d399;font-weight:600">' + fmt(l.amt) + '</span></div>';
    }).join('');
    const leftRow = '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 10px;margin-top:2px">' +
      '<span style="color:rgba(255,255,255,0.55);font-size:0.9rem">Left free to spend</span>' +
      '<span style="color:' + (res.leftover > 0 ? '#fbbf24' : 'rgba(255,255,255,0.4)') + ';font-weight:700">' + fmt(res.leftover) + '</span></div>';
    document.getElementById('alloc-preview').innerHTML = (rows || '<div style="padding:12px;color:rgba(255,255,255,0.4);font-size:0.85rem">Nothing to allocate yet.</div>') + leftRow;
    window._allocLines = res.lines;
  }
  document.getElementById('alloc-amt').addEventListener('input', refresh);
  document.getElementById('alloc-income').addEventListener('change', refresh);
  refresh();

  const btns = document.getElementById('alloc-btns');
  const apply = document.createElement('button');
  apply.className = 'btn-primary'; apply.style.flex = '1'; apply.textContent = 'Apply';
  apply.onclick = async function () {
    const lines = window._allocLines || [];
    if (!lines.length) { alert('Nothing to allocate.'); return; }
    apply.disabled = true; apply.textContent = 'Saving…';
    await applyAllocation(lines);
    overlay.remove();
  };
  btns.appendChild(apply);
}

// ── Pot editor ──
function openPotEditor(id) {
  const existing = id ? (pots || []).find((x) => String(x.id) === String(id)) : null;
  window._potEditId = id || null;
  const overlay = document.createElement('div');
  overlay.id = 'pot-dlg';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)';
  const inp = 'width:100%;box-sizing:border-box;background:#0f1319;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#fff;font-size:0.95rem;outline:none';
  const lab = 'display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.07em;margin:12px 0 5px';
  overlay.innerHTML =
    '<div style="width:420px;max-width:92vw;max-height:92vh;overflow:auto;background:#181c28;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.08)">' +
      '<div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:18px 20px;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-weight:700;font-size:1rem;color:#fff">' + (id ? '✏️ Edit pot' : '+ New pot') + '</span>' +
        '<button id="pot-close" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1.1rem">×</button>' +
      '</div>' +
      '<div style="padding:8px 20px 20px">' +
        '<div style="display:flex;gap:10px">' +
          '<div style="width:64px"><label style="' + lab + '">Icon</label><input id="pot-emoji" style="' + inp + ';text-align:center" maxlength="2" /></div>' +
          '<div style="flex:1"><label style="' + lab + '">Name</label><input id="pot-name" style="' + inp + '" placeholder="Pot name" /></div>' +
        '</div>' +
        '<label style="' + lab + '">Type</label>' +
        '<select id="pot-kind" style="' + inp + '">' +
          '<option value="goal">Savings goal (fill to a target)</option>' +
          '<option value="monthly">Monthly set-aside (recurring £/mo)</option>' +
          '<option value="percent">% of income (skimmed off the top)</option>' +
        '</select>' +
        '<div id="pot-goal-f"><label style="' + lab + '">Target (£)</label><input id="pot-target" type="number" step="0.01" min="0" style="' + inp + '" /></div>' +
        '<div id="pot-monthly-f"><label style="' + lab + '">Amount per month (£)</label><input id="pot-monthly" type="number" step="0.01" min="0" style="' + inp + '" />' +
          '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:rgba(255,255,255,0.75);font-size:0.85rem;cursor:pointer"><input id="pot-autodebt" type="checkbox" style="width:16px;height:16px;accent-color:#7c6cfc" /> Auto-pull from my total monthly debt payments</label></div>' +
        '<div id="pot-pct-f"><label style="' + lab + '">Percent of income (%)</label><input id="pot-rate" type="number" step="0.1" min="0" max="100" style="' + inp + '" /></div>' +
        '<label style="' + lab + '">Priority (lower = funded first)</label><input id="pot-priority" type="number" step="1" style="' + inp + '" />' +
        '<label style="' + lab + '">Balance now (£)</label><input id="pot-balance" type="number" step="0.01" style="' + inp + '" />' +
        '<div id="pot-btns" style="display:flex;gap:10px;margin-top:18px"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('pot-close').onclick = function () { overlay.remove(); };

  const kindSel = document.getElementById('pot-kind');
  function syncKind() {
    const k = kindSel.value;
    document.getElementById('pot-goal-f').style.display = k === 'goal' ? '' : 'none';
    document.getElementById('pot-monthly-f').style.display = k === 'monthly' ? '' : 'none';
    document.getElementById('pot-pct-f').style.display = k === 'percent' ? '' : 'none';
  }
  kindSel.addEventListener('change', syncKind);

  // defaults / existing
  document.getElementById('pot-emoji').value = existing ? (existing.emoji || '💰') : '💰';
  document.getElementById('pot-name').value = existing ? (existing.name || '') : '';
  kindSel.value = existing ? (existing.kind || 'goal') : 'goal';
  document.getElementById('pot-target').value = existing ? (existing.target || '') : '';
  document.getElementById('pot-monthly').value = existing ? (existing.monthly || '') : '';
  document.getElementById('pot-autodebt').checked = existing ? !!existing.auto_debt : false;
  document.getElementById('pot-rate').value = existing && existing.rate ? round2(parseNum(existing.rate) * 100) : '';
  document.getElementById('pot-priority').value = existing ? (existing.priority != null ? existing.priority : 100) : 100;
  document.getElementById('pot-balance').value = existing ? (existing.balance || 0) : 0;
  syncKind();

  const btns = document.getElementById('pot-btns');
  const save = document.createElement('button');
  save.className = 'btn-primary'; save.style.flex = '1'; save.textContent = 'Save';
  save.onclick = savePotEditor; btns.appendChild(save);
  if (id) {
    const del = document.createElement('button');
    del.className = 'btn-danger'; del.textContent = 'Delete';
    del.onclick = function () { deletePot(id); };
    btns.appendChild(del);
  }
}

async function savePotEditor() {
  const name = (document.getElementById('pot-name') || {}).value || '';
  if (!name.trim()) { alert('Give the pot a name.'); return; }
  const kind = document.getElementById('pot-kind').value;
  const payload = {
    name: name.trim(),
    emoji: (document.getElementById('pot-emoji').value || '💰').trim() || '💰',
    kind: kind,
    priority: parseInt(document.getElementById('pot-priority').value, 10) || 100,
    target: kind === 'goal' ? (parseFloat(document.getElementById('pot-target').value) || 0) : 0,
    monthly: kind === 'monthly' ? (parseFloat(document.getElementById('pot-monthly').value) || 0) : 0,
    auto_debt: kind === 'monthly' ? document.getElementById('pot-autodebt').checked : false,
    rate: kind === 'percent' ? round2((parseFloat(document.getElementById('pot-rate').value) || 0) / 100) : 0,
    balance: round2(parseFloat(document.getElementById('pot-balance').value) || 0),
  };
  const id = window._potEditId;
  const res = id
    ? await window.db.from('pots').update(payload).eq('id', id)
    : await window.db.from('pots').insert([payload]);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  const dlg = document.getElementById('pot-dlg'); if (dlg) dlg.remove();
  await loadAll();
}

async function deletePot(id) {
  if (!confirm('Delete this pot? The money it held just returns to "free to assign".')) return;
  const res = await window.db.from('pots').delete().eq('id', id);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  const dlg = document.getElementById('pot-dlg'); if (dlg) dlg.remove();
  await loadAll();
}

/* ===== Income ledger — actual earnings (incl. costs/net) across all streams, daily/weekly/monthly ===== */
function incomeISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function incomeMondayOf(iso){ const d=new Date(iso+'T00:00:00'); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return d; }
function incomePeriodBounds(){
  const ref = incomeRef || todayISO();
  if (incomeView === 'day') return [ref, ref];
  if (incomeView === 'week'){ const mon=incomeMondayOf(ref); const sun=new Date(mon); sun.setDate(mon.getDate()+6); return [incomeISO(mon), incomeISO(sun)]; }
  const ym = ref.slice(0,7); return [ym+'-01', ym+'-31'];
}
function incomePeriodLabel(){
  const [s,e]=incomePeriodBounds();
  if (incomeView==='day') return new Date(s+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  if (incomeView==='week') return new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' – '+new Date(e+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  return new Date((incomeRef||todayISO())+'T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
}
function incomeSetView(v){ incomeView=v; incomeRef=todayISO(); render(); }
function incomeShift(dir){
  const d=new Date((incomeRef||todayISO())+'T00:00:00');
  if (incomeView==='day') d.setDate(d.getDate()+dir);
  else if (incomeView==='week') d.setDate(d.getDate()+dir*7);
  else d.setMonth(d.getMonth()+dir);
  incomeRef=incomeISO(d); render();
}
function incomeJumpToday(){ incomeRef=todayISO(); render(); }

function renderIncome(){
  if (!window.SUPABASE_CONFIGURED) { list.innerHTML='<div class="empty error">Supabase not configured.</div>'; return; }
  const [start,end]=incomePeriodBounds();
  const rows=(incomeEntries||[]).filter(x=>x.date>=start && x.date<=end)
    .sort((a,b)=> (b.date===a.date ? String(b.created_at||'').localeCompare(String(a.created_at||'')) : b.date.localeCompare(a.date)));
  let inc=0,cost=0;
  rows.forEach(r=>{ inc+=parseNum(r.amount); cost+=parseNum(r.cost); });
  const net=round2(inc-cost);

  const cats={};
  rows.forEach(r=>{ const k=((r.category||'').trim())||'Uncategorised'; if(!cats[k]) cats[k]={inc:0,cost:0}; cats[k].inc+=parseNum(r.amount); cats[k].cost+=parseNum(r.cost); });
  const catArr=Object.keys(cats).map(k=>({name:k,inc:cats[k].inc,cost:cats[k].cost,net:round2(cats[k].inc-cats[k].cost)})).sort((a,b)=>b.net-a.net);

  const toggle = [['day','Day'],['week','Week'],['month','Month']].map(([v,l])=>`<button class="inc-tg${incomeView===v?' active':''}" onclick="incomeSetView('${v}')">${l}</button>`).join('');

  const totals = `
    <div class="inc-totals">
      <div class="inc-tot-cell"><span class="inc-tot-lbl">Income</span><span class="inc-tot-val pos">${fmt(inc)}</span></div>
      <div class="inc-tot-cell"><span class="inc-tot-lbl">Costs</span><span class="inc-tot-val">${fmt(cost)}</span></div>
      <div class="inc-tot-cell inc-tot-net"><span class="inc-tot-lbl">Net profit</span><span class="inc-tot-val ${net<0?'neg':'pos'}">${fmt(net)}</span></div>
    </div>`;

  const breakdown = catArr.length ? `
    <div class="inc-section-title">By stream</div>
    <div class="inc-cats">${catArr.map(c=>`
      <div class="inc-cat-row">
        <span class="inc-cat-name">${esc(c.name)}</span>
        <span class="inc-cat-nums"><span class="pos">${fmt(c.inc)}</span>${c.cost?` <span class="inc-cat-cost">− ${fmt(c.cost)}</span>`:''} <span class="inc-cat-net ${c.net<0?'neg':'pos'}">${fmt(c.net)}</span></span>
      </div>`).join('')}</div>` : '';

  const entriesHtml = rows.length ? rows.map(r=>{
    const n=round2(parseNum(r.amount)-parseNum(r.cost));
    const dlabel=new Date(r.date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    return `<div class="inc-entry" onclick="openIncomeEditor('${r.id}')">
      <div class="inc-entry-main">
        <span class="inc-entry-cat">${esc((r.category||'').trim()||'Uncategorised')}</span>
        ${r.note?`<span class="inc-entry-note">${esc(r.note)}</span>`:''}
      </div>
      <div class="inc-entry-right">
        <span class="inc-entry-net ${n<0?'neg':'pos'}">${fmt(n)}</span>
        <span class="inc-entry-sub">+${fmt(parseNum(r.amount))}${parseNum(r.cost)?` · −${fmt(parseNum(r.cost))}`:''} · ${dlabel}</span>
      </div>
    </div>`;
  }).join('') : '<div class="empty">No income logged for this period. Hit <strong>+ Add income</strong>.</div>';

  list.innerHTML = `
    <div class="inc-page">
      <div class="inc-bar">
        <div class="inc-toggle">${toggle}</div>
        <div class="inc-nav">
          <button class="inc-navbtn" onclick="incomeShift(-1)" aria-label="Previous">‹</button>
          <button class="inc-period" onclick="incomeJumpToday()">${esc(incomePeriodLabel())}</button>
          <button class="inc-navbtn" onclick="incomeShift(1)" aria-label="Next">›</button>
        </div>
      </div>
      ${totals}
      <div class="inc-actions"><button class="inc-add" onclick="openIncomeEditor(null)">+ Add income</button></div>
      ${breakdown}
      <div class="inc-section-title">Entries</div>
      <div class="inc-entries">${entriesHtml}</div>
    </div>`;
}

function openIncomeEditor(id){
  window._editingIncomeId = id || null;
  const e = id ? (incomeEntries||[]).find(x=>String(x.id)===String(id)) : null;
  const cats=[...new Set((incomeEntries||[]).map(x=>(x.category||'').trim()).filter(Boolean))];
  const dl = cats.map(c=>`<option value="${esc(c)}"></option>`).join('');
  showWorkModal(`
    <h3 class="work-modal-title">${e?'Edit income':'Add income'}</h3>
    <form id="income-form" onsubmit="return saveIncome(event)">
      <label class="work-lbl">Date</label>
      <input class="work-input" type="date" id="inc-date" value="${e?esc(e.date):todayISO()}" required/>
      <label class="work-lbl">Stream / label</label>
      <input class="work-input" id="inc-cat" list="inc-cat-list" placeholder="e.g. Company formations" value="${e?esc(e.category||''):''}"/>
      <datalist id="inc-cat-list">${dl}</datalist>
      <div class="work-row-2">
        <div><label class="work-lbl">Income (£)</label><input class="work-input" type="number" step="any" inputmode="decimal" id="inc-amt" placeholder="0" value="${e?esc(e.amount):''}"/></div>
        <div><label class="work-lbl">Cost (£)</label><input class="work-input" type="number" step="any" inputmode="decimal" id="inc-cost" placeholder="0" value="${e?esc(e.cost):''}"/></div>
      </div>
      <label class="work-lbl">Note</label>
      <textarea class="work-input" id="inc-note" rows="2" placeholder="What was this? e.g. set up 3 companies for X">${e?esc(e.note||''):''}</textarea>
      <div class="work-modal-actions">
        ${e?`<button type="button" class="work-btn-danger" onclick="deleteIncomeEntry('${e.id}')">Delete</button>`:'<span></span>'}
        <div class="work-modal-right">
          <button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button>
          <button type="submit" class="work-btn-primary">Save</button>
        </div>
      </div>
    </form>`);
  setTimeout(()=>{ const el=document.getElementById('inc-amt'); if(el) el.focus(); },50);
}

async function saveIncome(ev){
  ev.preventDefault();
  const date=(document.getElementById('inc-date').value)||todayISO();
  const category=(document.getElementById('inc-cat').value||'').trim();
  const amount=parseNum(document.getElementById('inc-amt').value);
  const cost=parseNum(document.getElementById('inc-cost').value);
  const note=(document.getElementById('inc-note').value||'').trim();
  if (!amount && !cost){ alert('Enter an income or cost amount.'); return false; }
  const editing = window._editingIncomeId || null;
  const payload={ date, category: category||null, amount, cost, note: note||null };
  const res = editing
    ? await window.db.from('income_entries').update(payload).eq('id', editing)
    : await window.db.from('income_entries').insert([payload]);
  if (res.error){ alert('Error: '+res.error.message); return false; }
  closeWorkModal(); window._editingIncomeId=null; await loadAll();
  return false;
}

async function deleteIncomeEntry(id){
  if (!confirm('Delete this income entry?')) return;
  const res=await window.db.from('income_entries').delete().eq('id', id);
  if (res.error){ alert('Error: '+res.error.message); return; }
  closeWorkModal(); window._editingIncomeId=null; await loadAll();
}

/* ===================== LIFE PROGRESS (Goals + Targets) ===================== */
const LIFE_DOMAINS = ['Money','Health','Faith','Sales/Skills','Network','Discipline'];
function lifeDomainClass(d){ return 'dom-' + String(d||'').toLowerCase().replace(/[^a-z]+/g,'-'); }
function lifeMonday(iso){ const d=new Date((iso||todayISO())+'T00:00:00'); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function lifeDateLabel(iso){ const t=todayISO(); if(iso===t) return 'Today'; if(iso===shiftISO(t,-1)) return 'Yesterday'; return new Date(iso+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }

function lifeSetSub(s){ lifeSubTab=s; render(); }
function lifeShiftDay(dir){ lifeDay=shiftISO(lifeDay,dir); render(); }
function lifeJumpToday(){ lifeDay=todayISO(); render(); }

function renderLife(){
  if (!window.SUPABASE_CONFIGURED) { list.innerHTML='<div class="empty error">Supabase not configured.</div>'; return; }
  list.innerHTML = `<div class="life-page"><div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin:2px 2px 6px">Long-term goals · daily tracking lives in Operator Log</div><div class="life-body">${renderLifeGoalsHtml()}</div></div>`;
}

/* ---------- GOALS ---------- */
/* --- Auto-source linking: pull from Gym / Tickets / Debts so nothing is entered twice --- */
const AUTO_LABEL = { gym:'Gym', tickets:'Tickets' };
function lifeWeekEnd(wk){ const d=new Date(wk+'T00:00:00'); d.setDate(d.getDate()+6); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function liveDebtTotal(){ return (debts||[]).filter(d=>d.type!=='receivable' && d.status!=='paid').reduce((s,d)=>s+parseNum(d.current_balance),0); }
function dailyAutoSource(t){ return /\bgym\b/i.test(t.title||'') ? 'gym' : null; }
function weeklyAutoSource(t){ const s=t.title||''; if(/\bgym\b/i.test(s)) return 'gym'; if(/ticket/i.test(s)) return 'tickets'; return null; }
function autoDailyVal(t, day){ if(dailyAutoSource(t)==='gym') return (gymSessions||[]).some(x=>x.date===day)?1:0; return null; }
function autoWeeklyVal(t, wk){ const src=weeklyAutoSource(t); if(!src) return null; const e=lifeWeekEnd(wk); if(src==='gym') return (gymSessions||[]).filter(x=>x.date>=wk&&x.date<=e).length; if(src==='tickets') return (tickets||[]).filter(k=>(k.ticket_kind||'personal')==='personal'&&k.date>=wk&&k.date<=e).length; return 0; }
function dailyEffective(t, day){ const a=autoDailyVal(t,day); return a!==null ? {v:a,auto:dailyAutoSource(t)} : {v:dailyVal(t.id,day),auto:null}; }
function weeklyEffective(t, wk){ const a=autoWeeklyVal(t,wk); return a!==null ? {v:a,auto:weeklyAutoSource(t)} : {v:weeklyVal(t.id,wk),auto:null}; }
function goalDebtLinked(g){ return /debt/i.test((g.metric_label||'')+' '+(g.title||'')); }
function goalCurrent(g){ return goalDebtLinked(g) ? liveDebtTotal() : g.current_value; }

function goalProgress(g){
  const cur = goalCurrent(g);
  const hasMetric = g.metric_label && g.target_value!=null && g.start_value!=null && cur!=null;
  if (hasMetric){
    const s=parseNum(g.start_value), c=parseNum(cur), t=parseNum(g.target_value);
    if (t===s) return c>=t?100:0;
    return Math.max(0, Math.min(100, Math.round(((c-s)/(t-s))*100)));
  }
  return Math.max(0, Math.min(100, parseInt(g.manual_progress)||0));
}
function goalCardHtml(g){
  const pct = goalProgress(g);
  const done = g.status==='done';
  const paused = g.status==='paused';
  const hasMetric = g.metric_label && g.target_value!=null;
  const metricLine = hasMetric
    ? `<div class="life-goal-metric">${esc(g.metric_label)}: <b>${fmtMaybe(goalCurrent(g))}</b> <span class="life-arrow">→</span> ${fmtMaybe(g.target_value)}${goalDebtLinked(g)?' <span class="life-autotag">live · Debts</span>':''}</div>`
    : '';
  const linked = [...dailyTargets, ...weeklyTargets].filter(t=>t.goal_id===g.id).length;
  return `
    <div class="life-goal-card${done?' done':''}${paused?' paused':''}" onclick="openGoalEditor('${g.id}')">
      <div class="life-goal-head">
        <span class="life-goal-title">${esc(g.title)}${done?' ✓':''}${paused?' ⏸':''}</span>
        ${g.domain?`<span class="life-dom ${lifeDomainClass(g.domain)}">${esc(g.domain)}</span>`:''}
      </div>
      ${g.why?`<div class="life-goal-why">${esc(g.why)}</div>`:''}
      ${metricLine}
      <div class="life-bar"><div class="life-bar-fill" style="width:${pct}%"></div></div>
      <div class="life-goal-foot">
        <span class="life-goal-pct">${pct}%</span>
        <span class="life-goal-meta">${g.deadline?('Due '+new Date(g.deadline+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})):''}${linked?` · ${linked} linked`:''}</span>
      </div>
    </div>`;
}
function fmtMaybe(v){ const n=Number(v); return isNaN(n)?esc(v):n.toLocaleString('en-GB'); }
function renderLifeGoalsHtml(){
  const groups=[['3m','Next 3 months'],['6m','6 months'],['12m','12 months']];
  const sections = groups.map(([h,label])=>{
    const gs=(lifeGoals||[]).filter(g=>g.horizon===h).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const cards = gs.length ? gs.map(goalCardHtml).join('') : '<div class="life-empty-sm">Nothing here yet.</div>';
    return `<div class="life-goal-group"><div class="life-group-head">${label} <span class="life-group-count">${gs.length}</span></div>${cards}</div>`;
  }).join('');
  return `<div class="life-actions"><button class="life-add" onclick="openGoalEditor(null)">+ Add goal</button></div>${sections}`;
}
function openGoalEditor(id){
  window._editGoalId = id || null;
  const g = id ? (lifeGoals||[]).find(x=>String(x.id)===String(id)) : null;
  const domOpts = LIFE_DOMAINS.map(d=>`<option value="${d}"${g&&g.domain===d?' selected':''}>${d}</option>`).join('');
  const hzOpts = [['3m','3 months'],['6m','6 months'],['12m','12 months']].map(([v,l])=>`<option value="${v}"${g&&g.horizon===v?' selected':''}>${l}</option>`).join('');
  const stOpts = [['active','Active'],['done','Done'],['paused','Paused']].map(([v,l])=>`<option value="${v}"${g&&g.status===v?' selected':''}>${l}</option>`).join('');
  showWorkModal(`
    <h3 class="work-modal-title">${g?'Edit goal':'Add goal'}</h3>
    <form id="goal-form" onsubmit="return saveGoal(event)">
      <label class="work-lbl">Goal</label>
      <input class="work-input" id="g-title" required value="${g?esc(g.title):''}" placeholder="e.g. Clear all debt"/>
      <div class="work-row-2">
        <div><label class="work-lbl">Horizon</label><select class="work-input" id="g-hz">${hzOpts}</select></div>
        <div><label class="work-lbl">Domain</label><select class="work-input" id="g-dom"><option value="">—</option>${domOpts}</select></div>
      </div>
      <label class="work-lbl">Why it matters</label>
      <textarea class="work-input" id="g-why" rows="2" placeholder="The reason behind it">${g?esc(g.why||''):''}</textarea>
      <label class="work-lbl">Metric (optional — auto-calculates progress)</label>
      <input class="work-input" id="g-mlabel" value="${g?esc(g.metric_label||''):''}" placeholder="e.g. Debt remaining £"/>
      <div class="work-row-3">
        <div><label class="work-lbl">Start</label><input class="work-input" type="number" step="any" id="g-start" value="${g&&g.start_value!=null?esc(g.start_value):''}"/></div>
        <div><label class="work-lbl">Current</label><input class="work-input" type="number" step="any" id="g-current" value="${g&&g.current_value!=null?esc(g.current_value):''}"/></div>
        <div><label class="work-lbl">Target</label><input class="work-input" type="number" step="any" id="g-target" value="${g&&g.target_value!=null?esc(g.target_value):''}"/></div>
      </div>
      <label class="work-lbl">Or manual progress (%) <span class="life-hint">used if no metric</span></label>
      <input class="work-input" type="range" min="0" max="100" id="g-manual" value="${g&&g.manual_progress!=null?g.manual_progress:0}" oninput="document.getElementById('g-manual-val').textContent=this.value+'%'"/>
      <div class="life-range-val" id="g-manual-val">${g&&g.manual_progress!=null?g.manual_progress:0}%</div>
      <div class="work-row-2">
        <div><label class="work-lbl">Deadline</label><input class="work-input" type="date" id="g-deadline" value="${g&&g.deadline?esc(g.deadline):''}"/></div>
        <div><label class="work-lbl">Status</label><select class="work-input" id="g-status">${stOpts}</select></div>
      </div>
      <div class="work-modal-actions">
        ${g?`<button type="button" class="work-btn-danger" onclick="deleteGoal('${g.id}')">Delete</button>`:'<span></span>'}
        <div class="work-modal-right">
          <button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button>
          <button type="submit" class="work-btn-primary">Save</button>
        </div>
      </div>
    </form>`);
}
async function saveGoal(ev){
  ev.preventDefault();
  const val=id=>document.getElementById(id).value;
  const numOrNull=id=>{ const v=val(id).trim(); return v===''?null:parseNum(v); };
  const title=val('g-title').trim(); if(!title){ alert('Title required.'); return false; }
  const payload={
    horizon:val('g-hz'), domain:val('g-dom')||null, title,
    why:val('g-why').trim()||null,
    metric_label:val('g-mlabel').trim()||null,
    start_value:numOrNull('g-start'), current_value:numOrNull('g-current'), target_value:numOrNull('g-target'),
    manual_progress:parseInt(val('g-manual'))||0,
    deadline:val('g-deadline')||null, status:val('g-status')
  };
  const editing=window._editGoalId||null;
  const res = editing
    ? await window.db.from('life_goals').update(payload).eq('id',editing)
    : await window.db.from('life_goals').insert([payload]);
  if(res.error){ alert('Error: '+res.error.message); return false; }
  closeWorkModal(); window._editGoalId=null; await loadAll();
  return false;
}
async function deleteGoal(id){
  if(!confirm('Delete this goal? Linked targets stay but lose the link.')) return;
  const res=await window.db.from('life_goals').delete().eq('id',id);
  if(res.error){ alert('Error: '+res.error.message); return; }
  closeWorkModal(); window._editGoalId=null; await loadAll();
}

/* ---------- TARGETS ---------- */
function dailyVal(targetId, day){ const l=(dailyLogs||[]).find(x=>x.target_id===targetId && x.log_date===day); return l?parseNum(l.value):0; }
function dailyMet(t, day){ const {v}=dailyEffective(t,day); return t.type==='count' ? v>=(t.target_count||1) && v>0 : v>=1; }
function dailyStreak(t){
  let streak=0, day=todayISO();
  // if today not yet met, start counting from yesterday so streak isn't 0 mid-day
  if(!dailyMet(t,day)) day=shiftISO(day,-1);
  for(let i=0;i<400;i++){ if(dailyMet(t,day)){ streak++; day=shiftISO(day,-1); } else break; }
  return streak;
}
function weeklyVal(targetId, wk){ const l=(weeklyLogs||[]).find(x=>x.target_id===targetId && x.week_start===wk); return l?parseNum(l.value):0; }

async function setDailyValue(targetId, valNum){
  const day=lifeDay;
  let log=(dailyLogs||[]).find(l=>l.target_id===targetId && l.log_date===day);
  if(log) log.value=valNum; else { dailyLogs.push({target_id:targetId,log_date:day,value:valNum}); }
  render();
  const {error}=await window.db.from('daily_logs').upsert({target_id:targetId,log_date:day,value:valNum},{onConflict:'target_id,log_date'});
  if(error){ alert('Save failed: '+error.message); await loadAll(); }
}
function toggleDailyCheck(id){ setDailyValue(id, dailyVal(id,lifeDay)>=1?0:1); }
function adjustDailyCount(ev,id,delta){ if(ev) ev.stopPropagation(); setDailyValue(id, Math.max(0, dailyVal(id,lifeDay)+delta)); }

async function setWeeklyValue(targetId, valNum){
  const wk=lifeMonday(todayISO());
  let log=(weeklyLogs||[]).find(l=>l.target_id===targetId && l.week_start===wk);
  if(log) log.value=valNum; else { weeklyLogs.push({target_id:targetId,week_start:wk,value:valNum}); }
  render();
  const {error}=await window.db.from('weekly_logs').upsert({target_id:targetId,week_start:wk,value:valNum},{onConflict:'target_id,week_start'});
  if(error){ alert('Save failed: '+error.message); await loadAll(); }
}
function adjustWeekly(ev,id,delta){ if(ev) ev.stopPropagation(); const wk=lifeMonday(todayISO()); setWeeklyValue(id, Math.max(0, weeklyVal(id,wk)+delta)); }

function renderLifeTargetsHtml(){
  const day=lifeDay;
  const ad=(dailyTargets||[]).filter(t=>t.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const metCount=ad.filter(t=>dailyMet(t,day)).length;
  const dayPct = ad.length ? Math.round(metCount/ad.length*100) : 0;

  const dailyRows = ad.length ? ad.map(t=>{
    const eff=dailyEffective(t,day), v=eff.v, met=dailyMet(t,day), streak=dailyStreak(t);
    let control;
    if(eff.auto){
      control = t.type==='count'
        ? `<div class="life-auto-val"><span class="life-cval">${v}<span class="life-ctar">/${t.target_count||1}</span></span></div>`
        : `<div class="life-auto-ind${met?' on':''}">${met?'✓':'—'}</div>`;
    } else {
      control = t.type==='count'
        ? `<div class="life-counter"><button class="life-cbtn" onclick="adjustDailyCount(event,'${t.id}',-1)">−</button><span class="life-cval">${v}<span class="life-ctar">/${t.target_count||1}</span></span><button class="life-cbtn" onclick="adjustDailyCount(event,'${t.id}',1)">+</button></div>`
        : `<button class="life-check${met?' on':''}" onclick="event.stopPropagation();toggleDailyCheck('${t.id}')">${met?'✓':''}</button>`;
    }
    const autotag = eff.auto ? `<span class="life-autotag">auto · ${AUTO_LABEL[eff.auto]||eff.auto}</span>` : '';
    return `<div class="life-target-row${met?' met':''}" onclick="openDailyTargetEditor('${t.id}')">
      <div class="life-target-main">
        <span class="life-target-title">${esc(t.title)}</span>
        <span class="life-target-sub">${t.domain?`<span class="life-dom ${lifeDomainClass(t.domain)}">${esc(t.domain)}</span>`:''}${autotag}${streak>0?`<span class="life-streak">🔥 ${streak}</span>`:''}</span>
      </div>
      <div class="life-target-ctl" onclick="event.stopPropagation()">${control}</div>
    </div>`;
  }).join('') : '<div class="life-empty-sm">No daily targets. Add one below.</div>';

  const aw=(weeklyTargets||[]).filter(t=>t.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const wk=lifeMonday(todayISO());
  const weeklyMet=aw.filter(t=>{ const v=weeklyEffective(t,wk).v; return (t.target_count||0)===0 ? v===0 : v>=t.target_count; }).length;
  const weekPct = aw.length ? Math.round(weeklyMet/aw.length*100) : 0;
  const weeklyRows = aw.length ? aw.map(t=>{
    const eff=weeklyEffective(t,wk); const v=eff.v; const tar=t.target_count||0;
    const isZero = tar===0;
    const pct = isZero ? (v===0?100:0) : Math.max(0,Math.min(100,Math.round(v/tar*100)));
    const label = isZero ? `${v} ${v===1?'incident':'incidents'}` : `${v}/${tar}`;
    const ok = isZero ? v===0 : v>=tar;
    const ctl = eff.auto
      ? `<span class="life-autotag">auto · ${AUTO_LABEL[eff.auto]||eff.auto}</span>`
      : `<button class="life-cbtn" onclick="adjustWeekly(event,'${t.id}',-1)">−</button><button class="life-cbtn" onclick="adjustWeekly(event,'${t.id}',1)">+</button>`;
    return `<div class="life-week-row" onclick="openWeeklyTargetEditor('${t.id}')">
      <div class="life-week-top">
        <span class="life-target-title">${esc(t.title)}${t.domain?` <span class="life-dom ${lifeDomainClass(t.domain)}">${esc(t.domain)}</span>`:''}${eff.auto?` <span class="life-autotag">auto · ${AUTO_LABEL[eff.auto]||eff.auto}</span>`:''}</span>
        <span class="life-week-count ${ok?'pos':''}">${label}</span>
      </div>
      <div class="life-bar"><div class="life-bar-fill${isZero&&v>0?' bad':''}" style="width:${pct}%"></div></div>
      <div class="life-week-ctl" onclick="event.stopPropagation()">${ctl}</div>
    </div>`;
  }).join('') : '<div class="life-empty-sm">No weekly targets. Add one below.</div>';

  return `
    <div class="life-day-bar">
      <button class="inc-navbtn" onclick="lifeShiftDay(-1)">‹</button>
      <button class="inc-period" onclick="lifeJumpToday()">${esc(lifeDateLabel(day))}</button>
      <button class="inc-navbtn" onclick="lifeShiftDay(1)">›</button>
    </div>
    <div class="life-ring-row"><div class="life-ring-cell"><span class="life-ring-pct">${dayPct}%</span><span class="life-ring-lbl">today · ${metCount}/${ad.length}</span></div></div>
    <div class="life-section-title">Daily</div>
    <div class="life-targets">${dailyRows}</div>
    <div class="life-actions"><button class="life-add" onclick="openDailyTargetEditor(null)">+ Add daily target</button></div>
    <div class="life-section-title">This week <span class="life-week-pct">${weekPct}%</span></div>
    <div class="life-weeks">${weeklyRows}</div>
    <div class="life-actions"><button class="life-add" onclick="openWeeklyTargetEditor(null)">+ Add weekly target</button></div>`;
}

function goalLinkOptions(selId){
  return '<option value="">— none —</option>' + (lifeGoals||[]).map(g=>`<option value="${g.id}"${selId===g.id?' selected':''}>${esc(g.title)} (${g.horizon})</option>`).join('');
}
function openDailyTargetEditor(id){
  window._editDailyId = id || null;
  const t = id ? (dailyTargets||[]).find(x=>String(x.id)===String(id)) : null;
  const domOpts = LIFE_DOMAINS.map(d=>`<option value="${d}"${t&&t.domain===d?' selected':''}>${d}</option>`).join('');
  showWorkModal(`
    <h3 class="work-modal-title">${t?'Edit daily target':'Add daily target'}</h3>
    <form id="dt-form" onsubmit="return saveDailyTarget(event)">
      <label class="work-lbl">Title</label>
      <input class="work-input" id="dt-title" required value="${t?esc(t.title):''}" placeholder="e.g. Fajr on time"/>
      <div class="work-row-2">
        <div><label class="work-lbl">Domain</label><select class="work-input" id="dt-dom"><option value="">—</option>${domOpts}</select></div>
        <div><label class="work-lbl">Type</label><select class="work-input" id="dt-type" onchange="document.getElementById('dt-tc-wrap').style.display=this.value==='count'?'block':'none'">
          <option value="check"${!t||t.type==='check'?' selected':''}>Check (done/not)</option>
          <option value="count"${t&&t.type==='count'?' selected':''}>Count</option>
        </select></div>
      </div>
      <div id="dt-tc-wrap" style="display:${t&&t.type==='count'?'block':'none'}"><label class="work-lbl">Target count</label><input class="work-input" type="number" id="dt-tc" value="${t?(t.target_count||1):3}"/></div>
      <label class="work-lbl">Link to goal (optional)</label>
      <select class="work-input" id="dt-goal">${goalLinkOptions(t&&t.goal_id)}</select>
      <label class="life-check-inline"><input type="checkbox" id="dt-active" ${!t||t.active!==false?'checked':''}/> Active</label>
      <div class="work-modal-actions">
        ${t?`<button type="button" class="work-btn-danger" onclick="deleteDailyTarget('${t.id}')">Delete</button>`:'<span></span>'}
        <div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary">Save</button></div>
      </div>
    </form>`);
}
async function saveDailyTarget(ev){
  ev.preventDefault();
  const v=id=>document.getElementById(id);
  const title=v('dt-title').value.trim(); if(!title){ alert('Title required.'); return false; }
  const payload={ title, domain:v('dt-dom').value||null, type:v('dt-type').value, target_count:parseInt(v('dt-tc').value)||1, goal_id:v('dt-goal').value||null, active:v('dt-active').checked };
  const editing=window._editDailyId||null;
  const res = editing ? await window.db.from('daily_targets').update(payload).eq('id',editing) : await window.db.from('daily_targets').insert([payload]);
  if(res.error){ alert('Error: '+res.error.message); return false; }
  closeWorkModal(); window._editDailyId=null; await loadAll();
  return false;
}
async function deleteDailyTarget(id){
  if(!confirm('Delete this daily target and its history?')) return;
  const res=await window.db.from('daily_targets').delete().eq('id',id);
  if(res.error){ alert('Error: '+res.error.message); return; }
  closeWorkModal(); window._editDailyId=null; await loadAll();
}
function openWeeklyTargetEditor(id){
  window._editWeeklyId = id || null;
  const t = id ? (weeklyTargets||[]).find(x=>String(x.id)===String(id)) : null;
  const domOpts = LIFE_DOMAINS.map(d=>`<option value="${d}"${t&&t.domain===d?' selected':''}>${d}</option>`).join('');
  showWorkModal(`
    <h3 class="work-modal-title">${t?'Edit weekly target':'Add weekly target'}</h3>
    <form id="wt-form" onsubmit="return saveWeeklyTarget(event)">
      <label class="work-lbl">Title</label>
      <input class="work-input" id="wt-title" required value="${t?esc(t.title):''}" placeholder="e.g. Gym"/>
      <div class="work-row-2">
        <div><label class="work-lbl">Domain</label><select class="work-input" id="wt-dom"><option value="">—</option>${domOpts}</select></div>
        <div><label class="work-lbl">Target / week <span class="life-hint">0 = keep at zero</span></label><input class="work-input" type="number" id="wt-tc" value="${t?(t.target_count!=null?t.target_count:5):5}"/></div>
      </div>
      <label class="work-lbl">Link to goal (optional)</label>
      <select class="work-input" id="wt-goal">${goalLinkOptions(t&&t.goal_id)}</select>
      <label class="life-check-inline"><input type="checkbox" id="wt-active" ${!t||t.active!==false?'checked':''}/> Active</label>
      <div class="work-modal-actions">
        ${t?`<button type="button" class="work-btn-danger" onclick="deleteWeeklyTarget('${t.id}')">Delete</button>`:'<span></span>'}
        <div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary">Save</button></div>
      </div>
    </form>`);
}
async function saveWeeklyTarget(ev){
  ev.preventDefault();
  const v=id=>document.getElementById(id);
  const title=v('wt-title').value.trim(); if(!title){ alert('Title required.'); return false; }
  const tc=v('wt-tc').value.trim();
  const payload={ title, domain:v('wt-dom').value||null, target_count:tc===''?1:parseInt(tc), goal_id:v('wt-goal').value||null, active:v('wt-active').checked };
  const editing=window._editWeeklyId||null;
  const res = editing ? await window.db.from('weekly_targets').update(payload).eq('id',editing) : await window.db.from('weekly_targets').insert([payload]);
  if(res.error){ alert('Error: '+res.error.message); return false; }
  closeWorkModal(); window._editWeeklyId=null; await loadAll();
  return false;
}
async function deleteWeeklyTarget(id){
  if(!confirm('Delete this weekly target and its history?')) return;
  const res=await window.db.from('weekly_targets').delete().eq('id',id);
  if(res.error){ alert('Error: '+res.error.message); return; }
  closeWorkModal(); window._editWeeklyId=null; await loadAll();
}

/* ===================== WORK PRICING calculator (value-based) + catalogue ===================== */
function wpGbp(n){ return '£' + Math.round(Number(n)||0).toLocaleString('en-GB'); }

function collectWorkPricingInputs(){
  const g = id => (document.getElementById(id)||{}).value;
  return { desc:g('wp-desc'), hours:g('wp-hours'), rate:g('wp-rate'), cx:g('wp-cx'), urg:g('wp-urg'),
    value:g('wp-value'), pct:g('wp-pct'), miles:g('wp-miles'), mileRate:g('wp-mileRate'),
    travelHrs:g('wp-travelHrs'), liability:g('wp-liability'), minFee:g('wp-minFee') };
}
function workPricingCompute(i){
  const n = x => parseFloat(x) || 0;
  const hours=n(i.hours), rate=n(i.rate), cx=n(i.cx)||1, urg=n(i.urg)||1, value=n(i.value), pct=n(i.pct),
        miles=n(i.miles), mr=n(i.mileRate), th=n(i.travelHrs), liab=n(i.liability), minFee=n(i.minFee);
  const labour=hours*rate*cx*urg, travel=miles*mr+th*rate, valueFee=value*(pct/100);
  const core=Math.max(labour,valueFee), target=Math.max(core+travel+liab,minFee),
        floor=Math.max(labour+travel,minFee), stretch=target*1.3;
  return {hours,rate,cx,urg,value,pct,labour,travel,valueFee,liab,target,floor,stretch};
}
function populateWorkPricing(i){
  if(!i) return;
  const set=(id,val)=>{ const e=document.getElementById(id); if(e && val!=null && val!=='') e.value=val; };
  set('wp-desc',i.desc); set('wp-hours',i.hours); set('wp-rate',i.rate); set('wp-cx',i.cx); set('wp-urg',i.urg);
  set('wp-value',i.value); set('wp-pct',i.pct); set('wp-miles',i.miles); set('wp-mileRate',i.mileRate);
  set('wp-travelHrs',i.travelHrs); set('wp-liability',i.liability); set('wp-minFee',i.minFee);
}

function renderWorkPricingView(){
  const list = document.getElementById('list');
  const nav = '<div class="ticket-type-filter">'
    + '<button class="ticket-filter" onclick="workView=\'companies\';renderWork()">Companies</button>'
    + '<button class="ticket-filter" onclick="workView=\'invoices\';renderWork()">Invoices</button>'
    + '<button class="ticket-filter" onclick="workView=\'travel\';renderWork()">Travel</button>'
    + '<button class="ticket-filter active" onclick="workView=\'pricing\';renderWork()">Pricing</button>'
    + '</div>';
  const descs = [...new Set((workQuotes||[]).map(q=>(q.description||'').trim()).filter(Boolean))];
  const dl = descs.map(d=>`<option value="${esc(d)}"></option>`).join('');
  const cat = (workQuotes && workQuotes.length) ? `
    <div class="wp-cat">
      <div class="wp-cat-title">Catalogue — ${workQuotes.length} saved ${workQuotes.length===1?'quote':'quotes'} <span class="wp-cat-hint">tap to reload</span></div>
      ${workQuotes.map(q=>`
        <div class="wp-cat-row" onclick="loadWorkQuote('${q.id}')">
          <div class="wp-cat-main">
            <span class="wp-cat-desc">${esc(q.description||'Untitled')}</span>
            <span class="wp-cat-sub">${new Date(q.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · floor ${wpGbp(q.floor)} · stretch ${wpGbp(q.stretch)}</span>
          </div>
          <span class="wp-cat-fee">${wpGbp(q.target)}</span>
          <button class="wp-cat-del" onclick="event.stopPropagation();deleteWorkQuote('${q.id}')" aria-label="Delete">✕</button>
        </div>`).join('')}
    </div>` : '';

  list.innerHTML = nav + `
    <div class="wp-wrap">
      <div class="wp-out">
        <div class="wp-out-lbl">Recommended fee</div>
        <div class="wp-big" id="wp-recommended">£0</div>
        <div class="wp-band">
          <div><div class="wp-v wp-floor" id="wp-floor">£0</div><div class="wp-k">Floor</div></div>
          <div><div class="wp-v wp-target" id="wp-targetB">£0</div><div class="wp-k">Target</div></div>
          <div><div class="wp-v wp-stretch" id="wp-stretch">£0</div><div class="wp-k">Stretch</div></div>
        </div>
        <div class="wp-breakdown" id="wp-breakdown"></div>
      </div>

      <div class="wp-card">
        <label class="wp-lbl">Job description (becomes the catalogue label)</label>
        <input class="wp-input" id="wp-desc" list="wp-desc-list" placeholder="e.g. VAT registration + setup">
        <datalist id="wp-desc-list">${dl}</datalist>
        <div class="wp-row">
          <div><label class="wp-lbl">Your hours on it</label><input class="wp-input" id="wp-hours" type="number" value="2" min="0" step="0.5" inputmode="decimal" oninput="calcWorkPricing()"></div>
          <div><label class="wp-lbl">Base rate (£/hr)</label><input class="wp-input" id="wp-rate" type="number" value="35" min="0" step="5" inputmode="decimal" oninput="calcWorkPricing()"><div class="wp-hint">Your floor for time</div></div>
        </div>
        <label class="wp-lbl">Complexity / expertise</label>
        <select class="wp-input" id="wp-cx" onchange="calcWorkPricing()">
          <option value="1">Routine admin (1.0×)</option>
          <option value="1.5" selected>Specialist — needs your know-how (1.5×)</option>
          <option value="2.2">Expert / high-stakes — few can do it (2.2×)</option>
        </select>
        <label class="wp-lbl">Urgency</label>
        <select class="wp-input" id="wp-urg" onchange="calcWorkPricing()">
          <option value="1" selected>Standard (1.0×)</option>
          <option value="1.25">Priority — drop other work (1.25×)</option>
          <option value="1.5">Emergency / same-day (1.5×)</option>
        </select>
      </div>

      <div class="wp-card">
        <label class="wp-lbl">What is this worth to the client? (£)</label>
        <input class="wp-input" id="wp-value" type="number" value="0" min="0" step="500" inputmode="decimal" oninput="calcWorkPricing()" placeholder="deal / revenue / saving it unlocks">
        <div class="wp-hint">The real lever. A 2-hr job that unlocks £1m is not a £70 job.</div>
        <label class="wp-lbl">Your share of that value (%)</label>
        <input class="wp-input" id="wp-pct" type="number" value="5" min="0" max="100" step="0.5" inputmode="decimal" oninput="calcWorkPricing()">
        <div class="wp-hint">Typical value-capture: 3–10% depending on how central you are</div>
      </div>

      <div class="wp-card">
        <div class="wp-row">
          <div><label class="wp-lbl">Travel miles (round trip)</label><input class="wp-input" id="wp-miles" type="number" value="0" min="0" step="5" inputmode="decimal" oninput="calcWorkPricing()"></div>
          <div><label class="wp-lbl">Mileage rate (£/mile)</label><input class="wp-input" id="wp-mileRate" type="number" value="0.45" min="0" step="0.05" inputmode="decimal" oninput="calcWorkPricing()"></div>
        </div>
        <div class="wp-row">
          <div><label class="wp-lbl">Travel hours</label><input class="wp-input" id="wp-travelHrs" type="number" value="0" min="0" step="0.5" inputmode="decimal" oninput="calcWorkPricing()"></div>
          <div><label class="wp-lbl">Responsibility fee (£)</label><input class="wp-input" id="wp-liability" type="number" value="0" min="0" step="50" inputmode="decimal" oninput="calcWorkPricing()"><div class="wp-hint">For carrying real liability</div></div>
        </div>
        <label class="wp-lbl">Minimum job fee (£)</label>
        <input class="wp-input" id="wp-minFee" type="number" value="150" min="0" step="25" inputmode="decimal" oninput="calcWorkPricing()">
        <div class="wp-hint">Never leave the house for less than this</div>
      </div>

      <div class="wp-actions"><button class="wp-save" id="wp-save-btn" onclick="saveWorkQuote()">Save quote to catalogue</button></div>

      <div class="wp-card wp-note"><b>How to read it.</b> The <span class="wp-floor">Floor</span> is your cost — never go below it. <span class="wp-target">Target</span> is the right ask, factoring in value delivered. <span class="wp-stretch">Stretch</span> is what you open with. Quote the Stretch, hold past the first push-back, settle at Target.</div>

      ${cat}
    </div>`;
  if(window._wpPending){ populateWorkPricing(window._wpPending); window._wpPending=null; }
  calcWorkPricing();
}

function calcWorkPricing(){
  const r = workPricingCompute(collectWorkPricingInputs());
  const set=(id,t)=>{ const e=document.getElementById(id); if(e) e.textContent=t; };
  set('wp-recommended', wpGbp(r.target));
  set('wp-floor', wpGbp(r.floor));
  set('wp-targetB', wpGbp(r.target));
  set('wp-stretch', wpGbp(r.stretch));
  const driver = r.valueFee > r.labour
    ? 'Value-based — outcome is driving the price (good)'
    : 'Time-based — no client value entered, so it caps at hours';
  const bd=document.getElementById('wp-breakdown');
  if(bd) bd.innerHTML =
    `<div><span>Labour (${r.hours}h × ${wpGbp(r.rate)} × ${r.cx} × ${r.urg})</span><b>${wpGbp(r.labour)}</b></div>`+
    `<div><span>Value capture (${r.pct}% of ${wpGbp(r.value)})</span><b>${wpGbp(r.valueFee)}</b></div>`+
    `<div><span>Travel</span><b>${wpGbp(r.travel)}</b></div>`+
    `<div><span>Responsibility</span><b>${wpGbp(r.liab)}</b></div>`+
    `<div class="wp-driver"><span>${driver}</span><b></b></div>`;
}

async function saveWorkQuote(){
  const inp = collectWorkPricingInputs();
  const desc = (inp.desc||'').trim();
  if(!desc){ alert('Add a job description first — that becomes the catalogue label.'); const d=document.getElementById('wp-desc'); if(d) d.focus(); return; }
  const r = workPricingCompute(inp);
  const row = { description: desc, inputs: inp, floor: Math.round(r.floor), target: Math.round(r.target), stretch: Math.round(r.stretch) };
  const btn = document.getElementById('wp-save-btn'); if(btn){ btn.textContent='Saving…'; btn.disabled=true; }
  const { data, error } = await window.db.from('work_quotes').insert([row]).select();
  if(error){ alert('Save failed: '+error.message); if(btn){ btn.textContent='Save quote to catalogue'; btn.disabled=false; } return; }
  if(data && data[0]) workQuotes.unshift(data[0]);
  window._wpPending = inp;
  renderWorkPricingView();
}
async function loadWorkQuote(id){
  const q = (workQuotes||[]).find(x=>String(x.id)===String(id));
  if(!q) return;
  window._wpPending = q.inputs || {};
  renderWorkPricingView();
  const out=document.querySelector('.wp-out'); if(out) out.scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteWorkQuote(id){
  if(!confirm('Remove this quote from the catalogue?')) return;
  const { error } = await window.db.from('work_quotes').delete().eq('id', id);
  if(error){ alert('Delete failed: '+error.message); return; }
  workQuotes = (workQuotes||[]).filter(x=>String(x.id)!==String(id));
  renderWorkPricingView();
}

/* ===================== OPERATOR LOG ===================== */
const OP_DEBT_START = 21101.25;
const OP_INCOME_TARGET = 15000;
const OP_DAILY_ITEMS = [['wake','Wake by 6:00am'],['fajr','Fajr on time'],['gym','Gym before 9am'],['pmo','No PMO'],['sleep','Fixed bedtime hit'],['prayers','All 5 prayers on time']];
const OP_STREAMS = ['RASNEST','IMS Trading','Other'];

function opSetSub(t){ opSubTab=t; render(); }
function opDatesBack(n){ const a=[]; for(let i=n-1;i>=0;i--) a.push(shiftISO(todayISO(),-i)); return a; }
function opLogForDate(d){ return (opDailyLogs||[]).find(l=>l.date===d); }
function opDayScore(l){ if(!l) return 0; return OP_DAILY_ITEMS.reduce((s,it)=>s+(l[it[0]]===true?1:0),0); }
function opWeekLabel(iso){
  const d=new Date((iso||todayISO())+'T00:00:00');
  const dn=(d.getDay()+6)%7; d.setDate(d.getDate()-dn+3);
  const firstThu=new Date(d.getFullYear(),0,4);
  const week=1+Math.round(((d-firstThu)/86400000 - 3 + ((firstThu.getDay()+6)%7))/7);
  return d.getFullYear()+'-W'+String(week).padStart(2,'0');
}

function renderOperator(){
  if(!window.SUPABASE_CONFIGURED){ list.innerHTML='<div class="empty error">Supabase not configured.</div>'; return; }
  const tabs=[['daily','Daily'],['money','Money'],['projects','Projects'],['partner','Partner']];
  const sub=`<div class="op-subnav">${tabs.map(t=>`<button class="op-subtab${opSubTab===t[0]?' active':''}" onclick="opSetSub('${t[0]}')">${t[1]}</button>`).join('')}</div>`;
  let body;
  if(opSubTab==='money') body=renderOpMoney();
  else if(opSubTab==='projects') body=renderOpProjects();
  else if(opSubTab==='partner') body=renderOpPartner();
  else body=renderOpDaily();
  list.innerHTML=`<div class="op-wrap">${sub}${body}</div>`;
}

/* ---- Daily ---- */
async function opUpsertDaily(patch){
  const d=todayISO();
  let log=opLogForDate(d);
  if(!log){ log={date:d}; opDailyLogs.unshift(log); }
  Object.assign(log, patch);
  render();
  const {error}=await window.db.from('op_daily_logs').upsert(Object.assign({date:d},patch),{onConflict:'date'});
  if(error){ alert('Save failed: '+error.message); await loadAll(); }
}
function opToggleDaily(key){ const l=opLogForDate(todayISO()); const cur=l?l[key]:null; const p={}; p[key]=(cur===true)?false:true; opUpsertDaily(p); }
function opSetHours(v){ opUpsertDaily({hours:parseFloat(v)||0}); }

function renderOpDaily(){
  const today=todayISO();
  const tLog=opLogForDate(today);
  const score=opDayScore(tLog);
  const streak=opDatesBack(14).map(d=>{const l=opLogForDate(d);return l?opDayScore(l)>=5:false;})
    .map(hit=>`<div class="op-streak-cell${hit?' hit':''}"></div>`).join('');
  const toggles=OP_DAILY_ITEMS.map(it=>{
    const v=tLog?tLog[it[0]]:null; const st=v===true?'pass':(v===false?'fail':'none');
    return `<div class="op-item"><span class="op-item-label">${it[1]}</span><button class="op-yn op-${st}" onclick="opToggleDaily('${it[0]}')">${v===true?'✓':(v===false?'✗':'—')}</button></div>`;
  }).join('');
  const hoursVal=(tLog&&tLog.hours!=null)?tLog.hours:'';
  const days7=opDatesBack(7);
  const head=`<div class="op-grid-row op-grid-head"><span class="op-grid-label"></span>${days7.map(d=>`<span class="op-grid-cell-h">${new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'narrow'})}</span>`).join('')}</div>`;
  const rows=OP_DAILY_ITEMS.map(it=>{
    const cells=days7.map(d=>{const l=opLogForDate(d);const v=l?l[it[0]]:null;const c=(v===true)?'pass':((v===false&&l)?'fail':'none');return `<span class="op-cell op-${c}"></span>`;}).join('');
    return `<div class="op-grid-row"><span class="op-grid-label">${it[1]}</span>${cells}</div>`;
  }).join('');
  return `
    <div class="op-panel"><div class="op-panel-head">14-day streak <span class="op-dim">5+/6 = hit</span></div><div class="op-streak">${streak}</div></div>
    <div class="op-panel">
      <div class="op-score">${score}<span class="op-dim"> /6 non-negotiables today</span></div>
      <div class="op-items">${toggles}</div>
      <div class="op-item" style="margin-top:8px;border-top:1px solid #23262b;padding-top:12px"><span class="op-item-label">Focused work hours</span><input class="op-hours" type="number" step="0.5" inputmode="decimal" value="${hoursVal}" onchange="opSetHours(this.value)" placeholder="0"/></div>
    </div>
    <div class="op-panel"><div class="op-panel-head">Last 7 days</div><div class="op-grid">${head}${rows}</div></div>`;
}

/* ---- Money ---- */
function renderOpMoney(){
  const bal=liveDebtTotal();
  const paid=Math.max(0,OP_DEBT_START-bal);
  const pct=OP_DEBT_START>0?Math.min(100,Math.max(0,paid/OP_DEBT_START*100)):0;
  const ym=todayISO().slice(0,7);
  const monthInc=(opIncome||[]).filter(x=>(x.date||'').slice(0,7)===ym).reduce((s,x)=>s+parseNum(x.amount),0);
  const incPct=OP_INCOME_TARGET>0?Math.round(monthInc/OP_INCOME_TARGET*100):0;
  const gbp=n=>'£'+Math.round(n).toLocaleString('en-GB');
  const gbp2=n=>'£'+n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const incRows=(opIncome||[]).slice(0,40).map(x=>`<div class="op-row"><span class="op-row-main"><span class="op-tag">${esc(x.stream||'Other')}</span> ${_fmtDay(x.date)}</span><span class="op-row-amt pos">${gbp(parseNum(x.amount))}</span><button class="op-del" onclick="opDeleteIncome('${x.id}')">×</button></div>`).join('')||'<div class="op-dim" style="padding:8px 0">No income logged.</div>';
  const spendRows=(opSpend||[]).slice(0,40).map(x=>`<div class="op-row"><span class="op-row-main">${esc(x.description||'—')} · ${_fmtDay(x.date)}</span><span class="op-row-amt neg">${gbp(parseNum(x.amount))}</span><button class="op-del" onclick="opDeleteSpend('${x.id}')">×</button></div>`).join('')||'<div class="op-dim" style="padding:8px 0">No spend logged.</div>';
  const streamOpts=OP_STREAMS.map(s=>`<option value="${s}">${s}</option>`).join('');
  return `
    <div class="op-panel">
      <div class="op-panel-head">Debt</div>
      <div class="op-debt-bal">${gbp2(bal)}<span class="op-dim"> of ${gbp2(OP_DEBT_START)}</span></div>
      <div class="op-bar"><div class="op-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="op-dim">${pct.toFixed(1)}% paid off · ${gbp2(paid)} killed</div>
      <div class="op-dim" style="margin-top:10px">\u21bb Live from your Debts tab \u2014 log a payment there and this drops automatically.</div>
    </div>
    <div class="op-panel">
      <div class="op-panel-head">Income · this month</div>
      <div class="op-debt-bal">${gbp(monthInc)}<span class="op-dim"> / ${gbp(OP_INCOME_TARGET)} (${incPct}%)</span></div>
      <div class="op-bar"><div class="op-bar-fill" style="width:${Math.min(100,Math.max(0,incPct))}%"></div></div>
      <div class="op-inline">
        <input class="op-input" id="op-inc-amt" type="number" step="0.01" inputmode="decimal" placeholder="Amount"/>
        <select class="op-input" id="op-inc-stream">${streamOpts}</select>
        <input class="op-input" id="op-inc-date" type="date" value="${todayISO()}"/>
        <button class="op-btn" onclick="opAddIncome()">Add</button>
      </div>
      <div class="op-list">${incRows}</div>
    </div>
    <div class="op-panel">
      <div class="op-panel-head">Spend log <span class="op-dim">(£100+)</span></div>
      <div class="op-inline">
        <input class="op-input" id="op-sp-desc" placeholder="Description" style="flex:2"/>
        <input class="op-input" id="op-sp-amt" type="number" step="0.01" inputmode="decimal" placeholder="Amount"/>
        <input class="op-input" id="op-sp-date" type="date" value="${todayISO()}"/>
        <button class="op-btn" onclick="opAddSpend()">Add</button>
      </div>
      <div class="op-list">${spendRows}</div>
    </div>`;
}
async function opSetDebt(v){ const b=parseNum(v); const {error}=await window.db.from('op_debt').upsert({id:1,balance:b,updated_at:new Date().toISOString()},{onConflict:'id'}); if(error){alert('Error: '+error.message);return;} opDebt={id:1,balance:b}; render(); }
async function opAddIncome(){ const amt=parseNum(document.getElementById('op-inc-amt').value); if(!amt){alert('Enter an amount.');return;} const row={date:document.getElementById('op-inc-date').value||todayISO(),stream:document.getElementById('op-inc-stream').value,amount:amt}; const {data,error}=await window.db.from('op_income').insert([row]).select(); if(error){alert('Error: '+error.message);return;} if(data&&data[0])opIncome.unshift(data[0]); render(); }
async function opDeleteIncome(id){ const {error}=await window.db.from('op_income').delete().eq('id',id); if(error){alert('Error');return;} opIncome=(opIncome||[]).filter(x=>String(x.id)!==String(id)); render(); }
async function opAddSpend(){ const amt=parseNum(document.getElementById('op-sp-amt').value); if(!amt){alert('Enter an amount.');return;} const row={date:document.getElementById('op-sp-date').value||todayISO(),description:(document.getElementById('op-sp-desc').value||'').trim()||null,amount:amt}; const {data,error}=await window.db.from('op_spend').insert([row]).select(); if(error){alert('Error: '+error.message);return;} if(data&&data[0])opSpend.unshift(data[0]); render(); }
async function opDeleteSpend(id){ const {error}=await window.db.from('op_spend').delete().eq('id',id); if(error){alert('Error');return;} opSpend=(opSpend||[]).filter(x=>String(x.id)!==String(id)); render(); }

/* ---- Projects ---- */
function renderOpProjects(){
  const order={Active:0,Stalled:1,Dead:2};
  const ps=[...(opProjects||[])].sort((a,b)=>((order[a.status]==null?9:order[a.status])-(order[b.status]==null?9:order[b.status]))||String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  const cards=ps.length?ps.map(p=>{
    const st=p.status||'Active';
    return `<div class="op-proj op-st-${st.toLowerCase()}" onclick="openOpProjectEditor('${p.id}')">
      <div class="op-proj-head"><span class="op-proj-name">${esc(p.name)}</span><span class="op-proj-status st-${st.toLowerCase()}">${st}</span></div>
      <div class="op-proj-next">${p.next_action?('<span class="op-dim">Next:</span> '+esc(p.next_action)):'<span class="op-dim">No next action set</span>'}</div>
      <div class="op-proj-upd op-dim">Updated ${_fmtDay((p.updated_at||'').slice(0,10))}</div>
    </div>`;
  }).join(''):'<div class="op-dim" style="padding:10px 0">No projects yet. Every project needs one of: Active / Stalled / Dead.</div>';
  return `<div class="op-actions"><button class="op-add" onclick="openOpProjectEditor(null)">+ Add project</button></div>${cards}`;
}
function openOpProjectEditor(id){
  window._opProjId=id||null;
  const p=id?(opProjects||[]).find(x=>String(x.id)===String(id)):null;
  const stOpts=['Active','Stalled','Dead'].map(s=>`<option value="${s}"${p&&p.status===s?' selected':''}>${s}</option>`).join('');
  showWorkModal(`<h3 class="work-modal-title">${p?'Edit project':'Add project'}</h3>
    <form id="opp-form" onsubmit="return saveOpProject(event)">
      <label class="work-lbl">Name</label>
      <input class="work-input" id="opp-name" required value="${p?esc(p.name):''}"/>
      <label class="work-lbl">Status</label>
      <select class="work-input" id="opp-status">${stOpts}</select>
      <label class="work-lbl">Next action</label>
      <textarea class="work-input" id="opp-next" rows="2" placeholder="The single next move">${p?esc(p.next_action||''):''}</textarea>
      <div class="work-modal-actions">${p?`<button type="button" class="work-btn-danger" onclick="deleteOpProject('${p.id}')">Delete</button>`:'<span></span>'}<div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary">Save</button></div></div>
    </form>`);
}
async function saveOpProject(ev){ ev.preventDefault(); const name=document.getElementById('opp-name').value.trim(); if(!name){alert('Name required.');return false;} const payload={name,status:document.getElementById('opp-status').value,next_action:document.getElementById('opp-next').value.trim()||null,updated_at:new Date().toISOString()}; const id=window._opProjId; const res=id?await window.db.from('op_projects').update(payload).eq('id',id):await window.db.from('op_projects').insert([payload]); if(res.error){alert('Error: '+res.error.message);return false;} closeWorkModal(); await loadAll(); return false; }
async function deleteOpProject(id){ if(!confirm('Delete this project?'))return; const res=await window.db.from('op_projects').delete().eq('id',id); if(res.error){alert('Error: '+res.error.message);return;} closeWorkModal(); await loadAll(); }

/* ---- Partner check ---- */
function renderOpPartner(){
  const wk=opWeekLabel(todayISO());
  const done=(opPartner||[]).some(p=>p.week_label===wk);
  const hist=[...(opPartner||[])].sort((a,b)=>String(b.week_label).localeCompare(String(a.week_label)));
  const rows=hist.length?hist.map(p=>`<div class="op-panel" onclick="openOpPartnerEditor('${p.id}')" style="cursor:pointer">
      <div class="op-panel-head">${esc(p.week_label)}${p.week_label===wk?' <span class="op-tag">this week</span>':''}</div>
      <div class="op-partner-note">${p.note?esc(p.note):'<span class="op-dim">No note</span>'}</div>
    </div>`).join(''):'<div class="op-dim" style="padding:10px 0">No entries yet.</div>';
  return `<div class="op-actions"><button class="op-add" onclick="openOpPartnerEditor(null)">${done?'Edit this week':'+ Log this week'}</button></div>
    <div class="op-partner-q op-dim">"Did anything happen this week that gave my business partner reason to doubt me?"</div>
    ${rows}`;
}
function openOpPartnerEditor(id){
  const wk=opWeekLabel(todayISO());
  const p=id?(opPartner||[]).find(x=>String(x.id)===String(id)):(opPartner||[]).find(x=>x.week_label===wk);
  window._opPartnerId=p?p.id:null; window._opPartnerWeek=p?p.week_label:wk;
  showWorkModal(`<h3 class="work-modal-title">Partner check · ${window._opPartnerWeek}</h3>
    <form id="opw-form" onsubmit="return saveOpPartner(event)">
      <label class="work-lbl">Did anything give your partner reason to doubt you this week?</label>
      <textarea class="work-input" id="opw-note" rows="4" placeholder="Be honest.">${p?esc(p.note||''):''}</textarea>
      <div class="work-modal-actions">${p?`<button type="button" class="work-btn-danger" onclick="deleteOpPartner('${p.id}')">Delete</button>`:'<span></span>'}<div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary">Save</button></div></div>
    </form>`);
}
async function saveOpPartner(ev){ ev.preventDefault(); const note=document.getElementById('opw-note').value.trim(); const {error}=await window.db.from('op_partner_checks').upsert({week_label:window._opPartnerWeek,note:note||null},{onConflict:'week_label'}); if(error){alert('Error: '+error.message);return false;} closeWorkModal(); await loadAll(); return false; }
async function deleteOpPartner(id){ if(!confirm('Delete this entry?'))return; const res=await window.db.from('op_partner_checks').delete().eq('id',id); if(res.error){alert('Error: '+res.error.message);return;} closeWorkModal(); await loadAll(); }

/* ===================== DAILY BRIEFS ===================== */
/* Three sections: Call · E (the one he reads live on the phone) · Daily brief · Quick check.
 *
 * The Chat sub-tab was REMOVED on 2026-08-10 at Razin's instruction. It was unusable: a long
 * update plus "give me my E brief" made the model spend all 4096 output tokens on tool calls
 * and return no text at all. Chat mode was never the right shape for producing a brief, and it
 * duplicated what he already does in a Cowork chat. The RASNEST sub-tab went at the same time —
 * superseded by the separate RASNEST app.
 *
 * /api/agent stays live: Quick check still posts to it with mode:'check'. The chat-only helpers
 * below (agentBubble, sendAgentMessage, agentVoice, agentUndo, agentQuick) and the rasnest
 * loader are now unreachable from the UI. Left in place deliberately — ripping out ~150 lines of
 * interlinked code in the same deploy as the auth change would make any failure hard to isolate.
 * They are dead code and should be deleted in a follow-up.
 */

var agentSub = agentSub || 'ecall';
var briefState = briefState || { kind:'morning', text:'', loading:false, cached:null, err:null };
var checkState = checkState || { q:'', answer:'', loading:false };
var eBriefState = eBriefState || { text:'', date:'', loading:false, err:null };
var rasnestState = rasnestState || { text:'', loading:false, cached:null, err:null };
// Drafts live in state, not in the DOM — render() rebuilds innerHTML on every tab switch,
// which was silently binning whatever had been typed.
var agentDraft = agentDraft || '';
var checkDraft = checkDraft || '';

function saveAgentDrafts(){
  const i=document.getElementById('ag-input'); if(i) agentDraft=i.value;
  const c=document.getElementById('ag-check-input'); if(c) checkDraft=c.value;
}
function setAgentSub(s){
  saveAgentDrafts();
  agentSub=s; render();
  if(s==='brief' && !briefState.text && !briefState.loading) loadBrief(briefState.kind);
  if(s==='ecall' && !eBriefState.text && !eBriefState.loading) loadEBrief();
}

// Lightweight markdown → HTML. The agent replies in markdown; rendering it raw looked like a terminal.
function agentFmt(s){
  let t = esc(String(s||''));
  t = t.replace(/^### (.*)$/gm,'<b class="ag-h">$1</b>')
       .replace(/^## (.*)$/gm,'<b class="ag-h">$1</b>')
       .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
       .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s).,!?]|$)/g,'$1<em>$2</em>')
       .replace(/`([^`]+)`/g,'<code>$1</code>')
       .replace(/^\s*[-•]\s+(.*)$/gm,'<span class="ag-li">$1</span>')
       .replace(/\n/g,'<br>');
  return t;
}
function agentBubble(m){
  if(m.role==='user') return `<div class="ag-row ag-user"><div class="ag-bub ag-ubub">${agentFmt(m.content)}</div></div>`;
  const tools = (m.tools&&m.tools.length)?`<div class="ag-tools">${[...new Set(m.tools)].map(t=>`<span class="ag-tool">${esc(t)}</span>`).join('')}</div>`:'';
  // Trust layer: the server re-reads every write out of Postgres before replying.
  // A card only shows the tick if the row was actually found. verified===undefined
  // = an older message from before this shipped, so don't imply either way.
  const acts = (m.actions&&m.actions.length)?`<div class="ag-acts">${m.actions.map(a=>{
      const bad = a.verified===false;
      const mark = bad?'<span class="ag-act-x">NOT SAVED</span>':(a.verified===true?'<span class="ag-act-ok">✓</span>':'');
      const where = (a.verified===true&&a.where)?`<span class="ag-act-where">${esc(a.where)}</span>`:'';
      return `<div class="ag-act${bad?' ag-act-bad':''}">${mark}<span class="ag-act-txt">${esc(a.summary||a.tool)}${where}</span>${bad?'':`<button class="ag-undo" onclick="agentUndo('${esc(a.id)}',this)">undo</button>`}</div>`;
    }).join('')}</div>`:'';
  return `<div class="ag-row ag-ai"><div class="ag-avatar">12</div><div class="ag-bub ag-abub">${agentFmt(m.content)}${acts}${tools}</div></div>`;
}

function renderAgent(){
  const LABELS={ecall:'Call · E',brief:'Daily brief',check:'Quick check'};
  const tabs = ['ecall','brief','check'].map(s=>
    `<button class="ag-subtab ${agentSub===s?'on':''}" onclick="setAgentSub('${s}')">${LABELS[s]}</button>`
  ).join('');

  let body='';

  if(agentSub==='brief'){
    const kinds=['morning','evening','week'].map(k=>`<button class="ag-kind ${briefState.kind===k?'on':''}" onclick="loadBrief('${k}')">${k==='week'?'This week':(k==='morning'?'Morning':'Evening')}</button>`).join('');
    let inner;
    if(briefState.loading) inner=`<div class="ag-brief-load"><div class="ag-think"><span></span><span></span><span></span></div><div>Reading your whole operation…</div></div>`;
    else if(briefState.err) inner=`<div class="ag-brief-err">${esc(briefState.err)}</div>`;
    else if(briefState.text) inner=`<div class="ag-brief-body">${agentFmt(briefState.text)}</div>`;
    else inner=`<div class="ag-brief-err">No brief yet — hit refresh.</div>`;
    body=`<div class="ag-brief">
        <div class="ag-brief-bar">
          <div class="ag-kinds">${kinds}</div>
          <button class="ag-refresh" onclick="loadBrief('${briefState.kind}',true)" ${briefState.loading?'disabled':''}>Refresh</button>
        </div>
        ${briefState.cached!==null&&!briefState.loading?`<div class="ag-stamp">${briefState.cached?'cached — today':'freshly generated'}</div>`:''}
        ${inner}
        <div class="ag-brief-foot">Pushed to your phone at 06:05, 13:00 and 21:00.</div>
      </div>`;
  }

  if(agentSub==='ecall'){
    let inner;
    if(eBriefState.loading) inner=`<div class="ag-brief-load"><div class="ag-think"><span></span><span></span><span></span></div><div>Building your call brief…</div></div>`;
    else if(eBriefState.err) inner=`<div class="ag-brief-err">${esc(eBriefState.err)}</div>`;
    else if(eBriefState.text) inner=`<div class="ag-brief-body">${agentFmt(eBriefState.text)}</div>`;
    else inner=`<div class="ag-brief-err">No call brief stored yet. Hit Generate — or it lands automatically each morning.</div>`;
    body=`<div class="ag-brief">
        <div class="ag-brief-bar">
          <div class="ag-kinds"><span class="ag-kind on">Call with E</span></div>
          <button class="ag-refresh" onclick="loadEBrief(true)" ${eBriefState.loading?'disabled':''}>Generate</button>
        </div>
        ${eBriefState.date?`<div class="ag-stamp">brief for ${esc(eBriefState.date)}</div>`:''}
        ${inner}
        <div class="ag-brief-foot">Decisions needed from E · per project done/blocked/next · open loops between you · the unnamed risk · call discipline</div>
      </div>`;
  }

  if(agentSub==='check'){
    const suggestions=['Shall I eat this?','Should I take this call now?','Can I take tonight off?','Is it worth doing this deal?','Should I go gym now or later?'];
    body=`<div class="ag-check">
        <div class="ag-check-h">Quick check</div>
        <p class="ag-check-p">Fast yes/no against today — your deadlines, your targets, the time on the clock. It answers in two lines, not an essay.</p>
        <div class="ag-chips">${suggestions.map(q=>`<button class="ag-chip" onclick="runCheck('${esc(q).replace(/'/g,"\\'")}')">${esc(q)}</button>`).join('')}</div>
        <div class="ag-input-bar ag-check-bar">
          <textarea id="ag-check-input" class="ag-input" rows="1" placeholder="Shall I…?" ${checkState.loading?'disabled':''}>${esc(checkDraft)}</textarea>
          <button class="ag-send" onclick="runCheck()" ${checkState.loading?'disabled':''}>Ask</button>
        </div>
        ${checkState.loading?`<div class="ag-check-a ag-check-loading"><div class="ag-think"><span></span><span></span><span></span></div></div>`:''}
        ${(!checkState.loading&&checkState.answer)?`<div class="ag-check-a">${agentFmt(checkState.answer)}</div>`:''}
      </div>`;
  }

  // The old version printed u.input_tokens alone, which since the prompt-cache fix is almost
  // always a single-digit number — it read as "2 in / 4096 out", which looks broken. The real
  // input is fresh + cache-read + cache-write.
  const u=window._agLastUsage;
  const cost=u?(function(){
    const cr=u.cache_read_tokens||0, cw=u.cache_write_tokens||0;
    const tin=(u.input_tokens||0)+cr+cw;
    const usd=(u.input_tokens||0)/1e6*3+(u.output_tokens||0)/1e6*15+cr/1e6*0.3+cw/1e6*3.75;
    return `<div class="ag-cost">${tin.toLocaleString()} in / ${(u.output_tokens||0).toLocaleString()} out · ~$${usd.toFixed(3)}</div>`;
  })():'';

  list.innerHTML=`<div class="ag-wrap">
    <div class="ag-subnav">${tabs}</div>
    ${body}${cost}
  </div>`;

  const th=document.getElementById('ag-thread'); if(th) th.scrollTop=th.scrollHeight;
  const inp=document.getElementById('ag-input');
  if(inp && !agentBusy){
    inp.focus();
    // put the caret back at the end of the restored draft rather than the start
    try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(e){}
    inp.style.height='auto'; inp.style.height=Math.min(140,inp.scrollHeight)+'px';
    inp.oninput=function(){ agentDraft=this.value; this.style.height='auto'; this.style.height=Math.min(140,this.scrollHeight)+'px'; };
    inp.onkeydown=function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendAgentMessage(); } };
  }
  const ci=document.getElementById('ag-check-input');
  if(ci && !checkState.loading){
    try{ ci.setSelectionRange(ci.value.length, ci.value.length); }catch(e){}
    ci.oninput=function(){ checkDraft=this.value; };
    ci.onkeydown=function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); runCheck(); } };
  }
}

async function loadRasnest(force){
  rasnestState.loading=true; rasnestState.err=null; if(force) rasnestState.text='';
  render();
  try{
    const r=await fetch('/api/brief?kind=rasnest'+(force?'&refresh=1':''));
    const d=await r.json();
    if(!r.ok||d.error){ rasnestState.err=d.error||('HTTP '+r.status); }
    else { rasnestState.text=d.text||''; rasnestState.cached=!!d.cached; }
  }catch(e){ rasnestState.err=e.message; }
  rasnestState.loading=false; render();
}

async function loadEBrief(force){
  eBriefState.loading=true; eBriefState.err=null; if(force) eBriefState.text='';
  render();
  try{
    const r=await fetch('/api/ebrief'+(force?'?generate=1':''));
    const d=await r.json();
    if(!r.ok||d.error){ eBriefState.err=d.error||('HTTP '+r.status); }
    else { eBriefState.text=d.text||''; eBriefState.date=d.date||''; }
  }catch(e){ eBriefState.err=e.message; }
  eBriefState.loading=false; render();
}

function agentQuick(q){ const i=document.getElementById('ag-input'); if(i){ i.value=q; } sendAgentMessage(); }

async function loadBrief(kind, force){
  briefState.kind=kind; briefState.loading=true; briefState.err=null; if(force) briefState.text='';
  render();
  try{
    const r=await fetch('/api/brief?kind='+encodeURIComponent(kind)+(force?'&refresh=1':''));
    const d=await r.json();
    if(!r.ok||d.error){ briefState.err=d.error||('HTTP '+r.status); }
    else { briefState.text=d.text||''; briefState.cached=!!d.cached; }
  }catch(e){ briefState.err=e.message; }
  briefState.loading=false; render();
}

async function runCheck(preset){
  const ci=document.getElementById('ag-check-input');
  const q=(preset||(ci?ci.value:'')||'').trim();
  if(!q||checkState.loading) return;
  checkDraft='';
  checkState.q=q; checkState.loading=true; checkState.answer=''; render();
  try{
    const r=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mode:'check',messages:[{role:'user',content:q}]})});
    const d=await r.json();
    checkState.answer=(!r.ok||d.error)?('⚠ '+(d.error||('HTTP '+r.status))):(d.text||'');
    if(d.usage) window._agLastUsage=d.usage;
  }catch(e){ checkState.answer='⚠ '+e.message; }
  checkState.loading=false; render();
}
async function sendAgentMessage(){
  const inp=document.getElementById('ag-input'); if(!inp) return;
  const text=(inp.value||'').trim(); if(!text || agentBusy) return;
  agentDraft='';
  agentMessages.push({role:'user',content:text});
  agentBusy=true; render();
  try{ await window.db.from('coach_messages').insert({role:'user',content:text}); }catch(e){}
  try{
    const r=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:agentMessages.map(m=>({role:m.role,content:m.content}))})});
    let data={}; try{ data=await r.json(); }catch(e){}
    if(!r.ok || data.error){ agentMessages.push({role:'assistant',content:'⚠ '+(data.error||('HTTP '+r.status))}); }
    else {
      agentMessages.push({role:'assistant',content:data.text,tools:data.toolsUsed,actions:data.actions||[]});
      window._agLastUsage=data.usage;
      try{ await window.db.from('coach_messages').insert({role:'assistant',content:data.text}); }catch(e){}
      // agent changed data — pull it back in so the other tabs are not stale
      if((data.actions||[]).length){ try{ await loadAll(); }catch(e){} }
    }
  }catch(e){ agentMessages.push({role:'assistant',content:'⚠ '+e.message}); }
  agentBusy=false; render();
}
async function agentUndo(actionId, btn){
  if(!actionId) return;
  if(btn){ btn.disabled=true; btn.textContent='…'; }
  try{
    const r=await fetch('/api/agentUndo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actionId})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error){ alert('Undo failed: '+(d.error||('HTTP '+r.status))); if(btn){btn.disabled=false;btn.textContent='undo';} return; }
    // drop the action from the thread so the button can't be pressed twice
    (agentMessages||[]).forEach(m=>{ if(m.actions) m.actions=m.actions.filter(a=>String(a.id)!==String(actionId)); });
    await loadAll();
    render();
  }catch(e){ alert('Undo failed: '+e.message); if(btn){btn.disabled=false;btn.textContent='undo';} }
}
function agentVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ alert('Voice input isn’t supported on this device/browser.'); return; }
  const rec=new SR(); rec.lang='en-GB'; rec.interimResults=false; rec.maxAlternatives=1;
  rec.onresult=function(e){ const tr=e.results[0][0].transcript; const inp=document.getElementById('ag-input'); if(inp){ inp.value=(inp.value?inp.value+' ':'')+tr; inp.focus(); inp.dispatchEvent(new Event('input')); } };
  rec.onerror=function(){}; try{ rec.start(); }catch(e){}
}



/* ═══════════════════════════════════════════════════════════════════════════
   CONTACTS — encrypted at rest (2026-08-17)
   ───────────────────────────────────────────────────────────────────────────
   These are Razin's "special contacts". A password that hides a tab would be
   theatre: src/supabase.js ships the publishable key in plaintext, so anything
   the app can read, anyone with the URL can read straight off the REST API.

   So the records are sealed, not hidden:
     passphrase --PBKDF2(250k, SHA-256, per-install salt)--> AES-256-GCM key
     each record --AES-GCM(random 12-byte IV)--> base64 ciphertext in Postgres

   The passphrase and the derived key live in a module variable for the session
   only. Never written to the database, never to localStorage, never sent
   anywhere. What lands in Postgres is unreadable without the passphrase
   regardless of the API key, the RLS policies, or who gets the URL.

   A wrong passphrase fails on the GCM authentication tag, so it errors cleanly
   instead of producing garbage. contacts_meta holds a "verifier" blob so a wrong
   passphrase can be told apart from an empty list before any contact exists.

   THERE IS NO RESET. Lose the passphrase, lose the records. That is the design.
   ═══════════════════════════════════════════════════════════════════════════ */

var contacts = contacts || [];          // raw rows from Postgres (ciphertext)
var contactsMeta = contactsMeta || null;
var _cKey = null;                        // CryptoKey, session only
var _cOpen = [];                         // decrypted contacts, in memory only
var _cState = { locked: true, busy: false, err: '', q: '', setup: false };
var _cLastTouch = 0;
var CONTACTS_IDLE_MS = 15 * 60 * 1000;   // re-lock after 15 min untouched

function _b64(buf) {
  const b = new Uint8Array(buf); let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function _unb64(s) {
  const raw = atob(String(s || '')); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function _deriveKey(pass, saltB64) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: _unb64(saltB64), iterations: 250000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function _seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
    new TextEncoder().encode(JSON.stringify(obj)));
  return { iv: _b64(iv), payload: _b64(ct) };
}
async function _open(key, ivB64, ctB64) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _unb64(ivB64) }, key, _unb64(ctB64));
  return JSON.parse(new TextDecoder().decode(pt));
}

const CONTACT_VERIFIER = '12world-contacts-ok';

// First run: mint a salt and a verifier blob so future unlocks can be checked.
async function contactsSetPassphrase(pass) {
  const salt = _b64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await _deriveKey(pass, salt);
  const v = await _seal(key, CONTACT_VERIFIER);
  const row = { id: 1, salt, verifier_iv: v.iv, verifier: v.payload };
  const res = await window.db.from('contacts_meta').upsert(row).select();
  if (res.error) throw new Error(res.error.message);
  contactsMeta = row;
  _cKey = key;
  return key;
}

async function contactsUnlock(pass) {
  if (!contactsMeta) return contactsSetPassphrase(pass);
  const key = await _deriveKey(pass, contactsMeta.salt);
  // Throws on a wrong passphrase — AES-GCM verifies its auth tag.
  const v = await _open(key, contactsMeta.verifier_iv, contactsMeta.verifier);
  if (v !== CONTACT_VERIFIER) throw new Error('bad');
  _cKey = key;
  return key;
}

function contactsLock() {
  _cKey = null; _cOpen = []; _cState.locked = true; _cState.err = '';
  const i = document.getElementById('c-pass'); if (i) i.value = '';
  render();
}

async function submitContactPass() {
  const inp = document.getElementById('c-pass');
  const pass = inp ? inp.value : '';
  if (!pass || _cState.busy) return;
  if (!contactsMeta && pass.length < 10) {
    _cState.err = 'First passphrase must be at least 10 characters. There is no reset.';
    render(); return;
  }
  _cState.busy = true; _cState.err = ''; render();
  try {
    await contactsUnlock(pass);
    await decryptAllContacts();
    _cState.locked = false;
    _cLastTouch = Date.now();
  } catch (e) {
    _cState.err = contactsMeta ? 'Wrong passphrase.' : ('Could not set it up: ' + (e.message || e));
    _cKey = null;
  }
  _cState.busy = false;
  render();
}

async function decryptAllContacts() {
  const out = [];
  for (const row of (contacts || [])) {
    try {
      const data = await _open(_cKey, row.iv, row.payload);
      out.push(Object.assign({ id: row.id, label: row.label, sort_order: row.sort_order }, data));
    } catch (e) {
      // A single unreadable row must not take the whole tab down — surface it.
      out.push({ id: row.id, label: row.label, name: '(unreadable — encrypted with a different passphrase)', _broken: true });
    }
  }
  _cOpen = out;
}

async function saveContact() {
  if (!_cKey) return;
  const g = id => (document.getElementById(id) || {}).value || '';
  const data = {
    name: g('c-name').trim(), role: g('c-role').trim(), company: g('c-company').trim(),
    phone: g('c-phone').trim(), email: g('c-email').trim(),
    tags: g('c-tags').trim(), notes: g('c-notes').trim(),
  };
  if (!data.name) { alert('A name is the one thing it needs.'); return; }
  const sealed = await _seal(_cKey, data);
  const id = window._cEditId || ((crypto.randomUUID && crypto.randomUUID()) ||
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const row = {
    id, label: g('c-label').trim() || null,
    iv: sealed.iv, payload: sealed.payload, updated_at: new Date().toISOString(),
  };
  const res = window._cEditId
    ? await window.db.from('contacts').update(row).eq('id', id)
    : await window.db.from('contacts').insert([row]);
  if (res.error) {
    const missing = /contacts/i.test(res.error.message || '');
    alert(missing
      ? 'Contacts are not set up yet.\n\nRun contacts_setup.sql in the Supabase SQL editor, then try again.'
      : 'Could not save: ' + res.error.message);
    return;
  }
  const dlg = document.getElementById('contact-editor'); if (dlg && dlg.close) dlg.close();
  await loadAll();
  if (_cKey) { await decryptAllContacts(); render(); }
}

async function deleteContact() {
  if (!window._cEditId) return;
  if (!confirm('Delete this contact? It cannot be recovered.')) return;
  const res = await window.db.from('contacts').delete().eq('id', window._cEditId);
  if (res.error) { alert('Could not delete: ' + res.error.message); return; }
  const dlg = document.getElementById('contact-editor'); if (dlg && dlg.close) dlg.close();
  await loadAll();
  if (_cKey) { await decryptAllContacts(); render(); }
}

function openContactEditor(id) {
  if (!_cKey) return;
  window._cEditId = id || null;
  const c = id ? _cOpen.find(x => x.id === id) : null;
  const set = (el, v) => { const e = document.getElementById(el); if (e) e.value = v || ''; };
  set('c-name', c && c.name); set('c-role', c && c.role); set('c-company', c && c.company);
  set('c-phone', c && c.phone); set('c-email', c && c.email); set('c-tags', c && c.tags);
  set('c-notes', c && c.notes); set('c-label', c && c.label);
  const t = document.getElementById('contact-editor-title');
  if (t) t.textContent = id ? 'Edit contact' : 'New contact';
  const del = document.getElementById('c-delete-btn');
  if (del) del.style.display = id ? '' : 'none';
  const dlg = document.getElementById('contact-editor');
  if (dlg && dlg.showModal) dlg.showModal();
}

function contactSearch(v) { _cState.q = v; _cLastTouch = Date.now(); renderContacts(); }

function renderContacts() {
  // Idle re-lock. Walking away with the tab open should not leave it readable.
  if (!_cState.locked && _cLastTouch && Date.now() - _cLastTouch > CONTACTS_IDLE_MS) {
    _cKey = null; _cOpen = []; _cState.locked = true;
  }

  if (_cState.locked) {
    const first = !contactsMeta;
    list.innerHTML = `<div class="c-lock">
        <svg viewBox="0 0 40 40" class="c-lock-icon" fill="none"><rect x="8" y="18" width="24" height="18" rx="3" fill="currentColor" opacity="0.85"/><path d="M13 18v-6a7 7 0 0114 0v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        <h2>${first ? 'Set a passphrase' : 'Contacts'}</h2>
        <p class="c-lock-p">${first
          ? 'These records are encrypted before they leave this device. Nothing readable is stored in the database.<br><strong>There is no reset — lose this passphrase and the contacts are gone.</strong>'
          : 'Encrypted. Enter your passphrase to decrypt on this device.'}</p>
        <input type="password" id="c-pass" class="c-pass" placeholder="${first ? 'Choose a passphrase (10+ chars)' : 'Passphrase'}" autocomplete="off" ${_cState.busy ? 'disabled' : ''} />
        <button class="c-unlock" onclick="submitContactPass()" ${_cState.busy ? 'disabled' : ''}>${_cState.busy ? 'Working…' : (first ? 'Set and open' : 'Unlock')}</button>
        ${_cState.err ? `<div class="c-err">${esc(_cState.err)}</div>` : ''}
        ${!first && contacts.length ? `<div class="c-count">${contacts.length} sealed record${contacts.length === 1 ? '' : 's'}</div>` : ''}
      </div>`;
    const i = document.getElementById('c-pass');
    if (i && !_cState.busy) {
      i.addEventListener('keydown', e => { if (e.key === 'Enter') submitContactPass(); });
      i.focus();
    }
    return;
  }

  const q = (_cState.q || '').toLowerCase();
  const shown = _cOpen.filter(c => !q || [c.name, c.role, c.company, c.phone, c.email, c.tags, c.notes]
    .some(v => String(v || '').toLowerCase().includes(q)));

  list.innerHTML = `<div class="c-page">
      <div class="c-bar">
        <input id="c-search" class="c-search" type="search" placeholder="Search contacts…" value="${esc(_cState.q)}" oninput="contactSearch(this.value)" />
        <button class="c-new" onclick="openContactEditor()">+ New</button>
        <button class="c-import" onclick="openContactImport()">Import</button>
        <button class="c-relock" onclick="contactsLock()">Lock</button>
      </div>
      <div class="c-note">Decrypted on this device only · auto-locks after 15 minutes idle</div>
      ${shown.length === 0
        ? `<div class="empty">${_cOpen.length ? 'Nothing matches that.' : 'No contacts yet. Hit <strong>+ New</strong>.'}</div>`
        : shown.map(renderContactCard).join('')}
    </div>`;
}

function renderContactCard(c) {
  const line = [c.role, c.company].filter(Boolean).join(' · ');
  const tags = (c.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  return `<div class="card c-card${c._broken ? ' c-broken' : ''}" onclick="openContactEditor('${esc(c.id)}')">
      <div class="c-card-head">
        <span class="c-name">${esc(c.name || 'Unnamed')}</span>
        ${c.label ? `<span class="c-label">${esc(c.label)}</span>` : ''}
      </div>
      ${line ? `<div class="c-sub">${esc(line)}</div>` : ''}
      <div class="c-contact-lines">
        ${c.phone ? `<a class="c-link" href="tel:${esc(c.phone)}" onclick="event.stopPropagation()">${esc(c.phone)}</a>` : ''}
        ${c.email ? `<a class="c-link" href="mailto:${esc(c.email)}" onclick="event.stopPropagation()">${esc(c.email)}</a>` : ''}
      </div>
      ${tags.length ? `<div class="c-tags">${tags.map(t => `<span class="c-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${c.notes ? `<div class="card-notes">${esc(c.notes)}</div>` : ''}
    </div>`;
}


/* ─── CONTACTS: bulk import ───────────────────────────────────────────────────
 * Claude cannot write contacts on Razin's behalf — they are sealed with a
 * passphrase that never leaves his device, by design. So the import runs here,
 * in the browser, after he has unlocked: parse -> encrypt each -> insert.
 *
 * Format is whatever his Apple Notes list already looks like:
 *   Contacts list:            <- a line ending in ':' becomes the category
 *   Marc - Lawyer             <- "Name - role"
 *   Arif- Rentals             <- missing space is fine
 *   Ash                       <- role optional
 * Checkbox glyphs and bullets are stripped, blank lines ignored.
 * ─────────────────────────────────────────────────────────────────────────── */
function parseContactImport(text) {
  const out = [];
  let cat = '';
  for (const raw of String(text || '').split('\n')) {
    // Strip list bullets and Notes checkbox glyphs from the front.
    const line = raw.replace(/^[\s\-•*○☐☑✓✔•]+/, '').trim();
    if (!line) continue;
    if (/:\s*$/.test(line)) { cat = line.replace(/:\s*$/, '').trim(); continue; }
    let name = line, role = '';
    const m = line.match(/^(.*?)\s*[-–—]\s*(.+)$/);
    if (m && m[1].trim()) { name = m[1].trim(); role = m[2].trim(); }
    if (!name) continue;
    out.push({ name, role, tags: cat });
  }
  return out;
}

function openContactImport() {
  if (!_cKey) return;
  const ta = document.getElementById('ci-text'); if (ta) ta.value = '';
  const p = document.getElementById('ci-preview'); if (p) p.innerHTML = '';
  const dlg = document.getElementById('contact-import');
  if (dlg && dlg.showModal) dlg.showModal();
}

function previewContactImport() {
  const ta = document.getElementById('ci-text');
  const rows = parseContactImport(ta ? ta.value : '');
  const el = document.getElementById('ci-preview');
  if (!el) return;
  if (!rows.length) { el.innerHTML = '<span class="muted">Nothing to import yet.</span>'; return; }
  const cats = [...new Set(rows.map(r => r.tags).filter(Boolean))];
  const dupes = rows.filter(r => _cOpen.some(c => (c.name || '').toLowerCase() === r.name.toLowerCase()));
  el.innerHTML = `<strong>${rows.length}</strong> contact${rows.length === 1 ? '' : 's'}` +
    (cats.length ? ` in ${cats.length} categor${cats.length === 1 ? 'y' : 'ies'}: ${cats.map(esc).join(', ')}` : '') +
    (dupes.length ? `<div class="ci-warn">${dupes.length} already exist by name and will be skipped: ${dupes.slice(0, 6).map(d => esc(d.name)).join(', ')}${dupes.length > 6 ? '…' : ''}</div>` : '');
}

async function runContactImport() {
  if (!_cKey) return;
  const ta = document.getElementById('ci-text');
  const rows = parseContactImport(ta ? ta.value : '');
  if (!rows.length) return;
  const btn = document.getElementById('ci-run');
  if (btn) { btn.disabled = true; btn.textContent = 'Encrypting…'; }

  const fresh = rows.filter(r => !_cOpen.some(c => (c.name || '').toLowerCase() === r.name.toLowerCase()));
  const payload = [];
  for (const r of fresh) {
    const sealed = await _seal(_cKey, {
      name: r.name, role: r.role || '', company: '', phone: '', email: '',
      tags: r.tags || '', notes: '',
    });
    payload.push({
      id: (crypto.randomUUID && crypto.randomUUID()) ||
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      label: null, iv: sealed.iv, payload: sealed.payload,
    });
  }
  // Chunked so a long list does not hit a request size limit halfway and leave
  // Razin guessing which half landed.
  let done = 0;
  for (let i = 0; i < payload.length; i += 50) {
    const res = await window.db.from('contacts').insert(payload.slice(i, i + 50));
    if (res.error) {
      alert('Imported ' + done + ' before failing: ' + res.error.message);
      break;
    }
    done += Math.min(50, payload.length - i);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Import'; }
  const dlg = document.getElementById('contact-import'); if (dlg && dlg.close) dlg.close();
  await loadAll();
  if (_cKey) { await decryptAllContacts(); render(); }
  alert('Imported ' + done + ' contact' + (done === 1 ? '' : 's') +
    (fresh.length < rows.length ? ' (' + (rows.length - fresh.length) + ' skipped as duplicates)' : ''));
}
