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
  // Delve origins sit past the dungeon x-bands; force crypt dressing (not bastion).
  return dungeons.buildInterior(interior, ox, oz, layout, 'crypt');
}
