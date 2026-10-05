# Snack Attack

A browser Battleship game where you protect your snacks from your hungry
roommate: stock five snacks on your pantry shelves, then raid theirs before
they clean you out. Plain HTML/CSS/JS — no build step, no framework, no
backend.

Live demo: https://snewzy7.github.io/battleship/

## The shelf

Each item occupies contiguous cells on a 10×10 pantry grid:

| Item | Shelves |
|---|---|
| Kraft Mac & Cheese | 5 |
| Pringles | 4 |
| Ray's Red Hot Sauce | 3 |
| Peanut Butter Cups | 3 |
| Dr Pepper | 2 |

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

1. **Stock your pantry** — click a cell to place the item named in the status
   line; it extends horizontally or vertically. Hovering previews placement
   (green = fits, red = doesn't). `Rotate (H/V)` or the `R` key toggles
   orientation; `Stock randomly` and `Clear shelves` do what they say.
2. Click **Start** once all five items are shelved.
3. **Raid** — click cells in the Roommate's Pantry to search a shelf. Filled
   color = found, dashed outline = empty shelf, struck-through color = gone.
   The roommate searches your pantry after a beat; watch the chat strip for
   their running commentary.
4. The side panel shows both pantries' shelf lists (item, damage pips, state:
   on the shelf · found · gone) plus searches/found/hit rate.
5. Game over when one pantry is cleaned out. Click **Run It Back** to restock.

## How the roommate targets

The AI (in `ai.js`) uses a classic hunt/target strategy:

- **Hunt mode** — with no live leads, it picks a random unfired cell.
- **Target mode** — after a hit, it searches unfired orthogonal neighbors of
  the hit cells belonging to that item.
- **Line extension** — once it has two or more hits on the same item (which
  are necessarily collinear), it only fires at the two ends of the
  established line.
- **Recovery** — when an item is gone, its hits are dropped; hits on other
  items (from adjacent placements) keep it in target mode.

A `Set` of fired cells guarantees it never searches the same shelf twice.

## The Hungry Roommate dialogue

`roommate.js` is a pure, context-aware line picker — no DOM. `react(rm, ev)`
is called after every shot with `{actor, result, item, score}` and selects a
line by specificity:

1. **Item × result** — a line specific to what was found/taken
   ("wait... you actually have pringles in here?").
2. **Streaks** — 3+ misses or 2+ finds in a row by the same actor.
3. **Momentum** — who's ahead, or a last-item warning.
4. **Milestones** — game start, win, loss (`line(rm, key)` for
   `start`/`idle`/`rm_win`/`you_win`).
5. **Generic fallback** — per-result pools.

Every pool uses a shuffled cursor, so no line repeats until the pool is
exhausted. The roommate only reacts to ~45% of your misses to keep noise
down, and idles ("you good?") if you take more than 15 s on your turn. All
lines live in the `LINES` object at the top of `roommate.js` — edit freely
without touching the selection logic.

## Tests

```sh
node tests/ai.test.js        # 200 simulated games, placement validation
node tests/roommate.test.js  # dialogue pool coverage, no immediate repeats
```

### Aggressive test passes

Two full passes have been run against the game (see `battleship-bug-report.md`
in the session for the write-up):

- **Logic stress:** 20,000 simulated AI-vs-fleet games — no repeated shots in
  either mode, every fleet valid (17 cells, no overlap/out-of-bounds), target
  mode always fires orthogonally adjacent to a live hit; `placeShip` edge cases
  (re-placing a ship, corners, every rotation).
- **Browser/UI (Puppeteer, real clicks + timers):** first-open help card and
  its `localStorage` persistence, edge/overlap placement rejection, `R` rotate
  preview refresh, Clear, Stock randomly (exactly 17 cells), rapid-click shot
  lock, duplicate-shot prevention, fixed-height chat panel, speech card ==
  latest roommate line, restart mid-AI-turn (all timers cancelled), full games
  to both endings, end-game overlay + Run It Back, no horizontal overflow at
  1300 / 1000 / 390 px, zero JS errors.

Bugs found by the second pass (all fixed): the help card could not be closed
with Escape or by clicking the backdrop; `R` rotated the placement preview
behind the open help card; the pantry-strip hint text collapsed into a thin
column on phones. A follow-up report from a real phone game: a found-but-not-yet-gone
square on the roommate's board showed only the red X on an unchanged cream tile, so
it didn't read as "lit up" — found squares now get an amber tile, distinct from the
grey tile of an item that's fully gone.

## Project structure

```
index.html     page shell: two pantry trays, roommate chat, snack cards, overlay
style.css      Snack Attack theme (Permanent Marker + Caveat + Inter), effects
packages.js    stylized SVG snack packages drawn on the grid and cards
game.js        board model (Battleship namespace) + all UI/game logic
ai.js          hunt/target search AI (BattleshipAI namespace)
roommate.js    Hungry Roommate dialogue engine (Roommate namespace)
tests/         Node tests for the AI and the dialogue engine
.nojekyll      disable Jekyll processing on GitHub Pages
```

Scripts are plain (non-module) files loaded in order `ai.js`,
`roommate.js`, `packages.js`, `game.js`, so the game also works over `file://`. Each also
exports via `module.exports` when present, which is how the Node tests load
them.
