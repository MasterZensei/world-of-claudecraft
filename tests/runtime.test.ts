import { describe, expect, it } from 'vitest';
import { apiUrl, isElectronRuntime, mediaUrl, normalizeOrigin, webSocketUrl } from '../src/runtime';

describe('runtime URL routing', () => {
  it('keeps browser REST calls same-origin', () => {
    expect(apiUrl('/api/login', null)).toBe('/api/login');
  });

  it('points Electron REST calls at the configured origin', () => {
    expect(apiUrl('/api/login', 'https://dev.worldofclaudecraft.com')).toBe('https://dev.worldofclaudecraft.com/api/login');
  });

  it('maps HTTPS origins to secure WebSockets', () => {
    expect(webSocketUrl('file:', '', 'https://dev.worldofclaudecraft.com')).toBe('wss://dev.worldofclaudecraft.com/ws');
  });

  it('maps HTTP origins to plain WebSockets for local development', () => {
    expect(webSocketUrl('http:', 'localhost:8787', 'http://localhost:8787')).toBe('ws://localhost:8787/ws');
  });

  it('keeps browser WebSockets same-origin', () => {
    expect(webSocketUrl('https:', 'worldofclaudecraft.com', null)).toBe('wss://worldofclaudecraft.com/ws');
  });

  it('rejects non-http server origins', () => {
    expect(() => normalizeOrigin('file:///tmp/game')).toThrow(/unsupported server origin protocol/);
  });

  it('detects Electron by user agent without Node globals', () => {
    expect(isElectronRuntime('Mozilla/5.0 Electron/42.4.0 Safari/537.36')).toBe(true);
    expect(isElectronRuntime('Mozilla/5.0 Chrome/149.0.0.0 Safari/537.36')).toBe(false);
  });

  it('makes absolute media paths relative under file URLs', () => {
    expect(mediaUrl('/media/models/chars/knight.abc.glb', 'file:')).toBe('./media/models/chars/knight.abc.glb');
  });
});
