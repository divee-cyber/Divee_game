# Divee_game

Bottle Sort — a water-sort style puzzle game. Sort colored sand into 12 bottles by pouring between them; each color also has its own glyph so bottles are distinguishable without relying on color alone. Levels get harder by adding colors and, once colors max out, by growing bottle capacity.

Also has:
- A **hint button** (1-3 uses depending on level difficulty) that suggests one legal next move, without solving the puzzle for you.
- **Guest names, no login** — pick a display name (or skip and play anonymously) to save your progress and appear on the public leaderboard.
- A **public leaderboard** (level reached + moves), so friends on different devices can compare progress.

The name/progress/leaderboard features need a small backend — `/api/guest.js`, `/api/progress.js`, `/api/leaderboard.js` — backed by [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (`@vercel/kv`, see `package.json`). The game itself never depends on this: if the API is unreachable, or you skip naming, it plays exactly the same as a plain offline single-player game.

Also included: `water-tracker.html` — a mobile water intake tracker with a big animated wave, a daily mascot that colors in as you drink, and hourly hydration reminders. Also self-contained, no build step.
