import type { MermaidTarget } from './markupDiscovery';
import type { MermaidTheme } from './mermaidRenderer';

export interface InlineMermaidLabels {
  open: string;
  source: string;
  error: string;
}

export type InlineMermaidRender = (source: string, theme: MermaidTheme) => Promise<string>;

interface InlineEntry {
  target: MermaidTarget;
  source: string;
  theme: MermaidTheme;
  revision: number;
  timer: number;
  container: HTMLDivElement;
}

const INLINE_RENDER_SETTLE_MS = 450;

function inlineStyles(theme: MermaidTheme): string {
  const dark = theme === 'dark';
  return `
    :host { display: block; max-width: 100%; margin: .75rem 0; color-scheme: ${dark ? 'dark' : 'light'}; }
    .card { max-width: 100%; overflow: auto; border: 1px solid ${dark ? '#394150' : '#d8dee9'};
      border-radius: 12px; background: ${dark ? '#171a21' : '#ffffff'}; padding: 12px; }
    .diagram { display: block; width: 100%; padding: 0; border: 0; background: transparent;
      color: inherit; cursor: zoom-in; text-align: center; }
    .diagram svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
    details { margin-top: 10px; text-align: left; }
    summary { cursor: pointer; font: 600 12px/1.4 system-ui, sans-serif; }
    pre { max-height: 320px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .error { border: 1px solid ${dark ? '#874b4b' : '#efb4b4'}; border-radius: 9px;
      background: ${dark ? '#2a1717' : '#fff5f5'}; color: ${dark ? '#ffd7d7' : '#8d2424'};
      padding: 8px 10px; font: 600 12px/1.4 system-ui, sans-serif; }
  `;
}

function renderSuccess(
  entry: InlineEntry,
  svg: string,
  labels: InlineMermaidLabels,
  onOpen: (target: MermaidTarget) => void,
): void {
  const shadow = entry.container.shadowRoot ?? entry.container.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = inlineStyles(entry.theme);
  const card = document.createElement('section');
  card.className = 'card';
  const diagram = document.createElement('button');
  diagram.className = 'diagram';
  diagram.type = 'button';
  diagram.setAttribute('aria-label', labels.open);
  // The Mermaid renderer uses strict mode and sanitizes SVG before this insertion.
  diagram.innerHTML = svg;
  diagram.addEventListener('click', () => onOpen(entry.target));
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = labels.source;
  const source = document.createElement('pre');
  source.textContent = entry.source;
  details.append(summary, source);
  card.append(diagram, details);
  shadow.replaceChildren(style, card);
  entry.container.hidden = false;
  entry.target.element.hidden = true;
}

function renderFailure(entry: InlineEntry, labels: InlineMermaidLabels): void {
  const shadow = entry.container.shadowRoot ?? entry.container.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = inlineStyles(entry.theme);
  const error = document.createElement('div');
  error.className = 'error';
  error.setAttribute('role', 'status');
  error.textContent = labels.error;
  shadow.replaceChildren(style, error);
  entry.target.element.hidden = false;
  entry.container.hidden = false;
}

export class InlineMermaidController {
  private readonly entries = new Map<HTMLElement, InlineEntry>();

  constructor(
    private readonly render: InlineMermaidRender,
    private readonly labels: InlineMermaidLabels,
    private readonly onOpen: (target: MermaidTarget) => void,
    private readonly settleMs = INLINE_RENDER_SETTLE_MS,
  ) {}

  sync(targets: MermaidTarget[], theme: MermaidTheme): void {
    const live = new Set(targets.map(({ element }) => element));
    for (const [element, entry] of this.entries) {
      if (!live.has(element) || !element.isConnected) this.remove(entry);
    }

    for (const target of targets) {
      const current = this.entries.get(target.element);
      if (current && current.source === target.source && current.theme === theme) {
        current.target = target;
        continue;
      }
      if (current) this.remove(current);
      const container = document.createElement('div');
      container.dataset.mawMermaidInline = 'true';
      container.hidden = true;
      target.element.after(container);
      target.element.hidden = false;
      const entry: InlineEntry = {
        target,
        source: target.source,
        theme,
        revision: 1,
        timer: 0,
        container,
      };
      this.entries.set(target.element, entry);
      const revision = entry.revision;
      entry.timer = window.setTimeout(() => {
        void this.render(entry.source, entry.theme)
          .then((svg) => {
            if (this.entries.get(target.element) !== entry || entry.revision !== revision) return;
            renderSuccess(entry, svg, this.labels, this.onOpen);
          })
          .catch(() => {
            if (this.entries.get(target.element) !== entry || entry.revision !== revision) return;
            renderFailure(entry, this.labels);
          });
      }, this.settleMs);
    }
  }

  dispose(): void {
    for (const entry of [...this.entries.values()]) this.remove(entry);
  }

  private remove(entry: InlineEntry): void {
    window.clearTimeout(entry.timer);
    entry.revision += 1;
    entry.target.element.hidden = false;
    entry.container.remove();
    this.entries.delete(entry.target.element);
  }
}

function parsedBackgroundIsDark(color: string): boolean | null {
  const match = color.match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const [red, green, blue] = match.slice(1, 4).map(Number);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 < 0.45;
}

export function resolveMermaidTheme(document_: Document = document): MermaidTheme {
  const view = document_.defaultView;
  if (!view) return 'default';
  const rootStyle = view.getComputedStyle(document_.documentElement);
  if (rootStyle.colorScheme.split(/\s+/).includes('dark')) return 'dark';
  const body = document_.body;
  if (body) {
    const bodyDark = parsedBackgroundIsDark(view.getComputedStyle(body).backgroundColor);
    if (bodyDark !== null) return bodyDark ? 'dark' : 'default';
  }
  return view.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
}
