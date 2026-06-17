import type { NpcDef } from '../../types';
import { COLLAPSED_RELIQUARY_DELVE, COLLAPSED_RELIQUARY_MODULES } from './collapsed_reliquary';

export { DELVE_AFFIXES } from './affixes';
export { DELVE_COMPANIONS, COMPANION_UPGRADE_COSTS, COMPANION_TESSA } from './companions';
export { DELVE_MOBS } from './mobs';
export { COLLAPSED_RELIQUARY_DELVE, COLLAPSED_RELIQUARY_MODULES } from './collapsed_reliquary';

export const BROTHER_HALVEN: NpcDef = {
  id: 'brother_halven',
  name: 'Brother Halven',
  title: 'Reliquary Keeper',
  pos: { x: -5, z: -52 },
  facing: Math.PI,
  color: 0xd4c5a0,
  questIds: [],
  greeting: 'The reliquary below has shifted again.',
};
