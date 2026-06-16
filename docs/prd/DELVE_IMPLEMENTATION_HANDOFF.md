# Delve System — Implementation Handoff

**Read this first in a fresh chat.** This document plus `docs/prd/delves.md` and `.cursor/plans/delve_system_design_b9ca2faf.plan.md` contain everything needed to implement delves without prior conversation context.

---

## Section A — One-paragraph mission

Implement the **Delve** system for World of ClaudeCraft: replayable 10–20 minute modular instances between quests and dungeons, driven by a new `DelveRun` engine in `src/sim/`, surfaced through `IWorld`, and delivered in **six small PRs** on branch `feature/delves`. Ship the **Collapsed Reliquary** crypt vertical slice (Brother Halven, Acolyte Tessa, Deacon Varric) in PR 4. Critical invariants: spatial band at `DELVE_X_MIN = 3600` (not `instanceOrigin(4+)`), definitive death/pet/daily rules in the PRD, no cross-credit with Hollow Crypt, sim stays DOM-free, all player strings via `t()` in Phase 4.

---

## Section B — Copy-paste starter prompt

```
You are implementing the Delve system for World of ClaudeCraft (repo: c:\Users\Sud0S\Documents\Projektit\claudecraft).

## Read first (mandatory, in order)
1. docs/prd/DELVE_IMPLEMENTATION_HANDOFF.md (this file — full handoff)
2. docs/prd/delves.md (canonical PRD — death, pet stow, daily limits are definitive)
3. .cursor/plans/delve_system_design_b9ca2faf.plan.md (design plan + authored content)
4. Root CLAUDE.md, src/sim/CLAUDE.md, src/net/CLAUDE.md

## Branch
Work on `feature/delves` branched from `main`. Do not push unless asked.

## Execute Phase 1 first
Phase 1 scope ONLY (see Section C PR 1):
- Append Delve types to src/sim/types.ts
- Add DELVE_X_MIN, delveOrigin(), isDelvePos(), delveAt() to src/sim/data.ts
- Placeholder content src/sim/content/delves/_placeholder.ts
- DelveRun lifecycle stubs in sim.ts (new // Delves banner at end)
- IWorld + server/game.ts + online.ts wire for enter_delve / leave_delve
- tests/delves.test.ts (delveOrigin band, determinism skeleton)

## Hard rules
- DELVE_X_MIN = 3600 — past arena (ARENA_X_MIN=2800). Never use instanceOrigin(4+).
- Death: 1st = module entry 50% HP; 2nd = fail, eject to brother_halven, no completion rewards.
- releaseSpirit in delve uses delveAt(), not dungeonAt().
- enterDelve: stow hunter PetState, despawn warlock demon; restore on leave/complete.
- delveDaily on PlayerMeta: { date UTC, firstClearXp Set, markClears } — reset on date change.
- Do NOT edit brother_aldric, sexton_marrow quests, or InstanceSlot/claimInstance.
- Defer hud.ts full UI until Phase 4; Phase 1 tracker via events only.
- npm test must stay green after each PR.

## Verify
npx vitest run tests/delves.test.ts
npm test

Report what you changed and which PR phase you completed.
```

---

## Section C — Work breakdown (6 PRs)

### PR 0 — Documentation (this PR)

| | |
|---|---|
| **Scope** | `docs/prd/delves.md`, `docs/prd/DELVE_IMPLEMENTATION_HANDOFF.md`, plan gap resolution |
| **Files to touch** | `docs/prd/*`, `.cursor/plans/delve_system_design_b9ca2faf.plan.md` |
| **Files NOT to touch** | Any runtime code |
| **Tests** | None |
| **Commit** | `docs(prd): add delves system spec and implementation handoff` |
| **Merge checklist** | [ ] PRD has definitive death/pet/daily rules [ ] Handoff prompt self-contained |

---

### PR 1 — Engine skeleton (Phase 1)

| | |
|---|---|
| **Scope** | Types, spatial band, placeholder delve, `enterDelve`/`leaveDelve`/`completeDelve` stubs, `updateDelveRuns`, module picker (seeded), `kill_boss` objective, basic marks meta, IWorld + wire + snapshots |
| **Files to touch** | `src/sim/types.ts` (append), `src/sim/data.ts` (append after arena block ~L215), `src/sim/content/delves/_placeholder.ts`, `src/sim/sim.ts` (new `// Delves` section at end), `src/world_api.ts`, `src/net/online.ts`, `server/game.ts`, `tests/delves.test.ts` |
| **Files NOT to touch** | `hud.ts`, `i18n.ts` (except sim_i18n if emitting new log strings), `InstanceSlot`, `claimInstance`, `enterDungeon`, `brother_aldric` NPC defs |
| **Tests** | `npx vitest run tests/delves.test.ts` — `delveOrigin` x ≥ 3600; same seed → same module order; enter/leave smoke |
| **Commit** | `feat(delve): add DelveRun engine skeleton and spatial band` |
| **Merge checklist** | [ ] `isDelvePos` does not overlap arena [ ] `dungeonAt` null for delve x [ ] `npm test` green [ ] No hud.ts changes |

