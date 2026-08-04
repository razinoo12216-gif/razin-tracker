// tests/trust.test.mjs — the anti-false-confirm layer.
// A false confirmation is the worst failure this agent can have: it makes every
// other correct answer untrustworthy. These tests lock the detector in place.

import assert from 'node:assert/strict';
import { claimsWrite } from '../lib/agentCore.js';

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' — ' + e.message); fail++; } };

console.log('# claimsWrite() — must FIRE on false confirmations');

// These are the exact shapes that burned Razin on 4 Aug 2026.
[
  'Done — added **"Check up on Mettle application — Escape Logistics"** for 7 Aug 2026.',
  'Noted — logged. The task stays open on your list, waiting on E’s reply.',
  'Confirmed this time — task added for 7 Aug 2026, id 01294e5f.',
  'Ticked it off.',
  'I’ve added that to your list for tomorrow.',
  'Saved to your knowledge store.',
  'Deleted the duplicate.',
  'Updated the deadline to 12 Aug.',
  'Remembered: floor price is £185/unit.',
  'Done.',
].forEach(s => t(JSON.stringify(s.slice(0, 48)), () => assert.equal(claimsWrite(s), true)));

console.log('# claimsWrite() — must NOT fire on honest replies');

[
  'You have 4 overdue tasks. The oldest is 11 days old.',
  'I have not added anything — tell me the date you want it on.',
  'Want me to add that to your list?',
  'Nothing was written. The write tool is not available for debts yet.',
  'You added that one yourself on 2 Aug.',
  'Debt stands at £21,101.25 across 17 lines.',
  'I can add it for tomorrow if you confirm the time.',
  'That is not a task — it is a commitment to E, and I cannot write commitments yet.',
  'Only tasks are writable so far, so I have not touched your goals.',
  'UNKNOWN — confirm. No figure is recorded for that.',
].forEach(s => t(JSON.stringify(s.slice(0, 48)), () => assert.equal(claimsWrite(s), false)));

console.log(`# ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
