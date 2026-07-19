export const SHADOW_HOST_ATTRIBUTE = 'data-multi-ai-workspace-root';
export const SHADOW_HOST_SELECTOR = `[${SHADOW_HOST_ATTRIBUTE}="true"]`;

export interface ShadowMount {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  mountPoint: HTMLDivElement;
}

export function attachShadowHost(host: HTMLElement, documentRef: Document = document): void {
  if (host.isConnected && host.parentElement === documentRef.documentElement) return;
  documentRef.documentElement.append(host);
}

export function keepShadowHostAttached(
  host: HTMLElement,
  documentRef: Document = document,
): () => void {
  attachShadowHost(host, documentRef);
  const observer = new MutationObserver(() => attachShadowHost(host, documentRef));
  observer.observe(documentRef.documentElement, { childList: true });
  return () => observer.disconnect();
}

export function createShadowMount(documentRef: Document = document): ShadowMount | null {
  if (documentRef.querySelector(SHADOW_HOST_SELECTOR)) {
    return null;
  }

  const host = documentRef.createElement('div');
  host.setAttribute(SHADOW_HOST_ATTRIBUTE, 'true');
  host.style.pointerEvents = 'none';
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.zIndex = '2147483000';

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const mountPoint = documentRef.createElement('div');
  mountPoint.id = 'multi-ai-workspace-app';
  shadowRoot.append(mountPoint);
  attachShadowHost(host, documentRef);

  return { host, shadowRoot, mountPoint };
}
