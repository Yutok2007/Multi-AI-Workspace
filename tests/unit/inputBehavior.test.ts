import { describe, expect, it } from 'vitest';

import { resolveShortcutAction } from '../../src/content/useInputBehavior';

const none = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

describe('resolveShortcutAction', () => {
  it('sends only for the exact configured shortcut', () => {
    expect(resolveShortcutAction('enter', none)).toBe('send');
    expect(resolveShortcutAction('ctrl-enter', { ...none, ctrlKey: true })).toBe('send');
    expect(resolveShortcutAction('ctrl-enter', { ...none, metaKey: true })).toBe('send');
    expect(resolveShortcutAction('shift-enter', { ...none, shiftKey: true })).toBe('send');
  });

  it('preserves a newline for every non-matching Enter combination', () => {
    expect(resolveShortcutAction('enter', { ...none, shiftKey: true })).toBe('newline');
    expect(resolveShortcutAction('ctrl-enter', none)).toBe('newline');
    expect(resolveShortcutAction('ctrl-enter', { ...none, ctrlKey: true, shiftKey: true })).toBe(
      'newline',
    );
    expect(resolveShortcutAction('shift-enter', none)).toBe('newline');
  });
});
