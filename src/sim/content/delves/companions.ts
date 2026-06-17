import type { DelveCompanionDef } from '../../types';

export const DELVE_COMPANIONS: Record<string, DelveCompanionDef> = {
  companion_tessa: {
    id: 'companion_tessa',
    name: 'Acolyte Tessa',
    role: 'healer',
    mobTemplateId: 'acolyte_tessa',
  },
};

export const COMPANION_TESSA = DELVE_COMPANIONS.companion_tessa;

/** Rank-up costs (rank 1 is free at intro). */
export const COMPANION_UPGRADE_COSTS: Record<number, { marks: number; copper: number }> = {
  2: { marks: 4, copper: 20 },
  3: { marks: 9, copper: 60 },
  4: { marks: 16, copper: 120 },
  5: { marks: 28, copper: 200 },
};
