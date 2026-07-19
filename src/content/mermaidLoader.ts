import browser from 'webextension-polyfill';

import type * as MermaidRenderer from './mermaidRenderer';

let mermaidRendererPromise: Promise<typeof MermaidRenderer> | null = null;

export function loadMermaidRenderer(): Promise<typeof MermaidRenderer> {
  mermaidRendererPromise ??= import(
    /* @vite-ignore */ browser.runtime.getURL('mermaid/renderer.js')
  ) as Promise<typeof MermaidRenderer>;
  return mermaidRendererPromise;
}