---

### PR 2 — Interactables & affixes (Phase 2)

| | |
|---|---|
| **Scope** | `delve_interact` dispatch, pressure plate + locked door + destructible wall, `DELVE_AFFIXES` registry, tier affix roll at enter, affix hooks on spawn/detectRange |
| **Files to touch** | `src/sim/sim.ts` (Delves section), `src/sim/content/delves/affixes.ts`, `src/sim/data.ts`, `src/world_api.ts`, `src/net/online.ts`, `server/game.ts`, `tests/delves.test.ts` |
| **Files NOT to touch** | `hud.ts`, `collapsed_reliquary.ts` (not yet), render files |
| **Tests** | `npx vitest run tests/delves.test.ts` — plate triggers door; affix modifies spawn |
| **Commit** | `feat(delve): add interactables and affix registry` |
| **Merge checklist** | [ ] Three mechanics work in placeholder module [ ] Heroic affix roll deterministic per seed |

---

### PR 3 — Companion framework (Phase 3)

| | |
|---|---|
| **Scope** | `DelveCompanionDef`, `updateDelveCompanion` (fork `updatePet` ~L4131), pet stow/restore on enter/leave, marks spend ranks, death rules FR-3.x, `releaseSpirit` delve branch, `delveDaily` tracking |
| **Files to touch** | `src/sim/sim.ts`, `src/sim/types.ts`, `src/sim/content/delves/companions.ts`, `src/world_api.ts`, `src/net/online.ts`, `server/game.ts`, `tests/delve_companion.test.ts`, `tests/delves.test.ts` |
| **Files NOT to touch** | `hud.ts` (companion bar deferred), full Tessa content |
| **Tests** | `npx vitest run tests/delve_companion.test.ts tests/delves.test.ts` — solo companion spawn; hunter pet stowed/restored; 2nd death ejects |
| **Commit** | `feat(delve): companion framework, death rules, and daily limits` |
| **Merge checklist** | [ ] Pet stow on enter [ ] 50% HP first death [ ] Second death no completion chest [ ] UTC daily reset |

---

### PR 4 — Crypt vertical slice (Phase 4)

| | |
|---|---|
| **Scope** | `collapsed_reliquary.ts`, `brother_halven` NPC, modules, `deacon_varric` boss, Tessa ranks, Normal/Heroic, `delve_layout.ts`, `render/delve.ts`, full i18n all locales, `scripts/delve_crypt.mjs` |
| **Files to touch** | `src/sim/content/delves/collapsed_reliquary.ts`, `src/sim/content/zone1.ts` (add Halven only), `src/sim/delve_layout.ts`, `src/render/delve.ts`, `src/render/interior_kit.ts`, `src/sim/colliders.ts`, `src/render/renderer.ts`, `src/ui/hud.ts`, `src/ui/i18n.ts`, `src/ui/entity_i18n.ts`, `src/ui/sim_i18n.ts`, `src/game/interactions.ts`, `scripts/delve_crypt.mjs` |
| **Files NOT to touch** | `brother_aldric` questIds, `sexton_marrow`, `deacon_voss`, dungeon defs |
| **Tests** | `npm test`, `npx vitest run tests/localization_fixes.test.ts`, `node scripts/delve_crypt.mjs` (needs dev server + `ALLOW_DEV_COMMANDS=1` locally only) |
| **Commit** | `feat(delve): Collapsed Reliquary crypt vertical slice` |
| **Merge checklist** | [ ] All locales for delveUi.* [ ] sim_i18n matchers [ ] No q_sexton cross-credit [ ] Boss telegraphs [ ] E2E green |

---

### PR 5 — Catalog expansion (Phase 5, follow-up)

| | |
|---|---|
| **Scope** | Additional themed delves (mine, sewer, vault) reusing module library |
| **Files to touch** | `src/sim/content/delves/*.ts`, layouts, i18n |
| **Files NOT to touch** | Engine unless new mechanic required |
| **Tests** | Per-delve test file or extend `tests/delves.test.ts` |
| **Commit** | `feat(delve): add <theme> delve content` |
| **Merge checklist** | [ ] Reuses engine without sim.ts refactor [ ] Theme affixes from pool |

