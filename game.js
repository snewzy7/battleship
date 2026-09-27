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
