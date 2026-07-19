import type { PlatformId } from '../types/platform';

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

export async function hashAccountScope(platformId: PlatformId, email: string): Promise<string> {
  const input = new TextEncoder().encode(`${platformId}:${normalizeEmail(email)}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
