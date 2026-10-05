# Battleship — Aggressive Test & Bug Fix Report

Project: https://github.com/snewzy7/battleship
Live: https://snewzy7.github.io/battleship/
Date: 2026-09-29

## 0. Original project prompt

The project began with the following prompt, which was drafted with Claude and then given to Devin:

> Build a browser-based Battleship game where a human plays against an AI opponent.
>
> **Tech constraints**
> Plain HTML, CSS, and JavaScript. A single static site, no backend, no build step, no framework. It has to be servable as static files so it can be deployed to GitHub Pages.
>
> **Rules**
> Standard Battleship. Two 10x10 grids, one for the player and one for the AI, labeled columns A to J and rows 1 to 10. Each side has five ships: Carrier (5 squares), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2). Ships are placed in a straight line, horizontal or vertical. Ships cannot overlap each other or extend past the edge of the grid.
>
> **Setup phase**
> The player places their five ships by clicking on their own grid, with a control to toggle between horizontal and vertical placement, and a button to place all ships randomly instead. Reject and clearly explain any invalid placement. The AI places its own ships randomly, hidden from the player.
>
> **Gameplay**
> Turns alternate, player first. The player clicks a cell on the AI's grid to fire. Show hit, miss, and sunk with visually distinct states, and never allow firing at a cell that has already been fired at. Then the AI takes its shot at the player's grid. Maintain a running message log of what happened on each turn, for example "You hit the Cruiser at C4" or "The AI missed at G9."
>
> **AI logic**
> The AI fires at random cells until it scores a hit. Once it hits, it switches to targeting mode and fires at cells adjacent to the hit until it sinks that ship, then returns to random firing. It must never fire at a cell it has already fired at, in either mode.
>
> **End state**
> Detect when all five of one side's ships are sunk, declare the winner clearly, and provide a restart that fully resets both grids and all game state.
>
> **Deliverables**
> Create a new public GitHub repo for this project and push the code with clear, incremental commit messages that show the build sequence. Then set up GitHub Pages so the game is playable from a public URL, and tell me that URL. Include a README covering how to run it locally and how the AI targeting logic works.

A follow-up request added drama: slower pacing between turns, a bigger "boom" on hits, a per-player fleet dashboard, and more visual boats. The testing described below was run against that version.

## 1. What you asked for

> "i want to do an aggressive test on this to be sure theres no bugs. can you run this testing and let me know what bugs you find?"

Then, after the results:

> "Fix all four and redeploy, and then also write a short document on the bugs that were found and how i commanded you to fix them and then what you did"

## 2. How the testing was done

**Logic stress test (Node, no browser)** — a script loaded `game.js` and `ai.js` directly and simulated **20,000 complete AI games**, asserting on every shot that:

- the AI never fires at a cell it already fired at;
- after a hit, the AI's next shot is orthogonally adjacent to a live hit (targeting mode);
- the AI's `mode` flag always matches whether it has un-sunk hits;
- every random fleet has exactly 5 straight, contiguous, non-overlapping, in-bounds ships (17 cells);
- every game finishes within 100 shots (average was ~59.8).

It also exercised the placement API edge cases (past-edge in both orientations, overlap detection naming the right ship, remove/clear, coordinate formatting `C4`/`J10`, hit → sunk transitions).

**Browser test (real clicks, real timers)** — a recorded session against the local server and a smoke test against the live GitHub Pages URL, covering: 60 boundary placement cases, overlap rejection, Rotate button and R key, Reset/Random combinations, rapid click-spam during the AI's turn, clicking already-fired cells, strict 1:1 turn alternation, stats/pips/accuracy consistency, four full games (wins and a loss), restart and reload mid-turn, `prefers-reduced-motion`, responsive layout at 1920/800/400 px, keyboard navigation, and the JS console.

## 3. Results

No gameplay, scoring, or AI bugs were found. Shot counts, hit counts, pips, turn order, win/loss detection and restart state were all consistent across every game.

Four UI-level bugs were found:

| # | Severity | Bug | Repro |
|---|----------|-----|-------|
| 1 | Medium | Pressing **R** while hovering the grid did not redraw the placement preview; it kept showing the old orientation until the mouse moved, so the green/red preview could contradict what a click actually did. | Hover B9 horizontally → press R → preview stays horizontal, click places/rejects vertically. |
| 2 | Low | Clicking **Play again** immediately after the winning shot let the previous game's gold flash, board shake and status pulse play out on the fresh setup screen (~1 s). | Sink last ship → click Play again within ~0.5 s. |
| 3 | Low | With `prefers-reduced-motion: reduce`, CSS animations never run so `animationend` never fires; the `boom`/`splash`/`shake`/`flash`/`status-hit` classes were never removed, leaving hit cells permanently glowing. | Enable reduced motion → score a hit → glow never clears. |
| 4 | Low | The **Play again** button in the Command panel sat underneath the end-game overlay and could not be clicked (only reachable via keyboard). | Finish a game → click the Command panel's Play again → nothing. |

