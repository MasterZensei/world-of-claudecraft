import { describe, expect, it } from 'vitest';

import { Sim } from '../src/sim/sim';
import { terrainHeight } from '../src/sim/world';

function makeSim(cls: 'hunter' | 'warrior' = 'warrior', seed = 42) {
  return new Sim({ seed, playerClass: cls, autoEquip: true });
}

function teleport(sim: Sim, x: number, z: number) {
  const p = sim.player;
  p.pos.x = x;
  p.pos.z = z;
  p.pos.y = terrainHeight(x, z, sim.cfg.seed);
  p.prevPos = { ...p.pos };
}

describe('delve companions', () => {
  it('solo enter spawns Acolyte Tessa', () => {
    const sim = makeSim();
    sim.setPlayerLevel(10);
    teleport(sim, 0, 0);
    sim.enterDelve('collapsed_reliquary', 'normal');
    const run = sim.delveRunForPlayer(sim.playerId)!;
    expect(run.companion?.companionId).toBe('companion_tessa');
    expect(sim.companionState?.companionId).toBe('companion_tessa');
  });

  it('stows hunter pet on enter and restores on leave', () => {
    const sim = makeSim('hunter');
    sim.setPlayerLevel(10);
    const boar = [...sim.entities.values()].find((e) => e.templateId === 'wild_boar' && e.ownerId === null);
    (sim as any).completeTame(sim.player, boar!);
    expect(sim.petOf(sim.playerId)?.templateId).toBe('wild_boar');
    teleport(sim, 0, 0);
    sim.enterDelve('collapsed_reliquary', 'normal');
    expect(sim.petOf(sim.playerId)).toBeNull();
    sim.leaveDelve();
    expect(sim.petOf(sim.playerId)?.templateId).toBe('wild_boar');
  });

  it('barks on boss pull', () => {
    const sim = makeSim();
    sim.setPlayerLevel(10);
    teleport(sim, 0, 0);
    sim.enterDelve('collapsed_reliquary', 'normal');
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    const boss = [...sim.entities.values()].find((e) => e.templateId === 'deacon_varric');
    (sim as any).aggroMob(boss, sim.player, false);
    const bark = sim.tick().find((e) => e.type === 'companionBark');
    expect(bark?.barkId).toBe('boss_pull');
  });

  it('companion upgrade rank 2 costs 4 marks', () => {
    const sim = makeSim();
    const meta = (sim as any).players.get(sim.playerId);
    meta.delveMarks = 10;
    meta.copper = 100;
    sim.companionUpgrade('companion_tessa');
    expect(meta.companionUpgrades.companion_tessa).toBe(2);
    expect(meta.delveMarks).toBe(6);
  });

  it('companion heals owner on interval', () => {
    const sim = makeSim();
    sim.setPlayerLevel(10);
    teleport(sim, 0, 0);
    sim.enterDelve('collapsed_reliquary', 'normal');
    const run = sim.delveRunForPlayer(sim.playerId)!;
    const companion = sim.entities.get(run.companion!.entityId)!;
    sim.player.hp = Math.max(1, Math.round(sim.player.maxHp * 0.5));
    companion.wanderTimer = 0;
    for (let i = 0; i < 20 * 4; i++) {
      sim.tick();
      if (sim.player.hp > Math.round(sim.player.maxHp * 0.5)) break;
    }
    expect(sim.player.hp).toBeGreaterThan(Math.round(sim.player.maxHp * 0.5));
  });
});
