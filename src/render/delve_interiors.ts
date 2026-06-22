// Delve module interior placement — v1 reuses the crypt KayKit kit.
import { DELVE_MODULES } from '../sim/data';
import { type DelveModuleId } from '../sim/delve_layout';
import { DungeonInteriors } from './dungeon';

/** Build one delve module at a world origin (v1: crypt KayKit kit + delve layout). */
export function buildDelveModule(
  dungeons: DungeonInteriors,
  moduleId: DelveModuleId,
  ox: number,
  oz: number,
): Promise<void> {
  const mod = DELVE_MODULES[moduleId];
  const interior = mod?.interior ?? 'crypt';
  // Delve origins sit at x≈4800 (past all overworld dungeon + arena bands).
  // buildInterior derives layout and variant from interior+ox; at x≈4800 the
  // crypt kit resolves to 'crypt' variant (blue-flame torches). Per-module
  // reliquary dressing (ossuary / bell niche / saintless hall / finale) and the
  // 'delve' ember-red torch variant require dungeon.ts to support those args;
  // adapt this call once buildInterior exposes the extended signature.
  return dungeons.buildInterior(interior, ox, oz);
}