One non-user-visible note: `placeShip()` does not guard against re-placing a ship index that is already on the board. The UI never calls it that way (it always advances to the next ship, and random placement clears first), so it was left unchanged.

## 4. Your instruction

"Fix all four and redeploy."

## 5. What was done

Four commits were pushed to `main`, one per bug, and the GitHub Pages workflow redeployed the site automatically (workflow run succeeded; fix confirmed on the live URL).

| # | Commit | Fix |
|---|--------|-----|
| 1 | `4071541` Fix placement preview not updating on R rotate | Track the last hovered cell in `state.hover` (set on hover, cleared on mouse-leave). `toggleRotate()` now re-runs `previewAt()` for that cell so the preview redraws instantly in the new orientation. |
| 2 | `6b318f4` Clear transient effects on restart | Added `clearEffects()` which strips `boom`/`splash` from all cells, `shake` from both boards, `status-hit` from the status line and resets the `#flash` overlay; called from `restartGame()`. The staggered per-cell sunk-boom timers are now stored in `state.timeouts` so restart cancels them too. |
| 3 | `ac8841b` Make effect classes self-clearing under reduced motion | Added `removeLater(el, cls, ms)` which pairs every `animationend` listener with a tracked `setTimeout` fallback matched to each animation's CSS duration (boom 700 ms, splash 500, shake 500, flash 400, status pulse 600). The boom's glow gradient was moved inside the `@keyframes` so a `.boom` cell with animations disabled falls back to plain hit/sunk styling. |
| 4 | `70dc876` Let Command-panel Play again work with overlay open | Removed the redundant Command-panel `#restart-btn` (HTML, JS references, CSS). The overlay's Play again is the single restart control, so there is no longer an unreachable button. |

Verification after the fixes:

- `node tests/ai.test.js` — all tests pass.
- Headless browser check: hover a cell → press R → preview cells change from horizontal to vertical; under emulated reduced motion, 1 s after a hit zero `.boom` classes remain; no console errors.
- Live site: reloaded https://snewzy7.github.io/battleship/ and confirmed the R-rotate preview updates in place.

## 6. Artifacts

- Test recording: attached to the session (`battleship-aggressive-edited.mp4`).
- Commit history: https://github.com/snewzy7/battleship/commits/main

---

## 7. Second pass — Snack Attack redesign (2026-10-04)

### Your instruction
> run your testing again, fix the bugs, and update the documentation

### How the testing was done
- Re-ran the logic stress harness: **20,000 simulated games**, avg 59.8 shots,
  max 100; no repeated AI shots, all fleets valid, `placeShip` edge cases pass.
- Both unit suites (`tests/ai.test.js`, `tests/roommate.test.js`) pass.
- New Puppeteer UI harness against the redesigned layout (real clicks and
  timers): help card on first open + persistence after reload, How to Play
  reopen, Escape key, edge and overlap placement rejection, `R` preview refresh,
  Clear, Stock randomly (17 cells), Pantry Stocked → play transition, rapid
  clicking while the roommate "thinks" registers one shot, duplicate shots
  ignored, chat auto-scroll, `.chat` panel stays exactly its fixed height, speech
  card matches the newest roommate bubble, Run It Back during the AI delay cancels
  every timer and resets both boards, full games to a win and a loss, end-game
  overlay text/stats, no firing after game over, overlay restart, no horizontal
  overflow at 1300 / 1000 / 390 px, console errors (favicon 404 excluded).

### Results
No logic, scoring, turn-order, or state-reset bugs. Three low-severity UI bugs:

1. **Low** — The "How to Play" card could only be closed with the "Got it"
   button; Escape and clicking the dim backdrop did nothing.
2. **Low** — Pressing `R` while the help card was open rotated the placement
   preview behind it.
3. **Low** — On phone widths the pantry-strip hint ("Click your pantry grid…")
   shrank into a one-word-wide column next to the heading.

### What was done
- `game.js` `initHelp`: single `close()` used by the button, a backdrop click,
  and an `Escape` keydown; the `R` shortcut now ignores keys while the help card
  is visible.
- `style.css`: `.strip-head .hint` uses `flex: 1 1 220px` so it wraps under the
  heading instead of squeezing.
- Re-ran the full harness after the fixes: `errors: [], bugs: []`, Escape closes
  the card, `R` no longer rotates behind it.
- README "Tests" section documents both aggressive passes and the fixes.

### Known limitation
- The browser requests `/favicon.ico`, which 404s (no icon shipped). Cosmetic.

### Follow-up from your phone play-through
> i just played and I think I found a bug. It didn't light up when I got the 2 x

Reproduced in a headless browser: on the roommate's board a **found** square
(item not yet fully taken) kept the plain cream tile and only drew the red X —
the grey "gone" tile appears only once every square of that item is found.
Mechanically the hit was counted (confirmed via cell state), but visually it
didn't light up. Fix: `#enemy-grid .cell.hit` now gets an amber tile
(`#ffd98a`, orange border), so found = amber + X, gone = grey + X, empty = dot.
