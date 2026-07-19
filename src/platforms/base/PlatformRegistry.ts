import { AppError } from '../../shared/errors/AppError';
import type { PlatformAdapter, PlatformId } from '../../shared/types/platform';

export class PlatformRegistry {
  private readonly adapters = new Map<PlatformId, PlatformAdapter>();

  register(adapter: PlatformAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new AppError(
        'DUPLICATE_PLATFORM_ADAPTER',
        `Adapter ${adapter.id} is already registered.`,
      );
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(id: PlatformId): PlatformAdapter | undefined {
    return this.adapters.get(id);
  }

  match(location: Location): PlatformAdapter | null {
    const matches = [...this.adapters.values()].filter((adapter) => adapter.matches(location));
    if (matches.length > 1) {
      throw new AppError(
        'AMBIGUOUS_PLATFORM_ADAPTER',
        'More than one platform adapter matched this page.',
      );
    }
    return matches[0] ?? null;
  }

  list(): PlatformAdapter[] {
    return [...this.adapters.values()];
  }

  async dispose(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      adapter.dispose();
    }
  }
}
