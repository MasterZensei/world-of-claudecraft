import { MEDIA_ASSETS } from './manifest.generated';
import { mediaUrl } from '../../runtime';

function logicalPath(url: string): string {
  return url.replace(/^\/+/, '');
}

export function assetUrl(url: string): string {
  const logical = logicalPath(url);
  if (import.meta.env.DEV) return `/${logical}`;
  return mediaUrl(MEDIA_ASSETS[logical] ?? `/${logical}`);
}
