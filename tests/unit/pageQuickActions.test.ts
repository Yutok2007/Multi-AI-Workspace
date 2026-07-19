import { describe, expect, it } from 'vitest';

import { availablePageQuickActions } from '../../src/content/pageQuickActions';

describe('page quick action availability', () => {
  it('keeps the stable action order when every action is available', () => {
    expect(
      availablePageQuickActions({
        prompt: true,
        restore: true,
        undoRestore: true,
        pin: true,
        branch: true,
        export: true,
      }),
    ).toEqual(['prompt', 'restore', 'undo-restore', 'pin', 'branch', 'export']);
  });

  it('omits actions the current page cannot safely perform', () => {
    expect(
      availablePageQuickActions({
        prompt: false,
        restore: true,
        undoRestore: false,
        pin: true,
        branch: false,
        export: false,
      }),
    ).toEqual(['restore', 'pin']);
  });

  it('returns no action when every capability is unavailable', () => {
    expect(
      availablePageQuickActions({
        prompt: false,
        restore: false,
        undoRestore: false,
        pin: false,
        branch: false,
        export: false,
      }),
    ).toEqual([]);
  });

  it('shows Prompt only when the current page can insert into its composer', () => {
    expect(
      availablePageQuickActions({
        prompt: true,
        restore: false,
        undoRestore: false,
        pin: false,
        branch: false,
        export: false,
      }),
    ).toEqual(['prompt']);
  });

  it('switches between restore and undo without exposing both in normal draft states', () => {
    const base = { prompt: false, pin: false, branch: false, export: false };

    expect(availablePageQuickActions({ ...base, restore: true, undoRestore: false })).toEqual([
      'restore',
    ]);
    expect(availablePageQuickActions({ ...base, restore: false, undoRestore: true })).toEqual([
      'undo-restore',
    ]);
  });
});
