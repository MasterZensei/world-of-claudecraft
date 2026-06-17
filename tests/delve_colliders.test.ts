// Delve module layout collision smoke tests (spatial band PR 4 partial).
import { describe, expect, it } from 'vitest';
import { isBlocked, resolvePosition } from '../src/sim/colliders';
import { delveOrigin, delveModuleZOffset, DELVE_MODULE_Z_START } from '../src/sim/data';
import {
  DELVE_MODULE_LAYOUTS,
  delveModuleEntry,
  type DelveModuleId,
} from '../src/sim/delve_layout';

const SEED = 42;

const ENTRY_MODULES: DelveModuleId[] = [
  'reliquary_sunken_ossuary',
  'reliquary_bell_niche',
];

describe('delve module colliders', () => {
  for (const moduleId of ENTRY_MODULES) {
    it(`${moduleId} entry is walkable at delve origin`, () => {
      const origin = delveOrigin(0, 0);
      const entry = delveModuleEntry(DELVE_MODULE_LAYOUTS[moduleId]);
      expect(isBlocked(SEED, origin.x + entry.x, origin.z + 8 + entry.z, 0.5)).toBe(false);
    });
  }

  it('side walls block movement at module perimeter', () => {
    const origin = delveOrigin(0, 0);
    const layout = DELVE_MODULE_LAYOUTS.reliquary_saintless_hall;
    const midZ = (layout.zMin + layout.zMax) / 2;
    expect(isBlocked(SEED, origin.x + 23, origin.z + DELVE_MODULE_Z_START + midZ, 0.5)).toBe(true);
  });

  it('finale boss dais center is walkable at module 3 z offset', () => {
    const origin = delveOrigin(0, 0);
    const modules: DelveModuleId[] = [
      'reliquary_sunken_ossuary',
      'reliquary_bell_niche',
      'reliquary_saintless_hall',
      'reliquary_finale',
    ];
    const layout = DELVE_MODULE_LAYOUTS.reliquary_finale;
    const zBase = delveModuleZOffset(modules, 3);
    const wx = origin.x;
    const wz = origin.z + zBase + layout.dais.z;
    const res = resolvePosition(SEED, wx, wz, 0.5, modules);
    expect(Math.abs(res.x - wx)).toBeLessThan(0.05);
    expect(Math.abs(res.z - wz)).toBeLessThan(0.05);
  });
});
