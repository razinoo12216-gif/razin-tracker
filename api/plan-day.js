// Vercel Serverless Function — /api/plan-day
// Fetches prayer times, calls Anthropic Claude, returns a time-blocked day plan.
// Required env var: ANTHROPIC_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tasks = [], city = 'London', country = 'GB', date } = req.body || {};

  let prayers = {};
  try {
    const todayStr = date || new Date().toLocaleDateString('en-GB').split('/').join('-');
    const pRes = await fetch(
      `https://api.aladhan.com/v1/timingsByCity/${todayStr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`
    );
    const pData = await pRes.json();
    const t = pData?.data?.timings || {};
    prayers = { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
  } catch (e) { console.error('Prayer times fetch failed:', e); }

  const taskList = tasks.length
    ? tasks.map((t, i) => `${i + 1}. ${t.title}${t.priority ? ` [Priority: ${t.priority}]` : ''}${t.duration ? ` (~${t.duration} min)` : ''}${t.location ? ` [Needs: ${t.location}]` : ''}${t.notes ? ` — ${t.notes}` : ''}`).join('\n')
    : 'No tasks specified — build a productive default structure.';

  const prayerBlock = Object.entries(prayers).length
    ? Object.entries(prayers).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'Not available';

  const prompt = `You are an elite operations advisor building a time-blocked day plan for a 24-year-old self-employed Muslim businessman in London.

FIXED CONSTRAINTS:
- Gym: must be done before 9:00 AM
- Prayer times for today (${city}): ${prayerBlock}
- Each salah needs ~15-20 min block including wudu and the prayer itself
- Work day runs roughly 8 AM to 8 PM

TODAY'S TASKS:
${taskList}

INSTRUCTIONS:
- Build a realistic, tight time-blocked schedule from ~5:30 AM to ~10:30 PM
- Group admin tasks together where possible
- Insert prayer blocks using the exact times above
- Mark HIGH priority tasks in morning peak hours (9 AM to 12 PM)
- Include a 30-min lunch break around 1-2 PM
- Include wind-down time after Isha for planning tomorrow
- Output ONLY the schedule as a JSON array, no extra text, in this format:
[
  { "time": "05:30", "end": "06:00", "label": "Fajr + Morning Dhikr", "type": "prayer" },
  { "time": "06:00", "end": "07:30", "label": "Gym", "type": "gym" }
]
Types: "prayer" | "gym" | "work" | "admin" | "travel" | "break" | "personal"`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars' });

  let schedule = [];
  try {
    const aRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    });
    const aData = await aRes.json();
    const raw = aData?.content?.[0]?.text || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    schedule = match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error('Anthropic call failed:', e);
    return res.status(500).json({ error: 'AI call failed: ' + e.message });
  }

  return res.status(200).json({ schedule, prayers });
}