'use strict';

(function (root) {
  const SIZE = 10;
  const COLS = 'ABCDEFGHIJ';

  const SHIPS = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 },
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
    stats: { playerShots: 0, aiShots: 0 },
    timeouts: [],
  };

  const $ = id => document.getElementById(id);
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

  function orientationWord() {
    return state.orientation === 'h' ? 'horizontally' : 'vertically';
  }

  function renderPlayerBoard() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = cellAt(playerGrid, r, c);
        cell.classList.toggle('ship', state.playerBoard.cells[r][c].ship !== null);
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

  function renderShipCells(board, grid, shipIndex) {
    for (const { row, col } of board.ships[shipIndex].cells) {
      const cell = cellAt(grid, row, col);
      cell.classList.remove('hit');
      cell.classList.add('sunk');
    }
  }

  function paintShot(board, grid, row, col, res) {
    const cell = cellAt(grid, row, col);
    cell.classList.add('fired');
    if (res.result === 'miss') {
      cell.classList.add('miss');
    } else if (res.result === 'hit') {
      cell.classList.add('hit');
    } else {
      renderShipCells(board, grid, res.shipIndex);
    }
  }

  function aiFire() {
    const { row, col } = window.BattleshipAI.chooseShot(state.ai);
    const res = B.fireAt(state.playerBoard, row, col);
    window.BattleshipAI.notifyResult(state.ai, row, col, res);
    state.stats.aiShots++;
    paintShot(state.playerBoard, playerGrid, row, col, res);
    const at = B.coord(row, col);
    if (res.result === 'miss') {
      log(`The AI missed at ${at}`, 'ai');
    } else if (res.result === 'hit') {
      log(`The AI hit your ${res.shipName} at ${at}`, 'ai');
    } else {
      log(`The AI sank your ${res.shipName}!`, 'ai');
    }
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
    paintShot(state.enemyBoard, enemyGrid, row, col, res);
    const at = B.coord(row, col);
    if (res.result === 'miss') {
      log(`You missed at ${at}`, 'player');
    } else if (res.result === 'hit') {
      log(`You hit the ${res.shipName} at ${at}`, 'player');
    } else {
      log(`You sank the AI's ${res.shipName}!`, 'player');
    }
    if (B.allSunk(state.enemyBoard)) {
      endGame(true);
      return;
    }
    state.aiLock = true;
    enemyGrid.classList.add('locked');
    setStatus('Enemy shot incoming…');
    const wait = AI_DELAY + (res.result === 'miss' ? 0 : HIT_PAUSE);
    state.timeouts.push(setTimeout(() => {
      aiFire();
      if (state.phase !== 'play') return;
      state.timeouts.push(setTimeout(() => {
        enemyGrid.classList.remove('locked');
        state.aiLock = false;
        setStatus('Your turn — fire at Enemy Waters.');
      }, POST_AI_DELAY));
    }, wait));
  }

  function endGame(playerWon) {
    state.phase = 'over';
    setStatus(playerWon ? 'You win!' : 'The AI wins!');
    log(playerWon ? 'You win!' : 'The AI wins!', 'info');
    $('overlay-title').textContent = playerWon ? 'You win!' : 'The AI wins!';
    $('overlay-summary').textContent =
      `You fired ${state.stats.playerShots} shots; the AI fired ${state.stats.aiShots}.`;
    $('overlay').hidden = false;
    $('restart-btn').hidden = false;
  }

  function restartGame() {
    state.phase = 'setup';
    state.playerBoard = B.createBoard();
    state.enemyBoard = B.createBoard();
    state.orientation = 'h';
    state.nextShip = 0;
    state.aiLock = false;
    state.ai = null;
    state.stats = { playerShots: 0, aiShots: 0 };
    state.timeouts.forEach(clearTimeout);
    state.timeouts = [];
    buildGrid(playerGrid);
    buildGrid(enemyGrid);
    logEl.textContent = '';
    $('overlay').hidden = true;
    $('restart-btn').hidden = true;
    $('start-btn').hidden = true;
    $('rotate-btn').disabled = false;
    $('rotate-btn').textContent = 'Rotate (H)';
    $('random-btn').disabled = false;
    $('reset-btn').disabled = false;
    enemyGrid.classList.remove('locked');
    updateSetupStatus();
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
    setStatus('Your turn — fire at Enemy Waters.');
    log('Game started. Good luck!', 'info');
  }

  function updateSetupStatus() {
    if (state.nextShip < SHIPS.length) {
      setStatus(`Place your ${SHIPS[state.nextShip].name} (${SHIPS[state.nextShip].size} cells) — ${orientationWord()}, press R to rotate`);
    } else {
      setStatus('All ships placed. Start the game!');
    }
  }

  function failPlacement(row, col, check) {
    const name = SHIPS[state.nextShip].name;
    const at = B.coord(row, col);
    const msg = check.reason === 'edge'
      ? `Can't place ${name} at ${at} ${orientationWord()}: it would extend past the edge`
      : `Can't place ${name} at ${at} ${orientationWord()}: it overlaps the ${check.overlapName}`;
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
    log(`Placed ${SHIPS[state.nextShip].name} at ${B.coord(row, col)}`, 'info');
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
    previewAt(+cell.dataset.row, +cell.dataset.col);
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
  }

  function init() {
    buildLabels('player-col-labels', 'player-row-labels');
    buildLabels('enemy-col-labels', 'enemy-row-labels');
    buildGrid(playerGrid);
    buildGrid(enemyGrid);

    playerGrid.addEventListener('click', onPlayerCellClick);
    playerGrid.addEventListener('mouseover', onPlayerCellHover);
    playerGrid.addEventListener('mouseleave', clearPreview);
    $('rotate-btn').addEventListener('click', toggleRotate);
    $('random-btn').addEventListener('click', () => {
      B.randomFleet(state.playerBoard);
      state.nextShip = SHIPS.length;
      renderPlayerBoard();
      clearPreview();
      updateSetupStatus();
      $('start-btn').hidden = false;
      log('Fleet placed randomly.', 'info');
    });
    $('reset-btn').addEventListener('click', resetPlacement);
    $('start-btn').addEventListener('click', startGame);
    enemyGrid.addEventListener('click', onEnemyCellClick);
    $('restart-btn').addEventListener('click', restartGame);
    $('overlay-btn').addEventListener('click', restartGame);
    document.addEventListener('keydown', e => {
      if ((e.key === 'r' || e.key === 'R') && state.phase === 'setup') toggleRotate();
    });

    updateSetupStatus();
  }

  init();
})();
