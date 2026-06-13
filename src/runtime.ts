const DEFAULT_ELECTRON_ORIGIN = 'https://worldofclaudecraft.com';

export function isElectronRuntime(userAgent = globalThis.navigator?.userAgent ?? ''): boolean {
  return /\bElectron\//.test(userAgent);
}

export function normalizeOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`unsupported server origin protocol: ${url.protocol}`);
  }
  return url.origin;
}

export function electronOnlineOrigin(): string {
  return normalizeOrigin(import.meta.env.VITE_ONLINE_ORIGIN || DEFAULT_ELECTRON_ORIGIN);
}

export function onlineServerOrigin(userAgent = globalThis.navigator?.userAgent ?? ''): string | null {
  return isElectronRuntime(userAgent) ? electronOnlineOrigin() : null;
}

export function apiUrl(path: string, origin: string | null = onlineServerOrigin()): string {
  if (!path.startsWith('/')) throw new Error(`api path must start with /: ${path}`);
  return origin ? `${normalizeOrigin(origin)}${path}` : path;
}

export function webSocketUrl(protocol: string, host: string, origin: string | null = onlineServerOrigin()): string {
  if (origin) {
    const url = new URL(normalizeOrigin(origin));
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    url.hash = '';
    return url.toString();
  }
  const proto = protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${host}/ws`;
}

export function mediaUrl(path: string, protocol = globalThis.location?.protocol): string {
  if (!path.startsWith('/')) return path;
  if (protocol === 'file:') return `.${path}`;
  return path;
}
