import { Sim } from './sim/sim';
import { Renderer } from './render/renderer';
import { Input } from './game/input';
import { Keybinds } from './game/keybinds';
import { Settings, GameSettings } from './game/settings';
import { MobileControls, PHONE_TOUCH_QUERY, isPhoneTouchDevice } from './game/mobile_controls';
import { Hud } from './ui/hud';
import { audio } from './game/audio';
import { music } from './game/music';
import { handlePickedEntity } from './game/interactions';
import { Api, ClientWorld, CharacterSummary } from './net/online';
import type { IWorld } from './world_api';
import { assetsReady } from './render/assets/preload';
import { DT, INTERACT_RANGE, PlayerClass, dist2d } from './sim/types';

const WORLD_SEED = 20061; // fixed: World of Claudecraft is a persistent place

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;

function syncAppViewport(): void {
  const width = Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth));
  const height = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
  document.documentElement.style.setProperty('--app-vw', `${width}px`);
  document.documentElement.style.setProperty('--app-vh', `${height}px`);
}

function preventMobileZoom(): void {
  let lastTouchEnd = 0;
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  document.addEventListener('gestureend', prevent, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 320) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}

function syncPhoneTouchClass(): void {
  document.body.classList.toggle('mobile-touch', isPhoneTouchDevice());
}

syncAppViewport();
preventMobileZoom();
syncPhoneTouchClass();
window.matchMedia(PHONE_TOUCH_QUERY).addEventListener?.('change', syncPhoneTouchClass);
window.addEventListener('resize', syncAppViewport);
window.addEventListener('orientationchange', () => {
  syncAppViewport();
  window.setTimeout(syncAppViewport, 250);
  window.setTimeout(syncAppViewport, 800);
});
window.visualViewport?.addEventListener('resize', syncAppViewport);
window.visualViewport?.addEventListener('scroll', syncAppViewport);
document.addEventListener('fullscreenchange', syncAppViewport);

function requestMobileFullscreenLandscape(): void {
  if (!isPhoneTouchDevice()) return;
  const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  try {
    const request = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    const result = request?.();
    if (result && typeof (result as Promise<void>).catch === 'function') void (result as Promise<void>).catch(() => {});
  } catch { /* browser declined fullscreen */ }
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: OrientationLockType) => Promise<void> };
    void orientation.lock?.('landscape').catch(() => {});
  } catch { /* browser declined orientation lock */ }
}

function mobilePlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function mobilePreflightCopy(): { detail: string; steps: string[] } {
  const standalone = isStandaloneDisplay();
  const base = [
    'Rotate your device to landscape before entering the world.',
    'Mobile performance may be degraded. Close extra tabs and lower Render Quality if the game feels slow.',
  ];
  if (mobilePlatform() === 'ios') {
    return {
      detail: standalone
        ? 'You are in home-screen fullscreen mode. Keep the device in landscape.'
        : 'For true fullscreen on iPhone or iPad, install this page to your Home Screen first.',
      steps: standalone
        ? base
        : [
          'In Safari, tap Share, then Add to Home Screen.',
          'Open World of Claudecraft from the new Home Screen icon.',
          ...base,
        ],
    };
  }
  if (mobilePlatform() === 'android') {
    return {
      detail: standalone
        ? 'You are in fullscreen app mode. Keep the device in landscape.'
        : 'For fullscreen on Android, install this page or add it to your Home screen first.',
      steps: standalone
        ? base
        : [
          'In Chrome, tap the menu, then Install app or Add to Home screen.',
          'Open World of Claudecraft from the new icon.',
          ...base,
        ],
    };
  }
  return {
    detail: standalone
      ? 'Keep your device in landscape fullscreen.'
      : 'Install or add this page to your Home screen for the best fullscreen mobile experience.',
    steps: base,
  };
}

