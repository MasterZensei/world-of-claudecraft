// Delve system — spatial band, lifecycle, death rules, and pet stow (Phase 1).
import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
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
import { terrainHeight } from '../src/sim/world';

function makeSim(cls: 'warrior' | 'warlock' = 'warrior', seed = 42) {
  return new Sim({ seed, playerClass: cls, autoEquip: true });
}

function teleport(sim: Sim, x: number, z: number) {
  const p = sim.player;
  p.pos.x = x;
  p.pos.z = z;
  p.pos.y = terrainHeight(x, z, sim.cfg.seed);
  p.prevPos = { ...p.pos };
}

function castAndFinish(sim: Sim, id: string) {
  sim.castAbility(id);
  for (let i = 0; i < 20 * 12 && sim.player.castingAbility; i++) sim.tick();
}

function killPlayer(sim: Sim) {
  (sim as any).dealDamage(null, sim.player, sim.player.maxHp + 100, false, 'physical', null, 'hit', true);
}

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

describe('delve lifecycle', () => {
  it('enter and leave toggle delve position band', () => {
    const sim = makeSim();
    teleport(sim, DELVES.delve_placeholder.doorPos.x, DELVES.delve_placeholder.doorPos.z);
    sim.enterDelve('delve_placeholder', 'normal');
    expect(isDelvePos(sim.player.pos.x)).toBe(true);
    const run = sim.delveRunForPlayer(sim.playerId);
    expect(run).not.toBeNull();
    expect(run!.modules.length).toBeGreaterThan(0);
    sim.leaveDelve();
    expect(isDelvePos(sim.player.pos.x)).toBe(false);
  });

  it('same seed picks the same module order', () => {
    const runModules = (seed: number) => {
      const sim = makeSim('warrior', seed);
      teleport(sim, 0, 0);
      sim.enterDelve('delve_placeholder', 'normal');
      const run = sim.delveRunForPlayer(sim.playerId)!;
      return [...run.modules];
    };
    expect(runModules(100)).toEqual(runModules(100));
    expect(runModules(200)).toEqual(runModules(200));
  });
});

describe('delve death rules', () => {
  it('first death respawns at module entry with 50% HP', () => {
    const sim = makeSim();
    teleport(sim, 0, 0);
    sim.enterDelve('delve_placeholder', 'normal');
    const entry = { ...sim.player.pos };
    killPlayer(sim);
    expect(sim.player.dead).toBe(true);
    sim.releaseSpirit();
    expect(sim.player.dead).toBe(false);
    expect(sim.player.hp).toBe(Math.round(sim.player.maxHp * 0.5));
    expect(isDelvePos(sim.player.pos.x)).toBe(true);
    expect(Math.abs(sim.player.pos.x - entry.x)).toBeLessThan(1);
  });

  it('second death fails the run and ejects to the board door', () => {
    const sim = makeSim();
    teleport(sim, 0, 0);
    sim.enterDelve('delve_placeholder', 'normal');
    killPlayer(sim);
    sim.releaseSpirit();
    killPlayer(sim);
    sim.releaseSpirit();
    expect(isDelvePos(sim.player.pos.x)).toBe(false);
    expect(sim.player.dead).toBe(false);
    expect(sim.player.hp).toBe(sim.player.maxHp);
    const door = DELVES.delve_placeholder.doorPos;
    expect(Math.hypot(sim.player.pos.x - door.x, sim.player.pos.z - (door.z - 4))).toBeLessThan(2);
  });
});

describe('delve pet stow', () => {
  it('stows warlock demon on enter and restores on leave', () => {
    const sim = makeSim('warlock');
    sim.setPlayerLevel(10);
    castAndFinish(sim, 'summon_imp');
    expect(sim.petOf(sim.playerId)).not.toBeNull();
    teleport(sim, 0, 0);
    sim.enterDelve('delve_placeholder', 'normal');
    expect(sim.petOf(sim.playerId)).toBeNull();
    sim.leaveDelve();
    expect(sim.petOf(sim.playerId)).not.toBeNull();
    expect(sim.petOf(sim.playerId)!.templateId).toBe('imp');
  });
});
