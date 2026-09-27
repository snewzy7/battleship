# Battleship

A browser Battleship game: human vs AI on two 10x10 grids. Plain HTML/CSS/JS —
no build step, no framework, no backend.

Live demo: https://snewzy7.github.io/battleship/

## Run locally

The game is a static site and works straight from the filesystem:

- Open `index.html` in any browser, **or**
- Serve it over HTTP:

  ```sh
  python3 -m http.server 8000
  ```

  then visit <http://localhost:8000>.

No dependencies to install.

## How to play

1. **Setup** — place your five ships on *Your Fleet*. Click a cell to place the
   ship named in the status line; it extends horizontally or vertically from
   that cell. Hovering previews placement (green = valid, red = invalid).
   - `Rotate (H/V)` button or the `R` key toggles orientation.
   - `Place randomly` places the whole fleet for you.
   - `Reset placement` clears the board.
2. Click **Start game** once all five ships are placed.
3. **Battle** — click cells in *Enemy Waters* to fire. Hits are orange,
   misses blue, sunk ships red. You and the AI alternate shots; the AI fires
   about half a second after you.
4. The game ends when all five ships on one side are sunk. Click **Play again**
   to restart.

Ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).

## How the AI targets

The AI (in `ai.js`) uses a classic hunt/target strategy:

- **Hunt mode** — with no live leads, it picks a random unfired cell.
- **Target mode** — after a hit, it fires at unfired orthogonal neighbors of
  the hit cells belonging to that ship.
- **Line extension** — once it has two or more hits on the same ship (which
  are necessarily collinear), it stops probing neighbors and only fires at the
  two ends of the established line, sinking the ship efficiently.
- **Recovery** — when a ship is sunk, its hits are dropped. If hits on other
  ships remain (possible when ships were adjacent), the AI stays in target
  mode and works on those; otherwise it returns to hunt mode.

A `Set` of every fired cell guarantees it never shoots the same cell twice.
The module is pure — functions take board state and return `{row, col}` — and
is exercised by `tests/ai.test.js`, which simulates 200 full games and asserts
the AI always wins within 100 shots. Run tests with:

```sh
node tests/ai.test.js
```

## Project structure

```
index.html   page layout: two grids, controls, log, end-game overlay
style.css    styling, cell states, responsive layout
game.js      board model (Battleship namespace) + all UI/game logic
ai.js        hunt/target AI (BattleshipAI namespace)
tests/       Node test script for the AI and placement validation
.nojekyll    disable Jekyll processing on GitHub Pages
```

Scripts are plain (non-module) files loaded in order `ai.js`, `game.js`, so
the game also works when opened via `file://`. Both scripts also export via
`module.exports` when present, which is how the Node tests load them.
