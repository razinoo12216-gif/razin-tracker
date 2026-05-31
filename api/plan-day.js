// Vercel Serverless Function — /api/plan-day
// Fetches prayer times, calls Anthropic Claude, returns a time-blocked day plan.
// Required env var: ANTHROPIC_API_KEY

function subtractMinutes(timeStr, mins) {
  if (!timeStr) return '05:00';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tasks = [], city = 'London', country = 'GB', date } = req.body || {};

  // 1. Fetch prayer times from Aladhan
  let prayers = {};
  try {
    let todayStr;
    if (date) {
      const parts = date.split('-');
      todayStr = parts[2] + '-' + parts[1] + '-' + parts[0]; // YYYY-MM-DD -> DD-MM-YYYY
    } else {
      todayStr = new Date().toLocaleDateString('en-GB').split('/').join('-');
    }
    const pRes = await fetch(
      'https://api.aladhan.com/v1/timingsByCity/' + todayStr + '?city=' + encodeURIComponent(city) + '&country=' + encodeURIComponent(country) + '&method=2'
    );
    const pData = await pRes.json();
    const t = pData && pData.data && pData.data.timings || {};
    prayers = { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
  } catch (e) {
    console.error('Prayer times fetch failed:', e);
  }

  // 2. Compute wake time (25 min before Fajr) and bedtime
  const wakeTime = subtractMinutes(prayers.Fajr, 25);
  const bedTime = '22:30';

  // 3. Format task list — high priority first
  const highPri = tasks.filter(function(t) { return t.priority === 'high'; });
  const normalPri = tasks.filter(function(t) { return t.priority !== 'high'; });
  const ordered = highPri.concat(normalPri);

  const taskList = ordered.length
    ? ordered.map(function(t, i) {
        return (i + 1) + '. ' + t.title +
          (t.priority === 'high' ? ' [HIGH PRIORITY]' : '') +
          (t.notes ? ' — ' + t.notes : '');
      }).join('\n')
    : 'No tasks — build a solid default structure for a productive Muslim businessman.';

  // 4. Build the prompt
  const prompt = 'You are an elite personal operations advisor. Build a precise, realistic time-blocked day plan.\n\n' +
    'PERSON: 24-year-old self-employed Muslim businessman, London.\n' +
    'SCHEDULE WINDOW: ' + wakeTime + ' (wake) to ' + bedTime + ' (sleep)\n\n' +
    'PRAYER SCHEDULE — NON-NEGOTIABLE, use exact times:\n' +
    'Fajr: ' + (prayers.Fajr || 'N/A') + ' | Dhuhr: ' + (prayers.Dhuhr || 'N/A') + ' | Asr: ' + (prayers.Asr || 'N/A') + ' | Maghrib: ' + (prayers.Maghrib || 'N/A') + ' | Isha: ' + (prayers.Isha || 'N/A') + '\n' +
    'Each prayer block = 20 min (wudu + salah + dhikr). Type: "prayer"\n\n' +
    'FIXED BLOCKS:\n' +
    '- ' + wakeTime + ': Wake, Fajr prep\n' +
    '- Before 09:00: GYM — 60-90 min. Type: "gym"\n' +
    '- ~13:00: Lunch 30 min. Type: "break"\n' +
    '- After Isha: Plan tomorrow + wind-down. Type: "personal"\n' +
    '- ' + bedTime + ': Sleep\n\n' +
    'TODAY's TASK LIST (' + tasks.length + ' tasks — EVERY task MUST appear in the schedule):\n' +
    taskList + '\n\n' +
    'SCHEDULING RULES:\n' +
    '1. HIGH PRIORITY tasks go in 09:00-12:00 morning peak\n' +
    '2. Admin tasks (calls, emails, chasing, invoices) group into ADMIN blocks — use actual task names. Type: "admin"\n' +
    '3. Deep work / business tasks — use real task name as label. Type: "work"\n' +
    '4. Travel if a task needs it. Type: "travel"\n' +
    '5. Reading, learning, planning. Type: "personal"\n' +
    '6. NEVER use generic labels like "Work Block" or "Admin Time" — use the real task name\n' +
    '7. Multiple short tasks in one block: "Chase invoice + Reply supplier + Update CRM"\n' +
    '8. Be realistic — do not compress 8 hours of work into 4 hours\n\n' +
    'Output ONLY a valid JSON array, zero other text:\n' +
    '[\n' +
    '  { "time": "HH:MM", "end": "HH:MM", "label": "exact activity name", "type": "prayer|gym|work|admin|travel|break|personal" }\n' +
    ']';

  // 5. Call Anthropic API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars' });

  let schedule = [];
  try {
    const aRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const aData = await aRes.json();
    const raw = aData && aData.content && aData.content[0] && aData.content[0].text || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    schedule = match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error('Anthropic call failed:', e);
    return res.status(500).json({ error: 'AI call failed: ' + e.message });
  }

  return res.status(200).json({ schedule, prayers });
}
