// Delve module layout collision smoke tests (spatial band PR 4 partial).
import { describe, expect, it } from 'vitest';
import { isBlocked } from '../src/sim/colliders';
import { delveOrigin } from '../src/sim/data';
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
      expect(isBlocked(SEED, origin.x + entry.x, origin.z + entry.z, 0.5)).toBe(false);
    });
  }

  it('side walls block movement at module perimeter', () => {
    const origin = delveOrigin(0, 0);
    const layout = DELVE_MODULE_LAYOUTS.reliquary_saintless_hall;
    const midZ = (layout.zMin + layout.zMax) / 2;
    expect(isBlocked(SEED, origin.x + 23, origin.z + midZ, 0.5)).toBe(true);
  });
});
