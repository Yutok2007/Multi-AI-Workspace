import type { PlatformCapability, PlatformId } from './platform';

export type PlatformStatus =
  'healthy' | 'partial' | 'disabled' | 'dom-incompatible' | 'permission-missing' | 'unverified';

export interface PlatformDiagnostic {
  platform: PlatformId;
  status: PlatformStatus;
  capabilities: Partial<Record<PlatformCapability, boolean>>;
  failures: Record<string, string>;
  checkedAt: number;
}

export interface DiagnosticError {
  code: string;
  message: string;
  timestamp: number;
}

export interface DebugReport {
  extensionVersion: string;
  browser: string;
  platform: PlatformId | 'unknown';
  urlOrigin: string;
  capabilities: Partial<Record<PlatformCapability, boolean>>;
  failedSelectors: string[];
  errors: DiagnosticError[];
  settingsSummary: {
    locale: string;
    enabledFeatureCount: number;
    onboardingComplete: boolean;
  };
}

export type CompatibilityFeatureId = 'pin' | 'timeline' | 'branch' | 'quote' | 'export';
export type CompatibilityFeatureStatus =
  'available' | 'unavailable' | 'disabled' | 'native' | 'recovering';
export type CompatibilityReasonCode =
  | 'ready'
  | 'feature-disabled'
  | 'native-platform-feature'
  | 'extension-timeline-unavailable'
  | 'composer-not-detected'
  | 'messages-not-detected'
  | 'automatic-recovery-running';

export interface AdapterCompatibilityEvidence {
  composer: boolean;
  userMessages: boolean;
  assistantMessages: boolean;
  readableMessages: boolean;
  bindingConfigured: boolean;
  checkedAt: number;
}

export interface CompatibilityMonitorSnapshot {
  phase: 'healthy' | 'partial' | 'degraded' | 'recovering';
  recoveryAttempts: number;
  lastRecoveryAt: number | null;
  lastChangeAt: number | null;
  evidence: AdapterCompatibilityEvidence;
}

export interface CompatibilityFeatureCheck {
  feature: CompatibilityFeatureId;
  status: CompatibilityFeatureStatus;
  reason: CompatibilityReasonCode;
}

export interface CompatibilityDebugReport {
  schemaVersion: 1;
  extensionVersion: string;
  generatedAt: string;
  browser: string;
  platform: PlatformId;
  monitor: Omit<CompatibilityMonitorSnapshot, 'evidence'>;
  evidence: Omit<AdapterCompatibilityEvidence, 'checkedAt'>;
  features: CompatibilityFeatureCheck[];
  recentErrorCodes: Array<{ code: string; timestamp: number }>;
}
