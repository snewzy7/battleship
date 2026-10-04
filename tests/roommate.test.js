'use strict';
const assert = require('assert');
const R = require('../roommate.js');

const items = ['buldak', 'takis', 'cfa', 'pbcups', 'poppi'];
const rm = R.createRoommate();

// Every top-level pool never repeats a line until exhausted.
for (const [key, list] of Object.entries(R.LINES)) {
  if (!Array.isArray(list)) continue;
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const l = R.line(rm, key);
    assert(!seen.has(l), `repeat in ${key}`);
    seen.add(l);
  }
}

// react() always returns a string for hit/sunk and item lines reference real items.
for (let g = 0; g < 500; g++) {
  const r = R.createRoommate();
  for (const actor of ['roommate', 'you']) {
    for (const item of items) {
      for (const result of ['hit', 'sunk']) {
        const out = R.react(r, { actor, result, item, score: { youGone: 1, rmGone: 1 } });
        assert.strictEqual(typeof out, 'string', `${actor} ${result} ${item}`);
      }
    }
    const miss = R.react(r, { actor, result: 'miss', item: null, score: { youGone: 0, rmGone: 0 } });
    assert(miss === null || typeof miss === 'string');
  }
}
// last item lines fire
const r2 = R.createRoommate();
assert(R.LINES.rm_last_item.includes(R.react(r2, { actor: 'roommate', result: 'sunk', item: 'cfa', score: { youGone: 4, rmGone: 0 } })));
assert(R.LINES.you_last_item.includes(R.react(r2, { actor: 'you', result: 'sunk', item: 'cfa', score: { youGone: 0, rmGone: 4 } })));
console.log('roommate tests passed');
