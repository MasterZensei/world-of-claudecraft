// "Tumbler's Path" lockpick panel — pure view helpers (no DOM/canvas), mirroring
// the delve_map.ts pattern: take the fogged IWorld.LockpickView in, return plain
// draw/layout data out. hud.ts owns the actual DOM. Snapshot-tested by
// tests/lockpick_panel.test.ts.
//
// v2 redesign: NOT a grid of squares — a row of tumbler pin-tracks. Each lock
// column is a brass tumbler; only its wards (open notches / gate / seat / trap)
// are lit, the rest of the face is solid metal. Columns past the fog window are
// a blank covered plate (unknown). The run is FLAWLESS across multiple pages
// (premium 3 / medium 2 / low 1); one slip, bind, or hidden ward-trap jams it.
//
// NOTE: strings here are English literals by product decision (the lockpick
// minigame ships English-only for now; no t()/locale coverage). Keep all other
// HUD i18n rules intact.

import type { LockpickView } from '../world_api';
import type {
  Ante, LootTier, PickAction, StepResult, VisibleCell,
} from '../sim/lockpick';
import { ACTION_DELTA, ANTE_TO_PAGES, ANTE_TO_TIER, ANTE_TO_TRIES, PICK_ACTIONS } from '../sim/lockpick';

/** Kind of a lit notch on a tumbler track. */
export type NotchKind = 'open' | 'gate' | 'seat' | 'trap';
/** Lifecycle of a tumbler column relative to the pick. */
export type ColumnState = 'set' | 'active' | 'ahead' | 'fog';

export interface TumblerNotch {
  row: number;
  kind: NotchKind;
}

export interface TumblerColumn {
  col: number;
  state: ColumnState;
  /** Lit wards on this track (empty when fogged). */
  notches: TumblerNotch[];
  /** Pick depth shown on this column, or null (only the active column carries it). */
  markerRow: number | null;
  isGate: boolean;
  isSeat: boolean;
}

export interface BoardModel {
  w: number;
  h: number;
  columns: TumblerColumn[];
  activeCol: number;
  markerRow: number;
  seatCol: number;
}

/** Human-facing names for each loot tier. */
export const TIER_LABEL: Record<LootTier, string> = {
  premium: 'Premium',
  medium: 'Medium',
  low: 'Modest',
};

/** Seconds per lock page: easy=15s, medium=10s, hard=5s. */
export const TIER_TIMER_SECONDS: Record<LootTier, number> = {
  low: 15,
  medium: 10,
  premium: 5,
};

/** Display label + delta glyph + hotkey for each depth action (shallow→deep). */
export interface ActionButton {
  action: Exclude<PickAction, 'abort'>;
  label: string;
  glyph: string;
  /** 1-based hotkey shown on the button and bound while the panel is open. */
  key: string;
  enabled: boolean;
}

const ACTION_LABEL: Record<Exclude<PickAction, 'abort'>, string> = {
  hardSet: 'Hard Set',
  set: 'Set',
  steady: 'Steady',
  ease: 'Ease',
  drop: 'Drop',
};

function deltaGlyph(delta: number): string {
  if (delta <= -2) return '▲▲';
  if (delta === -1) return '▲';
  if (delta === 0) return '—';
  if (delta === 1) return '▼';
  return '▼▼';
}

/** The five action buttons in shallow→deep order; disabled when not allowed. */
export function lockpickActionButtons(allowed: readonly Exclude<PickAction, 'abort'>[]): ActionButton[] {
  const allow = new Set(allowed);
  return PICK_ACTIONS.map((action, i) => ({
    action,
    label: ACTION_LABEL[action],
    glyph: deltaGlyph(ACTION_DELTA[action]),
    key: String(i + 1),
    enabled: allow.has(action),
  }));
}

/** Build the tumbler tracks from the fogged view. Columns are 'set' (passed),
 * 'active' (current pick), 'ahead' (lit but not reached) or 'fog' (covered). */
