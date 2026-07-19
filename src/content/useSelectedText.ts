import { useEffect, useState } from 'react';

import { SHADOW_HOST_SELECTOR } from './shadowRoot';

export interface SelectedTextSnapshot {
  text: string;
  range: Range;
  anchorX: number;
  anchorY: number;
  placement: 'above' | 'below';
}

interface ViewportSize {
  width: number;
  height: number;
}

function isWorkspaceSelection(node: Node | null): boolean {
  const root = node?.getRootNode();
  return root instanceof ShadowRoot && root.host.matches(SHADOW_HOST_SELECTOR);
}

function isWorkspaceEvent(event: Event): boolean {
  return event
    .composedPath()
    .some((target) => target instanceof Element && target.matches(SHADOW_HOST_SELECTOR));
}

export function captureSelectedText(
  selection: Selection | null,
  viewport: ViewportSize,
): SelectedTextSnapshot | null {
  if (
    !selection ||
    selection.isCollapsed ||
    selection.rangeCount === 0 ||
    isWorkspaceSelection(selection.anchorNode)
  ) {
    return null;
  }

  const text = selection.toString().trim();
  if (!text) return null;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;

  const center = rect.left + rect.width / 2;
  const popoverHalfWidth = Math.min(190, Math.max(0, (viewport.width - 24) / 2));
  const minimumX = 12 + popoverHalfWidth;
  const maximumX = Math.max(minimumX, viewport.width - 12 - popoverHalfWidth);
  const anchorX = Math.min(Math.max(center, minimumX), maximumX);
  const placement = rect.top >= 64 ? 'above' : 'below';
  const anchorY = placement === 'above' ? rect.top - 10 : rect.bottom + 10;

  return {
    text,
    range: selection.getRangeAt(0).cloneRange(),
    anchorX,
    anchorY: Math.min(Math.max(anchorY, 12), Math.max(12, viewport.height - 12)),
    placement,
  };
}

export function useSelectedText(enabled: boolean) {
  const [selection, setSelection] = useState<SelectedTextSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let updateTimer: number | null = null;
    const update = (event: Event) => {
      if (isWorkspaceEvent(event)) return;
      if (updateTimer !== null) window.clearTimeout(updateTimer);
      updateTimer = window.setTimeout(() => {
        updateTimer = null;
        setSelection(
          captureSelectedText(window.getSelection(), {
            width: window.innerWidth,
            height: window.innerHeight,
          }),
        );
      }, 0);
    };
    const hideIfCollapsed = () => {
      if (window.getSelection()?.isCollapsed) setSelection(null);
    };
    const dismiss = () => setSelection(null);

    document.addEventListener('mouseup', update, true);
    document.addEventListener('keyup', update, true);
    document.addEventListener('touchend', update, true);
    document.addEventListener('selectionchange', hideIfCollapsed);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);

    return () => {
      if (updateTimer !== null) window.clearTimeout(updateTimer);
      document.removeEventListener('mouseup', update, true);
      document.removeEventListener('keyup', update, true);
      document.removeEventListener('touchend', update, true);
      document.removeEventListener('selectionchange', hideIfCollapsed);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [enabled]);

  return {
    selection: enabled && !window.getSelection()?.isCollapsed ? selection : null,
    dismiss: () => setSelection(null),
  };
}
