// Delve module interior placement — v1 reuses the crypt KayKit kit.
import { DELVE_MODULES } from '../sim/data';
import { DELVE_MODULE_LAYOUTS, type DelveModuleId } from '../sim/delve_layout';
import { DungeonInteriors } from './dungeon';

/** Build one delve module at a world origin (v1: crypt KayKit kit + delve layout). */
export function buildDelveModule(
  dungeons: DungeonInteriors,
  moduleId: DelveModuleId,
  ox: number,
  oz: number,
): Promise<void> {
  const mod = DELVE_MODULES[moduleId];
  const layout = DELVE_MODULE_LAYOUTS[moduleId];
  const interior = mod?.interior ?? 'crypt';
  // Delve origins sit at x≈3600 (past all overworld dungeon bands); use the
  // 'delve' variant so their ember-red torches distinguish them from the
  // overworld Hollow Crypt ('crypt' = blue flame) without changing that look.
  return dungeons.buildInterior(interior, ox, oz, layout, 'delve');
}
