import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import browser from 'webextension-polyfill';

import { useCompletionNotification } from '../../src/content/useCompletionNotification';
import type { UserBoundPlatformAdapter } from '../../src/platforms/base/UserBoundPlatformAdapter';
import type { PlatformAnswerCompletion } from '../../src/shared/types/platform';

afterEach(() => vi.restoreAllMocks());

describe('useCompletionNotification', () => {
  it('sends one content-free notification for one formal completion', async () => {
    let complete: ((completion: PlatformAnswerCompletion) => void) | undefined;
    const unsubscribe = vi.fn();
    const adapter = {
      getCapabilities: () => new Set(['messages.observe']),
      observeAnswerCompletions: vi.fn((callback) => {
        complete = callback;
        return unsubscribe;
      }),
    } as unknown as UserBoundPlatformAdapter;
    const sendMessage = vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue({ ok: true });
    const completion: PlatformAnswerCompletion = {
      id: 'completion-once',
      message: {
        platform: 'custom',
        conversationId: 'conversation',
        messageId: null,
        runtimeMessageId: 'assistant:1',
        role: 'assistant',
        plainText: 'Sensitive final answer',
        html: null,
        timestamp: null,
        timestampSource: 'observed',
        element: document.createElement('article'),
        order: 1,
      },
    };

    const { unmount } = renderHook(() =>
      useCompletionNotification(adapter, true, 0, 0, 'Workspace', 'Answer complete'),
    );
    act(() => {
      complete?.(completion);
      complete?.(completion);
    });
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'notification.show',
      title: 'Workspace',
      message: 'Answer complete',
      dedupeKey: 'completion-once',
    });
    expect(JSON.stringify(sendMessage.mock.calls)).not.toContain('Sensitive final answer');
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('does not subscribe when notifications are disabled', () => {
    const observeAnswerCompletions = vi.fn();
    const adapter = {
      getCapabilities: () => new Set(['messages.observe']),
      observeAnswerCompletions,
    } as unknown as UserBoundPlatformAdapter;

    renderHook(() => useCompletionNotification(adapter, false, 0, 0, 'Workspace', 'Complete'));

    expect(observeAnswerCompletions).not.toHaveBeenCalled();
  });
});
