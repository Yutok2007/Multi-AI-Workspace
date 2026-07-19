import type { PlatformId } from '../shared/types/platform';
import {
  allowProgrammaticMessageScroll,
  findScrollableAncestor,
} from '../shared/utils/messageScroll';
import { measureMessageRailPosition, type MessageRailMeasurement } from './messageNavigator';

export const MAX_CONVERSATION_PINS = 200;
export const MAX_PIN_SELECTION_LENGTH = 20_000;

const PIN_ANCHOR_BLOCKS = new Set([
  'ARTICLE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DT',
  'FIGCAPTION',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'P',
  'PRE',
  'SECTION',
  'TD',
  'TH',
]);

const UNSAFE_PIN_ANCESTOR_SELECTOR =
  'nav, aside, header, footer, form, dialog, button, input, textarea, select, [role="navigation"], [role="dialog"], [role="menu"], [contenteditable]:not([contenteditable="false"]), [data-multi-ai-workspace-root="true"]';

const WORKSPACE_PIN_ANCESTOR_SELECTOR = '[data-multi-ai-workspace-root="true"]';

export interface ConversationPointPinTarget {
  element: HTMLElement;
  clientX: number;
  clientY: number;
}

function rangeNodeElement(node: Node): HTMLElement | null {
  return node instanceof HTMLElement ? node : node.parentElement;
}

