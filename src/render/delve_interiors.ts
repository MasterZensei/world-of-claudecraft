// Delve module interior placement — v1 reuses the crypt KayKit kit.
import { DungeonInteriors } from './dungeon';

/** Build one delve module at an instance origin (v1: crypt interior kit). */
export function buildDelveModule(
  dungeons: DungeonInteriors,
  moduleId: string,
  ox: number,
  oz: number,
): Promise<void> {
  void moduleId;
  return dungeons.buildInterior('crypt', ox, oz);
}
