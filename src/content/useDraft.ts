import { useCallback, useEffect, useRef, useState } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import type { DraftRecord } from '../shared/types/records';
import { createDraftKey } from '../shared/utils/draftKey';
import { deleteRecord, getRecord, putRecord } from './database';

const AUTO_RESTORE_SETTLE_MILLISECONDS = 250;

interface RestoredDraftState {
  draft: DraftRecord;
  generation: number;
  previousContent: string;
  restoredContent: string;
}

async function getCurrentDraftId(adapter: UserBoundPlatformAdapter): Promise<string> {
  const [conversation, accountScopeId] = await Promise.all([
    adapter.getCurrentConversation(),
    adapter.getCurrentAccountScope(),
  ]);
  return createDraftKey(adapter.id, accountScopeId, conversation.conversationId, conversation.url);
}

async function restoreSelection(
  adapter: UserBoundPlatformAdapter,
  draft: DraftRecord,
): Promise<void> {
  if (draft.selectionStart === null || draft.selectionEnd === null) return;
  const editable = (await adapter.findComposer())?.editable;
  if (!(editable instanceof HTMLTextAreaElement || editable instanceof HTMLInputElement)) return;
  const start = Math.min(draft.selectionStart, editable.value.length);
  const end = Math.min(Math.max(start, draft.selectionEnd), editable.value.length);
  editable.setSelectionRange(start, end);
}

