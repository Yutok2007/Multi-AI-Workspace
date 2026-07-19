import { useEffect, useMemo, useState } from 'react';
import browser from 'webextension-polyfill';

import type { UserBoundPlatformAdapter } from '../platforms/base/UserBoundPlatformAdapter';
import { useI18n } from '../shared/i18n/I18nContext';
import { logger } from '../shared/logger/logger';
import type {
  CompatibilityFeatureId,
  CompatibilityFeatureStatus,
  CompatibilityMonitorSnapshot,
  CompatibilityReasonCode,
} from '../shared/types/diagnostics';
import type { AppSettings } from '../shared/types/settings';
import {
  createCompatibilityDebugReport,
  createCompatibilityFeatureChecks,
} from './compatibilitySelfCheck';

const FEATURE_LABELS: Record<
  CompatibilityFeatureId,
  | 'compatibilityPin'
  | 'compatibilityTimeline'
  | 'compatibilityBranch'
  | 'compatibilityQuote'
  | 'compatibilityExport'
> = {
  pin: 'compatibilityPin',
  timeline: 'compatibilityTimeline',
  branch: 'compatibilityBranch',
  quote: 'compatibilityQuote',
  export: 'compatibilityExport',
};

const STATUS_LABELS: Record<
  CompatibilityFeatureStatus,
  | 'compatibilityAvailable'
  | 'compatibilityUnavailable'
  | 'compatibilityDisabled'
  | 'compatibilityNative'
  | 'compatibilityRecovering'
> = {
  available: 'compatibilityAvailable',
  unavailable: 'compatibilityUnavailable',
  disabled: 'compatibilityDisabled',
  native: 'compatibilityNative',
  recovering: 'compatibilityRecovering',
};

const REASON_LABELS: Record<
  CompatibilityReasonCode,
  | 'compatibilityReadyReason'
  | 'compatibilityDisabledReason'
  | 'compatibilityNativeReason'
  | 'compatibilityTimelineUnavailableReason'
  | 'compatibilityComposerMissingReason'
  | 'compatibilityMessagesMissingReason'
  | 'compatibilityRecoveryReason'
> = {
  ready: 'compatibilityReadyReason',
  'feature-disabled': 'compatibilityDisabledReason',
  'native-platform-feature': 'compatibilityNativeReason',
  'extension-timeline-unavailable': 'compatibilityTimelineUnavailableReason',
  'composer-not-detected': 'compatibilityComposerMissingReason',
  'messages-not-detected': 'compatibilityMessagesMissingReason',
  'automatic-recovery-running': 'compatibilityRecoveryReason',
};

const MONITOR_LABELS: Record<
  CompatibilityMonitorSnapshot['phase'],
  | 'compatibilityMonitorHealthy'
  | 'compatibilityMonitorPartial'
  | 'compatibilityMonitorDegraded'
  | 'compatibilityMonitorRecovering'
> = {
  healthy: 'compatibilityMonitorHealthy',
  partial: 'compatibilityMonitorPartial',
  degraded: 'compatibilityMonitorDegraded',
  recovering: 'compatibilityMonitorRecovering',
};

function downloadReport(filename: string, report: unknown): void {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function CompatibilityPanel({
  adapter,
  settings,
  bindingRevision,
  routeRevision,
}: {
  adapter: UserBoundPlatformAdapter;
  settings: AppSettings;
  bindingRevision: number;
  routeRevision: number;
}) {
  const t = useI18n();
  const [snapshot, setSnapshot] = useState(() => adapter.getCompatibilityMonitorSnapshot());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const capabilities = adapter.getCapabilities();
  const checks = useMemo(
    () => createCompatibilityFeatureChecks(adapter.id, capabilities, settings, snapshot),
    [adapter.id, capabilities, settings, snapshot],
  );

  useEffect(() => {
    const refresh = () => setSnapshot(adapter.getCompatibilityMonitorSnapshot());
    refresh();
    const interval = window.setInterval(refresh, 2_000);
    return () => window.clearInterval(interval);
  }, [adapter, bindingRevision, routeRevision]);

  const runSelfCheck = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    setSnapshot((current) => ({ ...current, phase: 'recovering' }));
    try {
      const recovered = await adapter.recoverCompatibility();
      setSnapshot(recovered);
      setNotice(t('compatibilityCheckComplete'));
    } catch (reason) {
      logger.error('compatibility.selfcheck.failed', 'Compatibility self-check failed', reason);
      setSnapshot(adapter.getCompatibilityMonitorSnapshot());
      setError(t('compatibilityCheckFailed'));
    } finally {
      setBusy(false);
    }
  };

  const exportReport = () => {
    const report = createCompatibilityDebugReport({
      extensionVersion: browser.runtime.getManifest().version,
      userAgent: navigator.userAgent,
      platformId: adapter.id,
      snapshot,
      features: checks,
      errors: logger.getErrors(),
    });
    downloadReport(`multi-ai-workspace-${adapter.id}-compatibility.json`, report);
    setNotice(t('compatibilityReportExported'));
    setError('');
  };

  return (
    <section className="maw-compatibility" aria-label={t('compatibilityTitle')}>
      <header>
        <div>
          <strong>{t('compatibilityTitle')}</strong>
          <p>{t('compatibilityDescription')}</p>
        </div>
        <span className={`maw-monitor-status ${snapshot.phase}`}>
          {t(MONITOR_LABELS[snapshot.phase])}
        </span>
      </header>
      {notice ? <div className="maw-notice">{notice}</div> : null}
      {error ? <div className="maw-error">{error}</div> : null}
      <div className="maw-compatibility-list">
        {checks.map((entry) => (
          <article key={entry.feature}>
            <span>{t(FEATURE_LABELS[entry.feature])}</span>
            <strong className={entry.status}>{t(STATUS_LABELS[entry.status])}</strong>
            <small>{t(REASON_LABELS[entry.reason])}</small>
          </article>
        ))}
      </div>
      <div className="maw-actions">
        <button type="button" disabled={busy} onClick={() => void runSelfCheck()}>
          {busy ? t('compatibilityChecking') : t('compatibilityRunCheck')}
        </button>
        <button type="button" disabled={busy} onClick={exportReport}>
          {t('compatibilityExportReport')}
        </button>
      </div>
      <p className="maw-compatibility-privacy">{t('compatibilityReportPrivacy')}</p>
    </section>
  );
}
