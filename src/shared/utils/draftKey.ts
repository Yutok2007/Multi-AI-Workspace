import type { PlatformId } from '../types/platform';

export function createDraftKey(
  platformId: PlatformId,
  accountScopeId: string,
  conversationId: string | null,
  conversationUrl: string,
): string {
  const conversationScope = conversationId ?? new URL(conversationUrl).href;
  return [platformId, accountScopeId, conversationScope]
    .map((part) => encodeURIComponent(part))
    .join('::');
}
