import { afterEach, describe, expect, it } from 'vitest';

import {
  createShadowMount,
  keepShadowHostAttached,
  SHADOW_HOST_SELECTOR,
} from '../../src/content/shadowRoot';

afterEach(() => {
  document.querySelectorAll(SHADOW_HOST_SELECTOR).forEach((element) => element.remove());
  document.body.innerHTML = '';
});

describe('createShadowMount', () => {
  it('isolates the mount and prevents duplicate injection', () => {
    const first = createShadowMount(document);
    const second = createShadowMount(document);

    expect(first?.host.matches(SHADOW_HOST_SELECTOR)).toBe(true);
    expect(first?.host.style.pointerEvents).toBe('none');
    expect(first?.shadowRoot.contains(first.mountPoint)).toBe(true);
    expect(second).toBeNull();
    expect(document.querySelectorAll(SHADOW_HOST_SELECTOR)).toHaveLength(1);
  });

  it('reattaches the same mounted app when a host SPA removes it', async () => {
    const mount = createShadowMount(document)!;
    const stop = keepShadowHostAttached(mount.host, document);

    mount.host.remove();
    await Promise.resolve();

    expect(mount.host.isConnected).toBe(true);
    expect(mount.host.parentElement).toBe(document.documentElement);
    expect(mount.shadowRoot.contains(mount.mountPoint)).toBe(true);
    expect(document.querySelectorAll(SHADOW_HOST_SELECTOR)).toHaveLength(1);
    stop();
  });
});
