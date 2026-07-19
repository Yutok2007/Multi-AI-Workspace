import { afterEach, describe, expect, it, vi } from 'vitest';
import browser from 'webextension-polyfill';

import { routeMessage } from '../../src/background/messageRouter';

afterEach(() => vi.restoreAllMocks());

describe('completion notification router', () => {
  it('creates at most one system notification for a completion ID', async () => {
    vi.spyOn(browser.permissions, 'contains').mockResolvedValue(true);
    const create = vi.spyOn(browser.notifications, 'create').mockResolvedValue('created');
    const request = {
      type: 'notification.show' as const,
      title: 'Workspace',
      message: 'Answer complete',
      dedupeKey: 'router-completion-once',
    };

    await expect(routeMessage(request)).resolves.toEqual({ ok: true });
    await expect(routeMessage(request)).resolves.toEqual({ ok: true });

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      'maw-answer-router-completion-once',
      expect.objectContaining({
        iconUrl: 'moz-extension://test/icon-128.png',
        title: 'Workspace',
        message: 'Answer complete',
      }),
    );
  });

  it('fails closed without notification permission', async () => {
    vi.spyOn(browser.permissions, 'contains').mockResolvedValue(false);
    const create = vi.spyOn(browser.notifications, 'create');

    await expect(
      routeMessage({
        type: 'notification.show',
        title: 'Workspace',
        message: 'Answer complete',
        dedupeKey: 'permission-missing',
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'NOTIFICATION_PERMISSION_MISSING' },
    });
    expect(create).not.toHaveBeenCalled();
  });
});
