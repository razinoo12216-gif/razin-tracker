// tests/companySearch.test.mjs — company search on the Work tab (2026-09-07)
//
// Pulls the real companyHaystack/filterCompanies source straight out of app.js and runs it,
// rather than restating the logic here — a test that reimplements the thing it is testing
// passes happily while production is broken.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

function grab(name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('could not find function ' + name + ' in app.js');
  let depth = 0, i = src.indexOf('{', start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unbalanced braces reading ' + name);
}

let companyQuery = '';
const ctx = { get companyQuery() { return companyQuery; } };
const fn = new Function('getQ', `
  ${grab('companyHaystack')}
  ${grab('filterCompanies').replace(/companyQuery/g, 'getQ()')}
  return { companyHaystack, filterCompanies };
`)(() => companyQuery);
const { companyHaystack, filterCompanies } = fn;

const co = (name, status, meta) => ({ id: name, name, status, notes: JSON.stringify(meta || {}) });
const COMPANIES = [
  co('Zenith Holdings Ltd', 'raz',     { company_number: '11223344', registered_office: '71-75 Shelton Street, London, WC2H 9JQ' }),
  co('Alpha Logistics Ltd', 'other',   { company_number: '99887766', registered_office: '12 Kings Road, Manchester' }),
  co('Meridian Trading Ltd','partial', { company_number: '55667788', registered_office: '71-75 Shelton Street, London, WC2H 9JQ', notes: 'dormant, VAT deregistered' }),
  co('Beta Ventures Ltd',   'raz',     {}),
  { id: 'x', name: 'Broken Notes Ltd', status: 'raz', notes: 'this is not JSON at all' },
];

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const names = (q) => { companyQuery = q; return filterCompanies(COMPANIES).map(c => c.name); };

console.log('# sorting — an empty box must always give the same predictable order');
ok('sorted A-Z, not insertion order', names('').join('|') ===
  'Alpha Logistics Ltd|Beta Ventures Ltd|Broken Notes Ltd|Meridian Trading Ltd|Zenith Holdings Ltd');
ok('empty query returns every company', names('').length === COMPANIES.length);
ok('whitespace-only query is treated as empty', names('   ').length === COMPANIES.length);
ok('does not mutate the array it was given', (names('zen'), COMPANIES[0].name === 'Zenith Holdings Ltd'));

console.log('# name matching');
ok('partial name', names('zen').join() === 'Zenith Holdings Ltd');
ok('case insensitive', names('ZENITH').join() === 'Zenith Holdings Ltd');
ok('mid-word substring', names('eridian').join() === 'Meridian Trading Ltd');
ok('no match returns empty, not everything', names('qqqzzz').length === 0);

console.log('# the fields that make this worth having');
ok('finds by Companies House number', names('99887766').join() === 'Alpha Logistics Ltd');
ok('partial CH number', names('998877').join() === 'Alpha Logistics Ltd');
ok('registered office finds every company at that address',
  names('shelton').join('|') === 'Meridian Trading Ltd|Zenith Holdings Ltd');
ok('postcode', names('wc2h').length === 2);
ok('notes text', names('dormant').join() === 'Meridian Trading Ltd');
ok('ownership label', names('partial').join() === 'Meridian Trading Ltd');

console.log('# multi-term narrows rather than widens');
ok('two terms are AND, not OR', names('shelton meridian').join() === 'Meridian Trading Ltd');
ok('AND across different fields', names('zenith shelton').join() === 'Zenith Holdings Ltd');
ok('one term missing means no match', names('shelton alpha').length === 0);
ok('extra spaces between terms are ignored', names('shelton    meridian').join() === 'Meridian Trading Ltd');

console.log('# robustness — notes is free-form and has held non-JSON before');
ok('a company with unparseable notes does not throw', names('').includes('Broken Notes Ltd'));
ok('it is still findable by name', names('broken').join() === 'Broken Notes Ltd');
ok('a company with empty meta still matches on name', names('beta').join() === 'Beta Ventures Ltd');
ok('searching a term only in bad notes matches nothing rather than crashing', names('notJSON').length === 0);

console.log('# the mobile trap this was written to avoid');
ok('renderWorkCompaniesView repaints only the grid on input, never the whole view',
  /si\.addEventListener\('input',[\s\S]{0,120}?paintCompanyGrid\(companies\)/.test(src));
ok('search input is not autofocused (would raise the phone keyboard on tab open)',
  !/id="co-search"[^>]*autofocus/.test(src));

console.log('# incorporation date (added 2026-09-07)');
const ageFn = new Function(`${grab('companyAge')}; return companyAge;`)();
const iso = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const now = new Date();
const agoMonths = (n) => { const d = new Date(now.getFullYear(), now.getMonth() - n, now.getDate()); return iso(d.getFullYear(), d.getMonth()+1, d.getDate()); };
ok('exactly 1 year reads 1y', ageFn(agoMonths(12)) === '1y');
ok('18 months reads 1y 6m', ageFn(agoMonths(18)) === '1y 6m');
ok('under a year shows months only', ageFn(agoMonths(5)) === '5m');
ok('today is 0m, not blank or negative', ageFn(agoMonths(0)) === '0m');
ok('a future date returns empty rather than a negative age', ageFn(iso(now.getFullYear()+2, 1, 1)) === '');
ok('empty input is empty', ageFn('') === '');
ok('null input is empty, does not throw', ageFn(null) === '');
ok('a malformed date is empty rather than NaN', ageFn('not-a-date') === '');
ok('a non-ISO format is rejected', ageFn('12/03/2021') === '');
ok('incorporation date is searchable', (() => {
  const cs = [{ id:'a', name:'Dated Ltd', status:'raz', notes: JSON.stringify({ incorporated:'2021-03-12' }) }];
  companyQuery = '2021-03-12';
  return filterCompanies(cs).length === 1;
})());
ok('the card renders it only when present',
  /meta\.incorporated\?`<div class="work-due-row"><span class="work-due-lbl">Incorporated/.test(src));
ok('CH lookup fills it from date_of_creation', /const inc = data\.date_of_creation/.test(src));
ok('it is saved into the notes blob', /incorporated: fd\.get\('incorporated'\)/.test(src));

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
