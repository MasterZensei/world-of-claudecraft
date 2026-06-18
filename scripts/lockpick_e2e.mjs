// REAL end-to-end for the lockpicking minigame — drives the actual sim session
// (not synthetic events like lockpick_ui_smoke.mjs). Offline only; needs
// `npm run dev` (:5173). Flow: enter delve -> spawn the finale reward chest ->
// engage the lock at ante 1 (premium / flawless) -> solve it with the real
// generated spec -> assert success grants loot, opens the surface exit, and the
// HUD board opens on engage and closes on end. Also runs a fail path (ante 1,
// deliberate slip) to confirm the chest jams.
//
// Boss-clear combat is bypassed via onDelveBossDefeated(run); the lock flow it
// gates is identical regardless of which module the chest sits on.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BROWSER_PATH } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('tmp', { recursive: true });

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  (cond ? (pass++, console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`))
        : (fail++, console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`)));
};

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH, headless: 'new', protocolTimeout: 60000,
  userDataDir: `C:/Users/Sud0S/AppData/Local/Temp/woc-lockpick-e2e-${Date.now()}`,
  args: ['--window-size=1280,800', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
const errors = [];
// Offline `npm run dev` has no server, so the homepage's /api project-stats fetch
// 502s — unrelated to the lockpick feature. Ignore that one known-benign noise.
const benign = (t) => /502|Bad Gateway|project stats/i.test(t);
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !benign(m.text())) errors.push('CONSOLE: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.click('#btn-offline');
await sleep(200);
await page.type('#char-name', 'Picker');
await page.click('#offline-select .mini-class[data-class="warrior"]');
await page.click('#btn-start-offline');
await sleep(2200);

// ---- enter delve + spawn the reward chest (bypass the boss fight) ----
const setup = await page.evaluate(() => {
  const g = window.__game; const sim = g.sim; const p = sim.player;
  p.level = 12;
  sim.enterDelve('collapsed_reliquary', 'normal');
  const run = sim.delveRunForPlayer(sim.player.id);
  // Spawn the finale chest directly (private at compile-time, callable at runtime in dev).
  sim.onDelveBossDefeated(run);
  // Lockpick engage gates on proximity — stand the player on the chest.
  const chest = sim.entities.get(run.rewardChestId);
  if (chest) { p.pos.x = chest.pos.x; p.pos.z = chest.pos.z; p.prevPos.x = chest.pos.x; p.prevPos.z = chest.pos.z; }
  return {
    chestId: run.rewardChestId,
    attemptAvailable: run.objectState[run.rewardChestId]?.attemptAvailable ?? false,
    surfaceExitBefore: run.surfaceExitId,
    tierId: run.tierId,
  };
});
console.log('setup:', JSON.stringify(setup));
check('reward chest spawned', setup.chestId != null);
check('attempt available on spawn', setup.attemptAvailable === true);
check('surface exit not yet open', setup.surfaceExitBefore == null);

// ---- SUCCESS path: engage ante 1, solve the real lock flawlessly ----
const engage = await page.evaluate((chestId) => {
  const g = window.__game; const sim = g.sim;
  sim.lockpickEngage(chestId, 1); // ante 1 = premium, 0 slips allowed
  const s = sim.delveRunForPlayer(sim.player.id).lockpick;
  // Plain-JS mirror of solveLockActions() over the in-memory spec.
  const DELTA = { hardSet: -2, set: -1, steady: 0, ease: 1, drop: 2 };
  const spec = s.spec;
  const deltas = spec.tier.allowedActions.map((a) => DELTA[a]);
  const W = spec.open.length;
  // BFS with parent tracking from (0, startRow) to (W-1, seatRow).
  const parents = []; let reach = new Set([spec.startRow]); parents[0] = new Map();
  for (let c = 1; c < W; c++) {
    const next = new Set(); const par = new Map();
    for (const r of reach) for (const d of deltas) {
      const nr = r + d;
      if (spec.open[c].includes(nr) && !par.has(nr)) { par.set(nr, r); next.add(nr); }
    }
    parents[c] = par; reach = next;
  }
  const path = new Array(W); path[W - 1] = spec.seatRow;
  for (let c = W - 1; c > 0; c--) path[c - 1] = parents[c].get(path[c]);
  const actToDelta = Object.entries(DELTA);
  const actions = [];
  for (let c = 1; c < W; c++) actions.push(actToDelta.find(([, d]) => d === path[c] - path[c - 1])[0]);
  return {
    sessionStarted: !!s, w: spec.tier.cols, lootTier: s.lootTier, lives: s.livesLeft, actions,
  };
}, setup.chestId);
console.log('engage:', JSON.stringify(engage));
check('session started', engage.sessionStarted === true);
check('ante 1 = premium tier', engage.lootTier === 'premium');
check('lives = 1 (flawless)', engage.lives === 1);
check('solver produced one action per column', engage.actions.length === engage.w - 1);

await sleep(120); // let the game loop drain events into the HUD
const boardOpen = await page.evaluate(() => {
  const el = document.querySelector('#lockpick-panel');
  return { display: el?.style.display, cells: el?.querySelectorAll('.lp-cell').length ?? 0 };
});
check('HUD board opened on engage', boardOpen.display === 'block' && boardOpen.cells > 0,
  `display=${boardOpen.display} cells=${boardOpen.cells}`);
await page.screenshot({ path: 'tmp/lockpick_e2e_board.png' });

// Submit the solution one action per frame so the board animates + we exercise
// the real lockpickAction path (the same call the HUD keybinds make).
for (const a of engage.actions) {
  await page.evaluate((act) => window.__game.sim.lockpickAction(act), a);
  await sleep(60);
}
await sleep(150);

const after = await page.evaluate((chestId) => {
  const g = window.__game; const sim = g.sim; const run = sim.delveRunForPlayer(sim.player.id);
  const st = run.objectState[chestId];
  const el = document.querySelector('#lockpick-panel');
  return {
    sessionGone: run.lockpick == null,
    looted: st?.looted === true,
    lootedTier: st?.lootedTier,
    surfaceExitOpen: run.surfaceExitId != null,
    completed: run.completed === true,
    panelClosed: el?.style.display === 'none' || el?.style.display === '',
    lockpickState: sim.lockpickState,
  };
}, setup.chestId);
console.log('after success:', JSON.stringify(after));
check('session ended', after.sessionGone === true);
check('chest looted', after.looted === true);
check('looted at premium tier', after.lootedTier === 'premium');
check('surface exit opened', after.surfaceExitOpen === true);
check('run marked completed', after.completed === true);
check('HUD board closed on end', after.panelClosed === true);
check('lockpickState cleared', after.lockpickState === null);
await page.screenshot({ path: 'tmp/lockpick_e2e_after_success.png' });

// ---- FAIL path: fresh delve, ante 1, one deliberate wrong move -> jam ----
const failPath = await page.evaluate(() => {
  const g = window.__game; const sim = g.sim;
  // leaveDelve only ejects the player; the run keeps its instance claim until it
  // times out empty. Free it so re-enter claims a fresh, unlooted instance — the
  // real "clear the delve again for another attempt" path, fast-forwarded.
  const prev = sim.delveRunForPlayer(sim.player.id);
  sim.leaveDelve();
  if (prev) sim.freeDelveRun(prev);
  sim.enterDelve('collapsed_reliquary', 'normal');
  const run = sim.delveRunForPlayer(sim.player.id);
  if (!run) return { setupErr: 'no run after re-enter' };
  sim.onDelveBossDefeated(run);
  const chestId = run.rewardChestId;
  const chest = sim.entities.get(chestId);
  if (chest) { const p = sim.player; p.pos.x = chest.pos.x; p.pos.z = chest.pos.z; p.prevPos.x = chest.pos.x; p.prevPos.z = chest.pos.z; }
  const distOk = chest ? Math.hypot(sim.player.pos.x - chest.pos.x, sim.player.pos.z - chest.pos.z) : -1;
  sim.lockpickEngage(chestId, 1);
  if (!run.lockpick) {
    const st = run.objectState[chestId];
    return { setupErr: 'engage made no session', chestId, distOk,
      attemptAvailable: st?.attemptAvailable, looted: st?.looted, kind: st?.kind };
  }
  const spec = run.lockpick.spec;
  // Pick a deliberately illegal first move: an action whose delta lands off every
  // open row of column 1 (guaranteed slip/bind) — fall back to the action that is
  // NOT the correct one if all single steps happen to be open.
  const DELTA = { hardSet: -2, set: -1, steady: 0, ease: 1, drop: 2 };
  const allowed = spec.tier.allowedActions;
  let wrong = null;
  for (const a of allowed) {
    const nr = spec.startRow + DELTA[a];
    if (!spec.open[1].includes(nr)) { wrong = a; break; }
  }
  // If every allowed single-step happens to be open (wide bands), drive 2 deep
  // then check; but normally a wrong move exists. Submit it.
  if (!wrong) return { chestId, noWrongMove: true };
  sim.lockpickAction(wrong);
  const st = run.objectState[chestId];
  return {
    chestId, noWrongMove: false, wrong,
    sessionGone: run.lockpick == null,
    attemptAvailable: st?.attemptAvailable,
    looted: st?.looted === true,
  };
});
console.log('fail path:', JSON.stringify(failPath));
if (failPath.setupErr) {
  check('fail path: session engaged', false, failPath.setupErr + ' ' + JSON.stringify(failPath));
} else if (failPath.noWrongMove) {
  check('fail path: found a wrong move', false, 'all single steps open — widen test');
} else {
  check('fail: ante-1 slip ends session', failPath.sessionGone === true);
  check('fail: chest jammed (no attempt left)', failPath.attemptAvailable === false);
  check('fail: chest not looted', failPath.looted === false);
}

console.log(`\nerrors: ${errors.length ? errors.slice(0, 6).join(' | ') : 'none'}`);
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
await browser.close();
process.exit(fail > 0 || errors.length > 0 ? 1 : 0);
