// Delve system — spatial band and registry smoke tests (Phase 1 skeleton).
import { describe, expect, it } from 'vitest';
import {
  ARENA_X,
  ARENA_X_MIN,
  DELVE_X_MIN,
  DELVE_LIST,
  DELVES,
  delveAt,
  delveOrigin,
  dungeonAt,
  isDelvePos,
} from '../src/sim/data';

describe('delve spatial band', () => {
  it('DELVE_X_MIN is past the arena band', () => {
    expect(DELVE_X_MIN).toBeGreaterThan(ARENA_X);
    expect(DELVE_X_MIN).toBeGreaterThan(ARENA_X_MIN);
  });

  it('delveOrigin places instances at or beyond DELVE_X_MIN', () => {
    const o = delveOrigin(0, 0);
    expect(o.x).toBeGreaterThanOrEqual(DELVE_X_MIN);
    expect(delveOrigin(1, 2).x).toBe(DELVE_X_MIN + 600);
  });

  it('isDelvePos and delveAt agree; dungeonAt returns null for delve x', () => {
    const x = delveOrigin(0, 0).x;
    expect(isDelvePos(x)).toBe(true);
    expect(delveAt(x)?.id).toBe('delve_placeholder');
    expect(dungeonAt(x)).toBeNull();
  });

  it('arena and dungeon bands do not overlap delve band', () => {
    expect(isDelvePos(ARENA_X)).toBe(false);
    expect(isDelvePos(2700)).toBe(false);
    expect(isDelvePos(DELVE_X_MIN)).toBe(true);
  });
});

describe('delve registry', () => {
  it('exports placeholder delve for Phase 1', () => {
    expect(DELVES.delve_placeholder).toBeDefined();
    expect(DELVE_LIST.length).toBeGreaterThanOrEqual(1);
  });
});
