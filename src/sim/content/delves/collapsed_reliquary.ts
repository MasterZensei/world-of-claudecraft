import type { DelveDef, DelveModuleDef } from '../../types';

// Ossuary: Wraiths rush in from afar (high aggroRadius), Ringers pulse AoE.
// Kill wraiths first to avoid corrode stacking while managing Ringer chimes.
const OSSUARY_SPAWNS = {
  id: 'ossuary_trash',
  weight: 1,
  spawns: [
    { mobId: 'reliquary_ledger_wraith',   x: -5, z: 26 },
    { mobId: 'reliquary_funeral_ringer',  x:  5, z: 28 },
    { mobId: 'reliquary_ledger_wraith',   x: -4, z: 54 },
    { mobId: 'reliquary_funeral_ringer',  x:  4, z: 56 },
  ],
};

// Bell Niche: pure Ringers in the first pack, Ringer + Acolyte in the second.
// Acolyte applies mortal strike — kill it first or Tessa's heals suffer.
// Watch chime overlap when both Ringers pulse simultaneously.
const BELL_NICHE_SPAWNS = {
  id: 'bell_niche_trash',
  weight: 1,
  spawns: [
    { mobId: 'reliquary_funeral_ringer',      x: -6, z: 26 },
    { mobId: 'reliquary_funeral_ringer',      x:  6, z: 28 },
    { mobId: 'reliquary_funeral_ringer',      x: -4, z: 54 },
    { mobId: 'reliquary_gravecall_acolyte',   x:  4, z: 58 },
  ],
};

// Saintless Hall: Acolyte + Ringer guard the entrance; the Effigy waits at
// the back. Effigy is ccImmune and cleaves — tank it alone, others stay clear.
const SAINTLESS_HALL_SPAWNS = {
  id: 'saintless_hall_trash',
  weight: 1,
  spawns: [
    { mobId: 'reliquary_gravecall_acolyte',   x: -4, z: 26 },
    { mobId: 'reliquary_funeral_ringer',      x:  4, z: 28 },
    { mobId: 'reliquary_saintless_effigy',    x:  0, z: 58 },
  ],
};

const FINALE_SPAWNS = {
  id: 'boss',
  weight: 1,
  // Dais face is at ~z=68 (dais z=80, r=12); spawn just south so Varric strides
  // onto the platform as the encounter opens.
  spawns: [{ mobId: 'deacon_varric', x: 0, z: 72 }],
};

export const COLLAPSED_RELIQUARY_MODULES: Record<string, DelveModuleDef> = {
  reliquary_sunken_ossuary: {
    id: 'reliquary_sunken_ossuary',
    interior: 'crypt',
    layout: 'reliquary_sunken_ossuary',
    length: 110,
    spawnSets: [OSSUARY_SPAWNS],
    interactableSlots: [
      // Pressure plate 1: between pillar rows z=14 and z=40, clear of tombs at z=18.
      { x: 0, z: 32, variants: ['pressure_plate'] },
      // Iron portcullis gate: between pillar rows z=40 and z=66, clear of tombs.
      // Both plates must be stepped on to open it.
      { x: 0, z: 47, variants: ['locked_door'] },
      // Pressure plate 2: between pillar rows z=40 and z=66, south of the gate.
      { x: 0, z: 58, variants: ['pressure_plate'] },
    ],
  },
  reliquary_bell_niche: {
    id: 'reliquary_bell_niche',
    interior: 'crypt',
    layout: 'reliquary_bell_niche',
    length: 110,
    spawnSets: [BELL_NICHE_SPAWNS],
    interactableSlots: [],
  },
  reliquary_saintless_hall: {
    id: 'reliquary_saintless_hall',
    interior: 'crypt',
    layout: 'reliquary_saintless_hall',
    length: 110,
    spawnSets: [SAINTLESS_HALL_SPAWNS],
    interactableSlots: [],
  },
  reliquary_finale: {
    id: 'reliquary_finale',
    interior: 'crypt',
    layout: 'reliquary_finale',
    length: 110,
    spawnSets: [FINALE_SPAWNS],
    interactableSlots: [
      // Cracked graves flanking the centre aisle in the south clutter zone.
      { x: -8, z: 58, variants: ['cracked_grave'] },
      { x:  8, z: 58, variants: ['cracked_grave'] },
      // Pressure plate on the centre aisle in front of the dais (dais z=80, r=12;
      // dais face at ~z=68). Plate sits at z=50, well south of the fighting ring.
      { x: 0, z: 50, variants: ['pressure_plate'] },
    ],
  },
};

export const COLLAPSED_RELIQUARY_DELVE: DelveDef = {
  id: 'collapsed_reliquary',
  name: 'The Collapsed Reliquary',
  theme: 'crypt',
  index: 0,
  minLevel: 7,
  suggestedPlayers: 2,
  doorPos: { x: -5, z: -52 },
  modules: [
    'reliquary_sunken_ossuary',
    'reliquary_bell_niche',
    'reliquary_saintless_hall',
  ],
  moduleCount: [3, 3],
  finaleModuleId: 'reliquary_finale',
  bosses: ['deacon_varric'],
  objective: 'kill_boss',
  boardNpcId: 'brother_halven',
  enterText: 'You descend into the collapsed reliquary.',
  leaveText: 'You climb back to Brother Halven at the reliquary ruin.',
  tiers: [
    {
      id: 'normal',
      label: 'Normal',
      enemyLevelBonus: 0,
      affixCount: 0,
      rewardMult: 1,
    },
    {
      id: 'heroic',
      label: 'Heroic',
      enemyLevelBonus: 2,
      affixCount: 1,
      rewardMult: 1.3,
    },
  ],
  baseRewards: {
    copperMin: 8,
    copperMax: 14,
    firstClearXp: 700,
    repeatClearXp: 420,
  },
};
