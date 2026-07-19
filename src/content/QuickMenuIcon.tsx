export type QuickMenuIconName =
  'prompt' | 'restore' | 'undo-restore' | 'pin' | 'branch' | 'export' | 'workspace' | 'close';

export function QuickMenuIcon({ name }: { name: QuickMenuIconName }) {
  const shape = (() => {
    switch (name) {
      case 'prompt':
        return (
          <>
            <path d="M6.5 5.5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4.5 3v-3h-.5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
            <path d="M8 9h8M8 12.5h5" />
          </>
        );
      case 'restore':
        return (
          <>
            <path d="M6 4.5h8.5L18 8v11.5H6Z" />
            <path d="M14.5 4.5V8H18M15 13H9M12 10l-3 3 3 3" />
          </>
        );
      case 'undo-restore':
        return (
          <>
            <path d="m9 7-5 5 5 5" />
            <path d="M5 12h8a6 6 0 0 1 6 6" />
          </>
        );
      case 'pin':
        return (
          <>
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </>
        );
      case 'branch':
        return (
          <>
            <circle cx="6" cy="12" r="2" />
            <circle cx="18" cy="5" r="2" />
            <circle cx="18" cy="19" r="2" />
            <path d="M8 12h2a4 4 0 0 0 4-4V7a2 2 0 0 1 2-2M8 12h2a4 4 0 0 1 4 4v1a2 2 0 0 0 2 2" />
          </>
        );
      case 'export':
        return (
          <>
            <path d="M12 3v11M8 10l4 4 4-4" />
            <path d="M5 15.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
          </>
        );
      case 'workspace':
        return <path d="m9 5 7 7-7 7" />;
      case 'close':
        return <path d="m7 7 10 10M17 7 7 17" />;
    }
  })();

  return (
    <svg
      className="maw-quick-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  );
}
