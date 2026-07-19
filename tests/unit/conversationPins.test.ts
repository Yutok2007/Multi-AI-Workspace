import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  conversationPinPreview,
  createElementIndexPath,
  createPointPinRange,
  createPointPinTarget,
  findSelectionPinAnchor,
  measureConversationPinPosition,
  resolveElementIndexPath,
  scrollConversationPinIntoView,
} from '../../src/content/conversationPins';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('conversation pin anchors', () => {
  it('round-trips a content-free numeric element path for an explicit selection', () => {
    document.body.innerHTML = `
      <main><section><p id="target">DeepSeek selected response text</p></section></main>
    `;
    const target = document.querySelector('#target');
    if (!(target instanceof HTMLElement)) throw new Error('Fixture target is missing.');
    const range = document.createRange();
    range.selectNodeContents(target);

    const anchor = findSelectionPinAnchor(range);
    expect(anchor).toBe(target);
    const path = anchor ? createElementIndexPath(anchor) : null;
    expect(path).toMatch(/^[0-9a-z.]+$/);
    expect(path).not.toContain('target');
    expect(path ? resolveElementIndexPath(document, path) : null).toBe(target);
  });

  it('rejects unsafe chrome selections and malformed stored paths', () => {
    document.body.innerHTML = '<nav><p id="navigation-text">Conversation title</p></nav>';
    const target = document.querySelector('#navigation-text');
    if (!(target instanceof HTMLElement)) throw new Error('Fixture target is missing.');
    const range = document.createRange();
    range.selectNodeContents(target);

    expect(findSelectionPinAnchor(range)).toBeNull();
    expect(resolveElementIndexPath(document, '../script')).toBeNull();
    expect(resolveElementIndexPath(document, 'zzzzzzzzzzzzzzzzzzzz')).toBeNull();
  });

  it('turns a clicked readable block into a safe point pin range', () => {
    document.body.innerHTML = `
      <main><article><p id="target">Click this <span id="word">answer location</span></p></article></main>
      <nav><p id="unsafe">Sidebar item</p></nav>
    `;
    const word = document.querySelector('#word');
    const unsafe = document.querySelector('#unsafe');

    const range = createPointPinRange(word);
    expect(range?.toString()).toBe('Click this answer location');
    expect(range ? findSelectionPinAnchor(range)?.id : null).toBe('target');
    expect(createPointPinRange(unsafe)).toBeNull();
  });

  it('accepts an exact page position without requiring text', () => {
    document.body.innerHTML = `
      <main><div id="blank-target" aria-label="Empty chart area"></div></main>
      <nav id="site-navigation"></nav>
      <div data-multi-ai-workspace-root="true"><div id="workspace-target"></div></div>
    `;
    const blankTarget = document.querySelector('#blank-target');
    const siteNavigation = document.querySelector('#site-navigation');
    const workspaceTarget = document.querySelector('#workspace-target');

    const target = createPointPinTarget(blankTarget, 48, 96);
    expect(target).toEqual({ element: blankTarget, clientX: 48, clientY: 96 });
    expect(createPointPinTarget(siteNavigation, 12, 24)?.element).toBe(siteNavigation);
    expect(createPointPinTarget(workspaceTarget, 48, 96)).toBeNull();
  });

  it('measures and jumps to the clicked height inside an element', () => {
    const target = document.createElement('div');
    document.body.append(target);
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 100,
      width: 300,
      height: 400,
      right: 300,
      bottom: 500,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    const range = document.createRange();
    range.selectNodeContents(target);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    expect(measureConversationPinPosition(range, target, 1_000, 0.75).topPercent).toBe(40);
    scrollConversationPinIntoView(range, target, 'auto', 0.75);
    expect(scrollTo).toHaveBeenCalledWith({
      top: Math.max(0, 400 - window.innerHeight / 2),
      behavior: 'auto',
    });
  });

  it('derives previews only from the live selected range', () => {
    expect(conversationPinPreview('  one\n two   three  ', 12)).toBe('one two thr…');
  });
});
