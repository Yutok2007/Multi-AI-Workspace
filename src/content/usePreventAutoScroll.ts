import { useEffect } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import type { PlatformMessage } from '../shared/types/platform';
import {
  findScrollableAncestor,
  PROGRAMMATIC_MESSAGE_SCROLL_EVENT,
} from '../shared/utils/messageScroll';

const USER_SCROLL_GRACE_MILLISECONDS = 350;
const SCROLLBAR_DRAG_GRACE_MILLISECONDS = 1_500;
const RESTORE_SETTLE_MILLISECONDS = 80;
const MAX_PROGRAMMATIC_SCROLL_GRACE_MILLISECONDS = 2_000;
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' ']);

function documentScrollElement(documentRef: Document): HTMLElement | null {
  const element = documentRef.scrollingElement ?? documentRef.documentElement;
  return element instanceof HTMLElement ? element : null;
}

export function resolveMessageScrollTarget(messages: PlatformMessage[]): HTMLElement | null {
  const message = messages.find((candidate) => candidate.element.isConnected);
  if (!message) return null;
  return (
    findScrollableAncestor(message.element) ?? documentScrollElement(message.element.ownerDocument)
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(
    element?.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
    ),
  );
}

function programmaticGrace(event: Event): number {
  const detail = (event as CustomEvent<{ durationMilliseconds?: unknown }>).detail;
  const duration = detail?.durationMilliseconds;
  if (typeof duration !== 'number' || !Number.isFinite(duration)) return 1_000;
  return Math.min(MAX_PROGRAMMATIC_SCROLL_GRACE_MILLISECONDS, Math.max(0, duration));
}

/**
 * Keeps the conversation viewport stable while message DOM is changing. The guard only adopts a
 * new scroll position after explicit user scroll input or an extension-owned navigation event.
 */
export function usePreventAutoScroll(
  adapter: UserBoundPlatformAdapter,
  enabled: boolean,
  bindingRevision: number,
  routeRevision: number,
): void {
  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let initialized = false;
    let scrollTarget: HTMLElement | null = null;
    let lockedScrollTop = 0;
    let acceptScrollUntil = 0;
    let suspendGuardUntil = 0;
    let guarding = false;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    let settleTimer: number | null = null;
    let contentObserver: MutationObserver | null = null;

    const view = document.defaultView;
    const requestFrame = (callback: FrameRequestCallback): number =>
      view?.requestAnimationFrame
        ? view.requestAnimationFrame(callback)
        : (view?.setTimeout(() => callback(Date.now()), 16) ?? 0);
    const cancelFrame = (handle: number | null) => {
      if (handle === null) return;
      if (view?.cancelAnimationFrame) view.cancelAnimationFrame(handle);
      else view?.clearTimeout(handle);
    };
    const clearRestoreSchedule = () => {
      cancelFrame(firstFrame);
      cancelFrame(secondFrame);
      firstFrame = null;
      secondFrame = null;
      if (settleTimer !== null) view?.clearTimeout(settleTimer);
      settleTimer = null;
    };
    const isScrollAccepted = () => Date.now() <= acceptScrollUntil;
    const isGuardSuspended = () => Date.now() <= suspendGuardUntil;
    const captureScrollPosition = () => {
      if (scrollTarget) lockedScrollTop = scrollTarget.scrollTop;
    };
    const acceptScroll = (durationMilliseconds: number) => {
      acceptScrollUntil = Math.max(acceptScrollUntil, Date.now() + durationMilliseconds);
    };
    const suspendGuard = (durationMilliseconds: number) => {
      const until = Date.now() + durationMilliseconds;
      acceptScrollUntil = Math.max(acceptScrollUntil, until);
      suspendGuardUntil = Math.max(suspendGuardUntil, until);
      guarding = false;
    };
    const onScroll = () => {
      if (!guarding || isScrollAccepted()) captureScrollPosition();
    };
    const unbindScrollTarget = () => {
      scrollTarget?.removeEventListener('scroll', onScroll);
      if (scrollTarget && scrollTarget === documentScrollElement(document)) {
        view?.removeEventListener('scroll', onScroll);
      }
    };
    const bindScrollTarget = (nextTarget: HTMLElement) => {
      if (scrollTarget === nextTarget) return;
      unbindScrollTarget();
      contentObserver?.disconnect();
      scrollTarget = nextTarget;
      scrollTarget.addEventListener('scroll', onScroll, { passive: true });
      if (scrollTarget === documentScrollElement(document)) {
        view?.addEventListener('scroll', onScroll, { passive: true });
      }
      contentObserver?.observe(scrollTarget, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      captureScrollPosition();
    };
    const restoreLockedPosition = () => {
      if (!scrollTarget) return;
      if (isGuardSuspended()) {
        captureScrollPosition();
        guarding = false;
        return;
      }
      scrollTarget.scrollTop = lockedScrollTop;
      lockedScrollTop = scrollTarget.scrollTop;
    };
    const guardMutation = () => {
      clearRestoreSchedule();
      if (isGuardSuspended()) {
        captureScrollPosition();
        return;
      }
      guarding = true;
      restoreLockedPosition();
      firstFrame = requestFrame(() => {
        firstFrame = null;
        restoreLockedPosition();
        secondFrame = requestFrame(() => {
          secondFrame = null;
          restoreLockedPosition();
          settleTimer =
            view?.setTimeout(() => {
              settleTimer = null;
              restoreLockedPosition();
              guarding = false;
            }, RESTORE_SETTLE_MILLISECONDS) ?? null;
        });
      });
    };
    const onMessages = (messages: PlatformMessage[]) => {
      if (disposed) return;
      const nextTarget = resolveMessageScrollTarget(messages);
      if (!nextTarget) return;
      const targetChanged = nextTarget !== scrollTarget;
      bindScrollTarget(nextTarget);
      if (!initialized || targetChanged) {
        initialized = true;
        captureScrollPosition();
        return;
      }
      guardMutation();
    };
    const onUserScrollIntent = () => acceptScroll(USER_SCROLL_GRACE_MILLISECONDS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEditableTarget(event.target) && SCROLL_KEYS.has(event.key)) onUserScrollIntent();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!scrollTarget) return;
      const eventTarget = event.target;
      const rootScrollTarget = documentScrollElement(document);
      if (
        eventTarget === scrollTarget ||
        (scrollTarget === rootScrollTarget &&
          (eventTarget === document.documentElement || eventTarget === document.body))
      ) {
        acceptScroll(SCROLLBAR_DRAG_GRACE_MILLISECONDS);
      }
    };
    const onProgrammaticScroll = (event: Event) => suspendGuard(programmaticGrace(event));

    contentObserver = new MutationObserver(() => {
      if (initialized) guardMutation();
    });

    document.addEventListener('wheel', onUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('touchmove', onUserScrollIntent, { capture: true, passive: true });
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener(PROGRAMMATIC_MESSAGE_SCROLL_EVENT, onProgrammaticScroll, true);

    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = adapter.observeMessages(onMessages);
    } catch {
      // An unavailable or temporarily unbound message surface must not affect the host page.
    }

    return () => {
      disposed = true;
      clearRestoreSchedule();
      unsubscribe();
      contentObserver?.disconnect();
      unbindScrollTarget();
      document.removeEventListener('wheel', onUserScrollIntent, true);
      document.removeEventListener('touchmove', onUserScrollIntent, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener(PROGRAMMATIC_MESSAGE_SCROLL_EVENT, onProgrammaticScroll, true);
    };
  }, [adapter, bindingRevision, enabled, routeRevision]);
}
