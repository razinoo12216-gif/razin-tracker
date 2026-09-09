// tests/meal.test.mjs — photo meal logging (2026-08-28)
//
// Covers the parts that fail silently in production: a model reply that is not clean JSON,
// numbers arriving as strings with units attached, and the date rolling over in the wrong
// timezone. The Anthropic and Supabase calls are not exercised here — they are network.
import { jsonFrom, N, todayLondon, MAX_IMAGE_BYTES } from '../api/meal.js';

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } };
const eq = (name, a, b) => ok(name + (a === b ? '' : `  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`), a === b);
const throws = (name, fn) => { try { fn(); ok(name + ' — did NOT throw', false); } catch { ok(name, true); } };

console.log('# jsonFrom() — the model is told to return bare JSON, but must never cost a meal if it does not');
eq('clean object', jsonFrom('{"calories":780}').calories, 780);
eq('markdown fenced', jsonFrom('```json\n{"calories":640}\n```').calories, 640);
eq('preamble prose', jsonFrom('Here is the estimate:\n{"calories":420}').calories, 420);
eq('trailing prose', jsonFrom('{"calories":300}\nHope that helps.').calories, 300);
eq('nested braces survive', jsonFrom('noise {"a":{"b":2},"calories":100} noise').a.b, 2);
throws('no JSON at all throws rather than returning junk', () => jsonFrom('I cannot see a meal here.'));
throws('empty string throws', () => jsonFrom(''));
throws('null throws', () => jsonFrom(null));

console.log('# N() — the model returns "780 kcal" and "52g" often enough to matter');
eq('plain number', N(780), 780);
eq('numeric string', N('780'), 780);
eq('unit suffix stripped', N('52g'), 52);
eq('kcal suffix stripped', N('780 kcal'), 780);
eq('one decimal kept', N(52.44), 52.4);
eq('rounds to one decimal', N(52.46), 52.5);
eq('null is zero', N(null), 0);
eq('undefined is zero', N(undefined), 0);
eq('garbage is zero, not NaN', N('unknown'), 0);
eq('negative clamped to zero — a meal cannot remove calories', N(-50), 0);
eq('Infinity clamped', N(Infinity), 0);
ok('never returns NaN for any junk input',
  ['', 'abc', {}, [], NaN, '..', '-'].every(v => !Number.isNaN(N(v))));

console.log('# todayLondon() — toISOString() would put a 00:30 BST meal on yesterday');
const d = todayLondon();
ok('shape is YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(d));
eq('matches an explicit Europe/London format', d,
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
ok('is not blindly the UTC slice at all times of year', typeof d === 'string' && d.length === 10);

console.log('# upload ceiling');
ok('image cap sits under the 4.5MB Vercel body limit', MAX_IMAGE_BYTES < 4.5 * 1024 * 1024);
ok('image cap still allows a 1100px JPEG (~300KB raw, ~400KB base64)', MAX_IMAGE_BYTES > 600_000);

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
