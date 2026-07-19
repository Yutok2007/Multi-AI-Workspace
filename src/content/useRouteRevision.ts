import { useEffect, useState } from 'react';

export function observeLocationChanges(
  callback: (url: string) => void,
  intervalMs = 250,
): () => void {
  let previousUrl = window.location.href;
  const check = () => {
    const nextUrl = window.location.href;
    if (nextUrl === previousUrl) return;
    previousUrl = nextUrl;
    callback(nextUrl);
  };
  const interval = window.setInterval(check, intervalMs);
  window.addEventListener('popstate', check);
  window.addEventListener('hashchange', check);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener('popstate', check);
    window.removeEventListener('hashchange', check);
  };
}

export function useRouteRevision(): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => observeLocationChanges(() => setRevision((current) => current + 1)), []);
  return revision;
}
