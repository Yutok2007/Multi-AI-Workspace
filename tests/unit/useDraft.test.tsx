import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserBoundPlatformAdapter } from '../../src/platforms/base/UserBoundPlatformAdapter';
import type { DraftRecord } from '../../src/shared/types/records';
import { createDraftKey } from '../../src/shared/utils/draftKey';
import { deleteRecord, getRecord, putRecord } from '../../src/content/database';
import { useDraft } from '../../src/content/useDraft';

vi.mock('../../src/content/database', () => ({
  deleteRecord: vi.fn(),
  getRecord: vi.fn(),
  putRecord: vi.fn(),
}));

const accountScopeId = 'account-1';

function draftFor(conversationId = 'conversation-1'): DraftRecord {
  const url = `https://chatgpt.com/c/${conversationId}`;
  return {
    id: createDraftKey('chatgpt', accountScopeId, conversationId, url),
    platformId: 'chatgpt',
    accountScopeId,
    conversationId,
    conversationUrl: url,
    content: 'Recovered input',
    selectionStart: 4,
    selectionEnd: 9,
    updatedAt: 1,
  };
}

function createAdapter(initialContent = '') {
  let content = initialContent;
  let conversationId = 'conversation-1';
  let observer: ((value: string) => void) | null = null;
  const editable = document.createElement('textarea');
  const sendButton = document.createElement('button');
  editable.value = content;
  document.body.append(editable, sendButton);

  const writeComposer = vi.fn(
    async (
      value: string,
      options?: { mode: 'replace' | 'insert-at-cursor' | 'append'; focus?: boolean },
    ) => {
      content = value;
      editable.value = value;
      observer?.(value);
      if (options?.focus) editable.focus();
    },
  );
  const observeComposer = vi.fn((callback: (value: string) => void) => {
    observer = callback;
    return () => {
      observer = null;
    };
  });
  const adapter = {
    id: 'chatgpt',
    getCapabilities: () => new Set(['composer.observe']),
    getCurrentConversation: vi.fn(async () => ({
      platform: 'chatgpt',
      accountScopeId,
      conversationId,
      url: `https://chatgpt.com/c/${conversationId}`,
      title: null,
      createdAt: null,
      updatedAt: null,
    })),
    getCurrentAccountScope: vi.fn(async () => accountScopeId),
    readComposer: vi.fn(async () => content),
    writeComposer,
    observeComposer,
    findComposer: vi.fn(async () => ({ root: editable, editable, sendButton })),
  } as unknown as UserBoundPlatformAdapter;

  return {
    adapter,
    editable,
    observeComposer,
    writeComposer,
    content: () => content,
    edit(nextContent: string) {
      content = nextContent;
      editable.value = nextContent;
      observer?.(nextContent);
    },
    changeConversation(nextConversationId: string) {
      conversationId = nextConversationId;
    },
  };
}

beforeEach(() => {
  vi.mocked(deleteRecord).mockResolvedValue(undefined);
  vi.mocked(putRecord).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe('useDraft', () => {
  it('automatically restores an empty composer without stealing focus and supports undo/restore', async () => {
    const draft = draftFor();
    vi.mocked(getRecord).mockResolvedValue(draft);
    const fixture = createAdapter();
    const { result } = renderHook(() => useDraft(fixture.adapter, true, 0, 0));

    await waitFor(() => expect(fixture.writeComposer).toHaveBeenCalledOnce());
    expect(fixture.writeComposer).toHaveBeenCalledWith(draft.content, {
      mode: 'replace',
      focus: false,
    });
    expect(fixture.content()).toBe(draft.content);
    expect(document.activeElement).not.toBe(fixture.editable);
    expect(result.current.undoAvailable).toBe(true);

    await act(async () => {
      await expect(result.current.undoRestore()).resolves.toBe(true);
    });
    expect(fixture.content()).toBe('');
    expect(result.current.restorable).toEqual(draft);
    expect(result.current.undoAvailable).toBe(false);
    expect(putRecord).toHaveBeenCalledWith('drafts', draft);

    await act(async () => {
      await expect(result.current.restore()).resolves.toBe(true);
    });
    expect(fixture.content()).toBe(draft.content);
    expect(result.current.restorable).toBeNull();
    expect(result.current.undoAvailable).toBe(true);
  });

  it('never overwrites a composer that already contains website or user input', async () => {
    vi.mocked(getRecord).mockResolvedValue(draftFor());
    const fixture = createAdapter('Website-restored input');
    const { result } = renderHook(() => useDraft(fixture.adapter, true, 0, 0));

    await waitFor(() => expect(fixture.observeComposer).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fixture.writeComposer).not.toHaveBeenCalled();
    expect(fixture.content()).toBe('Website-restored input');
    expect(result.current.restorable).toBeNull();
    expect(result.current.undoAvailable).toBe(false);
  });

  it('removes undo as soon as the restored input is edited', async () => {
    vi.mocked(getRecord).mockResolvedValue(draftFor());
    const fixture = createAdapter();
    const { result } = renderHook(() => useDraft(fixture.adapter, true, 0, 0));
    await waitFor(() => expect(result.current.undoAvailable).toBe(true));

    act(() => fixture.edit('Recovered input with a user edit'));
    await waitFor(() => expect(result.current.undoAvailable).toBe(false));
    await expect(result.current.undoRestore()).resolves.toBe(false);
    expect(fixture.content()).toBe('Recovered input with a user edit');
  });

  it('keeps undo available when the same conversation binding is remounted', async () => {
    vi.mocked(getRecord).mockResolvedValue(draftFor());
    const fixture = createAdapter();
    const { result, rerender } = renderHook(
      ({ bindingRevision }) => useDraft(fixture.adapter, true, bindingRevision, 0),
      { initialProps: { bindingRevision: 0 } },
    );
    await waitFor(() => expect(result.current.undoAvailable).toBe(true));

    rerender({ bindingRevision: 1 });

    await waitFor(() => expect(fixture.observeComposer).toHaveBeenCalledTimes(2));
    await act(async () => {
      await expect(result.current.undoRestore()).resolves.toBe(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fixture.writeComposer).toHaveBeenCalledTimes(2);
    expect(fixture.content()).toBe('');
    expect(result.current.restorable).toEqual(draftFor());
    expect(result.current.undoAvailable).toBe(false);
  });

  it('does not restore a draft after the conversation scope changes during startup', async () => {
    vi.mocked(getRecord).mockResolvedValue(draftFor());
    const fixture = createAdapter();
    renderHook(() => useDraft(fixture.adapter, true, 0, 0));
    await waitFor(() => expect(fixture.observeComposer).toHaveBeenCalledOnce());

    fixture.changeConversation('conversation-2');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fixture.writeComposer).not.toHaveBeenCalled();
    expect(fixture.content()).toBe('');
  });
});
