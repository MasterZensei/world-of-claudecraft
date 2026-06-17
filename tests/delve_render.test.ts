// Delve module stacking and slot detection — guards render/collider alignment.
import { describe, expect, it } from 'vitest';
import {
  defaultDelveModules,
  delveModuleLocal,
  delveModuleStackEndRelZ,
  delveModuleZOffset,
  delveOrigin,
  delveSlotAt,
  DELVE_MODULE_Z_START,
} from '../src/sim/data';
import { DELVE_MODULE_LAYOUTS, type DelveModuleId } from '../src/sim/delve_layout';

const FOUR_MODULE_RUN: DelveModuleId[] = [
  'reliquary_sunken_ossuary',
  'reliquary_bell_niche',
  'reliquary_saintless_hall',
  'reliquary_finale',
];

describe('delve module z stacking', () => {
  it('four-module run offsets increase monotonically; finale zBase > module0', () => {
    const z0 = delveModuleZOffset(FOUR_MODULE_RUN, 0);
    const z1 = delveModuleZOffset(FOUR_MODULE_RUN, 1);
    const z2 = delveModuleZOffset(FOUR_MODULE_RUN, 2);
    const z3 = delveModuleZOffset(FOUR_MODULE_RUN, 3);
    expect(z0).toBe(DELVE_MODULE_Z_START);
    expect(z1).toBeGreaterThan(z0);
    expect(z2).toBeGreaterThan(z1);
    expect(z3).toBeGreaterThan(z2);
    expect(z3).toBeGreaterThan(z0);
  });

  it('stack end rel-z covers the finale boss dais', () => {
    const end = delveModuleStackEndRelZ(FOUR_MODULE_RUN);
    const finaleZ = delveModuleZOffset(FOUR_MODULE_RUN, 3);
    const daisZ = DELVE_MODULE_LAYOUTS.reliquary_finale.dais.z;
    expect(end).toBeGreaterThanOrEqual(finaleZ + daisZ);
  });

  it('default collapsed reliquary chain ends with reliquary_finale', () => {
    const mods = defaultDelveModules('collapsed_reliquary');
    expect(mods[mods.length - 1]).toBe('reliquary_finale');
    expect(mods.length).toBeGreaterThanOrEqual(2);
  });
});

describe('delve slot detection', () => {
  it('module 3 in slot 0 resolves to slot 0, not the nearer slot-1 door', () => {
    const origin = delveOrigin(0, 0);
    const zBase = delveModuleZOffset(FOUR_MODULE_RUN, 3);
    const layout = DELVE_MODULE_LAYOUTS.reliquary_finale;
    const pz = origin.z + zBase + (layout.zMin + layout.zMax) / 2;
    const slot = delveSlotAt(0, pz, FOUR_MODULE_RUN);
    expect(slot).toBe(0);
    const loc = delveModuleLocal(origin.x, pz, FOUR_MODULE_RUN);
    expect(loc.moduleIndex).toBe(3);
    expect(loc.moduleId).toBe('reliquary_finale');
    expect(loc.oz).toBe(origin.z + zBase);
  });
});
