import type { PlatformAnswerCompletion, PlatformMessage } from '../../shared/types/platform';

interface AnswerCompletionObserverOptions {
  getMessages: () => Promise<PlatformMessage[]>;
  getGenerationIndicator: () => HTMLElement | null;
  getMessageRoot: () => HTMLElement | null;
  onComplete: (completion: PlatformAnswerCompletion) => void;
}

export interface AnswerCompletionObservation {
  observer: MutationObserver;
  stop: () => void;
}

function hasExplicitBusyState(root: HTMLElement | null): boolean {
  if (!root) return false;
  return root.matches('[aria-busy="true"]') || root.querySelector('[aria-busy="true"]') !== null;
}

function hasFailureState(root: HTMLElement): boolean {
  return (
    root.matches('[role="alert"], [aria-invalid="true"]') ||
    root.querySelector('[role="alert"], [aria-invalid="true"]') !== null
  );
}

export function createAnswerCompletionObserver({
  getMessages,
  getGenerationIndicator,
  getMessageRoot,
  onComplete,
}: AnswerCompletionObserverOptions): AnswerCompletionObservation {
  let disposed = false;
  let queued = false;
  let previousBusy = false;
  let currentIndicator: HTMLElement | null = null;
  let cycle: { id: string; cancelled: boolean; message: PlatformMessage | null } | null = null;
  let pending: {
    cycle: { id: string; cancelled: boolean; message: PlatformMessage | null };
    timer: number;
  } | null = null;

  const cancelCycle = () => {
    if (cycle) cycle.cancelled = true;
    if (pending) pending.cycle.cancelled = true;
  };
  const bindIndicator = (indicator: HTMLElement | null) => {
    if (indicator === currentIndicator) return;
    currentIndicator?.removeEventListener('pointerdown', cancelCycle, true);
    currentIndicator = indicator;
    currentIndicator?.addEventListener('pointerdown', cancelCycle, true);
  };
  const explicitBusy = (messages: PlatformMessage[]) => {
    const indicator = getGenerationIndicator();
    bindIndicator(indicator);
    const lastAssistant = [...messages].reverse().find(({ role }) => role === 'assistant');
    return Boolean(
      indicator ||
      hasExplicitBusyState(lastAssistant?.element ?? null) ||
      hasExplicitBusyState(getMessageRoot()),
    );
  };
  const inspect = async () => {
    if (disposed) return;
    const messages = await getMessages();
    if (disposed) return;
    const busy = explicitBusy(messages);
    const lastAssistant = [...messages].reverse().find(({ role }) => role === 'assistant') ?? null;
    if (busy && pending) {
      window.clearTimeout(pending.timer);
      cycle = pending.cycle;
      pending = null;
    }
    if (busy && !cycle) {
      cycle = { id: crypto.randomUUID(), cancelled: false, message: lastAssistant };
    } else if (busy && cycle && lastAssistant) {
      cycle.message = lastAssistant;
    }
    if (previousBusy && !busy && cycle) {
      const completedCycle = cycle;
      cycle = null;
      pending = { cycle: completedCycle, timer: 0 };
    }
    if (!busy && pending) {
      window.clearTimeout(pending.timer);
      const pendingCompletion = pending;
      pending.timer = window.setTimeout(() => {
        if (pending !== pendingCompletion) return;
        pending = null;
        void getMessages().then((finalMessages) => {
          if (disposed || pendingCompletion.cycle.cancelled || explicitBusy(finalMessages)) return;
          const finalMessage =
            [...finalMessages].reverse().find(({ role }) => role === 'assistant') ?? null;
          const messageRoot = getMessageRoot();
          if (
            navigator.onLine === false ||
            !finalMessage?.plainText.trim() ||
            hasFailureState(finalMessage.element) ||
            (messageRoot !== null && hasFailureState(messageRoot))
          ) {
            return;
          }
          onComplete({ id: pendingCompletion.cycle.id, message: finalMessage });
        });
      }, 250);
    }
    previousBusy = busy;
  };
  const scheduleInspect = () => {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      void inspect();
    });
  };
  const observer = new MutationObserver(scheduleInspect);
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
    attributeFilter: ['aria-busy', 'aria-invalid'],
  });
  scheduleInspect();

  return {
    observer,
    stop: () => {
      disposed = true;
      if (pending) window.clearTimeout(pending.timer);
      currentIndicator?.removeEventListener('pointerdown', cancelCycle, true);
      observer.disconnect();
    },
  };
}
