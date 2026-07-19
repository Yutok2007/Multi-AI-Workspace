export type PlatformId = 'chatgpt' | 'claude' | 'gemini' | 'deepseek' | 'grok' | 'kimi' | 'custom';

export type PlatformCapability =
  | 'composer.read'
  | 'composer.write'
  | 'composer.observe'
  | 'messages.read'
  | 'messages.observe'
  | 'messages.scroll'
  | 'messages.timestamps'
  | 'conversation.metadata'
  | 'conversation.list'
  | 'conversation.fork.native'
  | 'conversation.fork.manual'
  | 'sidebar.inject'
  | 'sidebar.hide-conversation'
  | 'export'
  | 'timeline'
  | 'quote-reply'
  | 'draft'
  | 'layout'
  | 'model.select'
  | 'usage.read';

export interface PlatformConversation {
  platform: PlatformId;
  accountScopeId: string;
  conversationId: string | null;
  url: string;
  title: string | null;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface PlatformMessage {
  platform: PlatformId;
  conversationId: string | null;
  messageId: string | null;
  runtimeMessageId: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'unknown';
  plainText: string;
  html: string | null;
  timestamp: number | null;
  timestampSource: 'platform' | 'observed' | 'unknown';
  element: HTMLElement;
  order: number;
}

export interface ComposerHandle {
  root: HTMLElement;
  editable: HTMLElement;
  sendButton: HTMLElement | null;
}

export interface PlatformAnswerCompletion {
  id: string;
  message: PlatformMessage;
}

export interface PlatformAdapter {
  readonly id: PlatformId;

  matches(location: Location): boolean;
  initialize(): Promise<void>;
  dispose(): void;
  getCapabilities(): ReadonlySet<PlatformCapability>;
  getCurrentAccountScope(): Promise<string>;
  getCurrentConversation(): Promise<PlatformConversation | null>;
  findComposer(): Promise<ComposerHandle | null>;
  readComposer(): Promise<string>;
  writeComposer(
    value: string,
    options?: {
      mode: 'replace' | 'insert-at-cursor' | 'append';
      focus?: boolean;
    },
  ): Promise<void>;
  observeComposer(callback: (value: string) => void): () => void;
  getMessages(): Promise<PlatformMessage[]>;
  observeMessages(callback: (messages: PlatformMessage[]) => void): () => void;
  scrollToMessage(message: PlatformMessage, behavior: 'smooth' | 'instant'): Promise<void>;
  getSidebarRoot(): Promise<HTMLElement | null>;
  getConversationListRoot(): Promise<HTMLElement | null>;
  getConversationItems(): Promise<PlatformConversation[]>;
  openConversation(conversation: PlatformConversation): Promise<void>;
  forkConversation?(message: PlatformMessage): Promise<{
    method: 'native' | 'manual';
    newUrl?: string;
  }>;
  selectModel?(model: string): Promise<{ model: string }>;
  getSelectedModel?(): Promise<string | null>;
  observeAnswerCompletions?(callback: (completion: PlatformAnswerCompletion) => void): () => void;
}

export interface DataScope {
  platformId: PlatformId;
  accountScopeId: string;
}
