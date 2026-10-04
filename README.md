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
| Buldak Spicy Carbonara Ramen | 5 |
| Trader Joe's Chili & Lime Rolled Corn Tortilla Chips | 4 |
| Chick-fil-A Sauce | 3 |
| Peanut Butter Cups | 3 |
| Raspberry Rose Poppi | 2 |

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
   ("oh you were hiding the buldak from me??").
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
