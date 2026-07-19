import { useEffect } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import type { AppSettings } from '../shared/types/settings';

interface ShortcutModifiers {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export function resolveShortcutAction(
  shortcut: Exclude<AppSettings['input']['sendShortcut'], 'platform'>,
  modifiers: ShortcutModifiers,
): 'send' | 'newline' {
  const noModifier =
    !modifiers.altKey && !modifiers.ctrlKey && !modifiers.metaKey && !modifiers.shiftKey;
  if (shortcut === 'enter' && noModifier) return 'send';
  if (
    shortcut === 'ctrl-enter' &&
    (modifiers.ctrlKey || modifiers.metaKey) &&
    !modifiers.altKey &&
    !modifiers.shiftKey
  ) {
    return 'send';
  }
  if (
    shortcut === 'shift-enter' &&
    modifiers.shiftKey &&
    !modifiers.altKey &&
    !modifiers.ctrlKey &&
    !modifiers.metaKey
  ) {
    return 'send';
  }
  return 'newline';
}

export function useInputBehavior(
  adapter: UserBoundPlatformAdapter,
  shortcut: AppSettings['input']['sendShortcut'],
  bindingRevision: number,
): void {
  useEffect(() => {
    if (shortcut === 'platform') return;
    let editable: HTMLElement | null = null;
    let sendButton: HTMLElement | null = null;
    let active = true;

    const refresh = () => {
      void adapter.findComposer().then((composer) => {
        if (!active) return;
        editable = composer?.editable ?? null;
        sendButton = composer?.sendButton ?? null;
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const keydown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.isComposing ||
        !editable ||
        !sendButton ||
        !(event.target instanceof Node) ||
        !(event.target === editable || editable.contains(event.target))
      ) {
        return;
      }
      const action = resolveShortcutAction(shortcut, event);
      event.preventDefault();
      event.stopPropagation();
      if (action === 'send') {
        sendButton.click();
      } else {
        void adapter.writeComposer('\n', { mode: 'insert-at-cursor', focus: true });
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener('keydown', keydown, true);
    };
  }, [adapter, bindingRevision, shortcut]);
}
