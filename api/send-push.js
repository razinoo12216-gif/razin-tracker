// Vercel Serverless — /api/send-push
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { title, body, url = '/', tag } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const contactEmail = process.env.VAPID_EMAIL || 'mailto:admin@12world.app';

  if (!supabaseUrl || !supabaseKey || !vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'Missing env vars' });
  }
  webpush.setVapidDetails(contactEmail, vapidPublic, vapidPrivate);

  const subsResp = await fetch(supabaseUrl + '/rest/v1/push_subscriptions?select=*', {
    headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey },
  });
  const subs = await subsResp.json();
  if (!Array.isArray(subs) || subs.length === 0) return res.status(200).json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url, tag });
  let sent = 0; let failed = 0; const stale = [];
  await Promise.allSettled(subs.map(async sub => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.endpoint);
    }
  }));
  for (const ep of stale) {
    await fetch(supabaseUrl + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), {
      method: 'DELETE', headers: { 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey },
    }).catch(() => {});
  }
  return res.status(200).json({ sent, failed, cleaned: stale.length });
}