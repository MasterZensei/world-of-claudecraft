// Compact delve module layouts as plain numbers — mirrors dungeon_layout.ts for
// modular 10–20 minute instances (~40yd wide, ~80yd deep). Sim layer: no
// three.js imports.
import type { Collider } from './colliders';
import { type DungeonLayout, layoutColliders } from './dungeon_layout';

export type DelveModuleId =
  | 'reliquary_sunken_ossuary'
  | 'reliquary_bell_niche'
  | 'reliquary_saintless_hall'
  | 'reliquary_finale';

interface GridPoint {
  x: number;
  z: number;
}

interface WallStub {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

function grid(zFrom: number, zTo: number, zStep: number, xs: readonly number[]): GridPoint[] {
  const out: GridPoint[] = [];
  for (let z = zFrom; z <= zTo; z += zStep) {
    for (const x of xs) out.push({ x, z });
  }
  return out;
}

// Shared compact footprint: side walls at |x|=23 (KayKit crypt kit), z -19..61.
const Z_MIN = -19;
const Z_MAX = 61;
const SIDE_Z = 21;
const SIDE_HD = 40;

/** The Sunken Ossuary — burial shelves along the walls, centre-aisle pillars. */
export const RELIQUARY_SUNKEN_OSSUARY_LAYOUT: DungeonLayout = {
  zMin: Z_MIN,
  zMax: Z_MAX,
  sideWallZ: SIDE_Z,
  sideWallHd: SIDE_HD,
  pillars: grid(10, 50, 20, [-14, 14]),
  tombs: grid(16, 44, 14, [-19, 19]),
  stubs: [],
  dais: { x: 0, z: 52, r: 8 },
};

/** The Bell Niche — alcove stubs where handbells hang, open centre passage. */
export const RELIQUARY_BELL_NICHE_LAYOUT: DungeonLayout = {
  zMin: Z_MIN,
  zMax: Z_MAX,
  sideWallZ: SIDE_Z,
  sideWallHd: SIDE_HD,
  pillars: grid(15, 45, 15, [-14, 14]),
  tombs: [],
  stubs: [
    { x: -14, z: 30, hw: 9, hd: 4 },
    { x: 14, z: 30, hw: 9, hd: 4 },
  ],
  dais: { x: 0, z: 50, r: 7 },
};

/** The Saintless Hall — defaced saint-statue alcoves and colonnade rows. */
export const RELIQUARY_SAINTLESS_HALL_LAYOUT: DungeonLayout = {
  zMin: Z_MIN,
  zMax: Z_MAX,
  sideWallZ: SIDE_Z,
  sideWallHd: SIDE_HD,
  pillars: grid(12, 56, 22, [-14, 14]),
  tombs: grid(18, 50, 16, [-19, 19]),
  stubs: [],
  dais: { x: 0, z: 48, r: 8 },
};

/** The Bell-Buried Chamber — boss arena with a cleared centre ring. */
export const RELIQUARY_FINALE_LAYOUT: DungeonLayout = {
  zMin: Z_MIN,
  zMax: Z_MAX,
  sideWallZ: SIDE_Z,
  sideWallHd: SIDE_HD,
  pillars: [
    { x: -14, z: 10 }, { x: 14, z: 10 },
    { x: -14, z: 25 }, { x: 14, z: 25 },
  ],
  tombs: grid(16, 30, 14, [-19, 19]),
  stubs: [],
  dais: { x: 0, z: 55, r: 10 },
};

export const DELVE_MODULE_LAYOUTS: Record<DelveModuleId, DungeonLayout> = {
  reliquary_sunken_ossuary: RELIQUARY_SUNKEN_OSSUARY_LAYOUT,
  reliquary_bell_niche: RELIQUARY_BELL_NICHE_LAYOUT,
  reliquary_saintless_hall: RELIQUARY_SAINTLESS_HALL_LAYOUT,
  reliquary_finale: RELIQUARY_FINALE_LAYOUT,
};

/** Interior collision set for a delve module, in instance-local coordinates. */
export function delveModuleColliders(moduleId: DelveModuleId): Collider[] {
  return layoutColliders(DELVE_MODULE_LAYOUTS[moduleId]);
}

/** Centre-aisle spawn just inside the entrance porch (instance-local). */
export function delveModuleEntry(layout: DungeonLayout): { x: number; z: number } {
  return { x: 0, z: layout.zMin + 8 };
}