function showMobilePreflightPrompt(): void {
  if (!isPhoneTouchDevice()) return;
  const prompt = document.getElementById('mobile-preflight') as HTMLElement | null;
  const detail = document.getElementById('mobile-preflight-detail') as HTMLElement | null;
  const steps = document.getElementById('mobile-preflight-steps') as HTMLOListElement | null;
  const continueBtn = document.getElementById('mobile-preflight-continue') as HTMLButtonElement | null;
  if (!prompt || !detail || !steps || !continueBtn) return;

  const copy = mobilePreflightCopy();
  detail.textContent = copy.detail;
  steps.replaceChildren(...copy.steps.map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));

  document.body.classList.add('mobile-preflight-open', 'mobile-touch');
  prompt.style.display = 'flex';
  prompt.classList.add('visible');
  continueBtn.onclick = () => hideMobilePreflightPrompt();
}

function hideMobilePreflightPrompt(): void {
  const prompt = document.getElementById('mobile-preflight') as HTMLElement | null;
  prompt?.classList.remove('visible');
  if (prompt) prompt.style.display = '';
  document.body.classList.remove('mobile-preflight-open');
}

// ---------------------------------------------------------------------------
// Loading screen (shown from "enter world" until the first frame renders)
// ---------------------------------------------------------------------------

const LOADING_FADE_MS = 350; // keep in sync with the #loading-screen CSS transition

let loadingHideTimer: number | null = null;

function showLoadingScreen(statusText: string): void {
  const el = $('#loading-screen');
  if (loadingHideTimer !== null) {
    window.clearTimeout(loadingHideTimer);
    loadingHideTimer = null;
  }
  el.classList.remove('fade');
  el.classList.add('visible');
  setLoadingStatus(statusText);
}

function setLoadingStatus(text: string): void {
  $('#ls-status').textContent = text;
}

function setLoadingProgress(done: number, total: number): void {
  $('#ls-fill').style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
  setLoadingStatus(`Loading world… ${done}/${total}`);
}

function hideLoadingScreen(): void {
  const el = $('#loading-screen');
  if (!el.classList.contains('visible')) return;
  el.classList.add('fade');
  loadingHideTimer = window.setTimeout(() => {
    el.classList.remove('visible', 'fade');
    loadingHideTimer = null;
  }, LOADING_FADE_MS);
}

function enterLoadingState(statusText: string): void {
  hideMobilePreflightPrompt();
  showLoadingScreen(statusText);
  $('#start-screen').style.display = 'none';
}

// The loading screen blocks pointer input but a covered button keeps keyboard
// focus, so Enter/Space could re-fire it mid-entry. One entry per page load;
// every failure path recovers via fatalOverlay's reload.
let hasBegunWorldEntry = false;

function beginWorldEntry(): boolean {
  if (hasBegunWorldEntry) return false;
  hasBegunWorldEntry = true;
  return true;
}

async function prepareWorldEntry(): Promise<boolean> {
  if (hasBegunWorldEntry) return false;
  requestMobileFullscreenLandscape();
  syncAppViewport();
  window.setTimeout(syncAppViewport, 250);
  window.setTimeout(syncAppViewport, 800);
  return beginWorldEntry();
}

// ---------------------------------------------------------------------------
// Shared game wiring (used by both offline sim and online world)
// ---------------------------------------------------------------------------

