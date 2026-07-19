import { afterEach, describe, expect, it, vi } from 'vitest';

import { InlineMermaidController, resolveMermaidTheme } from '../../src/content/inlineMermaid';
import type { MermaidTarget } from '../../src/content/markupDiscovery';

function target(id: string, source: string): MermaidTarget {
  const element = document.createElement('pre');
  element.id = id;
  element.textContent = source;
  document.body.append(element);
  return { id, element, source };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('InlineMermaidController', () => {
  it('renders multiple targets once, updates changed source, and restores source on dispose', async () => {
    const first = target('first', 'graph TD\nA-->B');
    const second = target('second', 'graph LR\nX-->Y');
    const render = vi.fn(async (source: string, theme: 'default' | 'dark') =>
      Promise.resolve(`<svg data-source="${source.length}" data-theme="${theme}"></svg>`),
    );
    const open = vi.fn();
    const controller = new InlineMermaidController(
      render,
      { open: 'Open diagram', source: 'Source', error: 'Render failed' },
      open,
      0,
    );

    controller.sync([first, second], 'dark');
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(2));
    expect(first.element.hidden).toBe(true);
    expect(second.element.hidden).toBe(true);
    expect(document.querySelectorAll('[data-maw-mermaid-inline="true"]')).toHaveLength(2);

    controller.sync([first, second], 'dark');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render).toHaveBeenCalledTimes(2);

    const changed = { ...first, source: 'graph TD\nA-->C' };
    controller.sync([changed, second], 'dark');
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(3));
    const firstContainer = changed.element.nextElementSibling as HTMLElement;
    firstContainer.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click();
    expect(open).toHaveBeenCalledWith(changed);

    controller.dispose();
    expect(first.element.hidden).toBe(false);
    expect(second.element.hidden).toBe(false);
    expect(document.querySelector('[data-maw-mermaid-inline="true"]')).toBeNull();
  });

  it('keeps original code visible and contains render errors locally', async () => {
    const diagram = target('invalid', 'graph TD\nA--');
    const controller = new InlineMermaidController(
      async () => Promise.reject(new Error('invalid syntax')),
      { open: 'Open diagram', source: 'Source', error: 'Render failed safely' },
      () => undefined,
      0,
    );

    controller.sync([diagram], 'default');
    await vi.waitFor(() => {
      const container = diagram.element.nextElementSibling as HTMLElement;
      expect(container.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe(
        'Render failed safely',
      );
    });
    expect(diagram.element.hidden).toBe(false);
    controller.dispose();
  });

  it('derives theme from standard color-scheme or page background', () => {
    document.documentElement.style.colorScheme = 'dark';
    expect(resolveMermaidTheme()).toBe('dark');
    document.documentElement.style.colorScheme = 'light';
    document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    expect(resolveMermaidTheme()).toBe('default');
  });
});
