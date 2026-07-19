import { useI18n } from '../shared/i18n/I18nContext';
import type { TextHighlightColor } from '../shared/types/records';
import { TEXT_HIGHLIGHT_BACKGROUNDS, TEXT_HIGHLIGHT_COLORS } from './textHighlights';
import type { SelectedTextSnapshot } from './useSelectedText';

export function formatSelectedQuote(text: string): string {
  return `${text
    .trim()
    .slice(0, 5000)
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')}\n\n`;
}

export function SelectionRewritePopover({
  selection,
  canQuote,
  canRewrite,
  canHighlight,
  highlighted,
  highlightColor,
  onQuote,
  onRewrite,
  onHighlight,
  onRemoveHighlight,
  onHighlightColorChange,
  onDismiss,
  error,
}: {
  selection: SelectedTextSnapshot;
  canQuote: boolean;
  canRewrite: boolean;
  canHighlight: boolean;
  highlighted: boolean;
  highlightColor: TextHighlightColor;
  onQuote: () => void | Promise<void>;
  onRewrite: () => void;
  onHighlight: () => void | Promise<void>;
  onRemoveHighlight: () => void | Promise<void>;
  onHighlightColorChange: (color: TextHighlightColor) => void;
  onDismiss: () => void;
  error?: string;
}) {
  const t = useI18n();
  const preview = selection.text.length > 80 ? `${selection.text.slice(0, 80)}…` : selection.text;

  return (
    <aside
      className={`maw-selection-popover ${selection.placement}`}
      style={{ left: selection.anchorX, top: selection.anchorY }}
      role="toolbar"
      aria-label={t('selectionActionsHint')}
      onMouseDown={(event) => event.preventDefault()}
    >
      <span className="maw-selection-preview" title={selection.text}>
        {preview}
      </span>
      <span className="maw-selection-actions">
        {canQuote ? (
          <button className="maw-selection-quote" type="button" onClick={() => void onQuote()}>
            {t('selectionQuoteAction')}
          </button>
        ) : null}
        {canHighlight ? (
          <span className="maw-highlight-actions">
            <button
              className="maw-selection-highlight"
              type="button"
              onClick={() => void onHighlight()}
            >
              <span aria-hidden="true">⌁</span>
              {t('selectionHighlightAction')}
            </button>
            <span className="maw-highlight-palette" aria-label={t('highlightColorLabel')}>
              {TEXT_HIGHLIGHT_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`${t('highlightColorLabel')}: ${color}`}
                  aria-pressed={highlightColor === color}
                  style={{ background: TEXT_HIGHLIGHT_BACKGROUNDS[color] }}
                  onClick={() => onHighlightColorChange(color)}
                />
              ))}
            </span>
            {highlighted ? (
              <button
                className="maw-selection-highlight maw-selection-highlight-remove"
                type="button"
                onClick={() => void onRemoveHighlight()}
              >
                {t('selectionRemoveHighlightAction')}
              </button>
            ) : null}
          </span>
        ) : null}
        {canRewrite ? (
          <button className="maw-selection-rewrite" type="button" onClick={onRewrite}>
            <span aria-hidden="true">✦</span>
            {t('selectionRewriteAction')}
          </button>
        ) : null}
      </span>
      <button
        className="maw-selection-dismiss"
        type="button"
        aria-label={t('dismissSelectionAction')}
        onClick={onDismiss}
      >
        ×
      </button>
      {error ? <span className="maw-selection-error">{error}</span> : null}
    </aside>
  );
}