async function startGame(world: IWorld, offlineSim: Sim | null, online: ClientWorld | null): Promise<void> {
  // Model/texture/HDRI fetches were kicked off at module import; the renderer
  // builds its scene synchronously, so everything must be resolved first.
  // The loading screen covers the gap — not a silent black screen.
  enterLoadingState('Loading world…');
  document.body.classList.add('game-active');
  try {
    await assetsReady((done, total) => setLoadingProgress(done, total));
  } catch (err) {
    fatalOverlay(`Asset loading failed — try reloading. ${err instanceof Error ? err.message : err}`);
    return;
  }
  setLoadingStatus('Entering the world…');

  const canvas = $('#game-canvas') as unknown as HTMLCanvasElement;
  const nameplates = $('#nameplates') as HTMLDivElement;

  const keybinds = new Keybinds();
  const settings = new Settings();
  let renderer!: Renderer;
  let hud!: Hud;
  try {
    renderer = new Renderer(world, canvas, nameplates);
    hud = new Hud(world, renderer, keybinds);
  } catch (err) {
    // e.g. WebGL context creation failure — surface it instead of leaving the
    // loading screen up forever
    fatalOverlay(`Could not start the renderer — try reloading. ${err instanceof Error ? err.message : err}`);
    return;
  }

  const chatInput = $('#chat-input') as unknown as HTMLInputElement;
  function openChat(): void {
    chatInput.style.display = 'block';
    chatInput.focus();
  }
  chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = chatInput.value.trim();
      if (text) world.chat(text);
      chatInput.value = '';
      chatInput.style.display = 'none';
      chatInput.blur();
    } else if (e.key === 'Escape') {
      chatInput.value = '';
      chatInput.style.display = 'none';
      chatInput.blur();
    }
  });

  const input = new Input(canvas, {
    onTab: () => world.tabTarget(),
    // slot 0 (key 1) is Attack for every class — auto-attack without needing
    // right-click; keys and clicks share the Hud's remappable slot layout
    onAbility: (slot) => hud.castSlot(slot),
    onUiKey: (key) => {
      switch (key) {
        case 'interact': interactKey(); break;
        case 'bags': hud.toggleBags(); break;
        case 'char': hud.toggleChar(); break;
        case 'spellbook': hud.toggleSpellbook(); break;
        case 'questlog': hud.toggleQuestLog(); break;
        case 'map': hud.toggleMap(); break;
        case 'nameplates': renderer.showNameplates = !renderer.showNameplates; break;
        case 'meters': hud.toggleMeters(); break;
        case 'chat': openChat(); break;
        case 'escape':
          // close the topmost panel; if nothing was open, open the game menu
          if (!hud.closeAll()) hud.toggleOptionsMenu();
          break;
      }
    },
    onClickPick: (x, y, button) => handlePick(x, y, button),
  }, keybinds);
  input.camYaw = world.player.facing;

  const mobileControls = new MobileControls(input, {
    onAttackNearest: () => attackNearest(),
    onTarget: () => world.tabTarget(),
    onInteract: () => interactKey(),
    onChat: () => openChat(),
    onMenu: () => {
      if (!hud.closeAll()) hud.toggleOptionsMenu();
    },
  });
  mobileControls.start();

  // apply a setting to its live subsystem (also used to apply all on startup)
  function applySetting(key: keyof GameSettings, value: number): void {
    const v = settings.set(key, value);
    switch (key) {
      case 'cameraSpeed': input.setCameraSpeed(v); break;
      case 'sfxVolume': audio.setVolume(v); break;
      case 'musicVolume': music.setVolume(v); break;
      case 'brightness': renderer.setBrightness(v); break;
      case 'renderScale': renderer.setRenderScale(v); break;
    }
  }
  // apply persisted settings to the freshly-built subsystems
  const saved = settings.all();
  for (const k of Object.keys(saved) as (keyof GameSettings)[]) applySetting(k, saved[k]);

  // the options menu drives logout + key-capture + settings, all of which need
  // refs that only exist now (input/renderer) or are page-level (reload)
  hud.attachOptions({
    logout: () => location.reload(),
    captureKey: (cb) => input.captureNextKey(cb),
    settings,
    onSettingChange: (key, value) => applySetting(key, value),
  });

  function interactKey(): void {
    const p = world.player;
    let bestCorpse: number | null = null, bestCorpseD = INTERACT_RANGE;
    let bestObj: number | null = null, bestObjD = INTERACT_RANGE;
    let bestNpc: number | null = null, bestNpcD = INTERACT_RANGE + 1;
    for (const e of world.entities.values()) {
      const d = dist2d(p.pos, e.pos);
      if (e.kind === 'mob' && e.lootable && d < bestCorpseD) { bestCorpse = e.id; bestCorpseD = d; }
      if (e.kind === 'object' && e.lootable && d < bestObjD) { bestObj = e.id; bestObjD = d; }
      if (e.kind === 'npc' && d < bestNpcD) { bestNpc = e.id; bestNpcD = d; }
    }
    if (bestCorpse !== null) { world.lootCorpse(bestCorpse); return; }
    if (bestObj !== null) {
      const obj = world.entities.get(bestObj)!;
      if (obj.templateId === 'dungeon_door' && obj.dungeonId) { world.enterDungeon(obj.dungeonId); return; }
      if (obj.templateId === 'dungeon_exit') { world.leaveDungeon(); return; }
      world.pickUpObject(bestObj);
      return;
    }
    if (bestNpc !== null) { hud.openQuestDialog(bestNpc); return; }
    hud.showError('Nothing to interact with.');
  }

  function attackNearest(): void {
    const p = world.player;
    let best: number | null = null;
    let bestD = 40;
    for (const e of world.entities.values()) {
      if (e.kind !== 'mob' || e.dead || !e.hostile) continue;
      const d = dist2d(p.pos, e.pos);
      if (d < bestD) { best = e.id; bestD = d; }
    }
    if (best === null) { hud.showError('No enemy nearby.'); return; }
    world.targetEntity(best);
    world.startAutoAttack();
  }

  function handlePick(x: number, y: number, button: number): void {
    const id = renderer.pick(x, y);
    if (id === null) {
      if (button === 0) world.targetEntity(null);
      return;
    }
    handlePickedEntity(world, hud, id, button, x, y);
  }

  let last = performance.now();
  let acc = 0;

  // Camera follow state: keyboard turning advances facing in 20Hz sim steps,
  // so the camera tracks the player's render-interpolated facing per frame
  // (same curve the character model follows) instead of the raw tick deltas —
  // that's what killed the turn stutter. While running, the orbit offset
  // eases back to zero so the camera settles in behind the character.
  let lastInterpFacing: number | null = null;
  const CAM_SETTLE_RATE = 3; // 1/s exponential ease

  function wrapAngle(d: number): number {
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  function updateCamera(frameDt: number, interpFacing: number): void {
    if (!input.isMouselookActive()) {
      // follow turns 1:1 (keeps any manual orbit offset constant)
      if (lastInterpFacing !== null) input.camYaw += wrapAngle(interpFacing - lastInterpFacing);
      // settle behind the character while moving, unless the player is
      // actively holding an orbit drag
      const mi = input.readMoveInput();
      if ((mi.forward || mi.strafeLeft || mi.strafeRight) && !input.leftDown) {
        input.camYaw += wrapAngle(interpFacing - input.camYaw) * (1 - Math.exp(-frameDt * CAM_SETTLE_RATE));
      }
    }
    lastInterpFacing = interpFacing; // track through mouselook too — no snap on release
  }

  function frame(now: number): void {
    requestAnimationFrame(frame);
    let frameDt = (now - last) / 1000;
    last = now;
    if (frameDt > 0.25) frameDt = 0.25;

    // freeze movement while the game menu is up so WASD doesn't walk the
    // character behind it (other windows stay non-modal, as before)
    input.suspendMovement = hud.isModalOpen();
    input.updateTouchLook(frameDt);

    const mouselook = input.isMouselookActive() && !world.player.dead;

    if (offlineSim) {
      acc += frameDt;
      while (acc >= DT) {
        const mi = input.readMoveInput();
        Object.assign(offlineSim.moveInput, mi);
        if (mouselook) offlineSim.player.facing = input.camYaw;
        const events = offlineSim.tick();
        hud.handleEvents(events);
        acc -= DT;
      }
      const pp = offlineSim.player;
      updateCamera(frameDt, pp.prevFacing + wrapAngle(pp.facing - pp.prevFacing) * (acc / DT));
      renderer.camYaw = input.camYaw;
      renderer.camPitch = input.camPitch;
      renderer.camDist = input.camDist;
      renderer.sync(acc / DT, frameDt, mouselook ? input.camYaw : null);
      hud.update();
      return;
    }

    // online: inputs stream on a timer inside ClientWorld; here we mirror state
    const net = online!;
    Object.assign(net.moveInput, input.readMoveInput());
    net.setMouselookFacing(mouselook ? input.camYaw : null);
    net.pendingFacingDelta = 0; // superseded by the interpolated follow below
    hud.handleEvents(net.drainEvents());
    if (net.consumeInventoryChanged()) hud.onInventoryChanged();
    const alpha = net.lastSnapAt > 0
      ? Math.min(1.25, (performance.now() - net.lastSnapAt) / Math.max(20, net.snapInterval))
      : 1;
    const pe = world.player;
    // facing interp capped at 1 — extrapolating angles past the snapshot oscillates
    updateCamera(frameDt, pe.prevFacing + wrapAngle(pe.facing - pe.prevFacing) * Math.min(1, alpha));
    renderer.camYaw = input.camYaw;
    renderer.camPitch = input.camPitch;
    renderer.camDist = input.camDist;
    renderer.sync(alpha, frameDt, mouselook ? input.camYaw : null);
    hud.update();
  }
  requestAnimationFrame(frame);
  // cut to the game only once the first frame is actually on screen
  requestAnimationFrame(() => requestAnimationFrame(() => hideLoadingScreen()));

  (window as any).__game = { sim: world, world, renderer, input, hud, online };
}

