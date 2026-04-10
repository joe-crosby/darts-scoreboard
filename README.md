# Darts Scoreboard

Offline-capable vanilla JavaScript scoring app that uses `images/dartboard.svg` as a clickable board. It supports modular game definitions for `501`, `301`, `Cricket`, and standard `Shanghai`, stores finished games in IndexedDB, and renders per-game history plus aggregate player statistics in the browser.

## Features

- **Cricket scoreboard**: Displays in a full darts scoreboard layout with player names, target numbers horizontal, and marks (● for triple, ✕ for double, ⊘ for single) organized vertically by player.
- **Game history**: Complete record of finished games with player stats (throws, doubles, triples, bulls) and recent throw log.
- **Offline first**: Uses service worker for offline capability and IndexedDB for persistent storage.

## Rules implemented

- `501` and `301`: standard countdown scoring with double-out and whole-turn bust reversion.
- `Cricket`: 
  - Players race to close `15-20` and `Bull` (3 marks to close).
  - **Standard mode**: First to close all numbers wins. In 2-player with points enabled, must also have equal or more points than opponent.
  - **Cut-throat mode**: Points scored go to open opponents instead of the thrower; first to close all and have the lowest score wins.
  - Points only awarded on numbers already closed by the thrower; closing darts do not score.
  - **Options**: Cut-throat mode, points toggle (disabled in standard mode for >2 players), and allow slop (out-of-sequence targets).
- `Shanghai`: standard sequence (1-20 by default), instant win for hitting `single + double + triple` of the round number in one turn. Configure rounds (7-20) and scoring mode before the game starts:
  - **Flat Scoring**: Any hit on the active target number scores 1 point.
  - **Ring Scoring**: On the active target, Single = 1, Double = 2, Triple = 3 (target value does not change score).
  - **Standard (Multiplier) Scoring**: Single = target × 1, Double = target × 2, Triple = target × 3.
  - Tiebreak flow remains the same: when players tie on points, the player with the most triples wins; if still tied, tied players play sudden-death tiebreak rounds until one leads.

## Run locally

```bash
npm test
npm start
```

Then open `http://localhost:8000`.

## Project structure

- `index.html`: app shell and panels.
- `src/app.js`: runtime state, SVG click handling, session/history rendering.
- `src/gameRegistry.js`: modular game definitions.
- `src/games/`: rules engines.
- `src/storage.js`: IndexedDB persistence.
- `src/stats.js`: aggregate history statistics.
- `sw.js`: service worker cache for offline capability.
- `tests/games.test.js`: game rules verification.
