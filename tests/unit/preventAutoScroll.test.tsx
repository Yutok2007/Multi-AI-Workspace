import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePreventAutoScroll } from '../../src/content/usePreventAutoScroll';
import type { UserBoundPlatformAdapter } from '../../src/platforms/base/UserBoundPlatformAdapter';
import type { PlatformMessage } from '../../src/shared/types/platform';
import { allowProgrammaticMessageScroll } from '../../src/shared/utils/messageScroll';

function createScrollableConversation() {
  const container = document.createElement('main');
  container.style.overflowY = 'auto';
  Object.defineProperties(container, {
    clientHeight: { configurable: true, value: 300 },
    scrollHeight: { configurable: true, value: 1_200 },
  });
  const element = document.createElement('article');
  element.textContent = 'Answer';
  container.append(element);
  document.body.append(container);
  const message: PlatformMessage = {
    platform: 'custom',
    conversationId: 'conversation',
    messageId: null,
    runtimeMessageId: 'assistant:0',
    role: 'assistant',
    plainText: 'Answer',
    html: 'Answer',
    timestamp: null,
    timestampSource: 'observed',
    element,
    order: 0,
  };
  return { container, message };
}

function createAdapter(messages: PlatformMessage[]) {
  let emit: ((nextMessages: PlatformMessage[]) => void) | undefined;
  const unsubscribe = vi.fn();
  const observeMessages = vi.fn((callback: (nextMessages: PlatformMessage[]) => void) => {
    emit = callback;
    callback(messages);
    return unsubscribe;
  });
  return {
    adapter: { observeMessages } as unknown as UserBoundPlatformAdapter,
    emit(nextMessages = messages) {
      emit?.(nextMessages);
    },
    observeMessages,
    unsubscribe,
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('usePreventAutoScroll', () => {
  it('restores the reading position after message changes', () => {
    const { container, message } = createScrollableConversation();
    container.scrollTop = 180;
    const observed = createAdapter([message]);
    const { unmount } = renderHook(() => usePreventAutoScroll(observed.adapter, true, 0, 0));

    act(() => {
      container.scrollTop = 900;
      observed.emit();
    });

    expect(container.scrollTop).toBe(180);
    unmount();
    expect(observed.unsubscribe).toHaveBeenCalledOnce();
  });

  it('guards a native DOM update before an asynchronous adapter refresh is needed', async () => {
    const { container, message } = createScrollableConversation();
    container.scrollTop = 210;
    const observed = createAdapter([message]);
    const { unmount } = renderHook(() => usePreventAutoScroll(observed.adapter, true, 0, 0));

    act(() => {
      container.scrollTop = 880;
      message.element.append(' streamed token');
    });

    await waitFor(() => expect(container.scrollTop).toBe(210));
    unmount();
  });

  it('adopts a position chosen by wheel input, then protects that new position', () => {
    const { container, message } = createScrollableConversation();
    container.scrollTop = 120;
    const observed = createAdapter([message]);
    const { unmount } = renderHook(() => usePreventAutoScroll(observed.adapter, true, 0, 0));

    act(() => {
      document.dispatchEvent(new WheelEvent('wheel'));
      container.scrollTop = 360;
      container.dispatchEvent(new Event('scroll'));
      container.scrollTop = 940;
      observed.emit();
    });

    expect(container.scrollTop).toBe(360);
    unmount();
  });

  it('allows extension navigation and uses its destination as the next reading position', () => {
    let now = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const { container, message } = createScrollableConversation();
    container.scrollTop = 100;
    const observed = createAdapter([message]);
    const { unmount } = renderHook(() => usePreventAutoScroll(observed.adapter, true, 0, 0));

    act(() => {
      allowProgrammaticMessageScroll(document, 1_000);
      container.scrollTop = 520;
      container.dispatchEvent(new Event('scroll'));
    });
    now += 1_001;
    act(() => {
      container.scrollTop = 980;
      observed.emit();
    });

    expect(container.scrollTop).toBe(520);
    unmount();
  });

  it('does not observe or change the page while disabled', () => {
    const { container, message } = createScrollableConversation();
    const observed = createAdapter([message]);
    renderHook(() => usePreventAutoScroll(observed.adapter, false, 0, 0));

    container.scrollTop = 700;
    observed.emit();

    expect(observed.observeMessages).not.toHaveBeenCalled();
    expect(container.scrollTop).toBe(700);
  });
});
