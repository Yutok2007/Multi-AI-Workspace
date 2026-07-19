import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

export const MAX_MERMAID_SOURCE_LENGTH = 50_000;
const MERMAID_RENDER_TIMEOUT_MS = 4_000;
export type MermaidTheme = 'default' | 'dark';
let initializedTheme: MermaidTheme | null = null;
let renderQueue: Promise<void> = Promise.resolve();

export class MermaidRenderError extends Error {
  constructor(readonly code: 'too-large' | 'timeout' | 'invalid') {
    super(code);
  }
}

function initializeMermaid(theme: MermaidTheme): void {
  if (initializedTheme === theme) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    secure: [
      'secure',
      'securityLevel',
      'startOnLoad',
      'maxTextSize',
      'suppressErrorRendering',
      'theme',
    ],
    theme,
    maxTextSize: MAX_MERMAID_SOURCE_LENGTH,
    suppressErrorRendering: true,
    htmlLabels: false,
    flowchart: { htmlLabels: false, useMaxWidth: true },
  });
  initializedTheme = theme;
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new MermaidRenderError('timeout')), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

async function renderMermaidSourceNow(source: string, theme: MermaidTheme): Promise<string> {
  if (!source.trim() || source.length > MAX_MERMAID_SOURCE_LENGTH) {
    throw new MermaidRenderError(
      source.length > MAX_MERMAID_SOURCE_LENGTH ? 'too-large' : 'invalid',
    );
  }
  initializeMermaid(theme);
  try {
    await withTimeout(mermaid.parse(source), MERMAID_RENDER_TIMEOUT_MS);
    const id = `maw-mermaid-${crypto.randomUUID().replaceAll('-', '')}`;
    const { svg } = await withTimeout(mermaid.render(id, source), MERMAID_RENDER_TIMEOUT_MS);
    const sanitized = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'foreignObject'],
    });
    if (!sanitized.includes('<svg')) throw new MermaidRenderError('invalid');
    return sanitized;
  } catch (error) {
    if (error instanceof MermaidRenderError) throw error;
    throw new MermaidRenderError('invalid');
  }
}

export function renderMermaidSource(
  source: string,
  theme: MermaidTheme = 'default',
): Promise<string> {
  const task = () => renderMermaidSourceNow(source, theme);
  const result = renderQueue.then(task, task);
  renderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function mermaidSvgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const scale = Math.min(2, 4096 / Math.max(image.naturalWidth, image.naturalHeight, 1));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    if (width * height > 16_000_000) throw new MermaidRenderError('too-large');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new MermaidRenderError('invalid');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new MermaidRenderError('invalid'))),
        'image/png',
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
