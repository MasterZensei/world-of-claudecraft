// Phase 1 placeholder delve â€” replaced by collapsed_reliquary.ts in Phase 4.

import type { DelveDef, DelveModuleDef, MobTemplate } from '../../types';



export const PLACEHOLDER_DELVE_MOBS: Record<string, MobTemplate> = {

  placeholder_boss: {

    id: 'placeholder_boss', name: 'Trial Warden', minLevel: 5, maxLevel: 5,

    family: 'undead', elite: false, boss: true,

    hpBase: 80, hpPerLevel: 18, dmgBase: 6, dmgPerLevel: 2, attackSpeed: 2.4,

    armorPerLevel: 12, moveSpeed: 6.5, aggroRadius: 14,

    loot: [{ copper: 50, chance: 1 }],

    scale: 1.15, color: 0x9a8c98,

  },

};



const PLACEHOLDER_SPAWNS = {

  id: 'default',

  weight: 1,

  spawns: [

    { mobId: 'crypt_shambler', x: -2, z: 24 },

    { mobId: 'crypt_shambler', x: 2, z: 26 },

  ],

};



export const PLACEHOLDER_DELVE_MODULES: Record<string, DelveModuleDef> = {

  placeholder_entry: {

    id: 'placeholder_entry',

    interior: 'crypt',

    layout: 'placeholder_entry',

    length: 50,

    spawnSets: [PLACEHOLDER_SPAWNS],

    interactableSlots: [],

  },

  placeholder_hall: {

    id: 'placeholder_hall',

    interior: 'crypt',

    layout: 'placeholder_hall',

    length: 50,

    spawnSets: [PLACEHOLDER_SPAWNS],

    interactableSlots: [],

  },

  placeholder_finale: {

    id: 'placeholder_finale',

    interior: 'crypt',

    layout: 'placeholder_finale',

    length: 60,

    spawnSets: [{

      id: 'boss',

      weight: 1,

      spawns: [{ mobId: 'placeholder_boss', x: 0, z: 40 }],

    }],

    interactableSlots: [],

  },

};



export const PLACEHOLDER_DELVE: DelveDef = {

  id: 'delve_placeholder',

  name: 'Placeholder Delve',

  theme: 'crypt',

  index: 1,

  minLevel: 1,

  suggestedPlayers: 1,

  doorPos: { x: 0, z: 0 },

  modules: ['placeholder_entry', 'placeholder_hall'],

  moduleCount: [2, 2],

  finaleModuleId: 'placeholder_finale',

  bosses: ['placeholder_boss'],

  objective: 'kill_boss',

  boardNpcId: 'delve_placeholder_npc',

  enterText: 'You descend into the placeholder delve.',

  leaveText: 'You climb back to the surface.',

  tiers: [

    {

      id: 'normal',

      label: 'Normal',

      enemyLevelBonus: 0,

      affixCount: 0,

      rewardMult: 1,

    },

  ],

  baseRewards: {

    copperMin: 5,

    copperMax: 10,

    firstClearXp: 100,

    repeatClearXp: 50,

  },

};



