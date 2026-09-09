// lib/mealEstimate.js — photo calorie logging for 12 World.
//
//   Reached at POST /api/capture with { kind: 'meal', image, mediaType, note?, date? }
//     or                                { kind: 'meal', text, date? }
//     -> { ok, row, label, items, calories, protein, carbs, fats, confidence, assumptions, wrote }
//
// This lives in lib/ rather than api/ ON PURPOSE. Vercel's Hobby plan allows 12 Serverless
// Functions per deployment and the repo was already at 12 — adding api/meal.js made 13 and
// the build failed with exceeded_serverless_functions_per_deployment (2026-09-09). Files under
// lib/ are bundled into the functions that import them and do not count. Meal logging is a
// kind of capture anyway, so /api/capture dispatches to it. DO NOT move this back into api/
// without deleting another endpoint first.
//
// Why this exists (2026-08-28): macro logging already existed on the Gym tab, but it was a
// four-field form asking Razin to arrive already knowing the protein content of his dinner.
// He never used it once — the numbers demanded are exactly the ones a person cannot produce
// while eating. This endpoint moves that work off him: he photographs the plate, this reads it.
//
// The write happens HERE, server-side with the service key, for two reasons:
//   1. daily_macros has RLS on with no anon policy, so the browser client silently reads and
//      writes nothing — an empty array with error:null, indistinguishable from "no meals today".
//      Routing through the service key removes a whole class of silent failure.
//   2. Auto-saving beats a confirm dialog. A confirmation step is one more tap between him and
//      a logged meal, and the tap is where the habit dies. It saves, then shows him what it
//      saved with an Undo. Wrong-and-fixable is better than right-and-never-entered.
//
// Honest about what this is: a calibrated estimate from a photograph. It cannot see oil in the
// pan, it cannot weigh rice, and it guesses portions from plate geometry. Treat it as ±20-25%
// on calories, tighter on protein for identifiable cuts of meat. That is still vastly better
// than the nothing currently being recorded, and the error is consistent enough day to day that
// the TREND is honest even when a single number is not. The model is told to say what it
// assumed so a bad assumption is visible and correctable, not buried.

const MODEL = 'claude-sonnet-5';
export const MAX_IMAGE_BYTES = 4_000_000; // Vercel caps the request body at 4.5MB; the client downscales first.

const SYSTEM = `You estimate the nutritional content of a meal for Razin's personal tracking app.

You will be given a photograph of a meal, a text description, or both. Return ONE JSON object and nothing else — no markdown fence, no prose before or after.

{
  "label": "short name for the meal, max 6 words, e.g. 'Chicken shawarma with rice'",
  "items": [ { "name": "component", "portion": "what you judged it to be, e.g. '200g cooked chicken thigh'", "calories": 0, "protein": 0, "carbs": 0, "fats": 0 } ],
  "calories": 0, "protein": 0, "carbs": 0, "fats": 0,
  "confidence": "high" | "medium" | "low",
  "assumptions": "one sentence naming the biggest thing you had to guess, usually portion size or cooking fat. Say the actual number you assumed.",
  "question": "optional — ONE short question that would most improve the estimate, or null"
}

Rules:
- The top-level calories/protein/carbs/fats are the totals for the whole meal, in kcal and grams. They must be the sum of the items.
- Judge portions from context in the photo: plate and bowl diameter, cutlery, hands, cans and bottles. A dinner plate is about 27cm. Say what you concluded in "assumptions".
- Count the cooking fat. Restaurant and takeaway food carries far more oil than the same dish cooked at home — if it looks fried, glossy or takeaway-packaged, price that in.
- Do not round to comfortable numbers. 780 is a better answer than 800 if 780 is what you think.
- Be honest with "confidence". A clear photo of a simple plate is high. A dark photo, a stew, a mixed curry, anything where the contents are hidden or the portion is ambiguous is low. Low confidence is useful information, not a failure.
- If a text description conflicts with the photo, the text wins — he was there and you were not.
- If you genuinely cannot tell that this is food, set every number to 0, confidence "low", and put the reason in "assumptions".
- Never refuse and never lecture him about what he is eating. You are a measuring instrument, not a coach.`;

// The schema is enforced by the API rather than parsed out of prose. Free-text JSON failed in
// production on 2026-09-09 — an item name contained a character that broke the array and Razin
// got "Expected ',' or ']' after array element in JSON at position 524" instead of his breakfast.
// A forced tool call cannot produce malformed JSON, so that class of failure is gone rather than
// handled. jsonFrom() survives below purely as a fallback for a reply with no tool block.
const NUM = { type: 'number' };
const TOOL = {
  name: 'log_meal',
  description: 'Record the nutritional estimate for this meal. Always call this exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      label: { type: 'string', description: 'Short name for the meal, max 6 words.' },
      items: {
        type: 'array',
        description: 'One entry per component of the meal.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            portion: { type: 'string', description: 'The portion you judged it to be, e.g. "200g cooked chicken thigh".' },
            calories: NUM, protein: NUM, carbs: NUM, fats: NUM,
          },
          required: ['name', 'calories'],
        },
      },
      calories: NUM, protein: NUM, carbs: NUM, fats: NUM,
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      assumptions: { type: 'string', description: 'One sentence naming the biggest thing you had to guess, with the actual number you assumed.' },
      question: { type: 'string', description: 'Optional: the ONE short question that would most improve the estimate.' },
    },
    required: ['label', 'items', 'calories', 'protein', 'carbs', 'fats', 'confidence', 'assumptions'],
  },
};

