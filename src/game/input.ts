// Default (Mouse Camera off): WoW-style — WASD + A/D keyboard turn, Q/E strafe,
// left-drag orbits, right-drag mouselooks, both buttons run forward.
// Optional Mouse Camera (on): OSRS-style — WASD is camera-relative, A/D strafe,
// mouse drag rotates the orbit (no pointer lock), no keyboard turn.
// Shared: space jump, wheel zoom, Tab target, rebindable action bar, R autorun.

import { Keybinds, actionKind } from './keybinds';
import { CURSOR_ATTACK, CURSOR_FRIENDLY, CURSOR_GRAB, CURSOR_HAND, type HoverCursorKind } from './cursors';

// the camera sensitivity that used to be hard-coded in onMouseMove; the
// settings slider scales this (cameraSpeed 1.0 reproduces the old feel)
const BASE_LOOK_SENS = 0.0045;

export interface InputCallbacks {
  onTab(): void;
  onAbility(slot: number): void;
  onUiKey(key: 'interact' | 'bags' | 'char' | 'spellbook' | 'questlog' | 'map' | 'nameplates' | 'escape' | 'chat' | 'meters' | 'social'): void;
  onClickPick(x: number, y: number, button: number): void;
  /** When false, edge actions (spells, UI keys) are ignored. */
  canUseGameKeys?: () => boolean;
}

export class Input {
  keys = new Set<string>();
  leftDown = false;
  rightDown = false;
  camYaw = Math.PI;
  camPitch = 0.32;
  camDist = 12;
  autorun = false;
  // while true, readMoveInput reports neutral — set when a modal (the options
  // menu) is open so held WASD doesn't drive the character behind it
  suspendMovement = false;
  /** Latest pointer position while over the canvas (for hover pick). */
  hoverX = 0;
  hoverY = 0;
  hoverActive = false;
  private hoverKind: HoverCursorKind = 'default';
  /** OSRS-style camera-relative movement; when false, classic keyboard turn. */
  private mouseCameraEnabled = false;
  private dragDistance = 0;
  private downButton = -1;
  // one-shot key capture for the rebind UI: the next keydown is delivered here
  // (Escape cancels with null) instead of being dispatched as an action
  private captureCb: ((code: string | null) => void) | null = null;
  // mouse-look sensitivity, in radians per pixel of drag; the old fixed value
  // was BASE_LOOK_SENS — setCameraSpeed scales it from the settings menu
  private lookSensitivity = BASE_LOOK_SENS;

