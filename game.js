'use strict';

(function (root) {
  const SIZE = 10;
  const COLS = 'ABCDEFGHIJ';

  const SHIPS = [
    { name: 'Carrier', size: 5, key: 'buldak', label: 'Buldak Spicy Carbonara Ramen', short: 'Buldak', color: '#e23b5a' },
    { name: 'Battleship', size: 4, key: 'takis', label: "Trader Joe's Chili & Lime Rolled Corn Tortilla Chips", short: "TJ's Takis", color: '#f0742a' },
    { name: 'Cruiser', size: 3, key: 'cfa', label: 'Chick-fil-A Sauce', short: 'Chick-fil-A Sauce', color: '#d84a2b' },
    { name: 'Submarine', size: 3, key: 'pbcups', label: 'Peanut Butter Cups', short: 'PB Cups', color: '#b5651d' },
    { name: 'Destroyer', size: 2, key: 'poppi', label: 'Raspberry Rose Poppi', short: 'Poppi', color: '#e05a9c' },
  ];

  function createBoard() {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) {
        row.push({ ship: null, hit: false });
      }
      cells.push(row);
    }
    return {
      cells,
      ships: SHIPS.map(s => ({ name: s.name, size: s.size, cells: [], sunk: false })),
    };
  }

  function coord(row, col) {
    return COLS[col] + (row + 1);
  }

  // Returns { ok: true } or { ok: false, reason: 'edge'|'overlap', overlapName? }
  function canPlace(board, shipIndex, row, col, orientation) {
    const size = SHIPS[shipIndex].size;
    const dr = orientation === 'v' ? 1 : 0;
    const dc = orientation === 'h' ? 1 : 0;
    for (let i = 0; i < size; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
        return { ok: false, reason: 'edge' };
      }
      const existing = board.cells[r][c].ship;
      if (existing !== null) {
        return { ok: false, reason: 'overlap', overlapName: board.ships[existing].name };
      }
    }
    return { ok: true };
  }

  function placeShip(board, shipIndex, row, col, orientation) {
    const check = canPlace(board, shipIndex, row, col, orientation);
    if (!check.ok) return check;
    const size = SHIPS[shipIndex].size;
    const dr = orientation === 'v' ? 1 : 0;
    const dc = orientation === 'h' ? 1 : 0;
    const ship = board.ships[shipIndex];
    for (let i = 0; i < size; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      board.cells[r][c].ship = shipIndex;
      ship.cells.push({ row: r, col: c });
    }
    return { ok: true };
  }

  function removeShip(board, shipIndex) {
    const ship = board.ships[shipIndex];
    for (const cell of ship.cells) {
      board.cells[cell.row][cell.col].ship = null;
    }
    ship.cells = [];
    ship.sunk = false;
  }

  function clearBoard(board) {
    for (let i = 0; i < board.ships.length; i++) removeShip(board, i);
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) board.cells[r][c].hit = false;
    }
  }

  function randomFleet(board) {
    clearBoard(board);
    for (let i = 0; i < SHIPS.length; i++) {
      for (;;) {
        const row = Math.floor(Math.random() * SIZE);
        const col = Math.floor(Math.random() * SIZE);
        const orientation = Math.random() < 0.5 ? 'h' : 'v';
        if (placeShip(board, i, row, col, orientation).ok) break;
      }
    }
  }

  // Fire at (row, col). Returns { result: 'hit'|'miss'|'sunk', shipIndex? , shipName? }
  // Assumes caller checked the cell was not already fired.
  function fireAt(board, row, col) {
    const cell = board.cells[row][col];
    cell.hit = true;
    if (cell.ship === null) return { result: 'miss' };
    const ship = board.ships[cell.ship];
    const sunk = ship.cells.every(c => board.cells[c.row][c.col].hit);
    if (sunk) ship.sunk = true;
    return { result: sunk ? 'sunk' : 'hit', shipIndex: cell.ship, shipName: ship.name };
  }

  function allSunk(board) {
    return board.ships.every(s => s.sunk);
  }

  const api = {
    SIZE, COLS, SHIPS,
    createBoard, coord, canPlace, placeShip, removeShip, clearBoard,
    randomFleet, fireAt, allSunk,
  };

  root.Battleship = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

