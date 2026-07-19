import { useEffect, useRef, useState } from 'react';

import { AppError } from '../shared/errors/AppError';
import { logger } from '../shared/logger/logger';
import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import type { PlatformId } from '../shared/types/platform';
import { isNewConversationUrl } from '../shared/utils/conversationBranch';

export type DefaultModelApplicationStatus =
  | { state: 'applied'; model: string }
  | { state: 'binding-required'; model: string }
  | { state: 'error'; model: string; code: string }
  | null;

export function shouldApplyDefaultModel(
  platformId: PlatformId,
  currentUrl: string,
  messageCount: number,
): boolean {
  return messageCount === 0 && isNewConversationUrl(platformId, currentUrl);
}

export function useDefaultModel(
  adapter: UserBoundPlatformAdapter,
  platformId: PlatformId,
  defaultModel: string | undefined,
  bindingRevision: number,
  routeRevision: number,
): DefaultModelApplicationStatus {
  const [status, setStatus] = useState<DefaultModelApplicationStatus>(null);
  const applied = useRef('');
  const model = defaultModel?.trim() ?? '';
  const eligible = Boolean(model) && shouldApplyDefaultModel(platformId, location.href, 0);
  const canSelect = adapter.getCapabilities().has('model.select') && Boolean(adapter.selectModel);

  useEffect(() => {
    let active = true;
    const applicationKey = `${routeRevision}:${model}`;
    if (!eligible || !canSelect) {
      return () => {
        active = false;
      };
    }
    if (applied.current === applicationKey) {
      return () => {
        active = false;
      };
    }

    void adapter
      .getMessages()
      .then(async (messages) => {
        if (!shouldApplyDefaultModel(platformId, location.href, messages.length) || !active) {
          return null;
        }
        return adapter.selectModel!(model);
      })
      .then((selection) => {
        if (!selection || !active) return;
        applied.current = applicationKey;
        setStatus({ state: 'applied', model: selection.model });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const code = reason instanceof AppError ? reason.code : 'DEFAULT_MODEL_APPLY_FAILED';
        logger.warn(code, 'The configured default model was not applied.', {
          platformId,
          model,
        });
        setStatus({ state: 'error', model, code });
      });

    return () => {
      active = false;
    };
  }, [adapter, bindingRevision, canSelect, eligible, model, platformId, routeRevision]);

  if (!eligible) return null;
  if (!canSelect) return { state: 'binding-required', model };
  return status?.model === model ? status : null;
}
