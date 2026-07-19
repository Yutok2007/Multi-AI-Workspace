import { SUPPORTED_PLATFORMS } from '../shared/constants/platforms';
import { PlatformRegistry } from './base/PlatformRegistry';
import { UserBoundPlatformAdapter } from './base/UserBoundPlatformAdapter';

export function createPlatformRegistry(customLocation?: Location): PlatformRegistry {
  const registry = new PlatformRegistry();
  for (const platform of SUPPORTED_PLATFORMS) {
    registry.register(new UserBoundPlatformAdapter(platform.id, platform.hostname));
  }
  const localFixture =
    customLocation &&
    (customLocation.hostname === 'localhost' || customLocation.hostname === '127.0.0.1') &&
    customLocation.protocol === 'http:';
  if (localFixture) {
    registry.register(new UserBoundPlatformAdapter('custom', customLocation.hostname));
  }
  return registry;
}
