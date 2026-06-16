import type { MobTemplate } from '../../types';

export const DELVE_MOBS: Record<string, MobTemplate> = {
  reliquary_bonewalker: {
    id: 'reliquary_bonewalker', name: 'Raised Bonewalker', minLevel: 8, maxLevel: 8,
    family: 'undead',
    hpBase: 40, hpPerLevel: 14, dmgBase: 5, dmgPerLevel: 1.8, attackSpeed: 2.4,
    armorPerLevel: 8, moveSpeed: 6.5, aggroRadius: 10,
    loot: [{ copper: 4, chance: 1 }],
    scale: 0.9, color: 0xb8c0b8,
  },
  deacon_varric: {
    id: 'deacon_varric', name: 'Deacon Varric', minLevel: 9, maxLevel: 9, family: 'undead',
    elite: true, boss: true,
    hpBase: 100, hpPerLevel: 22, dmgBase: 8, dmgPerLevel: 2.4, attackSpeed: 2.2,
    armorPerLevel: 20, moveSpeed: 7, aggroRadius: 14,
    stomp: { radius: 8, every: 12, duration: 1.5, min: 14, max: 22, name: 'Bell Toll' },
    summonAdds: { mobId: 'reliquary_bonewalker', count: 2, atHpPct: [0.60, 0.30] },
    enrage: { belowHpPct: 0.20, dmgMult: 1.4, hasteMult: 1.2 },
    loot: [{ copper: 320, chance: 1 }],
    scale: 1.2, color: 0x7b7d7d,
  },
  acolyte_tessa: {
    id: 'acolyte_tessa', name: 'Acolyte Tessa', minLevel: 8, maxLevel: 8, family: 'humanoid',
    hpBase: 55, hpPerLevel: 16, dmgBase: 4, dmgPerLevel: 1.2, attackSpeed: 2.6,
    armorPerLevel: 8, moveSpeed: 7, aggroRadius: 0,
    loot: [],
    scale: 1.0, color: 0xebedef,
  },
};
