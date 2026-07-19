export type PageQuickAction = 'prompt' | 'restore' | 'undo-restore' | 'pin' | 'branch' | 'export';

export interface PageQuickActionAvailability {
  prompt: boolean;
  restore: boolean;
  undoRestore: boolean;
  pin: boolean;
  branch: boolean;
  export: boolean;
}

export function availablePageQuickActions({
  prompt,
  restore,
  undoRestore,
  pin,
  branch,
  export: exportAvailable,
}: PageQuickActionAvailability): PageQuickAction[] {
  const actions: PageQuickAction[] = [];
  if (prompt) actions.push('prompt');
  if (restore) actions.push('restore');
  if (undoRestore) actions.push('undo-restore');
  if (pin) actions.push('pin');
  if (branch) actions.push('branch');
  if (exportAvailable) actions.push('export');
  return actions;
}