export function useDraft(
  adapter: UserBoundPlatformAdapter,
  enabled: boolean,
  bindingRevision: number,
  routeRevision: number,
) {
  const [restorable, setRestorable] = useState<DraftRecord | null>(null);
  const [restoredDraft, setRestoredDraft] = useState<RestoredDraftState | null>(null);
  const restoredDraftRef = useRef<RestoredDraftState | null>(null);
  const generationRef = useRef(0);
  const suppressedAutoRestoreDraftIdRef = useRef<string | null>(null);
  const updateRestoredDraft = useCallback(
    (
      update:
        | RestoredDraftState
        | null
        | ((current: RestoredDraftState | null) => RestoredDraftState | null),
    ) => {
      setRestoredDraft((current) => {
        const next = typeof update === 'function' ? update(current) : update;
        restoredDraftRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    let active = true;
    const isCurrent = () => active && generationRef.current === generation;
    queueMicrotask(() => {
      if (!isCurrent()) return;
      setRestorable(null);
      if (!enabled || !adapter.getCapabilities().has('composer.observe')) {
        updateRestoredDraft(null);
      }
    });

    if (!enabled || !adapter.getCapabilities().has('composer.observe')) {
      return () => {
        active = false;
      };
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let latest = '';
    let draftId = '';
    let accountScopeId = 'anonymous';
    let draftConversation: Awaited<ReturnType<typeof adapter.getCurrentConversation>> | null = null;
    let removeComposerListeners = () => undefined;

    const persist = async (content: string) => {
      if (!draftId || !draftConversation) return;
      if (!content) {
        if (suppressedAutoRestoreDraftIdRef.current === draftId) return;
        await deleteRecord('drafts', draftId);
        if (isCurrent()) setRestorable(null);
        return;
      }
      if (suppressedAutoRestoreDraftIdRef.current === draftId) {
        suppressedAutoRestoreDraftIdRef.current = null;
      }
      const composer = await adapter.findComposer();
      const editable = composer?.editable;
      const record: DraftRecord = {
        id: draftId,
        platformId: adapter.id,
        accountScopeId,
        conversationId: draftConversation.conversationId,
        conversationUrl: draftConversation.url,
        content,
        selectionStart:
          editable instanceof HTMLTextAreaElement || editable instanceof HTMLInputElement
            ? editable.selectionStart
            : null,
        selectionEnd:
          editable instanceof HTMLTextAreaElement || editable instanceof HTMLInputElement
            ? editable.selectionEnd
            : null,
        updatedAt: Date.now(),
      };
      await putRecord('drafts', record);
    };

    const start = async () => {
      const [conversation, nextAccountScopeId] = await Promise.all([
        adapter.getCurrentConversation(),
        adapter.getCurrentAccountScope(),
      ]);
      if (!isCurrent()) return;
      draftConversation = conversation;
      accountScopeId = nextAccountScopeId;
      draftId = createDraftKey(
        adapter.id,
        accountScopeId,
        conversation.conversationId,
        conversation.url,
      );
      if (
        suppressedAutoRestoreDraftIdRef.current &&
        suppressedAutoRestoreDraftIdRef.current !== draftId
      ) {
        suppressedAutoRestoreDraftIdRef.current = null;
      }

      const [existing, current] = await Promise.all([
        getRecord('drafts', draftId),
        adapter.readComposer(),
      ]);
      if (!isCurrent()) return;
      latest = current;

      const unsubscribe = adapter.observeComposer((content) => {
        if (!isCurrent()) return;
        latest = content;
        updateRestoredDraft((snapshot) => {
          if (snapshot?.draft.id !== draftId || content !== snapshot.restoredContent) {
            return null;
          }
          return snapshot.generation === generation ? snapshot : { ...snapshot, generation };
        });
        if (content && suppressedAutoRestoreDraftIdRef.current === draftId) {
          suppressedAutoRestoreDraftIdRef.current = null;
        }
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => void persist(content), 500);
      });
      const composer = await adapter.findComposer();
      if (!isCurrent()) {
        unsubscribe();
        return;
      }
      const onSend = () => {
        setTimeout(() => {
          void adapter.readComposer().then(async (content) => {
            if (!isCurrent() || content.trim()) return;
            if (suppressedAutoRestoreDraftIdRef.current === draftId) {
              suppressedAutoRestoreDraftIdRef.current = null;
            }
            await deleteRecord('drafts', draftId);
            setRestorable(null);
            updateRestoredDraft(null);
            latest = '';
          });
        }, 900);
      };
      composer?.sendButton?.addEventListener('click', onSend, true);
      removeComposerListeners = () => {
        unsubscribe();
        composer?.sendButton?.removeEventListener('click', onSend, true);
      };

      if (!existing?.content) return;
      await new Promise((resolve) => setTimeout(resolve, AUTO_RESTORE_SETTLE_MILLISECONDS));
      if (!isCurrent()) return;
      const [liveDraftId, liveContent] = await Promise.all([
        getCurrentDraftId(adapter),
        adapter.readComposer(),
      ]);
      if (!isCurrent() || liveDraftId !== draftId) return;
      const previousRestoration = restoredDraftRef.current;
      if (
        previousRestoration?.draft.id === draftId &&
        liveContent === previousRestoration.restoredContent
      ) {
        updateRestoredDraft({ ...previousRestoration, generation });
        setRestorable(null);
        return;
      }
      if (previousRestoration) updateRestoredDraft(null);
      if (liveContent.trim()) return;
      if (suppressedAutoRestoreDraftIdRef.current === draftId) {
        setRestorable(existing);
        return;
      }

      const snapshot: RestoredDraftState = {
        draft: existing,
        generation,
        previousContent: liveContent,
        restoredContent: existing.content,
      };
      setRestorable(null);
      updateRestoredDraft(snapshot);
      try {
        await adapter.writeComposer(existing.content, { mode: 'replace', focus: false });
        await restoreSelection(adapter, existing);
        const postRestoreDraftId = await getCurrentDraftId(adapter);
        if (!isCurrent() || postRestoreDraftId !== draftId) {
          if ((await adapter.readComposer()) === existing.content) {
            await adapter.writeComposer(liveContent, { mode: 'replace', focus: false });
          }
          return;
        }
        latest = existing.content;
      } catch {
        if (!isCurrent()) return;
        updateRestoredDraft(null);
        setRestorable(existing);
      }
    };
    void start();

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      removeComposerListeners();
      if (latest) void persist(latest);
    };
  }, [adapter, bindingRevision, enabled, routeRevision, updateRestoredDraft]);

  const restore = useCallback(async (): Promise<boolean> => {
    const draft = restorable;
    if (!draft || (await getCurrentDraftId(adapter)) !== draft.id) {
      setRestorable(null);
      return false;
    }
    const current = await adapter.readComposer();
    if (current.trim()) return false;
    const snapshot: RestoredDraftState = {
      draft,
      generation: generationRef.current,
      previousContent: current,
      restoredContent: draft.content,
    };
    suppressedAutoRestoreDraftIdRef.current = null;
    setRestorable(null);
    updateRestoredDraft(snapshot);
    try {
      await adapter.writeComposer(draft.content, { mode: 'replace', focus: true });
      await restoreSelection(adapter, draft);
      return true;
    } catch {
      updateRestoredDraft(null);
      setRestorable(draft);
      return false;
    }
  }, [adapter, restorable, updateRestoredDraft]);

  const undoRestore = useCallback(async (): Promise<boolean> => {
    const snapshot = restoredDraft;
    if (!snapshot || (await getCurrentDraftId(adapter)) !== snapshot.draft.id) {
      updateRestoredDraft(null);
      return false;
    }
    if ((await adapter.readComposer()) !== snapshot.restoredContent) {
      updateRestoredDraft(null);
      return false;
    }

    suppressedAutoRestoreDraftIdRef.current = snapshot.draft.id;
    updateRestoredDraft(null);
    setRestorable(snapshot.draft);
    try {
      await adapter.writeComposer(snapshot.previousContent, { mode: 'replace', focus: true });
      await putRecord('drafts', snapshot.draft);
      return true;
    } catch {
      suppressedAutoRestoreDraftIdRef.current = null;
      setRestorable(null);
      updateRestoredDraft(snapshot);
      return false;
    }
  }, [adapter, restoredDraft, updateRestoredDraft]);

  return {
    restorable,
    undoAvailable: restoredDraft !== null,
    restore,
    undoRestore,
  };
}
