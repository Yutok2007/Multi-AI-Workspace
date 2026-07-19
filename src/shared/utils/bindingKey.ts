import type { PlatformId } from '../types/platform';

export function createBindingId(platformId: PlatformId, origin: string): string {
  return `binding:${platformId}:${origin}`;
}
