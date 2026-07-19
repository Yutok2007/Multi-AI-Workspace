import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../shared/i18n/I18nContext';
import type { MessageKey } from '../shared/i18n/messages';
import type { PlatformMessage } from '../shared/types/platform';
import type { AppSettings } from '../shared/types/settings';
import {
  discoverFormulaTargets,
  discoverMermaidTargets,
  extractFormulaSources,
  formatApproximateFormula,
  formatFormula,
  type FormulaTarget,
  type MermaidTarget,
} from './markupDiscovery';
import { InlineMermaidController, resolveMermaidTheme } from './inlineMermaid';
import { loadMermaidRenderer } from './mermaidLoader';
import type { MermaidTheme } from './mermaidRenderer';

type ActiveTarget =
  { kind: 'mermaid'; target: MermaidTarget } | { kind: 'formula'; target: FormulaTarget };
type OpenDialog = ActiveTarget | null;

interface ControlPosition {
  left: number;
  top: number;
}

const FORMULA_LABELS: Record<AppSettings['markup']['formulaCopyFormat'], MessageKey> = {
  latex: 'copyLatex',
  mathml: 'copyMathml',
  word: 'copyWordFormula',
  notion: 'copyNotionFormula',
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(prefix: string, extension: string): string {
  return `${prefix}-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.${extension}`;
}

export function MarkupEnhancements({
  messages,
  settings,
}: {
  messages: PlatformMessage[];
  settings: AppSettings['markup'];
}) {
  const t = useI18n();
  const mermaidTargets = useMemo(
    () => (settings.mermaidEnabled ? discoverMermaidTargets(messages) : []),
    [messages, settings.mermaidEnabled],
  );
  const formulaTargets = useMemo(
    () => (settings.formulaCopyEnabled ? discoverFormulaTargets(messages) : []),
    [messages, settings.formulaCopyEnabled],
  );
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);
  const [position, setPosition] = useState<ControlPosition | null>(null);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [mermaidView, setMermaidView] = useState<'diagram' | 'source'>(settings.mermaidDefaultView);
  const [renderedDiagram, setRenderedDiagram] = useState<{
    source: string;
    theme: MermaidTheme;
    svg: string;
  } | null>(null);
  const [mermaidTheme, setMermaidTheme] = useState<MermaidTheme>(() => resolveMermaidTheme());
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const hideTimer = useRef<number | null>(null);
  const renderRevision = useRef(0);
  const inlineController = useRef<InlineMermaidController | null>(null);
  const openMermaidRef = useRef<(target: MermaidTarget) => void>(() => undefined);

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);

  const scheduleHide = useCallback(
    (id: string) => {
      cancelHide();
      hideTimer.current = window.setTimeout(() => {
        setActiveTarget((current) => (current?.target.id === id ? null : current));
      }, 180);
    },
    [cancelHide],
  );

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const entry of [
      ...mermaidTargets.map((target) => ({ kind: 'mermaid' as const, target })),
      ...formulaTargets.map((target) => ({ kind: 'formula' as const, target })),
    ]) {
      const enter = () => {
        cancelHide();
        setActiveTarget(entry);
      };
      const leave = () => scheduleHide(entry.target.id);
      entry.target.element.addEventListener('mouseenter', enter);
      entry.target.element.addEventListener('mouseleave', leave);
      cleanups.push(() => {
        entry.target.element.removeEventListener('mouseenter', enter);
        entry.target.element.removeEventListener('mouseleave', leave);
      });
    }
    return () => {
      cancelHide();
      for (const cleanup of cleanups) cleanup();
    };
  }, [cancelHide, formulaTargets, mermaidTargets, scheduleHide]);

  useEffect(() => {
    if (!activeTarget) return;
    const update = () => {
      const rectangle = activeTarget.target.element.getBoundingClientRect();
      if (rectangle.width <= 0 || rectangle.height <= 0) {
        setPosition(null);
        return;
      }
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - 52, rectangle.right - 44)),
        top: Math.max(8, Math.min(window.innerHeight - 36, rectangle.top + 8)),
      });
    };
    update();
    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      document.removeEventListener('scroll', update, true);
    };
  }, [activeTarget]);

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [dialog]);

  const renderDiagram = async (target: MermaidTarget) => {
    const revision = ++renderRevision.current;
    setRendering(true);
    setRenderedDiagram(null);
    setError('');
    try {
      const renderer = await loadMermaidRenderer();
      const svg = await renderer.renderMermaidSource(target.source, mermaidTheme);
      if (renderRevision.current === revision) {
        setRenderedDiagram({ source: target.source, theme: mermaidTheme, svg });
      }
    } catch (reason) {
      if (renderRevision.current === revision) {
        setError(
          reason instanceof Error &&
            'code' in reason &&
            (reason as Error & { code?: string }).code === 'too-large'
            ? t('mermaidTooLarge')
            : t('mermaidRenderFailed'),
        );
      }
    } finally {
      if (renderRevision.current === revision) setRendering(false);
    }
  };

  const openMermaid = (target: MermaidTarget) => {
    setDialog({ kind: 'mermaid', target });
    setMermaidView(settings.mermaidDefaultView);
    setRenderedDiagram(null);
    setError('');
    setNotice('');
    if (settings.mermaidDefaultView === 'diagram') void renderDiagram(target);
  };

  useEffect(() => {
    openMermaidRef.current = openMermaid;
  });

  useEffect(() => {
    const updateTheme = () => setMermaidTheme(resolveMermaidTheme());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'],
      });
    }
    media?.addEventListener('change', updateTheme);
    return () => {
      observer.disconnect();
      media?.removeEventListener('change', updateTheme);
    };
  }, []);

  useEffect(() => {
    const controller = new InlineMermaidController(
      async (source, theme) => (await loadMermaidRenderer()).renderMermaidSource(source, theme),
      {
        open: t('mermaidOpen'),
        source: t('sourceView'),
        error: t('mermaidInlineError'),
      },
      (target) => openMermaidRef.current(target),
    );
    inlineController.current = controller;
    return () => {
      controller.dispose();
      if (inlineController.current === controller) inlineController.current = null;
    };
  }, [t]);

  useEffect(() => {
    inlineController.current?.sync(mermaidTargets, mermaidTheme);
  }, [mermaidTargets, mermaidTheme]);

  const openFormula = (target: FormulaTarget) => {
    const refreshed = extractFormulaSources(target.element);
    setDialog({
      kind: 'formula',
      target: {
        ...target,
        latex: refreshed.latex ?? target.latex,
        mathml: refreshed.mathml ?? target.mathml,
        renderedText: refreshed.renderedText ?? target.renderedText,
      },
    });
    setError('');
    setNotice('');
  };

  const copyValue = async (value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice(t('copiedToClipboard'));
      setError('');
    } catch {
      setError(t('requestFailed'));
    }
  };

  const exportSvg = () => {
    if (!renderedDiagram) return;
    downloadBlob(
      new Blob([renderedDiagram.svg], { type: 'image/svg+xml' }),
      safeFilename('mermaid-diagram', 'svg'),
    );
    setNotice(t('downloadCreated'));
  };

  const exportPng = async () => {
    if (!renderedDiagram) return;
    try {
      const renderer = await loadMermaidRenderer();
      downloadBlob(
        await renderer.mermaidSvgToPng(renderedDiagram.svg),
        safeFilename('mermaid-diagram', 'png'),
      );
      setNotice(t('downloadCreated'));
      setError('');
    } catch {
      setError(t('mermaidRenderFailed'));
    }
  };

  const orderedFormulaFormats =
    dialog?.kind === 'formula'
      ? [
          settings.formulaCopyFormat,
          ...(['latex', 'mathml', 'word', 'notion'] as const).filter(
            (format) => format !== settings.formulaCopyFormat,
          ),
        ]
      : [];

  return (
    <>
      {activeTarget && position ? (
        <button
          className={`maw-markup-trigger ${activeTarget.kind}`}
          style={{ left: position.left, top: position.top }}
          type="button"
          aria-label={t(activeTarget.kind === 'mermaid' ? 'mermaidOpen' : 'formulaOpen')}
          onMouseEnter={cancelHide}
          onMouseLeave={() => scheduleHide(activeTarget.target.id)}
          onClick={() =>
            activeTarget.kind === 'mermaid'
              ? openMermaid(activeTarget.target)
              : openFormula(activeTarget.target)
          }
        >
          {activeTarget.kind === 'mermaid' ? '◇' : 'ƒx'}
        </button>
      ) : null}
      {dialog ? (
        <div
          className="maw-markup-backdrop"
          role="presentation"
          onMouseDown={() => setDialog(null)}
        >
          <section
            className="maw-markup-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t(dialog.kind === 'mermaid' ? 'mermaidTitle' : 'formulaTitle')}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <strong>{t(dialog.kind === 'mermaid' ? 'mermaidTitle' : 'formulaTitle')}</strong>
              <button type="button" aria-label={t('close')} onClick={() => setDialog(null)}>
                ×
              </button>
            </header>
            {notice ? <div className="maw-notice">{notice}</div> : null}
            {error ? <div className="maw-error">{error}</div> : null}
            {dialog.kind === 'mermaid' ? (
              <>
                <nav className="maw-markup-tabs">
                  <button
                    type="button"
                    aria-current={mermaidView === 'diagram' ? 'page' : undefined}
                    onClick={() => {
                      setMermaidView('diagram');
                      if (
                        renderedDiagram?.source !== dialog.target.source ||
                        renderedDiagram.theme !== mermaidTheme
                      ) {
                        void renderDiagram(dialog.target);
                      }
                    }}
                  >
                    {t('diagramView')}
                  </button>
                  <button
                    type="button"
                    aria-current={mermaidView === 'source' ? 'page' : undefined}
                    onClick={() => setMermaidView('source')}
                  >
                    {t('sourceView')}
                  </button>
                </nav>
                {mermaidView === 'source' ? (
                  <pre className="maw-markup-source">{dialog.target.source}</pre>
                ) : rendering ? (
                  <div className="maw-markup-loading">{t('renderingDiagram')}</div>
                ) : renderedDiagram ? (
                  <div
                    className="maw-mermaid-preview"
                    // Mermaid runs in strict mode and the SVG is sanitized again before insertion.
                    dangerouslySetInnerHTML={{ __html: renderedDiagram.svg }}
                  />
                ) : null}
                <div className="maw-markup-actions">
                  <button type="button" onClick={() => void copyValue(dialog.target.source)}>
                    {t('copySource')}
                  </button>
                  <button type="button" disabled={!renderedDiagram} onClick={exportSvg}>
                    {t('exportSvg')}
                  </button>
                  <button
                    type="button"
                    disabled={!renderedDiagram}
                    onClick={() => void exportPng()}
                  >
                    {t('exportPng')}
                  </button>
                </div>
              </>
            ) : (
              <>
                {dialog.target.renderedText ? (
                  <div className="maw-formula-preview" aria-label={t('formulaPreview')}>
                    <span>{t('formulaPreview')}</span>
                    <div>{dialog.target.renderedText}</div>
                  </div>
                ) : null}
                {!dialog.target.latex && !dialog.target.mathml ? (
                  <div className="maw-markup-warning">
                    <strong>{t('formulaFallbackTitle')}</strong>
                    <span>{t('formulaFallbackDescription')}</span>
                  </div>
                ) : null}
                <div className="maw-formula-actions">
                  {!dialog.target.latex && !dialog.target.mathml ? (
                    <>
                      <button
                        type="button"
                        disabled={!dialog.target.renderedText}
                        onClick={() => void copyValue(dialog.target.renderedText)}
                      >
                        {t('copyCompatibleFormula')}
                      </button>
                      {formatApproximateFormula(dialog.target.renderedText, 'latex') ? (
                        <button
                          type="button"
                          onClick={() =>
                            void copyValue(
                              formatApproximateFormula(dialog.target.renderedText, 'latex'),
                            )
                          }
                        >
                          {t('copyApproximateLatex')}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {orderedFormulaFormats.map((format) => {
                        const value = formatFormula(dialog.target, format);
                        return value ? (
                          <button type="button" key={format} onClick={() => void copyValue(value)}>
                            {t(FORMULA_LABELS[format])}
                          </button>
                        ) : null;
                      })}
                      <button
                        type="button"
                        disabled={!dialog.target.renderedText}
                        onClick={() => void copyValue(dialog.target.renderedText)}
                      >
                        {t('copyRenderedText')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
