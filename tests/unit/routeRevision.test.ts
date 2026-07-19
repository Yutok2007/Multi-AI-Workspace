import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { observeLocationChanges } from '../../src/content/useRouteRevision';

describe('observeLocationChanges', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    history.replaceState(null, '', '/start');
  });

  afterEach(() => {
    vi.useRealTimers();
    history.replaceState(null, '', '/');
  });

  it('detects pushState-style SPA navigation and disposes its timer', () => {
    const callback = vi.fn();
    const dispose = observeLocationChanges(callback, 50);

    history.pushState(null, '', '/conversation/next');
    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledWith(expect.stringContaining('/conversation/next'));

    dispose();
    history.pushState(null, '', '/conversation/ignored');
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
  });
});
