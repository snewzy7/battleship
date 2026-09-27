'use strict';

// Hunt/target AI. Pure module: functions take plain state and return {row, col}.
(function (root) {
  const SIZE = 10;
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function key(r, c) { return r * SIZE + c; }

  function createAI() {
    return {
      shots: new Set(),      // keys of every cell ever fired
      mode: 'hunt',          // 'hunt' | 'target'
      hits: [],              // {row, col, ship} hits on unsunk ships
    };
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function unfired(ai, r, c) {
    return inBounds(r, c) && !ai.shots.has(key(r, c));
  }

  // Candidates extending a straight line through >=2 hits of one ship.
  function lineCandidates(ai, shipHits) {
    const rows = new Set(shipHits.map(h => h.row));
    const cols = new Set(shipHits.map(h => h.col));
    const out = [];
    if (rows.size === 1) {
      const r = shipHits[0].row;
      const cs = shipHits.map(h => h.col).sort((a, b) => a - b);
      for (const c of [cs[0] - 1, cs[cs.length - 1] + 1]) {
        if (unfired(ai, r, c)) out.push({ row: r, col: c });
      }
    } else if (cols.size === 1) {
      const c = shipHits[0].col;
      const rs = shipHits.map(h => h.row).sort((a, b) => a - b);
      for (const r of [rs[0] - 1, rs[rs.length - 1] + 1]) {
        if (unfired(ai, r, c)) out.push({ row: r, col: c });
      }
    }
    return out;
  }

  function neighborCandidates(ai, shipHits) {
    const out = [];
    const seen = new Set();
    for (const h of shipHits) {
      for (const [dr, dc] of DIRS) {
        const r = h.row + dr, c = h.col + dc;
        if (unfired(ai, r, c) && !seen.has(key(r, c))) {
          seen.add(key(r, c));
          out.push({ row: r, col: c });
        }
      }
    }
    return out;
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function chooseShot(ai) {
    // Group live hits by ship; a ship's hits vanish when it sinks.
    const byShip = new Map();
    for (const h of ai.hits) {
      if (!byShip.has(h.ship)) byShip.set(h.ship, []);
      byShip.get(h.ship).push(h);
    }

    // Prefer extending an established line (both ends).
    for (const shipHits of byShip.values()) {
      if (shipHits.length >= 2) {
        const line = lineCandidates(ai, shipHits);
        if (line.length) {
          ai.mode = 'target';
          return pickRandom(line);
        }
      }
    }

    // Otherwise try orthogonal neighbors of all live hits.
    const neighbors = [];
    const seen = new Set();
    for (const shipHits of byShip.values()) {
      for (const cand of neighborCandidates(ai, shipHits)) {
        if (!seen.has(key(cand.row, cand.col))) {
          seen.add(key(cand.row, cand.col));
          neighbors.push(cand);
        }
      }
    }
    if (neighbors.length) {
      ai.mode = 'target';
      return pickRandom(neighbors);
    }

    // Hunt: random unfired cell.
    ai.mode = 'hunt';
    const open = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!ai.shots.has(key(r, c))) open.push({ row: r, col: c });
      }
    }
    return pickRandom(open);
  }

  // res is the Battleship.fireAt result: {result:'miss'|'hit'|'sunk', shipIndex?}
  function notifyResult(ai, row, col, res) {
    ai.shots.add(key(row, col));
    if (res.result === 'hit') {
      ai.hits.push({ row, col, ship: res.shipIndex });
    } else if (res.result === 'sunk') {
      ai.hits = ai.hits.filter(h => h.ship !== res.shipIndex);
    }
    ai.mode = ai.hits.length ? 'target' : 'hunt';
  }

  const api = { createAI, chooseShot, notifyResult };
  root.BattleshipAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