export function lockpickBoardModel(view: LockpickView): BoardModel {
  const { w, h, visible, col, row } = view;
  let maxVisibleCol = -1;
  for (const c of visible) if (c.col > maxVisibleCol) maxVisibleCol = c.col;
  const byCol = new Map<number, TumblerNotch[]>();
  const gateCols = new Set<number>();
  let seatCol = w - 1;
  for (const c of visible) {
    if (c.kind === 'gate') gateCols.add(c.col);
    if (c.kind === 'seat') seatCol = c.col;
    const arr = byCol.get(c.col) ?? [];
    arr.push({ row: c.row, kind: c.kind as NotchKind });
    byCol.set(c.col, arr);
  }
  const columns: TumblerColumn[] = [];
  for (let c = 0; c < w; c++) {
    let state: ColumnState;
    if (c < col) state = 'set';
    else if (c === col) state = 'active';
    else if (c <= maxVisibleCol) state = 'ahead';
    else state = 'fog';
    const notches = state === 'fog' ? [] : (byCol.get(c) ?? []).slice().sort((a, b) => a.row - b.row);
    columns.push({
      col: c,
      state,
      notches,
      markerRow: c === col ? row : null,
      isGate: gateCols.has(c),
      isSeat: c === seatCol,
    });
  }
  return { w, h, columns, activeCol: col, markerRow: row, seatCol };
}

/** Page progress dots: one per page, marked done / current / upcoming. */
export function pageDots(page: number, pageCount: number): ('done' | 'current' | 'todo')[] {
  const out: ('done' | 'current' | 'todo')[] = [];
  for (let i = 1; i <= pageCount; i++) out.push(i < page ? 'done' : i === page ? 'current' : 'todo');
  return out;
}

export interface AnteOption {
  ante: Ante;
  tier: LootTier;
  tierLabel: string;
  /** Number of sequential lock pages this ante demands. */
  pages: number;
  /** Tries (attempts) granted before the chest jams (easy 3 / medium 2 / hard 1). */
  tries: number;
  /** Stakes summary line. */
  margin: string;
  /** Time allowed per lock page in seconds. */
  timerSeconds: number;
}

/** The three ante choices shown in the engage selector. Ante == loot tier ==
 * page count (premium 3 / medium 2 / low 1). Difficulty also sets the tries you
 * get (easy 3 / medium 2 / hard 1): a failed try resets the board until they run
 * out.
 *
 * A Bountiful Coffer (§7.6) is purple and forces the Hard/Premium path: only the
 * Premium ante is offered — the lower difficulties are not an option. */
export function anteOptions(coffer = false): AnteOption[] {
  const antes: Ante[] = coffer ? [1] : [1, 2, 3];
  return antes.map((ante) => {
    const tier = ANTE_TO_TIER[ante];
    const pages = ANTE_TO_PAGES[ante];
    const tries = ANTE_TO_TRIES[ante];
    const gauntlet = pages > 1 ? `${pages}-lock gauntlet` : 'Single lock';
    const triesText = tries > 1 ? `${tries} tries` : '1 try';
    const margin = `${gauntlet} — ${triesText}`;
    return { ante, tier, tierLabel: TIER_LABEL[tier], pages, tries, margin, timerSeconds: TIER_TIMER_SECONDS[tier] };
  });
}

/** Short diegetic feedback + tone for a step outcome (drives toast + SFX). */
export function stepFeedback(result: StepResult): { text: string; tone: 'good' | 'bad' | 'win' } {
  switch (result) {
    case 'advanced': return { text: 'The pin gives…', tone: 'good' };
    case 'slip': return { text: 'A ward bites — the pick slips!', tone: 'bad' };
    case 'bind': return { text: 'The tumbler binds — wrong depth!', tone: 'bad' };
    case 'trap': return { text: 'A false ward snaps shut — the lock jams!', tone: 'bad' };
    case 'retry': return { text: 'The lock resets — line up a fresh attempt.', tone: 'bad' };
    case 'pageCleared': return { text: 'A tumbler bank falls — the next lock turns up.', tone: 'win' };
    case 'success': return { text: 'The bolt throws — the cache is yours!', tone: 'win' };
    case 'fail': return { text: "The lock seizes. It won't budge again.", tone: 'bad' };
    default: return { text: '', tone: 'good' };
  }
}

/** End-of-attempt summary line for the result banner. */
export function endSummary(outcome: 'success' | 'fail' | 'abandoned', tier?: LootTier): string {
  if (outcome === 'success') return `Lock sprung — ${tier ? TIER_LABEL[tier] : 'a'} cache claimed.`;
  if (outcome === 'fail') return 'The lock is ruined. Clear the delve again for another attempt.';
  return 'You ease the picks back out. The lock waits.';
}
