import { createRoot, type Root } from 'react-dom/client';
import browser from 'webextension-polyfill';

import { createPlatformRegistry } from '../platforms';
import { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import { SUPPORTED_PLATFORMS } from '../shared/constants/platforms';
import { logger } from '../shared/logger/logger';
import type { AppSettings } from '../shared/types/settings';
import { ContentApp } from './App';
import { contentStyles } from './contentStyles';
import { getContentSettings, subscribeToContentSettings } from './contentSettings';
import { createShadowMount, keepShadowHostAttached } from './shadowRoot';
import { observeLocationChanges } from './useRouteRevision';

export interface ContentRuntime {
  dispose(): void;
}

export async function bootstrapContent(): Promise<ContentRuntime | null> {
  const initialRegistry = createPlatformRegistry(window.location);
  const initialAdapter = initialRegistry.match(window.location);
  if (!(initialAdapter instanceof UserBoundPlatformAdapter)) {
    return null;
  }

  await initialAdapter.initialize();
  let adapter = initialAdapter;
  let adapterRevision = 0;
  let requestedAdapterRevision = 0;
  let disposed = false;
  const platform = SUPPORTED_PLATFORMS.find(({ id }) => id === initialAdapter.id);
  let settings = await getContentSettings();
  logger.setLevel(settings.logLevel);

  const mount = createShadowMount();
  if (!mount) {
    logger.debug('DUPLICATE_INJECTION_PREVENTED', 'Content UI root already exists.');
    return null;
  }

  const style = document.createElement('style');
  style.textContent = contentStyles;
  mount.shadowRoot.prepend(style);
  const root: Root = createRoot(mount.mountPoint);
  const stopKeepingMountAttached = keepShadowHostAttached(mount.host);

  const render = (nextSettings: AppSettings) => {
    settings = nextSettings;
    logger.setLevel(settings.logLevel);
    root.render(
      <ContentApp
        key={`${adapter.id}:${adapterRevision}`}
        platformId={adapter.id}
        platformLabel={platform?.label ?? adapter.id}
        settings={settings}
        adapter={adapter}
        onLocaleChange={async (locale) => {
          await browser.runtime.sendMessage({ type: 'settings.update', patch: { locale } });
        }}
      />,
    );
  };
  render(settings);

  const unsubscribe = subscribeToContentSettings(render);
  const restartAdapterForRoute = async () => {
    const requestedRevision = ++requestedAdapterRevision;
    const registry = createPlatformRegistry(window.location);
    const nextAdapter = registry.match(window.location);
    if (!(nextAdapter instanceof UserBoundPlatformAdapter)) return;
    try {
      await nextAdapter.initialize();
    } catch (error) {
      nextAdapter.dispose();
      logger.warn('ROUTE_ADAPTER_RESTART_FAILED', 'The page adapter could not restart.', {
        error,
      });
      return;
    }
    if (disposed || requestedRevision !== requestedAdapterRevision) {
      nextAdapter.dispose();
      return;
    }
    const previousAdapter = adapter;
    adapter = nextAdapter;
    adapterRevision = requestedRevision;
    render(settings);
    queueMicrotask(() => previousAdapter.dispose());
  };
  const stopObservingRoutes = observeLocationChanges(() => {
    void restartAdapterForRoute();
  });
  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    window.removeEventListener('pagehide', dispose);
    stopObservingRoutes();
    stopKeepingMountAttached();
    unsubscribe();
    root.unmount();
    mount.host.remove();
    adapter.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true });

  return { dispose };
}
