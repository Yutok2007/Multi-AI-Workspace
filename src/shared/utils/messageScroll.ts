export const PROGRAMMATIC_MESSAGE_SCROLL_EVENT = 'multi-ai-workspace:programmatic-message-scroll';

export function allowProgrammaticMessageScroll(
  documentRef: Document,
  durationMilliseconds = 1_000,
): void {
  documentRef.dispatchEvent(
    new CustomEvent(PROGRAMMATIC_MESSAGE_SCROLL_EVENT, {
      detail: { durationMilliseconds },
    }),
  );
}

export function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  const documentRef = element.ownerDocument;
  const view = documentRef.defaultView;
  let current = element.parentElement;
  while (current && current !== documentRef.body && current !== documentRef.documentElement) {
    const overflowY = view?.getComputedStyle(current).overflowY ?? '';
    const canScrollProgrammatically = overflowY !== 'visible' && overflowY !== 'clip';
    if (canScrollProgrammatically && current.scrollHeight > current.clientHeight + 1) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function scrollElementToCenter(
  element: HTMLElement,
  behavior: 'smooth' | 'instant',
): boolean {
  if (!element.isConnected) return false;
  allowProgrammaticMessageScroll(element.ownerDocument, behavior === 'smooth' ? 1_000 : 100);
  const scrollContainer = findScrollableAncestor(element);
  if (!scrollContainer) {
    element.scrollIntoView({
      behavior: behavior === 'instant' ? 'auto' : 'smooth',
      block: 'center',
    });
    return true;
  }

  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const visibleHeight = Math.max(scrollContainer.clientHeight, containerRect.height, 1);
  const maximum = Math.max(0, scrollContainer.scrollHeight - visibleHeight);
  const requested =
    scrollContainer.scrollTop +
    elementRect.top -
    containerRect.top -
    (visibleHeight - elementRect.height) / 2;
  const top = Math.min(maximum, Math.max(0, requested));

  if (behavior === 'smooth' && typeof scrollContainer.scrollTo === 'function') {
    try {
      scrollContainer.scrollTo({ top, behavior: 'smooth' });
      return true;
    } catch {
      // Older embedded browser engines may reject object-form scroll options.
    }
  }
  scrollContainer.scrollTop = top;
  return true;
}
