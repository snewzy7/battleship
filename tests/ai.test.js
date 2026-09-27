'use strict';
const assert = require('assert');
const B = require('../game.js');
const AI = require('../ai.js');

// canPlace: out of bounds
{
  const board = B.createBoard();
  assert.strictEqual(B.canPlace(board, 0, 0, 6, 'h').ok, false); // Carrier size 5, col 6 -> J + overflow
  assert.strictEqual(B.canPlace(board, 0, 8, 0, 'v').ok, false);
  assert.strictEqual(B.canPlace(board, 0, 0, 5, 'h').ok, true);
  assert.strictEqual(B.canPlace(board, 0, 5, 0, 'v').ok, true);
}

// canPlace: overlap
{
  const board = B.createBoard();
  assert.strictEqual(B.placeShip(board, 1, 2, 2, 'h').ok, true); // Battleship at C3 horizontally
  const res = B.canPlace(board, 2, 0, 3, 'v'); // Cruiser down through D3
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'overlap');
  assert.strictEqual(res.overlapName, 'Battleship');
  assert.strictEqual(B.canPlace(board, 2, 0, 0, 'v').ok, true);
}

// 200 full games: never repeat a cell, sink everything within 100 shots
for (let game = 0; game < 200; game++) {
  const board = B.createBoard();
  B.randomFleet(board);
  const ai = AI.createAI();
  let shots = 0;
  while (!B.allSunk(board) && shots < 100) {
    const { row, col } = AI.chooseShot(ai);
    const k = row * B.SIZE + col;
    assert.ok(!ai.shots.has(k), `AI repeated cell ${row},${col} in game ${game}`);
    const res = B.fireAt(board, row, col);
    AI.notifyResult(ai, row, col, res);
    shots++;
  }
  assert.ok(B.allSunk(board), `AI failed to sink fleet in game ${game} (${shots} shots)`);
  assert.ok(shots <= 100);
}

console.log('All tests passed.');
