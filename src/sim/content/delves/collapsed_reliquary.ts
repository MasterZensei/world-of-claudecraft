import type { DelveDef, DelveModuleDef } from '../../types';

const TRASH_SPAWNS = {
  id: 'trash',
  weight: 1,
  spawns: [
    { mobId: 'crypt_shambler', x: -2, z: 24 },
    { mobId: 'crypt_shambler', x: 2, z: 26 },
  ] as const,
};

const FINALE_SPAWNS = {
  id: 'boss',
  weight: 1,
  spawns: [{ mobId: 'deacon_varric', x: 0, z: 52 }] as const,
};

export const COLLAPSED_RELIQUARY_MODULES: Record<string, DelveModuleDef> = {
  reliquary_sunken_ossuary: {
    id: 'reliquary_sunken_ossuary',
    interior: 'crypt',
    layout: 'reliquary_sunken_ossuary',
    length: 55,
    spawnSets: [TRASH_SPAWNS],
    interactableSlots: [
      { x: 0, z: 34, variants: ['pressure_plate', 'darkness_zone'] },
      { x: 12, z: 38, variants: ['locked_door', 'pressure_plate'] },
    ],
  },
  reliquary_bell_niche: {
    id: 'reliquary_bell_niche',
    interior: 'crypt',
    layout: 'reliquary_bell_niche',
    length: 50,
    spawnSets: [TRASH_SPAWNS],
    interactableSlots: [],
  },
  reliquary_saintless_hall: {
    id: 'reliquary_saintless_hall',
    interior: 'crypt',
    layout: 'reliquary_saintless_hall',
    length: 50,
    spawnSets: [TRASH_SPAWNS],
    interactableSlots: [],
  },
  reliquary_finale: {
    id: 'reliquary_finale',
    interior: 'crypt',
    layout: 'reliquary_finale',
    length: 65,
    spawnSets: [FINALE_SPAWNS],
    interactableSlots: [
      { x: -6, z: 44, variants: ['cracked_grave'] },
      { x: 6, z: 44, variants: ['cracked_grave'] },
      { x: 0, z: 58, variants: ['pressure_plate'] },
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
  doorPos: { x: -10, z: -8 },
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
  enterText: 'You descend into the shifted reliquary below the chapel.',
  leaveText: 'You climb back to Brother Halven at the chapel ruin.',
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
