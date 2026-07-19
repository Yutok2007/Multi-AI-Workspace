import type { PlatformId, PlatformMessage } from '../../shared/types/platform';
import { hasConfirmedNativeFeature } from '../nativeFeatures';

const BRANCH_LABELS = [
  /^branch in (?:a )?new chat$/i,
  /^branch in new conversation$/i,
  /^在新(?:聊天|对话|對話)中(?:建立)?分支$/i,
  /^(?:建立|创建)分支$/i,
];
const MORE_ACTION_LABELS = [/^more actions$/i, /^more$/i, /^更多(?:操作|動作)$/i];
const ACTION_SELECTOR = 'button, [role="button"], [role="menuitem"], [role="menuitemradio"]';

function actionLabel(element: HTMLElement): string {
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.innerText ||
    element.textContent ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest('[hidden], [aria-hidden="true"]')) return false;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display !== 'none' && style?.visibility !== 'hidden';
}

function matchingActions(root: ParentNode, labels: RegExp[]): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(ACTION_SELECTOR)].filter(
    (element) => isVisible(element) && labels.some((label) => label.test(actionLabel(element))),
  );
}

function messageScopes(message: PlatformMessage): HTMLElement[] {
  const scopes: HTMLElement[] = [];
  let current: HTMLElement | null = message.element;
  for (let depth = 0; current && depth < 6; depth += 1) {
    scopes.push(current);
    if (current.matches('article, [data-message-author-role], [data-message-id]')) break;
    current = current.parentElement;
  }
  return scopes;
}

function findMessageAction(message: PlatformMessage, labels: RegExp[]): HTMLElement | null {
  for (const scope of messageScopes(message)) {
    const matches = matchingActions(scope, labels);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null;
  }
  return null;
}

async function waitForUniqueDocumentAction(
  documentRef: Document,
  labels: RegExp[],
  timeoutMs = 1_500,
): Promise<HTMLElement | null> {
  const immediate = matchingActions(documentRef, labels);
  if (immediate.length === 1) return immediate[0];
  if (immediate.length > 1) return null;

  return new Promise((resolve) => {
    let timer = 0;
    const finish = (value: HTMLElement | null) => {
      window.clearTimeout(timer);
      observer.disconnect();
      resolve(value);
    };
    const inspect = () => {
      const matches = matchingActions(documentRef, labels);
      if (matches.length === 1) finish(matches[0]);
      else if (matches.length > 1) finish(null);
    };
    const observer = new MutationObserver(inspect);
    observer.observe(documentRef.documentElement, { childList: true, subtree: true });
    timer = window.setTimeout(() => finish(null), timeoutMs);
  });
}

/**
 * Uses only the platform's visible, accessible message actions. If a unique native
 * branch command cannot be verified, it fails closed so the caller can use a manual handoff.
 */
export async function tryNativeConversationBranch(
  platformId: PlatformId,
  message: PlatformMessage,
): Promise<boolean> {
  if (!hasConfirmedNativeFeature(platformId, 'conversation-branch')) return false;

  const directAction = findMessageAction(message, BRANCH_LABELS);
  if (directAction) {
    directAction.click();
    return true;
  }

  const moreActions = findMessageAction(message, MORE_ACTION_LABELS);
  if (!moreActions) return false;
  moreActions.click();
  const branchAction = await waitForUniqueDocumentAction(
    message.element.ownerDocument,
    BRANCH_LABELS,
  );
  if (!branchAction) return false;
  branchAction.click();
  return true;
}