  constructor(private canvas: HTMLCanvasElement, private cb: InputCallbacks, private keybinds: Keybinds) {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => this.releaseCapture('blur'));
    window.addEventListener('pointerup', (e) => this.onMouseUp(e));
    window.addEventListener('pointercancel', (e) => this.onMouseUp(e));
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement) this.releaseCapture('pointerlock');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseCapture('hidden');
    });
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = Math.min(22, Math.max(3, this.camDist + Math.sign(e.deltaY) * 1.4));
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mouseenter', () => { this.hoverActive = true; });
    canvas.addEventListener('mouseleave', () => {
      this.hoverActive = false;
      this.setHoverCursor('default');
    });
    this.updateCursor();
  }

  /** True while a mouse button is held for camera drag. */
  isDragging(): boolean {
    return this.leftDown || this.rightDown;
  }

  /** True when OSRS-style camera-relative movement is active. */
  isMouseCameraMode(): boolean {
    return this.mouseCameraEnabled;
  }

  /** Update hand / sword / shield cursor from a hover pick (called once per frame). */
  setHoverCursor(kind: HoverCursorKind): void {
    if (this.hoverKind === kind) return;
    this.hoverKind = kind;
    this.updateCursor();
  }

  /** @deprecated use setHoverCursor */
  setHoverEnemy(enemy: boolean): void {
    this.setHoverCursor(enemy ? 'attack' : 'default');
  }

  /** Toggle OSRS-style camera-relative movement (classic turn when off). */
  setMouseCameraEnabled(on: boolean): void {
    this.mouseCameraEnabled = on;
    if (on && document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
    this.updateCursor();
  }

  /** Capture the next keypress (for the rebind UI) instead of acting on it. */
  captureNextKey(cb: (code: string | null) => void): void {
    this.captureCb = cb;
  }

  /** Scale mouse-look sensitivity. 1.0 = the original fixed speed. */
  setCameraSpeed(mult: number): void {
    this.lookSensitivity = BASE_LOOK_SENS * mult;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    // rebind capture intercepts everything (incl. action/UI keys); Escape cancels
    if (this.captureCb) {
      e.preventDefault();
      const cb = this.captureCb;
      this.captureCb = null;
      cb(e.code === 'Escape' ? null : e.code);
      return;
    }
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (this.cb.canUseGameKeys && !this.cb.canUseGameKeys()) return;
    // Escape always opens/closes the game menu — never rebindable
    if (e.code === 'Escape') { this.cb.onUiKey('escape'); return; }
    if (e.code === 'Tab') e.preventDefault(); // keep Tab from moving DOM focus in-game
    const action = this.keybinds.actionForCode(e.code);
    if (action === null) return;
    if (actionKind(action) === 'held') {
      // movement: just record the key; readMoveInput polls it each frame
      this.keys.add(e.code);
      if (action === 'forward' || action === 'back') this.autorun = false;
      return;
    }
    this.dispatchEdge(action);
  }

  // Fire a one-shot (edge) action by id. Action-bar slots route to onAbility;
  // the rest map to the targeting/interface callbacks; autorun is internal.
  private dispatchEdge(action: string): void {
    if (action.startsWith('slot')) { this.cb.onAbility(Number(action.slice(4))); return; }
    switch (action) {
      case 'autorun': this.autorun = !this.autorun; return;
      case 'target': this.cb.onTab(); return;
      case 'interact': this.cb.onUiKey('interact'); return;
      case 'bags': this.cb.onUiKey('bags'); return;
      case 'char': this.cb.onUiKey('char'); return;
      case 'spellbook': this.cb.onUiKey('spellbook'); return;
      case 'questlog': this.cb.onUiKey('questlog'); return;
      case 'map': this.cb.onUiKey('map'); return;
      case 'nameplates': this.cb.onUiKey('nameplates'); return;
      case 'meters': this.cb.onUiKey('meters'); return;
      case 'social': this.cb.onUiKey('social'); return;
      case 'chat': this.cb.onUiKey('chat'); return;
    }
  }

  /** Drop stuck mouse/keyboard state (window blur, tab away, pointer lock exit). */
  private releaseCapture(_reason: string): void {
    this.keys.clear();
    this.leftDown = false;
    this.rightDown = false;
    this.downButton = -1;
    this.updateCursor();
  }

  private updateCursor(): void {
    const draggingCamera = this.isDragging() && this.mouseCameraEnabled;
    if (draggingCamera) {
      this.canvas.style.cursor = CURSOR_GRAB;
    } else if (this.hoverKind === 'attack') {
      this.canvas.style.cursor = CURSOR_ATTACK;
    } else if (this.hoverKind === 'friendly') {
      this.canvas.style.cursor = CURSOR_FRIENDLY;
    } else {
      this.canvas.style.cursor = CURSOR_HAND;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) this.leftDown = true;
    if (e.button === 2) this.rightDown = true;
    this.downButton = e.button;
    this.dragDistance = 0;
    if (!this.mouseCameraEnabled) {
      this.canvas.requestPointerLock?.();
    } else {
      this.updateCursor();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const wasDrag = this.dragDistance > 5;
    if (e.button === 0) this.leftDown = false;
    if (e.button === 2) this.rightDown = false;
    if (!this.mouseCameraEnabled && !this.leftDown && !this.rightDown && document.pointerLockElement) {
      document.exitPointerLock();
    }
    const onCanvas = e.target === this.canvas || document.pointerLockElement === this.canvas;
    if (!wasDrag && e.button === this.downButton && onCanvas) {
      this.cb.onClickPick(e.clientX, e.clientY, e.button);
    }
    this.downButton = -1;
    this.updateCursor();
  }

  private onMouseMove(e: MouseEvent): void {
    if (e.target === this.canvas) {
      this.hoverX = e.clientX;
      this.hoverY = e.clientY;
    }
    if (!this.leftDown && !this.rightDown) return;
    const mx = e.movementX ?? 0, my = e.movementY ?? 0;
    if (mx === 0 && my === 0) return;
    this.dragDistance += Math.abs(mx) + Math.abs(my);
    this.camYaw -= mx * this.lookSensitivity;
    this.camPitch = Math.min(1.35, Math.max(-0.4, this.camPitch + my * this.lookSensitivity));
  }

  readMoveInput(): {
    forward: boolean; back: boolean; turnLeft: boolean; turnRight: boolean;
    strafeLeft: boolean; strafeRight: boolean; jump: boolean;
  } {
    if (this.suspendMovement) {
      return { forward: false, back: false, turnLeft: false, turnRight: false, strafeLeft: false, strafeRight: false, jump: false };
    }
    const k = this.keys;
    const held = (id: string) => this.keybinds.codesForAction(id).some((c) => k.has(c));
    const bothButtons = this.leftDown && this.rightDown;
    const forward = held('forward') || bothButtons || this.autorun;
    const back = held('back');
    const jump = held('jump');

    if (this.mouseCameraEnabled) {
      // OSRS: A/D strafe; keyboard never turns.
      return {
        forward, back, jump,
        turnLeft: false,
        turnRight: false,
        strafeLeft: held('strafeLeft') || held('turnLeft'),
        strafeRight: held('strafeRight') || held('turnRight'),
      };
    }

    // Classic: A/D turn unless right-drag mouselooking; Q/E always strafe.
    const mouselook = this.rightDown;
    const aHeld = held('turnLeft');
    const dHeld = held('turnRight');
    return {
      forward, back, jump,
      strafeLeft: held('strafeLeft') || (mouselook && aHeld),
      strafeRight: held('strafeRight') || (mouselook && dHeld),
      turnLeft: !mouselook && aHeld,
      turnRight: !mouselook && dHeld,
    };
  }
}
