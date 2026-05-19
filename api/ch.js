export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-ch-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { n } = req.query;
  const key = req.headers['x-ch-key'];
  if (!n) return res.status(400).json({ error: 'Missing company number' });
  if (!key) return res.status(400).json({ error: 'Missing API key' });
  try {
    const r = await fetch(
      'https://api.company-information.service.gov.uk/company/' + encodeURIComponent(n.trim()),
      { headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') } }
    );
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
