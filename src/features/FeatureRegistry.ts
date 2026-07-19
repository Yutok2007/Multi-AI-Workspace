import type { Logger } from '../shared/logger/logger';
import type { PlatformAdapter, PlatformCapability } from '../shared/types/platform';
import type { AppSettings } from '../shared/types/settings';

export interface FeatureContext {
  adapter: PlatformAdapter;
  settings: AppSettings;
  signal: AbortSignal;
  logger: Logger;
}

export interface FeatureDefinition {
  id: string;
  defaultEnabled: boolean;
  experimental: boolean;
  requiredCapabilities: PlatformCapability[];
  initialize(context: FeatureContext): Promise<void>;
  dispose(): Promise<void>;
}

export interface FeatureEvaluation {
  active: string[];
  unavailable: Record<string, PlatformCapability[]>;
  failed: Record<string, string>;
}

export type FeatureEnabledResolver = (feature: FeatureDefinition, settings: AppSettings) => boolean;

export class FeatureRegistry {
  private readonly features = new Map<string, FeatureDefinition>();
  private readonly active = new Set<string>();
  private abortController = new AbortController();

  constructor(private readonly isEnabled: FeatureEnabledResolver) {}

  register(feature: FeatureDefinition): void {
    if (this.features.has(feature.id)) {
      throw new Error(`Feature ${feature.id} is already registered.`);
    }
    this.features.set(feature.id, feature);
  }

  async evaluate(context: Omit<FeatureContext, 'signal'>): Promise<FeatureEvaluation> {
    await this.dispose();
    this.abortController = new AbortController();
    const result: FeatureEvaluation = { active: [], unavailable: {}, failed: {} };
    const capabilities = context.adapter.getCapabilities();

    for (const feature of this.features.values()) {
      if (!this.isEnabled(feature, context.settings)) {
        continue;
      }
      const missing = feature.requiredCapabilities.filter(
        (capability) => !capabilities.has(capability),
      );
      if (missing.length > 0) {
        result.unavailable[feature.id] = missing;
        continue;
      }

      try {
        await feature.initialize({ ...context, signal: this.abortController.signal });
        this.active.add(feature.id);
        result.active.push(feature.id);
      } catch (error) {
        result.failed[feature.id] =
          error instanceof Error ? error.message : 'FEATURE_INITIALIZATION_FAILED';
        context.logger.error(
          'FEATURE_INITIALIZATION_FAILED',
          `Feature ${feature.id} failed to initialize.`,
          {
            error,
          },
        );
        try {
          await feature.dispose();
        } catch (disposeError) {
          context.logger.error(
            'FEATURE_DISPOSE_FAILED',
            `Feature ${feature.id} failed to dispose after initialization failure.`,
            { disposeError },
          );
        }
      }
    }

    return result;
  }

  async dispose(): Promise<void> {
    this.abortController.abort();
    const activeFeatures = [...this.active];
    this.active.clear();
    await Promise.all(
      activeFeatures.map(async (id) => {
        await this.features.get(id)?.dispose();
      }),
    );
  }
}
