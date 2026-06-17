// Lockpicking difficulty presets + loot-tier reward scaling, keyed to the
// delve's tier id. Puzzle difficulty scales with the delve band; the player's
// ante (lives) is a separate axis and is the loot tier — see lockpick.ts.
//
// Data-as-code: tune the numbers HERE, never inline in sim.ts.

import type { LockTierSpec, LootTier } from '../../lockpick';

/**
 * When false (default), the lock layout is identical across antes — a lower
 * ante is a pure error-margin gamble and premium is skill-gated on the same
 * puzzle. Flip to true (and wire anteScaledPreset) to make premium also a
 * harder board. Kept here as a single, reversible switch.
 */
export const LOCKPICK_ANTE_SCALES_DIFFICULTY = false;

/** Per-delve-tier puzzle presets. Add Mirefen/Thornpeak bands when those delves
 * ship; today only the Collapsed Reliquary exists (tiers: normal, heroic). */
export const LOCKPICK_TIER_PRESETS: Record<string, LockTierSpec> = {
  normal: {
    cols: 12,
    rows: 6,
    width: 1, // tight forgiveness band — must thread the true path
    gateCount: 2,
    visibilityWindow: 4, // fogged: only the next few wards are lit
    trapCount: 3, // ward-traps that jam on contact
    allowedActions: ['hardSet', 'set', 'steady', 'ease', 'drop'],
  },
  heroic: {
    cols: 16,
    rows: 6,
    width: 1,
    gateCount: 3,
    visibilityWindow: 3, // heavier fog
    trapCount: 5,
    allowedActions: ['hardSet', 'set', 'steady', 'ease', 'drop'],
  },
};

export const DEFAULT_LOCKPICK_PRESET: LockTierSpec = LOCKPICK_TIER_PRESETS.normal;

export function lockpickPresetFor(tierId: string): LockTierSpec {
  return LOCKPICK_TIER_PRESETS[tierId] ?? DEFAULT_LOCKPICK_PRESET;
}

/** Loot-tier reward scaling applied on top of the base delve chest rewards.
 * Premium (ante 1, flawless) pays the most; low (ante 3) is the base. */
export const LOCKPICK_TIER_REWARD: Record<LootTier, { bonusMarks: number; copperMult: number }> = {
  premium: { bonusMarks: 2, copperMult: 2 },
  medium: { bonusMarks: 1, copperMult: 1.5 },
  low: { bonusMarks: 0, copperMult: 1 },
};

/** Visible item loot shown in the post-unlock chest screen (test-friendly jerky tiers). */
export function delveChestItemsForTier(tier: LootTier): { itemId: string; count: number }[] {
  if (tier === 'premium') return [{ itemId: 'tough_jerky', count: 3 }, { itemId: 'spring_water', count: 1 }];
  if (tier === 'medium') return [{ itemId: 'tough_jerky', count: 2 }];
  return [{ itemId: 'tough_jerky', count: 1 }];
}