---

### PR 6 — Colliders & render routing (can merge with PR 1 or 4)

If PR 1 only adds data helpers, land collider/render branches in PR 1 or early PR 4:

| | |
|---|---|
| **Scope** | `colliders.ts` `isDelvePos` branch; `renderer.ts` delve instance drawing; login position sanitization |
| **Files** | `src/sim/colliders.ts` ~L225, `src/render/renderer.ts`, `src/sim/sim.ts` ~L649 |
| **Commit** | `feat(delve): wire delve spatial routing in colliders and renderer` |

---

## Section D — Storyline integration

### Gravecaller arc (existing)
- **Brother Aldric** (`brother_aldric`, Fallen Chapel, zone 1) gives quests `q_whispers` → `q_names_of_the_dead` → `q_silence_the_call` → `q_sexton` (kill **Sexton Marrow** in **Hollow Crypt** dungeon) → `q_gravecallers_trail`.
- Hollow Crypt uses dungeon index 0, `instanceOrigin(0, slot)` at x ≈ 900.

### Delve arc (new, parallel)
- **Brother Halven** (`brother_halven`, **new NPC**) tends the chapel ruin east of Aldric. He offers **The Collapsed Reliquary** delve — a *shifted burial vault* below the chapel, separate from the Hollow Crypt dungeon instance.
- Boss **Deacon Varric** (`deacon_varric`) is delve-only. Not **Sexton Marrow** (dungeon), not **Deacon Voss** (zone 2 Fen mire, `deacon_voss` id).
- **Acolyte Tessa** (`companion_tessa`) is a narrative ally for delves; she is not a hunter pet and not a party priest NPC.

### Conflict avoidance
| Entity | Delve? | Dungeon/Quest? | Action |
|--------|--------|----------------|--------|
| `brother_aldric` | No | Yes (quests) | Do not modify |
| `brother_halven` | Yes (board) | No | **Create new** |
| `sexton_marrow` | No | Hollow Crypt boss | No cross-credit |
| `deacon_voss` | No | Zone 2 overworld boss | Different id from `deacon_varric` |
| `deacon_varric` | Yes (finale) | No | Delve boss only |

---

## Section E — i18n checklist

### Namespace: `delveUi.*` (add to `en` first, then every locale in `translations`)

**Board & flow**
- `delveUi.board.title`
- `delveUi.board.enter`
- `delveUi.board.tier.normal`
- `delveUi.board.tier.heroic`
- `delveUi.board.companion.pick`
- `delveUi.tracker.objective`
- `delveUi.tracker.module` (e.g. "Module {current} of {total}")
- `delveUi.tracker.affix`
- `delveUi.summary.title`
- `delveUi.summary.marks`
- `delveUi.summary.loreUnlock`
- `delveUi.death.warning` (second death imminent)
- `delveUi.run.failed`

**Brother Halven**
- `delveUi.npc.halven.greeting`
- `delveUi.intro.normal`
- `delveUi.intro.heroic`

**Module flavor** (one key each)
- `delveUi.module.reliquary_sunken_ossuary`
- `delveUi.module.reliquary_bell_niche`
- `delveUi.module.reliquary_saintless_hall`

**Tessa barks**
- `delveUi.companion.tessa.combat_start`
- `delveUi.companion.tessa.low_hp`
- `delveUi.companion.tessa.trap_spotted`
- `delveUi.companion.tessa.boss_pull`
- `delveUi.companion.tessa.completion`
- `delveUi.companion.tessa.rank.1` through `.5` (rank fantasy labels)

**Boss Varric telegraphs** (`delveUi.boss.varric.*`)
- `bell.emote`, `bell.log`, `bell.warning`, `bell.impact`, `bell.lesson`
- `raise.emote`, `raise.log`, `raise.warning`, `raise.object`, `raise.interrupt_ok`, `raise.interrupt_fail`, `raise.lesson`
- `pull`, `mid60`, `mid30`, `defeat`
- `intro` (finale pull line)

**Lore journal**
- `delveUi.lore.eastbrook_ledger`
- `delveUi.lore.first_collapse`
- `delveUi.lore.gravecaller_mark`
- `delveUi.lore.bell_below`
- `delveUi.lore.tessa_note`

**Affix display names**
- `delveUi.affix.restless_graves`, `bad_air`, `candleblind`, `old_mechanisms`, `flooded_paths`, `grave_tax`, `unstable_roof`, `cult_remnants`
- `delveUi.blessing.chapel_candle`

