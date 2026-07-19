import type { PlatformDiagnostic } from '../../shared/types/diagnostics';
import type { PlatformAdapter, PlatformCapability } from '../../shared/types/platform';

export function createPlatformDiagnostic(
  adapter: PlatformAdapter,
  failures: Record<string, string> = {},
): PlatformDiagnostic {
  const available = adapter.getCapabilities();
  const capabilities: Partial<Record<PlatformCapability, boolean>> = {};
  for (const capability of available) {
    capabilities[capability] = true;
  }

  return {
    platform: adapter.id,
    status:
      available.size === 0
        ? 'unverified'
        : Object.keys(failures).length > 0
          ? 'partial'
          : 'healthy',
    capabilities,
    failures,
    checkedAt: Date.now(),
  };
}
