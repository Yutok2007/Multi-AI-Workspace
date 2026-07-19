import { useEffect } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import { sendContentRequest } from './runtime';

const notifiedCompletionIds = new Set<string>();

export function useCompletionNotification(
  adapter: UserBoundPlatformAdapter,
  enabled: boolean,
  bindingRevision: number,
  routeRevision: number,
  title: string,
  message: string,
): void {
  useEffect(() => {
    if (
      !enabled ||
      !adapter.getCapabilities().has('messages.observe') ||
      !adapter.observeAnswerCompletions
    ) {
      return;
    }
    return adapter.observeAnswerCompletions((completion) => {
      if (notifiedCompletionIds.has(completion.id)) return;
      notifiedCompletionIds.add(completion.id);
      if (notifiedCompletionIds.size > 500) {
        notifiedCompletionIds.delete(notifiedCompletionIds.values().next().value!);
      }
      void sendContentRequest({
        type: 'notification.show',
        title,
        message,
        dedupeKey: completion.id,
      }).catch(() => {
        // Notification permission or the OS notification service may be unavailable.
        // Completion handling on the host page must remain unaffected.
      });
    });
  }, [adapter, bindingRevision, enabled, message, routeRevision, title]);
}