export function findSelectionPinAnchor(range: Range): HTMLElement | null {
  const startElement = rangeNodeElement(range.startContainer);
  const endElement = rangeNodeElement(range.endContainer);
  let current = rangeNodeElement(range.commonAncestorContainer);
  if (!startElement || !endElement || !current || !current.isConnected) return null;
  if (current.closest(UNSAFE_PIN_ANCESTOR_SELECTOR)) return null;
  while (current && current !== current.ownerDocument.body) {
    const textLength = (current.innerText || current.textContent || '').trim().length;
    if (
      PIN_ANCHOR_BLOCKS.has(current.tagName) &&
      current.contains(startElement) &&
      current.contains(endElement) &&
      textLength > 0 &&
      textLength <= 40_000
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function createPointPinRange(target: EventTarget | null): Range | null {
  let current =
    target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null;
  if (!current?.isConnected || current.closest(UNSAFE_PIN_ANCESTOR_SELECTOR)) return null;

  while (current && current !== current.ownerDocument.body) {
    const textLength = (current.innerText || current.textContent || '').trim().length;
    if (
      PIN_ANCHOR_BLOCKS.has(current.tagName) &&
      textLength > 0 &&
      textLength <= MAX_PIN_SELECTION_LENGTH
    ) {
      const range = current.ownerDocument.createRange();
      range.selectNodeContents(current);
      return range.toString().trim() ? range : null;
    }
    current = current.parentElement;
  }
  return null;
}

export function createPointPinTarget(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): ConversationPointPinTarget | null {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  let node = target instanceof Node ? target : null;
  while (node && !(node instanceof HTMLElement)) node = node.parentNode;
  let element = node instanceof HTMLElement ? node : null;
  if (!element?.isConnected || element.closest(WORKSPACE_PIN_ANCESTOR_SELECTOR)) return null;
  if (element === element.ownerDocument.documentElement) {
    element = element.ownerDocument.body;
  }
  return element ? { element, clientX, clientY } : null;
}

export function createElementIndexPath(element: HTMLElement): string | null {
  const documentRef = element.ownerDocument;
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== documentRef.documentElement) {
    const parent: Element | null = current.parentElement;
    if (!parent) return null;
    const index = Array.prototype.indexOf.call(parent.children, current) as number;
    if (index < 0) return null;
    segments.unshift(index.toString(36));
    current = parent;
  }
  return current === documentRef.documentElement && segments.length ? segments.join('.') : null;
}

export function resolveElementIndexPath(documentRef: Document, path: string): HTMLElement | null {
  if (!/^[0-9a-z]+(?:\.[0-9a-z]+)*$/i.test(path)) return null;
  let current: Element = documentRef.documentElement;
  for (const segment of path.split('.')) {
    const index = Number.parseInt(segment, 36);
    if (!Number.isSafeInteger(index) || index < 0) return null;
    const child = current.children.item(index);
    if (!child) return null;
    current = child;
  }
  return current instanceof HTMLElement && current.isConnected ? current : null;
}

export function createConversationPinId(
  platformId: PlatformId,
  accountScopeId: string,
  conversationId: string,
  messageKey: string,
  startOffset: number,
  endOffset: number,
  pointSignature?: string,
): string {
  const parts: Array<string | number> = [
    'pin',
    platformId,
    accountScopeId,
    conversationId,
    messageKey,
    startOffset,
    endOffset,
  ];
  if (pointSignature) parts.push(pointSignature);
  return parts.map((part) => encodeURIComponent(String(part))).join(':');
}

export function conversationPinPreview(value: string, maximumLength = 100): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maximumLength
    ? `${normalized.slice(0, Math.max(1, maximumLength - 1))}…`
    : normalized;
}

function firstVisibleRangeRect(range: Range): DOMRect | null {
  try {
    const rects = Array.from(range.getClientRects());
    return rects.find((rect) => rect.width > 0 && rect.height > 0) ?? null;
  } catch {
    return null;
  }
}

export function measureConversationPinPosition(
  range: Range,
  messageElement: HTMLElement,
  documentHeight: number,
  anchorYRatio?: number,
): MessageRailMeasurement {
  const elementRect = messageElement.getBoundingClientRect();
  const rect =
    typeof anchorYRatio === 'number'
      ? {
          top: elementRect.top + elementRect.height * anchorYRatio,
          height: 0,
        }
      : firstVisibleRangeRect(range);
  if (!rect) return measureMessageRailPosition(messageElement, documentHeight);
  const scrollContainer = findScrollableAncestor(messageElement);
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const contentTop = rect.top - containerRect.top + scrollContainer.scrollTop;
    return {
      topPercent: Math.min(
        99,
        Math.max(1, (contentTop / Math.max(scrollContainer.scrollHeight, 1)) * 100),
      ),
      viewportCenter:
        containerRect.top + Math.max(containerRect.height, scrollContainer.clientHeight) / 2,
    };
  }
  return {
    topPercent: Math.min(
      99,
      Math.max(
        1,
        ((rect.top + (messageElement.ownerDocument.defaultView?.scrollY ?? 0)) /
          Math.max(documentHeight, 1)) *
          100,
      ),
    ),
    viewportCenter: (messageElement.ownerDocument.defaultView?.innerHeight ?? 0) / 2,
  };
}

export function scrollConversationPinIntoView(
  range: Range,
  messageElement: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
  anchorYRatio?: number,
): void {
  allowProgrammaticMessageScroll(messageElement.ownerDocument, behavior === 'smooth' ? 1_000 : 100);
  const elementRect = messageElement.getBoundingClientRect();
  const rect =
    typeof anchorYRatio === 'number'
      ? {
          top: elementRect.top + elementRect.height * anchorYRatio,
          height: 0,
        }
      : firstVisibleRangeRect(range);
  if (!rect) {
    messageElement.scrollIntoView({ behavior, block: 'center' });
    return;
  }
  const scrollContainer = findScrollableAncestor(messageElement);
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const top = Math.min(
      Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 0),
      Math.max(
        0,
        scrollContainer.scrollTop +
          rect.top -
          containerRect.top -
          scrollContainer.clientHeight / 2 +
          rect.height / 2,
      ),
    );
    scrollContainer.scrollTo({ top, behavior });
    return;
  }
  const view = messageElement.ownerDocument.defaultView;
  view?.scrollTo({
    top: Math.max(0, (view.scrollY ?? 0) + rect.top - view.innerHeight / 2 + rect.height / 2),
    behavior,
  });
}