// ---- UI ----
(function () {
  if (typeof document === 'undefined') return;
  const B = window.Battleship;
  const { SIZE, COLS, SHIPS } = B;

  const AI_DELAY = 1400;
  const POST_AI_DELAY = 900;
  const HIT_PAUSE = 600;

  const state = {
    phase: 'setup', // 'setup' | 'play' | 'over'
    playerBoard: B.createBoard(),
    enemyBoard: B.createBoard(),
    orientation: 'h',
    nextShip: 0,
    aiLock: false,
    ai: null,
    stats: { playerShots: 0, playerHits: 0, aiShots: 0, aiHits: 0 },
    timeouts: [],
    hover: null,
    roommate: null,
    idleTimer: null,
  };

  const $ = id => document.getElementById(id);
  const chatLog = $('chat-log');
  const statusEl = $('status');
  const playerGrid = $('player-grid');
  const enemyGrid = $('enemy-grid');
  const logEl = $('log');

  function buildLabels(colId, rowId) {
    const colEl = $(colId);
    const rowEl = $(rowId);
    for (let c = 0; c < SIZE; c++) {
      const s = document.createElement('span');
      s.textContent = COLS[c];
      colEl.appendChild(s);
    }
    for (let r = 0; r < SIZE; r++) {
      const s = document.createElement('span');
      s.textContent = r + 1;
      rowEl.appendChild(s);
    }
  }

  function buildGrid(grid) {
    grid.textContent = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        grid.appendChild(cell);
      }
    }
  }

  function cellAt(grid, r, c) {
    return grid.children[r * SIZE + c];
  }

  function log(text, cls) {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = cls || 'info';
    logEl.prepend(li);
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function say(text) {
    if (!text) return;
    const li = document.createElement('li');
    li.className = 'bubble';
    li.textContent = text;
    chatLog.appendChild(li);
    while (chatLog.children.length > 8) chatLog.firstChild.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function showTyping() {
    hideTyping();
    const li = document.createElement('li');
    li.className = 'bubble typing';
    li.id = 'typing-bubble';
    li.innerHTML = '<span></span><span></span><span></span>';
    chatLog.appendChild(li);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function hideTyping() {
    const t = $('typing-bubble');
    if (t) t.remove();
  }

  function score() {
    return {
      youGone: state.playerBoard.ships.filter(s => s.sunk).length,
      rmGone: state.enemyBoard.ships.filter(s => s.sunk).length,
    };
  }

  function roommateReact(actor, res) {
    const text = window.Roommate.react(state.roommate, {
      actor,
      result: res.result,
      item: res.shipIndex !== undefined ? SHIPS[res.shipIndex].key : null,
      score: score(),
    });
    if (text) say(text);
  }

  function scheduleIdle() {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      if (state.phase === 'play' && !state.aiLock) {
        say(window.Roommate.line(state.roommate, 'idle'));
      }
    }, 15000);
    state.timeouts.push(state.idleTimer);
  }

  function orientationWord() {
    return state.orientation === 'h' ? 'horizontally' : 'vertically';
  }

  function shipShapeClasses(ship, row, col) {
    const horizontal = ship.cells.every(c => c.row === ship.cells[0].row);
    const i = ship.cells.findIndex(c => c.row === row && c.col === col);
    let pos = 'ship-mid';
    if (i === 0) pos = 'ship-bow';
    else if (i === ship.cells.length - 1) pos = 'ship-stern';
    return ['ship', horizontal ? 'ship-h' : 'ship-v', pos];
  }

  function renderPlayerBoard() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = cellAt(playerGrid, r, c);
        cell.classList.remove('ship', 'ship-h', 'ship-v', 'ship-bow', 'ship-stern', 'ship-mid');
        const idx = state.playerBoard.cells[r][c].ship;
        if (idx !== null) {
          cell.classList.add(...shipShapeClasses(state.playerBoard.ships[idx], r, c));
        }
      }
    }
  }

  function shipCells(shipIndex, row, col) {
    const cells = [];
    const dr = state.orientation === 'v' ? 1 : 0;
    const dc = state.orientation === 'h' ? 1 : 0;
    for (let i = 0; i < SHIPS[shipIndex].size; i++) {
      cells.push({ r: row + dr * i, c: col + dc * i });
    }
    return cells;
  }

  function clearPreview() {
    for (const cell of playerGrid.children) {
      cell.classList.remove('preview-valid', 'preview-invalid');
    }
  }

  function previewAt(row, col) {
    clearPreview();
    if (state.phase !== 'setup' || state.nextShip >= SHIPS.length) return;
    const cls = B.canPlace(state.playerBoard, state.nextShip, row, col, state.orientation).ok
      ? 'preview-valid' : 'preview-invalid';
    for (const { r, c } of shipCells(state.nextShip, row, col)) {
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
        cellAt(playerGrid, r, c).classList.add(cls);
      }
    }
  }

  function renderFleetPanels() {
    renderFleetPanel($('player-fleet'), state.playerBoard,
      state.stats.aiShots, state.stats.aiHits);
    renderFleetPanel($('enemy-fleet'), state.enemyBoard,
      state.stats.playerShots, state.stats.playerHits);
  }

  function renderFleetPanel(panel, board, shots, hits) {
    const list = panel.querySelector('.fleet-list');
    list.textContent = '';
    board.ships.forEach(ship => {
      const li = document.createElement('li');
      if (ship.sunk) li.classList.add('sunk');
      const name = document.createElement('span');
      name.className = 'ship-name';
      name.textContent = ship.label;
      const pips = document.createElement('span');
      pips.className = 'pips';
      for (let i = 0; i < ship.size; i++) {
        const c = ship.cells[i];
        const pip = document.createElement('span');
        pip.className = 'pip';
        if (c && board.cells[c.row][c.col].hit) pip.classList.add('hit');
        pips.appendChild(pip);
      }
      const stateEl = document.createElement('span');
      stateEl.className = 'ship-state';
      const hits = ship.cells.filter(c => board.cells[c.row][c.col].hit).length;
      stateEl.textContent = ship.sunk ? 'gone' : (hits > 0 ? 'found' : 'on the shelf');
      li.append(name, pips, stateEl);
      list.appendChild(li);
    });
    const acc = shots ? Math.round((hits / shots) * 100) : 0;
    panel.querySelector('.fleet-stats').textContent =
      `Searches: ${shots} · Found: ${hits} · Hit rate: ${acc}%`;
  }

  function renderShipCells(board, grid, shipIndex) {
    const ship = board.ships[shipIndex];
    for (const { row, col } of ship.cells) {
      const cell = cellAt(grid, row, col);
      cell.classList.remove('hit');
      cell.classList.add('sunk', ...shipShapeClasses(ship, row, col));
    }
  }

  // animationend never fires under prefers-reduced-motion, so always
  // pair the listener with a tracked timeout fallback.
  function removeLater(el, cls, ms) {
    const remove = () => el.classList.remove(cls);
    el.addEventListener('animationend', remove, { once: true });
    state.timeouts.push(setTimeout(remove, ms + 50));
  }

  function boom(cell) {
    cell.classList.add('boom');
    removeLater(cell, 'boom', 700);
  }

  function statusPulse() {
    statusEl.classList.remove('status-hit');
    void statusEl.offsetWidth;
    statusEl.classList.add('status-hit');
    removeLater(statusEl, 'status-hit', 600);
  }

  function flashScreen(kind) {
    const flash = $('flash');
    flash.className = '';
    void flash.offsetWidth;
    flash.classList.add('on', kind);
    const remove = () => { flash.className = ''; };
    flash.addEventListener('animationend', remove, { once: true });
    state.timeouts.push(setTimeout(remove, 450));
  }

  function shakeBoard(grid) {
    const wrap = grid.closest('.board-wrap');
    if (!wrap) return;
    wrap.classList.add('shake');
    removeLater(wrap, 'shake', 500);
  }

  function paintShot(board, grid, row, col, res) {
    const cell = cellAt(grid, row, col);
    cell.classList.add('fired');
    if (res.result === 'miss') {
      cell.classList.add('miss', 'splash');
      removeLater(cell, 'splash', 500);
    } else if (res.result === 'hit') {
      cell.classList.add('hit');
      boom(cell);
      statusPulse();
    } else {
      renderShipCells(board, grid, res.shipIndex);
      board.ships[res.shipIndex].cells.forEach(({ row: r, col: c }, i) => {
        state.timeouts.push(setTimeout(() => boom(cellAt(grid, r, c)), i * 80));
      });
      shakeBoard(grid);
      flashScreen(grid === enemyGrid ? 'gold' : 'red');
      statusPulse();
    }
  }

  function aiFire() {
    const { row, col } = window.BattleshipAI.chooseShot(state.ai);
    const res = B.fireAt(state.playerBoard, row, col);
    window.BattleshipAI.notifyResult(state.ai, row, col, res);
    state.stats.aiShots++;
    if (res.result !== 'miss') state.stats.aiHits++;
    paintShot(state.playerBoard, playerGrid, row, col, res);
    renderFleetPanels();
    const at = B.coord(row, col);
    if (res.result === 'miss') {
      log(`Roommate: empty shelf at ${at}`, 'ai');
    } else if (res.result === 'hit') {
      log(`Roommate found your ${SHIPS[res.shipIndex].short} at ${at}`, 'ai');
    } else {
      log(`Roommate took your ${SHIPS[res.shipIndex].short}`, 'ai');
    }
    hideTyping();
    roommateReact('roommate', res);
    if (B.allSunk(state.playerBoard)) {
      endGame(false);
    }
  }

  function onEnemyCellClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell || state.phase !== 'play' || state.aiLock) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    if (state.enemyBoard.cells[row][col].hit) return;
    const res = B.fireAt(state.enemyBoard, row, col);
    state.stats.playerShots++;
    if (res.result !== 'miss') state.stats.playerHits++;
    paintShot(state.enemyBoard, enemyGrid, row, col, res);
    renderFleetPanels();
    const at = B.coord(row, col);
    if (res.result === 'miss') {
      log(`Empty shelf at ${at}`, 'player');
    } else if (res.result === 'hit') {
      log(`Found it — ${SHIPS[res.shipIndex].short} at ${at}`, 'player');
    } else {
      log(`Gone — the roommate's ${SHIPS[res.shipIndex].short}`, 'player');
    }
    state.timeouts.push(setTimeout(() => roommateReact('you', res), 400));
    if (B.allSunk(state.enemyBoard)) {
      endGame(true);
      return;
    }
    state.aiLock = true;
    enemyGrid.classList.add('locked');
    setStatus('the roommate is looking around…');
    showTyping();
    const wait = AI_DELAY + (res.result === 'miss' ? 0 : HIT_PAUSE);
    state.timeouts.push(setTimeout(() => {
      aiFire();
      if (state.phase !== 'play') return;
      state.timeouts.push(setTimeout(() => {
        enemyGrid.classList.remove('locked');
        state.aiLock = false;
        setStatus('Your turn — search the roommate\'s pantry.');
        scheduleIdle();
      }, POST_AI_DELAY));
    }, wait));
  }

  function endGame(playerWon) {
    state.phase = 'over';
    const title = playerWon ? 'Pantry defended.' : 'They got everything.';
    setStatus(title);
    log(title, 'info');
    $('overlay-title').textContent = title;
    $('overlay-summary').textContent =
      `You searched ${state.stats.playerShots} shelves; the roommate searched ${state.stats.aiShots}.`;
    const quote = window.Roommate.line(state.roommate, playerWon ? 'you_win' : 'rm_win');
    say(quote);
    $('overlay-quote').textContent = quote ? `“${quote}”` : '';
    $('overlay').hidden = false;
  }

  function clearEffects() {
    for (const grid of [playerGrid, enemyGrid]) {
      for (const cell of grid.children) {
        cell.classList.remove('boom', 'splash');
      }
    }
    for (const wrap of document.querySelectorAll('.board-wrap')) {
      wrap.classList.remove('shake');
    }
    statusEl.classList.remove('status-hit');
    $('flash').className = '';
  }

  function restartGame() {
    state.phase = 'setup';
    clearEffects();
    state.playerBoard = B.createBoard();
    state.enemyBoard = B.createBoard();
    state.orientation = 'h';
    state.nextShip = 0;
    state.aiLock = false;
    state.ai = null;
    state.roommate = window.Roommate.createRoommate();
    chatLog.textContent = '';
    state.stats = { playerShots: 0, playerHits: 0, aiShots: 0, aiHits: 0 };
    state.timeouts.forEach(clearTimeout);
    state.timeouts = [];
    buildGrid(playerGrid);
    buildGrid(enemyGrid);
    logEl.textContent = '';
    $('overlay').hidden = true;
    $('start-btn').hidden = true;
    $('rotate-btn').disabled = false;
    $('rotate-btn').textContent = 'Rotate (H)';
    $('random-btn').disabled = false;
    $('reset-btn').disabled = false;
    enemyGrid.classList.remove('locked');
    $('controls-title').textContent = 'Stock Your Pantry';
    updateSetupStatus();
    renderFleetPanels();
  }

  function startGame() {
    state.phase = 'play';
    state.ai = window.BattleshipAI.createAI();
    B.randomFleet(state.enemyBoard);
    $('start-btn').hidden = true;
    $('rotate-btn').disabled = true;
    $('random-btn').disabled = true;
    $('reset-btn').disabled = true;
    clearPreview();
    setStatus('Your turn — search the roommate\'s pantry.');
    $('controls-title').textContent = 'Command';
    say(window.Roommate.line(state.roommate, 'start'));
    scheduleIdle();
    renderFleetPanels();
    log('The pantry is stocked. Let the search begin.', 'info');
  }

  function updateSetupStatus() {
    if (state.nextShip < SHIPS.length) {
      const s = SHIPS[state.nextShip];
      setStatus(`Stock your pantry — place the ${s.short} (${s.size} shelves), ${orientationWord()}. Press R to rotate`);
    } else {
      setStatus('Pantry stocked. Ready?');
    }
  }

  function failPlacement(row, col, check) {
    const name = SHIPS[state.nextShip].short;
    const at = B.coord(row, col);
    const other = SHIPS.find(s => s.name === check.overlapName);
    const msg = check.reason === 'edge'
      ? `Can't put the ${name} at ${at} ${orientationWord()} — it runs off the shelf`
      : `Can't put the ${name} at ${at} ${orientationWord()} — it overlaps the ${other ? other.short : check.overlapName}`;
    setStatus(msg);
    log(msg, 'info');
  }

  function onPlayerCellClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell || state.phase !== 'setup' || state.nextShip >= SHIPS.length) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    const res = B.placeShip(state.playerBoard, state.nextShip, row, col, state.orientation);
    if (!res.ok) {
      failPlacement(row, col, res);
      return;
    }
    log(`Stocked the ${SHIPS[state.nextShip].short} at ${B.coord(row, col)}`, 'info');
    state.nextShip++;
    renderPlayerBoard();
    clearPreview();
    previewAt(row, col);
    updateSetupStatus();
    $('start-btn').hidden = state.nextShip < SHIPS.length;
  }

  function onPlayerCellHover(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    state.hover = { row: +cell.dataset.row, col: +cell.dataset.col };
    previewAt(state.hover.row, state.hover.col);
  }

  function resetPlacement() {
    B.clearBoard(state.playerBoard);
    state.nextShip = 0;
    renderPlayerBoard();
    clearPreview();
    updateSetupStatus();
    $('start-btn').hidden = true;
  }

  function toggleRotate() {
    state.orientation = state.orientation === 'h' ? 'v' : 'h';
    $('rotate-btn').textContent = `Rotate (${state.orientation.toUpperCase()})`;
    updateSetupStatus();
    if (state.hover) previewAt(state.hover.row, state.hover.col);
  }

  function init() {
    state.roommate = window.Roommate.createRoommate();
    buildLabels('player-col-labels', 'player-row-labels');
    buildLabels('enemy-col-labels', 'enemy-row-labels');
    buildGrid(playerGrid);
    buildGrid(enemyGrid);

    playerGrid.addEventListener('click', onPlayerCellClick);
    playerGrid.addEventListener('mouseover', onPlayerCellHover);
    playerGrid.addEventListener('mouseleave', () => {
      state.hover = null;
      clearPreview();
    });
    $('rotate-btn').addEventListener('click', toggleRotate);
    $('random-btn').addEventListener('click', () => {
      B.randomFleet(state.playerBoard);
      state.nextShip = SHIPS.length;
      renderPlayerBoard();
      clearPreview();
      updateSetupStatus();
      $('start-btn').hidden = false;
      log('Pantry stocked randomly.', 'info');
    });
    $('reset-btn').addEventListener('click', resetPlacement);
    $('start-btn').addEventListener('click', startGame);
    enemyGrid.addEventListener('click', onEnemyCellClick);
    $('overlay-btn').addEventListener('click', restartGame);
    document.addEventListener('keydown', e => {
      if ((e.key === 'r' || e.key === 'R') && state.phase === 'setup') toggleRotate();
    });

    updateSetupStatus();
    renderFleetPanels();
  }

  init();
})();
