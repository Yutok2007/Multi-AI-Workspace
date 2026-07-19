import { AppError } from '../shared/errors/AppError';
import { createElementSelector } from '../platforms/base/elementSelector';

export async function pickElement(
  instruction: string,
  options: { collection?: boolean; validate?: (element: HTMLElement) => boolean } = {},
): Promise<{ element: HTMLElement; selector: string }> {
  return new Promise((resolve, reject) => {
    const highlight = document.createElement('div');
    const toast = document.createElement('div');
    highlight.dataset.mawPicker = 'highlight';
    toast.dataset.mawPicker = 'toast';
    Object.assign(highlight.style, {
      position: 'fixed',
      zIndex: '2147483646',
      pointerEvents: 'none',
      border: '3px solid #5b5ff0',
      borderRadius: '6px',
      background: 'rgba(91,95,240,.12)',
      boxShadow: '0 0 0 9999px rgba(15,23,42,.18)',
    });
    Object.assign(toast.style, {
      position: 'fixed',
      zIndex: '2147483647',
      top: '18px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: 'min(620px, calc(100vw - 32px))',
      borderRadius: '12px',
      padding: '12px 16px',
      color: '#fff',
      background: '#242a55',
      boxShadow: '0 12px 40px rgba(15,23,42,.35)',
      font: '700 13px/1.4 Inter, system-ui, sans-serif',
      textAlign: 'center',
      pointerEvents: 'none',
    });
    toast.textContent = `${instruction} · Esc`;
    document.documentElement.append(highlight, toast);
    let hovered: HTMLElement | null = null;

    const cleanup = () => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', keydown, true);
      highlight.remove();
      toast.remove();
    };
    const isExtensionElement = (element: HTMLElement) =>
      element.dataset.mawPicker !== undefined || element.matches('[data-maw-shadow-host]');
    const move = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || isExtensionElement(target)) return;
      hovered = target;
      const box = target.getBoundingClientRect();
      Object.assign(highlight.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
    };
    const click = (event: MouseEvent) => {
      if (!hovered || isExtensionElement(hovered)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (options.validate && !options.validate(hovered)) {
        toast.textContent = `${instruction} — this element is not valid / 此元素不符合要求`;
        return;
      }
      try {
        const selector = createElementSelector(hovered, options.collection);
        const selected = hovered;
        cleanup();
        resolve({ element: selected, selector });
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      cleanup();
      reject(new AppError('ELEMENT_PICK_CANCELLED', 'Element selection was cancelled.'));
    };
    document.addEventListener('pointermove', move, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', keydown, true);
  });
}

export function isEditableElement(element: HTMLElement): boolean {
  return (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement &&
      ['text', 'search', 'url', 'email', ''].includes(element.type)) ||
    element.isContentEditable
  );
}