**Chest**
- `delveUi.chest.flavor`

### Entity manifest (`src/ui/entity_i18n.ts`)

Add entries in Phase 4 for:
- `kind: 'npc'` — `brother_halven`
- `kind: 'mob'` — `deacon_varric`, `acolyte_tessa`, `raised_bonewalker`
- `kind: 'delve'` — new kind if added: `collapsed_reliquary` fields `name`, `enterText`, `leaveText`

### Sim/server emit matchers (`src/ui/sim_i18n.ts` + `server_i18n.ts`)

Any combat log or system message emitted from sim with English literals needs matcher entries in the same PR (S3 guard: `tests/localization_fixes.test.ts`).

---

## Section F — Verification commands

```powershell
# Per-PR minimum
npx vitest run tests/delves.test.ts
npx vitest run tests/delve_companion.test.ts   # Phase 3+

# Before merge any PR
npm test

# Phase 4 i18n guard
npx vitest run tests/localization_fixes.test.ts

# Build sanity
npm run build

# Snapshot regression (when self fields added)
npx vitest run tests/snapshots.test.ts

# E2E Crypt slice (Phase 4 — terminal 1: npm run server; terminal 2: npm run dev)
# Local only; script may use ALLOW_DEV_COMMANDS=1 — never commit that env var enabled
node scripts/delve_crypt.mjs
```

---

## Section G — Known conflicts to avoid

| Conflict | Detail | Mitigation |
|----------|--------|------------|
| **Arena x-band** | `ARENA_X_MIN = 2800`, `ARENA_X = 3000`. Old plan used `instanceOrigin(4)` → x=3300 inside arena band. | `DELVE_X_MIN = 3600`, dedicated `delveOrigin()` |
| **dungeonAt()** | Returns null when `x >= ARENA_X_MIN` (~L178 data.ts) | `delveAt()` separate; colliders check `isDelvePos` before dungeon branch |
| **hud.ts** | ~5k lines; active UI PRs | Phase 1–2: events only; full windows Phase 4 |
| **sim.ts** | High churn on main/release branches | New `// Delves` banner at file end only |
| **brother_aldric** | Zone 1 quest hub | New `brother_halven` at different coords; never edit Aldric `questIds` |
| **deacon_voss** | Zone 2 boss id exists | Delve boss is `deacon_varric` (different template) |
| **sexton_marrow / q_sexton** | Hollow Crypt dungeon quest | Separate x-band; no kill credit |
| **releaseSpirit** | Uses `dungeonAt()` ~L5058 | Branch `delveAt()` first |
| **Login saved pos** | `addPlayer` sanitizes dungeon positions ~L649 | Extend for `isDelvePos` → Halven door |
| **Pet vs companion** | Both `ownerId` mobs | Stow hunter/warlock pet on `enterDelve` |
| **manifest.generated.ts** | Hand-edit forbidden | `npm run build` regenerates |
| **feat/arena-2v2** | `updateAmbience` arena blocks | Add `else if (isDelvePos(px))` separately |
| **feature/expansion-levels-1-20** | Zone 1 NPC placement | Place Halven at new coord; don't move Aldric |

---

## Quick reference — spatial constants

```
x ≤ 600        overworld
600–2799       dungeons (instanceOrigin indices 0–3 at 900/1500/2100/2700)
≥ 2800         arena (ARENA_X = 3000)
≥ 3600         delves (DELVE_X_MIN)  ← NEW
```

```typescript
// src/sim/data.ts — add after arena block
export const DELVE_X_MIN = 3600;
export const DELVE_SLOT_COUNT = 6;
export function delveOrigin(delveIndex: number, slot: number): { x: number; z: number };
export function isDelvePos(x: number): boolean;
export function delveAt(x: number): DelveDef | null;
```

---

## Quick reference — definitive rules (do not re-litigate)

1. **Death:** 1st → module entry @ 50% HP; 2nd → fail, eject to `brother_halven`, no completion rewards (trash copper ok).
2. **releaseSpirit:** use `delveAt`, not `dungeonAt`.
3. **Pets:** stow on enter, restore on leave/complete.
4. **Daily:** `delveDaily: { date, firstClearXp, markClears }` on PlayerMeta; UTC midnight reset.
5. **Marks:** meta counter on PlayerMeta, not inventory.
6. **Cross-credit:** default none with Hollow Crypt quests.

---

*Last updated: 2026-06-17 — PR 0 handoff package.*
