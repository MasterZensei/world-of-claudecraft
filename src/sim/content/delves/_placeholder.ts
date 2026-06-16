// Phase 1 placeholder delve — replaced by collapsed_reliquary.ts in Phase 4.
import type { DelveDef } from '../../types';

export const PLACEHOLDER_DELVE: DelveDef = {
  id: 'delve_placeholder',
  name: 'Placeholder Delve',
  theme: 'crypt',
  index: 0,
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
