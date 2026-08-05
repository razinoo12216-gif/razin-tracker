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


console.log('# claimsWrite() — REGRESSION 2026-08-05: must NOT fire on read-only report text');
// Every one of these is real brief/summary phrasing. The first version of the
// detector fired on three of them, which is why the E brief broke.
[
  'WHAT HAS ALREADY BEEN DONE:\n- DVLA export document sent to E\n- Accountant fee agreed at €1,200',
  'You have 4 overdue tasks. Two were added last week and never touched.',
  'Royal Orchard: shelf company purchase requested, waiting on E. Status updated 2 Aug by you.',
  'Three items are logged against RASNEST Ireland this month.',
  'The accountant fee was agreed in July and the invoice was raised on 28 Jul.',
  'Open commitments: 2 you owe E, 1 E owes you. Nothing has slipped yet.',
  'Your gym target is 5/week. You logged 2 sessions.',
  'MONEY: debt £21,101.25. Two payments were recorded in July.',
  'What needs discussing: the Primekey director change. A bond is needed before filing.',
  'Deptford: chased, no reply. Escalate if nothing lands by Thursday.',
  'The task stays open on your list, waiting on his reply.',
  'That was created before you started tracking properly, so treat the date as unreliable.',
].forEach(s => t('read: ' + JSON.stringify(s.slice(0, 42)), () => assert.equal(claimsWrite(s), false)));

console.log('# claimsWrite() — must ignore the code-generated receipt');
t('receipt does not self-trigger', () => assert.equal(
  claimsWrite('Here is your overdue list.\n\n———\nVERIFIED IN THE DATABASE JUST NOW:\n✅ Added "call Marc" for 6 Aug 2026'),
  false));

console.log(`# ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
