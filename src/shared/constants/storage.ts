export const DATABASE_NAME = 'multi-ai-workspace';
export const DATABASE_SCHEMA_VERSION = 11;

export const DATABASE_STORES = [
  'prompts',
  'promptFolders',
  'drafts',
  'timelineMetadata',
  'conversationPins',
  'textHighlights',
  'customSites',
  'apiProfiles',
  'exportHistory',
  'conversationBranches',
  'metadata',
] as const;

export const REMOVED_DATABASE_STORES = [
  'chatFolders',
  'folderAssignments',
  'conversationIndex',
  'syncQueue',
  'favorites',
] as const;

export type DatabaseStoreName = (typeof DATABASE_STORES)[number];

export const STORAGE_KEYS = {
  settings: 'multiAiWorkspace.settings',
  schemaVersion: 'multiAiWorkspace.schemaVersion',
  migrationBackup: 'multiAiWorkspace.migrationBackup',
  migrationResults: 'multiAiWorkspace.migrationResults',
  encryptionMetadata: 'multiAiWorkspace.encryptionMetadata',
  providerSecretPrefix: 'multiAiWorkspace.providerSecret.',
} as const;
