// Vercel Serverless — /api/check-deadlines
//   default (Vercel daily cron): morning agenda of today's timed tasks
//   ?mode=reminders (external cron every ~5 min): push ~1h before each timed task
import webpush from 'web-push';

function recurrenceMatches(recurrence, dayISO) {
  if (!recurrence || recurrence === 'none') return false;
  if (recurrence.startsWith('monthly-')) {
    return parseInt(dayISO.split('-')[2], 10) === parseInt(recurrence.split('-')[1], 10);
  }
  const p = dayISO.split('-');
  const dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  return recurrence.split(/[ ,]+/).map(Number).includes(dow);
}

function londonParts() {
  const out = {};
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  for (const p of fmt.formatToParts(new Date())) out[p.type] = p.value;
  return out;
}

async function getSubs(url, headers) {
  const r = await fetch(url + '/rest/v1/push_subscriptions?select=*', { headers });
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j : [];
}

async function sendAll(subs, payload, stale) {
  let count = 0;
  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      count++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.endpoint);
    }
  }));
  return count;
}

async function cleanStale(url, headers, stale) {
  for (const ep of stale) {
    await fetch(url + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE', headers }).catch(() => {});
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const contactEmail = process.env.VAPID_EMAIL || 'mailto:admin@12world.app';
  if (!supabaseUrl || !supabaseKey || !vapidPublic || !vapidPrivate) return res.status(500).json({ error: 'Missing env vars' });

  const mode = (req.query && req.query.mode) || 'agenda';
  const secret = process.env.CRON_SECRET;
  if (mode === 'reminders' && secret) {
    const provided = (req.query && req.query.key) || (req.headers.authorization || '').replace('Bearer ', '');
    if (provided !== secret) return res.status(401).json({ error: 'Unauthorized' });
  }

  webpush.setVapidDetails(contactEmail, vapidPublic, vapidPrivate);
  const headers = { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey };

  const lp = londonParts();
  const todayStr = lp.year + '-' + lp.month + '-' + lp.day;
  const nowMinutes = parseInt(lp.hour, 10) * 60 + parseInt(lp.minute, 10);

  const tResp = await fetch(supabaseUrl + '/rest/v1/tasks?select=id,title,time,done,day,recurrence&done=eq.false', { headers });
  const allTasks = await tResp.json().catch(() => []);
  if (!Array.isArray(allTasks)) return res.status(200).json({ message: 'Tasks not readable' });

  const timedToday = allTasks.filter((t) =>
    t.time && /^\d{1,2}:\d{2}/.test(t.time) && ((t.day === todayStr) || recurrenceMatches(t.recurrence, todayStr))
  );

  if (mode === 'reminders') {
    const due = timedToday.filter((t) => {
      const hm = t.time.split(':');
      const mins = (parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10)) - nowMinutes;
      return mins >= 55 && mins < 60;
    });
    if (due.length === 0) return res.status(200).json({ message: 'Nothing due', todayStr, nowMinutes, taskCount: allTasks.length, timedToday: timedToday.length });
    const subs = await getSubs(supabaseUrl, headers);
    if (!subs.length) return res.status(200).json({ message: 'No subscribers' });
    let sent = 0;
    const stale = [];
    for (const t of due) {
      const payload = JSON.stringify({ title: 'In 1 hour — ' + t.title, body: t.time + ' · ' + t.title, url: '/?tab=today', tag: 'task-' + t.id });
      sent += await sendAll(subs, payload, stale);
    }
    await cleanStale(supabaseUrl, headers, stale);
    return res.status(200).json({ sent, reminders: due.length, tasks: due.map((t) => t.title) });
  }

  // agenda mode
  if (timedToday.length === 0) return res.status(200).json({ message: 'No timed tasks today', date: todayStr, taskCount: allTasks.length });
  const lines = timedToday.sort((a, b) => a.time.localeCompare(b.time)).map((t) => t.time + '  ' + t.title);
  const title = "Today's plan — " + lines.length + ' timed task' + (lines.length > 1 ? 's' : '');
  const body = lines.slice(0, 6).join('\n') + (lines.length > 6 ? '\n+' + (lines.length - 6) + ' more' : '');
  const subs = await getSubs(supabaseUrl, headers);
  if (!subs.length) return res.status(200).json({ message: 'No subscribers' });
  const stale = [];
  const sent = await sendAll(subs, JSON.stringify({ title, body, url: '/?tab=today', tag: 'agenda' }), stale);
  await cleanStale(supabaseUrl, headers, stale);
  return res.status(200).json({ sent, tasks: lines.length, date: todayStr });
}
