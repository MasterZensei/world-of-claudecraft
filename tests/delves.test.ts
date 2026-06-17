// Delve system — spatial band, lifecycle, death rules, and pet stow (Phase 1).

import { describe, expect, it } from 'vitest';

import { Sim } from '../src/sim/sim';
import { DELVE_MODULE_LAYOUTS } from '../src/sim/delve_layout';

import {

  ARENA_X,

  ARENA_X_MIN,

  DELVE_BAND_X_MIN,

  DELVE_X_MIN,

  DELVE_LIST,

  DELVES,

  MOBS,

  delveAt,

  delveOrigin,

  delveModuleZOffset,

  dungeonAt,

  isArenaPos,

  isDelvePos,

} from '../src/sim/data';

import { createMob } from '../src/sim/entity';
import { terrainHeight } from '../src/sim/world';
import { solveLockActions } from '../src/sim/lockpick';



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

function enterReliquary(sim: Sim, tier: 'normal' | 'heroic' = 'normal') {
  sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
  const door = DELVES.collapsed_reliquary.doorPos;
  teleport(sim, door.x, door.z);
  sim.enterDelve('collapsed_reliquary', tier);
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

    expect(delveAt(x)?.id).toBe('collapsed_reliquary');

    expect(dungeonAt(x)).toBeNull();

  });



  it('arena and dungeon bands do not overlap delve band', () => {

    expect(isDelvePos(ARENA_X)).toBe(false);

    expect(isDelvePos(2700)).toBe(false);

    expect(isDelvePos(DELVE_X_MIN)).toBe(true);

    expect(isArenaPos(ARENA_X)).toBe(true);

    expect(isArenaPos(DELVE_X_MIN)).toBe(false);

  });



  it('isDelvePos covers the full room footprint west of DELVE_X_MIN (regression: camera yank bug)', () => {
    // Rooms are 48 u wide, centred at DELVE_X_MIN. The west wall sits at
    // world-x ≈ 3576 (slot 0). Before DELVE_BAND_X_MIN, x < DELVE_X_MIN was
    // classified as isArenaPos, yanking the camera ~574 u west to arena (x≈3000).
    const origin = delveOrigin(0, 0); // { x: 3600, z: ... }

    // West half of the room must still be a delve pos
    expect(isDelvePos(origin.x - 2)).toBe(true);   // 3598 — exact repro coordinate
    expect(isDelvePos(origin.x - 22)).toBe(true);  // walkable west edge
    expect(isDelvePos(origin.x - 24)).toBe(true);  // wall outer face
    expect(isDelvePos(origin.x)).toBe(true);        // room centre
    expect(isDelvePos(origin.x + 22)).toBe(true);  // walkable east edge
    expect(isDelvePos(origin.x + 24)).toBe(true);  // wall outer face east

    // isArenaPos must be false for all of the above
    expect(isArenaPos(origin.x - 2)).toBe(false);
    expect(isArenaPos(origin.x - 24)).toBe(false);
    expect(isArenaPos(origin.x)).toBe(false);

    // Bands are mutually exclusive — no x where both are true
    expect(isDelvePos(DELVE_BAND_X_MIN) && isArenaPos(DELVE_BAND_X_MIN)).toBe(false);
    expect(isDelvePos(DELVE_BAND_X_MIN - 1) && isArenaPos(DELVE_BAND_X_MIN - 1)).toBe(false);

    // delveAt resolves correctly across the whole west half of the room
    expect(delveAt(origin.x - 2)?.index).toBe(0);    // 3598
    expect(delveAt(origin.x - 24)?.index).toBe(0);   // 3576
    expect(delveAt(origin.x)?.index).toBe(0);         // 3600

    // Arena still classifies correctly
    expect(isArenaPos(3000)).toBe(true);
    expect(isDelvePos(3000)).toBe(false);
  });



  it('enterReliquary places player in delve band near instance origin', () => {

    const sim = makeSim();

    enterReliquary(sim);

    const run = sim.delveRunForPlayer(sim.playerId)!;

    const p = sim.player;

    expect(isDelvePos(p.pos.x)).toBe(true);

    expect(Math.abs(p.pos.x - run.origin.x)).toBeLessThan(200);

    expect(Math.abs(p.pos.z - run.origin.z)).toBeLessThan(250);

    expect(delveModuleZOffset(run.modules, 0)).toBe(8);

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



describe('delve interactables and affixes', () => {
  it('heroic affix roll is deterministic per seed', () => {
    const affixes = (seed: number) => {
      const sim = makeSim('warrior', seed);
      enterReliquary(sim, 'heroic');
      return [...sim.delveRunForPlayer(sim.playerId)!.affixes];
    };
    expect(affixes(42)).toEqual(affixes(42));
    expect(affixes(42).length).toBe(1);
  });

  it('pressure plate opens linked door only after all plates triggered', () => {
    const sim = makeSim();
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_sunken_ossuary'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    const plates = run.objectIds
      .map((id) => ({ id, state: run.objectState[id] }))
      .filter((o) => o.state?.kind === 'pressure_plate');
    const door = run.objectIds.map((id) => ({ id, state: run.objectState[id] })).find((o) => o.state?.kind === 'locked_door');
    expect(plates.length).toBeGreaterThanOrEqual(2);
    expect(door).toBeDefined();
    expect(door!.state.open).toBe(false);
    // First plate: door still closed (requires all plates).
    const plate1Ent = sim.entities.get(plates[0].id)!;
    sim.player.pos = { ...plate1Ent.pos };
    sim.player.prevPos = { ...plate1Ent.pos };
    sim.tick();
    expect(run.objectState[door!.id].open).toBe(false);
    // Second plate: door now opens.
    const plate2Ent = sim.entities.get(plates[1].id)!;
    sim.player.pos = { ...plate2Ent.pos };
    sim.player.prevPos = { ...plate2Ent.pos };
    sim.tick();
    expect(run.objectState[door!.id].open).toBe(true);
  });

  it('grave interrupt cancels Raise Dead summon', () => {
    const sim = makeSim();
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    const boss = [...sim.entities.values()].find((e) => e.templateId === 'deacon_varric')!;
    boss.inCombat = true;
    boss.hp = Math.ceil(boss.maxHp * 0.55);
    (sim as any).updateBossMechanics(boss);
    expect(run.raiseDeadChannel).not.toBeNull();
    const graveId = run.raiseDeadChannel!.graveId;
    sim.player.pos = { ...sim.entities.get(graveId)!.pos };
    sim.player.prevPos = { ...sim.player.pos };
    sim.delveInteract(graveId);
    expect(run.raiseDeadChannel).toBeNull();
    const before = [...sim.entities.values()].filter((e) => e.templateId === 'reliquary_bonewalker').length;
    for (let i = 0; i < 20 * 6; i++) sim.tick();
    const after = [...sim.entities.values()].filter((e) => e.templateId === 'reliquary_bonewalker').length;
    expect(after).toBe(before);
  });

  it('clears trash and opens exit portal at module far end', () => {
    const sim = makeSim();
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_bell_niche', 'reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    const exitId = run.objectIds.find((id) => run.objectState[id]?.kind === 'module_exit');
    expect(exitId).toBeDefined();
    expect(run.exitPortalOpen).toBe(false);
    for (const id of [...run.mobIds]) {
      const mob = sim.entities.get(id);
      if (mob && !mob.dead) (sim as any).dealDamage(sim.player, mob, mob.maxHp + 1, false, 'physical', null, 'hit', true);
    }
    sim.tick();
    expect(run.exitPortalOpen).toBe(true);
    const portal = sim.entities.get(exitId!)!;
    sim.player.pos = { ...portal.pos };
    sim.player.prevPos = { ...portal.pos };
    sim.tick();
    expect(run.moduleIndex).toBe(1);
    expect(run.modules[run.moduleIndex]).toBe('reliquary_finale');
  });

  it('pressure plate required before exit opens when module has one', () => {
    const sim = makeSim();
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_sunken_ossuary', 'reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    for (const id of [...run.mobIds]) {
      const mob = sim.entities.get(id);
      if (mob && !mob.dead) (sim as any).dealDamage(sim.player, mob, mob.maxHp + 1, false, 'physical', null, 'hit', true);
    }
    sim.tick();
    expect(run.exitPortalOpen).toBe(false);
    const plate = run.objectIds.map((id) => ({ id, state: run.objectState[id] }))
      .find((o) => o.state?.kind === 'pressure_plate');
    const plateEnt = sim.entities.get(plate!.id)!;
    sim.player.pos = { ...plateEnt.pos };
    sim.player.prevPos = { ...plateEnt.pos };
    sim.tick();
    expect(run.exitPortalOpen).toBe(true);
  });
});

describe('delve reward chest + surface exit flow', () => {
  function enterFinale(sim: ReturnType<typeof makeSim>) {
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    // Jump straight to the finale as the only module
    run.modules = ['reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    return run;
  }

  function killBoss(sim: ReturnType<typeof makeSim>, run: ReturnType<typeof enterFinale>) {
    const boss = [...sim.entities.values()].find((e) => e.templateId === 'deacon_varric')!;
    (sim as any).dealDamage(sim.player, boss, boss.maxHp + 1, false, 'physical', null, 'hit', true);
    sim.tick();
    return boss;
  }

  // Drive the lockpicking minigame to a flawless solve. Returns the chest id.
  function pickLockFlawless(sim: ReturnType<typeof makeSim>, run: ReturnType<typeof enterFinale>, ante: 1 | 2 | 3 = 1) {
    const chestId = run.rewardChestId!;
    const chestEnt = sim.entities.get(chestId)!;
    sim.player.pos = { ...chestEnt.pos };
    sim.player.prevPos = { ...chestEnt.pos };
    sim.lockpickEngage(chestId, ante);
    // Flawless multi-page solve: clear each lock board back-to-back.
    let guard = 0;
    while (run.lockpick && run.lockpick.state === 'IN_PROGRESS' && guard++ < 12) {
      const actions = solveLockActions(run.lockpick.pages[run.lockpick.pageIndex])!;
      for (const a of actions) sim.lockpickAction(a);
    }
    return chestId;
  }

  it('boss death spawns a locked chest (not ejecting the player) with an attempt available', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    const playerPosBefore = { ...sim.player.pos };
    killBoss(sim, run);

    // run.completed still false — chest not yet opened
    expect(run.completed).toBe(false);
    // objective is marked complete
    expect(run.objective.complete).toBe(true);
    // player stays in the delve band, position unchanged (no teleport)
    expect(isDelvePos(sim.player.pos.x)).toBe(true);
    expect(Math.abs(sim.player.pos.x - playerPosBefore.x)).toBeLessThan(1);
    // a locked chest object exists with an attempt granted
    const chestId = run.objectIds.find((id) => run.objectState[id]?.kind === 'locked_chest');
    expect(chestId).toBeDefined();
    expect(run.rewardChestId).not.toBeNull();
    expect(run.objectState[chestId!].attemptAvailable).toBe(true);
    expect(run.objectState[chestId!].open).toBe(false);
  });

  it('finale boss chest spawns south of dais, not on the sealed passage z', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    killBoss(sim, run);
    const layout = DELVE_MODULE_LAYOUTS.reliquary_finale;
    const zBase = (sim as any).delveModuleZOffset(run);
    const chest = sim.entities.get(run.rewardChestId!)!;
    const localZ = chest.pos.z - run.origin.z - zBase;
    expect(localZ).toBe(layout.dais.z - 9);
    expect(run.objectIds.some((id) => run.objectState[id]?.kind === 'module_exit')).toBe(false);
    expect(Math.hypot(chest.pos.x - run.origin.x, localZ - (layout.zMax - 6))).toBeGreaterThan(4);
  });

  it('boss death in a non-finale module does not spawn the reward chest', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_saintless_hall', 'reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    const origin = run.origin;
    const boss = createMob(910001, MOBS.deacon_varric, 12, { x: origin.x, y: 0, z: origin.z + 40 });
    (sim as any).addEntity(boss);
    (sim as any).dealDamage(sim.player, boss, boss.maxHp + 1, false, 'physical', null, 'hit', true);
    sim.tick();
    expect(run.rewardChestId).toBeNull();
    expect(run.objectIds.some((id) => run.objectState[id]?.kind === 'locked_chest')).toBe(false);
  });

  it('interacting with the locked chest offers the ante selector (no grant yet)', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    killBoss(sim, run);
    const chestId = run.rewardChestId!;
    const chestEnt = sim.entities.get(chestId)!;
    sim.player.pos = { ...chestEnt.pos };
    sim.player.prevPos = { ...chestEnt.pos };

    sim.delveInteract(chestId);
    const events = sim.tick();
    expect(events.find((e) => e.type === 'lockpickOffer')).toBeDefined();
    expect(run.completed).toBe(false);
    expect(run.lockpick).toBeNull();
  });

  it('flawless solve grants marks (premium tier), completes the run, and spawns the surface exit', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    killBoss(sim, run);

    const marksBefore = sim.delveMarksFor(sim.playerId);
    const chestId = pickLockFlawless(sim, run, 1);

    expect(run.completed).toBe(true);
    // base clear (+1 mark) + premium ante bonus (+2 marks)
    expect(sim.delveMarksFor(sim.playerId)).toBe(marksBefore + 3);
    expect(run.objectState[chestId].looted).toBe(true);
    expect(run.objectState[chestId].open).toBe(true);
    expect(run.objectState[chestId].lootedTier).toBe('premium');
    expect(run.lockpick).toBeNull();
    // surface exit spawned
    expect(run.surfaceExitId).not.toBeNull();
    const exitObj = run.objectIds.find((id) => run.objectState[id]?.kind === 'surface_exit');
    expect(exitObj).toBeDefined();
    expect(run.objectState[exitObj!].open).toBe(true);
  });

  it('flawless solve stages jerky loot for the overlay and collect grants inventory', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    killBoss(sim, run);
    const chestId = pickLockFlawless(sim, run, 1);

    expect(run.objectState[chestId].pendingLoot).toEqual([
      { itemId: 'tough_jerky', count: 3 },
      { itemId: 'spring_water', count: 1 },
    ]);
    expect(sim.entities.get(chestId)?.templateId).toBe('delve_reward_chest');

    const jerkyCount = (slots: typeof sim.inventory) =>
      slots.filter((s) => s?.itemId === 'tough_jerky').reduce((n, s) => n + s.count, 0);
    const jerkyBefore = jerkyCount(sim.inventory);
    sim.collectDelveChestLoot(chestId);
    expect(jerkyCount(sim.inventory) - jerkyBefore).toBe(3);
    expect(run.objectState[chestId].pendingLoot).toEqual([]);
  });

  it('interacting with an emptied chest says "chest is empty"', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    killBoss(sim, run);
    const chestId = pickLockFlawless(sim, run, 1);

    sim.delveInteract(chestId); // already looted
    const events = sim.tick();
    const emptyLog = events.find((ev) => ev.type === 'log' && (ev as any).text === 'The chest is empty.');
    expect(emptyLog).toBeDefined();
  });

  it('interacting with delve_exit ejects player and frees the run', () => {
    const sim = makeSim();
    sim.setPlayerLevel(DELVES.collapsed_reliquary.minLevel);
    const run = enterFinale(sim);
    killBoss(sim, run);
    pickLockFlawless(sim, run, 1); // open chest + spawn exit

    const exitId = run.surfaceExitId!;
    const exitEnt = sim.entities.get(exitId)!;
    sim.player.pos = { ...exitEnt.pos };
    sim.player.prevPos = { ...exitEnt.pos };
    sim.delveInteract(exitId);

    // Player is now outside the delve band
    expect(isDelvePos(sim.player.pos.x)).toBe(false);
    // Player is near the door
    const door = DELVES.collapsed_reliquary.doorPos;
    expect(Math.hypot(sim.player.pos.x - door.x, sim.player.pos.z - (door.z - 4))).toBeLessThan(2);
    // Run is freed (no active run for this player)
    expect(sim.delveRunForPlayer(sim.playerId)).toBeNull();
  });

  it('inter-module advance still works (non-finale modules not affected)', () => {
    const sim = makeSim();
    enterReliquary(sim);
    const run = sim.delveRunForPlayer(sim.playerId)!;
    run.modules = ['reliquary_bell_niche', 'reliquary_finale'];
    run.moduleIndex = 0;
    (sim as any).spawnDelveModule(run);
    const exitId = run.objectIds.find((id) => run.objectState[id]?.kind === 'module_exit');
    expect(exitId).toBeDefined();
    // Kill all trash
    for (const id of [...run.mobIds]) {
      const mob = sim.entities.get(id);
      if (mob && !mob.dead) (sim as any).dealDamage(sim.player, mob, mob.maxHp + 1, false, 'physical', null, 'hit', true);
    }
    sim.tick();
    expect(run.exitPortalOpen).toBe(true);
    // Walk into the portal to advance
    const portal = sim.entities.get(exitId!)!;
    sim.player.pos = { ...portal.pos };
    sim.player.prevPos = { ...portal.pos };
    sim.tick();
    expect(run.moduleIndex).toBe(1);
    expect(run.modules[run.moduleIndex]).toBe('reliquary_finale');
    // No reward chest exists yet (boss not killed)
    expect(run.rewardChestId).toBeNull();
  });
});
