import { afterEach, describe, expect, it } from 'vitest';

import { captureSelectedText } from '../../src/content/useSelectedText';
import { createShadowMount, SHADOW_HOST_SELECTOR } from '../../src/content/shadowRoot';
import { formatSelectedQuote } from '../../src/content/SelectionRewritePopover';

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.querySelectorAll(SHADOW_HOST_SELECTOR).forEach((element) => element.remove());
  document.body.innerHTML = '';
});

function selectNode(node: Node, rect: Partial<DOMRect> = {}): Selection {
  const range = document.createRange();
  range.selectNodeContents(node);
  Object.defineProperty(range, 'getBoundingClientRect', {
    value: () => ({
      left: 100,
      right: 220,
      top: 120,
      bottom: 144,
      width: 120,
      height: 24,
      x: 100,
      y: 120,
      toJSON: () => ({}),
      ...rect,
    }),
  });
  const selection = window.getSelection();
  if (!selection) throw new Error('Selection API is unavailable.');
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

describe('captureSelectedText', () => {
  it('captures visible page text and anchors the action above the selection', () => {
    const paragraph = document.createElement('p');
    paragraph.textContent = '  Improve this prompt  ';
    document.body.append(paragraph);

    const result = captureSelectedText(selectNode(paragraph), { width: 800, height: 600 });

    expect(result).toMatchObject({
      text: 'Improve this prompt',
      anchorX: 202,
      anchorY: 110,
      placement: 'above',
    });
    expect(result?.range.toString()).toBe('  Improve this prompt  ');
  });

  it('places the action below a selection near the top edge', () => {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Prompt';
    document.body.append(paragraph);

    const result = captureSelectedText(selectNode(paragraph, { top: 20, bottom: 44 }), {
      width: 800,
      height: 600,
    });

    expect(result?.placement).toBe('below');
    expect(result?.anchorY).toBe(54);
  });

  it('ignores text selected inside the extension workspace', () => {
    const mount = createShadowMount(document);
    if (!mount) throw new Error('Workspace mount was not created.');
    const text = document.createTextNode('Internal extension text');
    mount.mountPoint.append(text);

    expect(captureSelectedText(selectNode(text), { width: 800, height: 600 })).toBeNull();
  });

  it('formats every selected line as a visible quote reply', () => {
    expect(formatSelectedQuote(' First line\nSecond line ')).toBe(
      '> First line\n> Second line\n\n',
    );
  });
});
