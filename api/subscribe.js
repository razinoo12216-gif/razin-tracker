// Vercel Serverless — /api/subscribe
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscription } = req.body || {};
  if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Missing subscription' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase env vars not set' });

  const resp = await fetch(supabaseUrl + '/rest/v1/push_subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys && subscription.keys.p256dh,
      auth: subscription.keys && subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!resp.ok) { const err = await resp.text(); return res.status(500).json({ error: err }); }
  return res.status(200).json({ ok: true });
}