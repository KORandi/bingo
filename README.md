# Bingo Tracker

A tracker for 90-ball bingo (3×9 tickets, numbers 1–90) that marks all of your tickets at once as numbers are called. Plain HTML/CSS/JS — no build step, no backend.

## Features

- Tracks up to 6 tickets side by side; two tickets are pre-loaded, the rest are added via the ticket editor (enter each row's 5 numbers, columns are placed automatically).
- Type a called number (or tap it on the 1–90 board) and it's marked on every ticket that has it.
- Per-ticket progress: "N to a line", line, two lines, and full house detection.
- Call history with undo, plus a "New game" reset that keeps your tickets.
- Everything is saved in the browser (`localStorage`), so a refresh or accidental tab close loses nothing.
- Works on phones and in dark mode.

## Running locally

Open `index.html` in a browser. That's it.

## Hosting on GitHub Pages

1. Merge to `main`.
2. In the repo, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, and save.
3. The site goes live at `https://korandi.github.io/bingo/` within a minute or two.
