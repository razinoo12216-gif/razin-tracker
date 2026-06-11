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
  try { const {data:_dm} = await window.db.from('daily_macros').select('*').order('date',{ascending:false}); dailyMacros = _dm || []; } catch(_e) {}
  try { const {data:_rv} = await window.db.from('debts').select('*').or('type.eq.receivable,type.is.null').order('created_at',{ascending:false}); receivables = _rv || []; } catch(_e) {}
  try { const {data:_nts} = await window.db.from('user_notes').select('*').order('created_at',{ascending:false}); userNotes = _nts || []; } catch(_e) {}
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
  if(!['today','drive','review','invoice','ticket','debt','gym','project','potential','expense','notes'].includes(activeTab))activeTab='today';
  // Month-scoped: expenses use month filter; projects are ongoing (not month-scoped)
  const moneyEntries = entries.filter((e) => e.type !== 'potential');
  const inMonth = moneyEntries.filter((e) => matchesMonth(e, selectedMonth));
  const projectsInMonth = entries.filter((e) => e.type === 'project' && matchesMonth(e, selectedMonth));
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
  if (activeTab === 'notes') return renderNotes();

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
  const aFocus = a.priority === 'focus';
  const bFocus = b.priority === 'focus';
  if (aFocus !== bFocus) return aFocus ? -1 : 1;
  return parseNum(b.current_balance) - parseNum(a.current_balance);
}