// ---------------------------------------------------------------------------
// Offline flow
// ---------------------------------------------------------------------------

// Offline names go straight into innerHTML paths (quest $N text, char window
// title), so enforce the server's character-name rule client-side too:
// strip anything outside [A-Za-z' -], then require /^[A-Za-z][A-Za-z' -]{1,15}$/.
function sanitizeOfflineName(raw: string): string {
  const stripped = raw.replace(/[^A-Za-z' -]/g, '').replace(/^[^A-Za-z]+/, '').slice(0, 16);
  return /^[A-Za-z][A-Za-z' -]{1,15}$/.test(stripped) ? stripped : 'Adventurer';
}

async function startOffline(playerClass: PlayerClass, name: string): Promise<void> {
  if (!(await prepareWorldEntry())) return;
  enterLoadingState('Loading world…');
  const sim = new Sim({ seed: WORLD_SEED, playerClass, playerName: name });
  void startGame(sim, sim, null);
}

// ---------------------------------------------------------------------------
// Online flow: login -> character select -> world
// ---------------------------------------------------------------------------

const api = new Api();

function show(el: string): void {
  for (const id of ['#mode-select', '#login-panel', '#charselect-panel']) {
    $(id).style.display = id === el ? 'block' : 'none';
  }
}

function loginError(text: string): void {
  const el = $('#login-error');
  el.textContent = text;
}

async function refreshCharacters(): Promise<void> {
  const listEl = $('#char-list');
  listEl.innerHTML = '<div style="color:#887c5c;font-size:12px">Loading…</div>';
  try {
    const chars = await api.characters();
    listEl.innerHTML = '';
    if (chars.length === 0) {
      listEl.innerHTML = '<div style="color:#887c5c;font-size:12px;padding:6px 0">No characters yet — create one below.</div>';
    }
    for (const c of chars) {
      const row = document.createElement('div');
      row.className = 'char-row' + (c.online ? ' online' : '');
      row.innerHTML = `<span class="char-name">${c.name}</span>
        <span class="char-sub">Level ${c.level} ${c.class[0].toUpperCase()}${c.class.slice(1)}${c.online ? ' — in world' : ''}</span>
        <button class="btn">Enter World</button>`;
      row.querySelector('button')!.addEventListener('click', (e) => void enterWorld(c, e.currentTarget as HTMLButtonElement));
      listEl.appendChild(row);
    }
  } catch (err: any) {
    listEl.innerHTML = `<div style="color:#ff6b5e;font-size:12px">${err.message}</div>`;
  }
}

function fatalOverlay(message: string): void {
  hideLoadingScreen(); // its art would bleed through the translucent backdrop
  if (document.getElementById('disconnect-overlay')) return; // first reason wins
  const el = document.createElement('div');
  el.id = 'disconnect-overlay';
  el.style.cssText = 'position:absolute;inset:0;background:#000c;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;z-index:200;color:#e8d8a8;font-family:Georgia,serif;font-size:20px;';
  el.innerHTML = `<div>${message}</div>`;
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Return to Login';
  btn.addEventListener('click', () => location.reload());
  el.appendChild(btn);
  document.body.appendChild(el);
}

async function enterWorld(c: CharacterSummary, button?: HTMLButtonElement): Promise<void> {
  try {
    if (button) {
      button.disabled = true;
      button.textContent = 'Entering...';
    }
    if (!(await prepareWorldEntry())) return;
    audio.init();
    music.init();
    enterLoadingState('Connecting to realm…');
    const world = new ClientWorld(api.token!, c.id, c.class);
    // wait for hello + first snapshot so the world starts populated
    const waitStart = Date.now();
    const poll = setInterval(() => {
      if (world.connected && world.entities.has(world.playerId)) {
        clearInterval(poll);
        void startGame(world, null, world);
      } else if (Date.now() - waitStart > 10000) {
        clearInterval(poll);
        world.close();
        fatalOverlay('Could not enter world (timeout). Is the game server running?');
      }
    }, 50);
    // a rejected join must stop the poll too, or its timeout overlay would
    // mask the real reason (e.g. "character already in world")
    world.onDisconnect = (reason) => {
      clearInterval(poll);
      fatalOverlay(reason);
    };
  } catch (err) {
    fatalOverlay(`Could not enter world. ${err instanceof Error ? err.message : err}`);
  }
}

function wireStartScreens(): void {
  // mode select
  $('#btn-online').addEventListener('click', () => show('#login-panel'));
  $('#btn-offline').addEventListener('click', () => {
    $('#mode-select').style.display = 'none';
    $('#offline-select').style.display = 'block';
  });

  // offline class cards
  document.querySelectorAll('.class-card').forEach((card) => {
    card.addEventListener('click', () => {
      audio.init();
      music.init();
      const name = sanitizeOfflineName(($('#char-name') as unknown as HTMLInputElement).value.trim());
      void startOffline((card as HTMLElement).dataset.class as PlayerClass, name);
    });
  });

  // login
  const doAuth = async (mode: 'login' | 'register') => {
    const username = ($('#login-user') as unknown as HTMLInputElement).value.trim();
    const password = ($('#login-pass') as unknown as HTMLInputElement).value;
    loginError('');
    try {
      if (mode === 'login') await api.login(username, password);
      else await api.register(username, password);
      $('#charselect-user').textContent = api.username ?? '';
      show('#charselect-panel');
      await refreshCharacters();
    } catch (err: any) {
      loginError(err.message);
    }
  };
  $('#btn-login').addEventListener('click', () => void doAuth('login'));
  $('#btn-register').addEventListener('click', () => void doAuth('register'));
  $('#login-pass').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void doAuth('login');
  });
  $('#btn-login-back').addEventListener('click', () => show('#mode-select'));

  // character creation
  document.querySelectorAll('#charselect-panel .mini-class').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('#charselect-panel .mini-class').forEach((x) => x.classList.remove('sel'));
      el.classList.add('sel');
    });
  });
  $('#btn-create-char').addEventListener('click', async () => {
    const name = ($('#new-char-name') as unknown as HTMLInputElement).value.trim();
    const clsEl = document.querySelector('#charselect-panel .mini-class.sel') as HTMLElement | null;
    loginError('');
    if (!clsEl) { $('#charselect-error').textContent = 'Pick a class.'; return; }
    try {
      await api.createCharacter(name, clsEl.dataset.class as PlayerClass);
      ($('#new-char-name') as unknown as HTMLInputElement).value = '';
      $('#charselect-error').textContent = '';
      await refreshCharacters();
    } catch (err: any) {
      $('#charselect-error').textContent = err.message;
    }
  });
  $('#btn-charselect-back').addEventListener('click', () => show('#login-panel'));
}

wireStartScreens();
