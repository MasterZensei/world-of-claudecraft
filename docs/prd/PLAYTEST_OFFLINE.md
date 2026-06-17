# Offline Delve Playtest (no server / Postgres)

Branch: `feature/delves` @ `e1f0ba69` or later.

## Architecture check

- Offline uses **`Sim` directly**, not `ClientWorld`.
  - `startOffline()` in `src/main.ts` constructs `new Sim(...)` and passes it to `startGame(sim, sim, null)`.
  - The game loop ticks `offlineSim.tick()` locally; no WebSocket or `:8787`.
- Delve API is on **`IWorld`** (`enterDelve`, `leaveDelve`, `delveRun`, `delveMarks`); `Sim` implements it; HUD calls `this.sim.enterDelve(...)` on the board Enter button.
- Brother Halven (`brother_halven`) spawns at the Collapsed Reliquary door (`-10, -8`) from `NPCS` at sim init.

## Start dev client only

```powershell
cd c:\Users\Sud0S\Documents\Projektit\claudecraft
npm run dev
```

Do **not** run `npm run server`. Open **http://localhost:5173/**.

## Playtest steps

1. Main menu → **Play Offline** (skip login/realm).
2. Pick a class, enter a name (letters only), **Enter World**.
3. You spawn near the chapel ruin (`PLAYER_START` ~ `2, -2`). Brother Halven is ~15 yd west at `-10, -8`.
4. **Level gate:** Collapsed Reliquary requires **level 7**. In Vite dev, offline sim enables `/dev` chat cheats:
   - Press **Enter** to open chat.
   - `/dev level 7`
   - `/dev tp -10 -8` (optional; you can also walk to Halven).
5. **Interact** with Brother Halven (default interact key, or right-click → open delve board).
6. Delve board opens → pick **Normal** or **Heroic** → **Enter**.
7. Confirm delve tracker (top quest tracker area) shows module, objective, affixes.
8. **Visual check:** you should see a KayKit crypt interior (stone floor, walls, blue torchlight) — not a black void. If the screen stays black, hard-refresh and re-enter.
9. Fight trash, progress modules, kill **Deacon Varric** in the finale.
10. **Leave delve** (no HUD button yet): browser console → `__game.sim.leaveDelve()` — returns you to Halven.

## Dev console hooks (`window.__game`)

Exposed after world load in `startGame()`:

| Hook | Use |
|------|-----|
| `__game.sim` | Full `Sim` (offline) — `enterDelve`, `leaveDelve`, `setPlayerLevel`, `player` |
| `__game.world` | `IWorld` seam (same object offline) |
| `__game.hud` | `openDelveBoard(npcEntityId)` |
| `__game.online` | `null` offline |

**Fast path (console):**

```js
const s = __game.sim;
s.setPlayerLevel(7);
const p = s.player;
p.pos.x = -10; p.pos.z = -8;
p.pos.y = 0; // renderer snaps Y on next sync; or walk there
const halven = [...s.entities.values()].find(e => e.templateId === 'brother_halven');
__game.hud.openDelveBoard(halven.id);
// click Enter in UI, or:
s.enterDelve('collapsed_reliquary', 'normal');
```

## Automated sim proof

```powershell
npx vitest run tests/delves.test.ts
```

13 tests cover spatial band, enter/leave lifecycle, death rules, companions, and pet stow — all headless `Sim`, no server.

## What does *not* work offline

- Online-only: realm login, snapshots, `ClientWorld.cmd`, leaderboard persistence, companion mark upgrades tied to server saves.
- `/who` roster (offline shows a notice).
- Leave-delve UI button (API exists; use console or finish/abandon flow when added).
