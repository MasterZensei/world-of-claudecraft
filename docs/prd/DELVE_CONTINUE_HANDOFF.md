# Delve render fix — continue handoff

Branch: **`feature/delves`** (do not push unless operator asks).

## Git log (key commits, newest first)

| Commit | Summary |
|--------|---------|
| `7ef19368` | `fix(delves): align delve camera and walkable bounds with module floor` |
| `4d6b0471` | `fix(delves): full module render, tombstone exit, module objectives |
| `0ecde560` | `fix(render): restore overworld ambience on offline load` |
| `5cdee1ca` | `fix(delves): camera bounds, module exit portal, companion assist` |
| `2a126df2` | `fix(render): build delve crypt interiors at delve origin` |
| `11959e4f` | `fix(delves): enable offline delve playtest` |
| Earlier | Phase 1 sim lifecycle, layouts, colliders, HUD board, tests |

After this handoff session: look for commits `fix(render): prebuild all delve module interiors` and `docs(prd): delve continue handoff for render fix`.

## What works

- **Sim**: `enterDelve` / `leaveDelve`, module pick (`pickDelveModules`), spawn, tombstone exit portal, `advanceDelveModule`, affixes, companion (Tessa), objectives, colliders per module layout.
- **HUD**: delve board, tier select, tracker, offline playtest entry (`hud.ts` dev path).
- **Progression**: tombstone interact → next module teleports party to centered entry (`delveModuleEntry`).

## What was broken (root cause)

**Slot mis-detection when the player advances north through stacked modules.**

- Six delve instance slots share the same `x` but their door origins are **500u apart on z** (`DELVE_SLOT_SPACING`).
- `delveModuleLocal` and `ensureDelveInteriorsNear` used **nearest slot door by |z - slot.z|**.
- Module 0 entry is ~`origin.z - 3`; module 3 finale is ~`origin.z + 330`. Slot 1's door (`origin.z + 500`) becomes *closer in z* than slot 0 once the player passes module 1.
- Renderer then built interiors at **slot 1's oz** while the sim placed the player at **slot 0 + module z offset** → void/black from module 2 onward, wrong collider band, camera clamped to the wrong room box.

Secondary issues already addressed in `7ef19368`: delve camera wall occlusion disabled; per-module camera AABB from `delveModuleLocal`.

## Fix applied (this session)

1. **`src/sim/data.ts`**: `delveSlotAt` (containment in module stack), `delveModuleStackEndRelZ`; `delveModuleLocal` uses containment slot pick.
2. **`src/render/renderer.ts`**: `buildAllDelveModules` prebuilds **all** modules at enter (`delveEntered` event) and on proximity; keys `delve:{delveId}:{slot}:{moduleId}`; uses `sim.delveRun.origin` + `slot` when active; dev `console.warn` on build failure.
3. **`src/world_api.ts` + `sim.delveRunWire`**: expose `origin` and `slot` on `DelveRunInfo` for the renderer.
4. **Tests**: `tests/delve_render.test.ts`, extended `tests/delve_colliders.test.ts`.

## Files to edit for render issues

| File | Role |
|------|------|
| `src/render/renderer.ts` | `ensureDelveInteriorsNear`, `buildAllDelveModules`, `prebuildDelveInteriors`, camera delve branch in `updateCamera` |
| `src/render/delve_interiors.ts` | `buildDelveModule` → `DungeonInteriors.buildInterior` with per-module layout |
| `src/sim/delve_layout.ts` | Module footprints (`zMin`/`zMax`, dais, pillars) — must match KayKit floor span (80u) |
| `src/sim/data.ts` | `delveOrigin`, `delveModuleZOffset`, `delveSlotAt`, `delveModuleLocal` |
| `src/render/dungeon.ts` | KayKit placement (`placeFloor`, `placeDais`) if geometry missing inside a correctly placed module |

## Coordinate cheat sheet (slot 0, collapsed reliquary, 4 modules)

```
delveOrigin(0, 0) → x = 3600, z = -1250
DELVE_MODULE_Z_START = 8
Module span = 80 (zMax - zMin), gap = 20

module 0 zBase = 8    → world oz = -1242
module 1 zBase = 108  → world oz = -1142
module 2 zBase = 208  → world oz = -1042
module 3 zBase = 308  → world oz = -942  (finale / reliquary_finale)

Finale boss dais local z = 55 → world z ≈ -1250 + 308 + 55 = -887
```

Player at finale center aisle: `delveModuleLocal` → `moduleIndex: 3`, `moduleId: 'reliquary_finale'`, `oz: origin.z + 308`.

## Offline playtest steps

1. `npm run dev` (client :5173).
2. Optional: `npm run server` if testing online wire; offline sim works without server.
3. Level 10+ character (or dev commands if enabled).
4. Open delve board near Brother Halven → **Collapsed Reliquary** → enter.
5. **Module 0**: crypt floor/walls visible; player centered on entry aisle (`x≈0` local).
6. Clear trash → tombstone exit → **module 1+**: geometry still visible (not void).
7. Reach **Bell-Buried finale**: boss platform (dais z=55) has floor tiles + glow; Deacon Varric spawns.
8. Camera: third-person, no wall-pin void; yaw from mouse still works.

## i18n

Deferred on this branch. New player-facing strings from sim (`advanceDelveModule` log, etc.) still need `sim_i18n.ts` / full locale keys before ship. Do not block render QA on i18n.

## Verification commands

```powershell
npx vitest run tests/delve_render.test.ts tests/delve_colliders.test.ts tests/delves.test.ts
```

## Copy-paste starter prompt (new chat)

```
Branch feature/delves at c:\Users\Sud0S\Documents\Projektit\claudecraft.

Read docs/prd/DELVE_CONTINUE_HANDOFF.md first.

Delve sim/HUD work; render was fixed by slot-containment + prebuild-all-modules.
If void/black persists: trace delveSlotAt → buildAllDelveModules keys vs player
world (x,z) and sim.delveRun.origin/slot. Playtest offline through finale.

Do not push. Run delve vitest files after changes. i18n still deferred.
```