function renderDebtTotals() {
  clearTotalSpanClasses();
  if (window._debtView === 'owed') {
    setTotalsLabels(['Total owed to me', 'Collected', 'Outstanding', 'Active']);
    const act = (receivables || []).filter((r) => r.status !== 'paid');
    const totalOwed = act.reduce((s, r) => s + parseNum(r.original_amount), 0);
    const collected = act.reduce((s, r) => s + Math.max(0, parseNum(r.original_amount) - parseNum(r.current_balance)), 0);
    const outstanding = act.reduce((s, r) => s + parseNum(r.current_balance), 0);

    const owedEl = $('#t-rev');
    owedEl.textContent = fmt(totalOwed);
    if (totalOwed > 0) owedEl.classList.add('pos');

    $('#t-exp').textContent = fmt(collected);

    const outEl = $('#t-net');
    outEl.textContent = fmt(outstanding);
    if (outstanding > 0) outEl.classList.add('neg');

    $('#t-count').textContent = String(act.length);
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
  const totalOwed = act.reduce((s,r) => s + parseNum(r.current_balance), 0);
  const totalOrig = act.reduce((s,r) => s + parseNum(r.original_amount), 0);
  const totalCollected = Math.max(0, totalOrig - totalOwed);
  const summary = `<div class="debt-summary-card"><span class="debt-summary-total">${fmt(totalOwed)}</span> outstanding across ${act.length} entr${act.length===1?'y':'ies'}<br><span style="color:#34d399">£${totalCollected.toFixed(2)} collected so far</span></div>`;
  const cards = act.map(r => {
    const name = r.creditor || 'Unknown';
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
      ${rPayments.length > 0 ? `<div class="debt-meta"><span>${rPayments.length} payment${rPayments.length !== 1 ? 's' : ''}</span>${lastPay ? `<span>Last: ${lastPay.date}</span>` : ''}</div>` : ''}
      ${!isSettled ? `<button type="button" class="debt-pay-btn" style="background:rgba(52,211,153,0.12);color:#34d399;border:1px solid rgba(52,211,153,0.25)" onclick="event.stopPropagation();logReceivablePayment('${r.id}')">+ Log payment received</button>` : ''}
    </div>`;
  }).join('');
  return summary + cards + '<button class="add-btn" style="margin-top:12px" onclick="openReceivableEditor(null)">+ Add</button>';
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
  if (existing) {
    document.getElementById('rv-name').value = existing.creditor || '';
    document.getElementById('rv-amount').value = existing.original_amount || '';
  }
}
async function saveReceivableEditor() {
  var name = (document.getElementById('rv-name') || {}).value || '';
  var amount = parseFloat((document.getElementById('rv-amount') || {}).value) || 0;
  if (!name || !amount) { alert('Name and amount are required.'); return; }
  var id = window._rvEditId;
  var payload = { creditor: name, original_amount: amount, current_balance: amount, type: 'receivable', status: 'active' };
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
  const toggle = `<div class="ticket-type-filter"><button class="ticket-filter active" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button></div>`;
  const chKey  = localStorage.getItem('ch_api_key') || '';
  list.innerHTML = `<div class="work-header-bar">${toggle}<button class="work-fab" onclick="openWorkCompanyEditor()">+ Company</button></div><div class="work-ch-bar"><span class="work-ch-label">CH API Key</span><input type="password" id="ch-key-input" value="${esc(chKey)}" placeholder="Your Companies House API key"/><button class="work-ch-save" onclick="saveCHKey()">Save</button></div>${companies.length === 0 ? '<div class="empty">No companies yet. Hit <strong>+ Company</strong> to add one.</div>' : ''}<div class="work-companies-grid">${companies.map(c => renderWorkCompanyCard(c)).join('')}</div>`;
}

// PATCH D: new invoices view
function renderWorkInvoicesView() {
  const toggle = `<div class="ticket-type-filter"><button class="ticket-filter" onclick="workView='companies';renderWork()">Companies</button><button class="ticket-filter active" onclick="workView='invoices';renderWork()">Invoices</button><button class="ticket-filter" onclick="workView='travel';renderWork()">Travel</button></div>`;
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
  return `<div class="card work-company-card" style="border-left:3px solid ${col}" onclick="openWorkCompanyEditor('${c.id}')"><div class="work-co-head"><span class="work-co-name">${esc(c.name)}</span><span class="work-owner-badge" style="color:${col};border-color:${col}">${owner}</span></div>${meta.company_number?`<div class="work-ch-ref">CH: ${esc(meta.company_number)}</div>`:''}<div class="work-due-row"><span class="work-due-lbl">Accounts due</span>${accBdg}</div><div class="work-due-row"><span class="work-due-lbl">Conf. statement</span>${conBdg}</div>${meta.rent?`<div class="work-due-row"><span class="work-due-lbl">Rent</span><span class="work-days-badge work-badge-ok">£${esc(String(meta.rent))}</span></div>`:``}${meta.salary?`<div class="work-due-row"><span class="work-due-lbl">Salary</span><span class="work-days-badge work-badge-ok">£${esc(String(meta.salary))}</span></div>`:``}</div>`;
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
  showWorkModal(`<h3 class="work-modal-title">${c ? 'Edit Company' : 'New Company'}</h3><form id="work-company-form"><label class="work-lbl">Company Name</label><input class="work-input" name="name" required value="${c?esc(c.name):''}" placeholder="Company Ltd"/><label class="work-lbl">Ownership</label><select class="work-input" name="status"><option value="raz"${(c&&c.status)==='raz'?' selected':''}>Raz (Mine)</option><option value="partial"${(c&&c.status)==='partial'?' selected':''}>Partial</option><option value="other"${!c||(c&&c.status)==='other'?' selected':''}>Other</option></select><label class="work-lbl">Companies House Number</label><div class="work-ch-lookup-row"><input class="work-input" name="company_number" id="work-ch-num" value="${esc(meta.company_number||'')}" placeholder="e.g. 12345678"/><button type="button" class="work-btn-ghost" onclick="doWorkCHLookup()">Look up</button></div><div class="work-row-2"><div><label class="work-lbl">Accounts Due</label><input class="work-input" type="date" name="accounts_due" id="work-accounts-due" value="${meta.accounts_due||''}"/></div><div><label class="work-lbl">Conf. Statement Due</label><input class="work-input" type="date" name="confirmation_due" id="work-confirm-due" value="${meta.confirmation_due||''}"/></div></div><div class="work-row-2"><div><label class="work-lbl">Monthly Rent (£)</label><input class="work-input" type="number" name="rent" value="${meta.rent||''}" placeholder="0"/></div><div><label class="work-lbl">Monthly Salary (£)</label><input class="work-input" type="number" name="salary" value="${meta.salary||''}" placeholder="0"/></div></div><label class="work-lbl">Notes</label><textarea class="work-input" name="company_notes" rows="2">${esc(meta.notes||'')}</textarea><div class="work-modal-actions">${c?`<button type="button" class="work-btn-danger" onclick="deleteWorkItem('${c.id}','company')">Delete</button>`:'<span></span>'}<div class="work-modal-right"><button type="button" class="work-btn-ghost" onclick="closeWorkModal()">Cancel</button><button type="submit" class="work-btn-primary" id="work-co-submit">Save</button></div></div></form>`);
  document.getElementById('work-company-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const name = (fd.get('name')||'').trim(); if (!name) return;
    const notes = JSON.stringify({ company_number: (fd.get('company_number')||'').trim(), accounts_due: fd.get('accounts_due')||null, confirmation_due: fd.get('confirmation_due')||null, rent: (fd.get('rent')||'').trim()||null, salary: (fd.get('salary')||'').trim()||null, notes: (fd.get('company_notes')||'').trim() });
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

  const todayISO = () => new Date().toISOString().split("T")[0];
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
}async function registerPush() {
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