export function jsonFrom(text) {
  // The model is told to return bare JSON, but a stray fence or a sentence of preamble must not
  // cost him a logged meal. Take the outermost braces and parse that.
  const s = String(text || '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a === -1 || b === -1 || b <= a) throw new Error('no JSON in model reply');
  return JSON.parse(s.slice(a, b + 1));
}

export const N = (x) => {
  const n = parseFloat(String(x == null ? 0 : x).replace(/[^0-9.\-]/g, ''));
  return !isFinite(n) || n < 0 ? 0 : Math.round(n * 10) / 10;
};

export function todayLondon() {
  // Never toISOString() — it is UTC, and a 00:30 London meal in summer would land on yesterday.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}


// Estimates a meal and writes it. Returns { status, body } for the caller to send.
export async function estimateAndLogMeal(input, env) {
  const note = String(input.note || input.text || '').trim().slice(0, 500);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date || '')) ? input.date : todayLondon();

  let image = String(input.image || '');
  if (image.startsWith('data:')) image = image.slice(image.indexOf(',') + 1); // tolerate a full data URL
  image = image.replace(/\s/g, '');
  const mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(input.mediaType) ? input.mediaType : 'image/jpeg';

  if (!image && !note) return { status: 400, body: { error: 'Send a photo or a description.' } };
  if (image && image.length > MAX_IMAGE_BYTES) return { status: 413, body: { error: 'Photo too large after compression — try again.' } };

  // ---- estimate ----
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: image } });
  content.push({
    type: 'text',
    text: image
      ? (note ? `Estimate this meal. Razin adds: "${note}"` : 'Estimate this meal.')
      : `Estimate this meal from the description alone — there is no photo, so lean toward "medium" or "low" confidence and say what portion you assumed: "${note}"`,
  });

  async function askOnce() {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.anthropic, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1024, system: SYSTEM,
        tools: [TOOL], tool_choice: { type: 'tool', name: 'log_meal' },
        messages: [{ role: 'user', content }],
      }),
    });
    if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + (await r.text()).slice(0, 300));
    const d = await r.json();
    const call = (d.content || []).find((c) => c.type === 'tool_use' && c.name === 'log_meal');
    // The forced tool call is the normal path. The text fallback only matters if the API ever
    // returns prose anyway — better a salvaged meal than a lost one.
    const out = call ? call.input : jsonFrom((d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''));
    out._usage = d.usage || null;
    return out;
  }

  let est;
  try {
    est = await askOnce();
  } catch (e1) {
    // One silent retry. A single bad generation should cost him a second, not a meal.
    try {
      est = await askOnce();
    } catch (e2) {
      // Never show him a JSON parser message — "Expected ',' or ']' at position 524" is not
      // something a person eating breakfast can act on. Log the detail, show a human sentence.
      console.error('meal estimate failed twice:', e1 && e1.message, '|', e2 && e2.message);
      return { status: 502, body: { error: "Could not read that one — try again, or type what it was." } };
    }
  }

  const items = Array.isArray(est.items) ? est.items.slice(0, 20) : [];
  const rec = {
    date,
    calories: N(est.calories), protein: N(est.protein), carbs: N(est.carbs), fats: N(est.fats),
    label: String(est.label || 'Meal').slice(0, 120),
    items,
    source: image ? 'photo' : 'text',
    confidence: ['high', 'medium', 'low'].includes(est.confidence) ? est.confidence : 'medium',
    assumptions: String(est.assumptions || '').slice(0, 400),
    notes: note || null,
  };

  // Nothing recognised as food is a real outcome — say so rather than writing a row of zeros
  // that quietly drags his daily average down.
  if (!rec.calories && !rec.protein && !rec.carbs && !rec.fats) {
    return { status: 200, body: { ok: false, wrote: false, ...rec, question: est.question || null,
      error: rec.assumptions || 'Could not tell what that was — try a clearer photo or type it.' } };
  }

  // ---- write, then re-read it out of Postgres before claiming anything ----
  const base = env.url.replace(/\/$/, '') + '/rest/v1/';
  const H = { apikey: env.key, Authorization: 'Bearer ' + env.key, 'content-type': 'application/json' };
  let row = null;
  try {
    const w = await fetch(base + 'daily_macros', {
      method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(rec),
    });
    if (!w.ok) throw new Error('insert ' + w.status + ' ' + (await w.text()).slice(0, 300));
    const back = await w.json();
    const id = Array.isArray(back) && back[0] ? back[0].id : null;
    if (!id) throw new Error('insert returned no id');

    // The trust layer rule: a write is not a write until it has been read back out.
    const v = await fetch(base + 'daily_macros?id=eq.' + encodeURIComponent(id) + '&select=*', { headers: H });
    const got = v.ok ? await v.json() : [];
    row = Array.isArray(got) && got[0] ? got[0] : null;
    if (!row) throw new Error('row did not read back after insert');
  } catch (e) {
    return { status: 200, body: { ok: false, wrote: false, ...rec, question: est.question || null,
      error: 'Estimated it but could not save: ' + (e.message || 'write failed') } };
  }

  return { status: 200, body: {
    ok: true, wrote: true, row,
    label: rec.label, items, calories: rec.calories, protein: rec.protein, carbs: rec.carbs, fats: rec.fats,
    confidence: rec.confidence, assumptions: rec.assumptions, question: est.question || null,
    usage: est._usage,
  } };
}
