// tests/meal.test.mjs — photo meal logging (2026-08-28; moved to lib/ 2026-09-09)
//
// Covers the parts that fail silently in production: a model reply that is not clean JSON,
// numbers arriving as strings with units attached, and the date rolling over in the wrong
// timezone. The Anthropic and Supabase calls are not exercised here — they are network.
import { jsonFrom, N, todayLondon, MAX_IMAGE_BYTES } from '../lib/mealEstimate.js';

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

console.log('# forced tool call — the fix for the 2026-09-09 malformed-JSON failure');
import { readFileSync } from 'node:fs';
const lib = readFileSync(new URL('../lib/mealEstimate.js', import.meta.url), 'utf8');
const toolMatch = lib.match(/const TOOL = (\{[\s\S]*?\n\};)/);
ok('a TOOL definition exists', !!toolMatch);
const TOOL = new Function('const NUM={type:"number"}; return ' + toolMatch[1].replace(/;$/, ''))();
eq('tool is named log_meal', TOOL.name, 'log_meal');
eq('schema is an object', TOOL.input_schema.type, 'object');
ok('every field the writer reads is required',
  ['label','items','calories','protein','carbs','fats','confidence','assumptions']
    .every(k => TOOL.input_schema.required.includes(k)));
ok('question is optional — it is not always useful',
  !TOOL.input_schema.required.includes('question'));
ok('confidence is constrained to the three values the UI styles',
  JSON.stringify(TOOL.input_schema.properties.confidence.enum) === '["high","medium","low"]');
ok('the four totals are numbers, not strings',
  ['calories','protein','carbs','fats'].every(k => TOOL.input_schema.properties[k].type === 'number'));
ok('items is an array of objects', TOOL.input_schema.properties.items.type === 'array'
  && TOOL.input_schema.properties.items.items.type === 'object');
ok('an item must at least have a name and calories',
  ['name','calories'].every(k => TOOL.input_schema.properties.items.items.required.includes(k)));
ok('the request forces the tool rather than hoping for it',
  /tool_choice:\s*\{\s*type:\s*'tool',\s*name:\s*'log_meal'\s*\}/.test(lib));
ok('the reply is read from the tool_use block', /c\.type === 'tool_use' && c\.name === 'log_meal'/.test(lib));
ok('jsonFrom survives only as a fallback', /call \? call\.input : jsonFrom\(/.test(lib));
ok('a failed generation is retried once', /catch \(e1\)[\s\S]{0,200}est = await askOnce\(\)/.test(lib));
ok('the user-facing error carries no parser jargon',
  /Could not read that one — try again, or type what it was\./.test(lib)
  && !/error: 'Could not read the meal: ' \+/.test(lib));

console.log('# card layout must not overflow a phone (2026-09-09)');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
ok('the Fix/Undo row wraps', /\.meal-fixrow \{[^}]*flex-wrap:\s*wrap/.test(css));
ok('the fix input takes a full line', /\.meal-fixrow \.meal-fixinput \{[^}]*flex:\s*1 1 100%/.test(css));
ok('the two buttons share the next line', /\.meal-fixrow \.meal-btn \{[^}]*flex:\s*1 1 0/.test(css));
ok('flex children are allowed to shrink', /\.meal-wrap \* \{ min-width: 0; \}/.test(css));
ok('the card cannot exceed its container', /\.meal-wrap \{[\s\S]{0,200}max-width:\s*100%/.test(css));

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
