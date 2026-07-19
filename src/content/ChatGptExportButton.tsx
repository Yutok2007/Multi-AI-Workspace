import { useEffect } from 'react';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import type { ConversationExportFormat } from '../shared/types/settings';
import { exportConversation } from './conversationExport';

const EXPORT_BUTTON_ATTRIBUTE = 'data-multi-ai-workspace-export-button';
const SHARE_LABEL = /^(?:share|分享|共享)(?:\b|\s|对话|對話)/i;

function controlName(element: HTMLElement): string {
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

export function findChatGptShareControl(documentRef: Document): HTMLElement | null {
  const candidates = [...documentRef.querySelectorAll<HTMLElement>('button, [role="button"]')]
    .filter((element) => !element.hasAttribute(EXPORT_BUTTON_ATTRIBUTE))
    .filter((element) => SHARE_LABEL.test(controlName(element)));
  return candidates.find((element) => element.closest('header')) ?? candidates[0] ?? null;
}

interface ChatGptExportButtonProps {
  adapter: UserBoundPlatformAdapter;
  enabled: boolean;
  format: ConversationExportFormat;
  label: string;
  successLabel: string;
  errorLabel: string;
}

export function ChatGptExportButton({
  adapter,
  enabled,
  format,
  label,
  successLabel,
  errorLabel,
}: ChatGptExportButtonProps) {
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let button: HTMLButtonElement | null = null;
    let resetTimer: number | null = null;
    let queued = false;

    const resetButton = () => {
      if (!button) return;
      button.textContent = '⇩';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.style.color = 'currentColor';
    };
    const removeButton = () => {
      if (resetTimer !== null) window.clearTimeout(resetTimer);
      resetTimer = null;
      button?.remove();
      button = null;
    };
    const createButton = (shareControl: HTMLElement) => {
      removeButton();
      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.setAttribute(EXPORT_BUTTON_ATTRIBUTE, 'true');
      nextButton.style.cssText =
        'display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;margin-inline-start:6px;border:1px solid rgba(127,127,127,.28);border-radius:999px;padding:0;background:transparent;color:currentColor;cursor:pointer;font:700 20px/1 system-ui;vertical-align:middle;';
      button = nextButton;
      resetButton();
      nextButton.addEventListener('click', async () => {
        if (nextButton.disabled) return;
        nextButton.disabled = true;
        nextButton.textContent = '…';
        try {
          await exportConversation(adapter, format);
          if (disposed) return;
          nextButton.textContent = '✓';
          nextButton.title = successLabel;
          nextButton.setAttribute('aria-label', successLabel);
          nextButton.style.color = '#23845b';
        } catch {
          if (disposed) return;
          nextButton.textContent = '!';
          nextButton.title = errorLabel;
          nextButton.setAttribute('aria-label', errorLabel);
          nextButton.style.color = '#b33a47';
        } finally {
          nextButton.disabled = false;
          if (!disposed) resetTimer = window.setTimeout(resetButton, 1_500);
        }
      });
      shareControl.insertAdjacentElement('afterend', nextButton);
    };
    const ensureButton = () => {
      queued = false;
      if (disposed) return;
      const shareControl = findChatGptShareControl(document);
      if (!shareControl?.parentElement) {
        removeButton();
        return;
      }
      if (!button?.isConnected || shareControl.nextElementSibling !== button) {
        createButton(shareControl);
      }
    };
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(ensureButton);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    ensureButton();

    return () => {
      disposed = true;
      observer.disconnect();
      removeButton();
    };
  }, [adapter, enabled, errorLabel, format, label, successLabel]);

  return null;
}
