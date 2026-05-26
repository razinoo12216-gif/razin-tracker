// Vercel Serverless — /api/check-deadlines (Cron: 0 8 * * *)
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const contactEmail = process.env.VAPID_EMAIL || 'mailto:admin@12world.app';

  if (!supabaseUrl || !supabaseKey || !vapidPublic || !vapidPrivate) return res.status(500).json({ error: 'Missing env vars' });
  webpush.setVapidDetails(contactEmail, vapidPublic, vapidPrivate);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

  const entriesUrl = supabaseUrl + '/rest/v1/entries?select=title,deadline,date&done=eq.false&or=(deadline.eq.' + todayStr + ',deadline.eq.' + tomorrowStr + ',date.eq.' + todayStr + ',date.eq.' + tomorrowStr + ')';
  const entriesResp = await fetch(entriesUrl, { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } });
  const entries = await entriesResp.json().catch(() => []);
  if (!Array.isArray(entries) || entries.length === 0) return res.status(200).json({ message: 'No deadlines', date: todayStr });

  const dueToday = entries.filter(e => (e.deadline || e.date) === todayStr);
  const dueTomorrow = entries.filter(e => (e.deadline || e.date) === tomorrowStr);
  const title = dueToday.length > 0 ? ('Today: ' + dueToday.length + ' task' + (dueToday.length > 1 ? 's' : '') + ' due') : ('Tomorrow: ' + dueTomorrow.length + ' task' + (dueTomorrow.length > 1 ? 's' : '') + ' due');
  const body = (dueToday.length > 0 ? dueToday : dueTomorrow).slice(0, 3).map(e => e.title).join(', ');

  const subsResp = await fetch(supabaseUrl + '/rest/v1/push_subscriptions?select=*', { headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey } });
  const subs = await subsResp.json().catch(() => []);
  if (!Array.isArray(subs) || subs.length === 0) return res.status(200).json({ message: 'No subscribers' });

  const payload = JSON.stringify({ title, body, url: '/?tab=today', tag: 'deadline' });
  let sent = 0; const stale = [];
  await Promise.allSettled(subs.map(async sub => {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload); sent++; }
    catch (err) { if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.endpoint); }
  }));
  for (const ep of stale) {
    await fetch(supabaseUrl + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), {
      method: 'DELETE', headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey },
    }).catch(() => {});
  }
  return res.status(200).json({ sent, deadlines: entries.length, date: todayStr });
}