import { CapabilityUnavailableError } from '../../shared/errors/AppError';
import type {
  ComposerHandle,
  PlatformAdapter,
  PlatformCapability,
  PlatformConversation,
  PlatformId,
  PlatformMessage,
} from '../../shared/types/platform';

export class UnverifiedPlatformAdapter implements PlatformAdapter {
  readonly id: PlatformId;
  private readonly hostname: string;

  constructor(id: PlatformId, hostname: string) {
    this.id = id;
    this.hostname = hostname;
  }

  matches(location: Location): boolean {
    return location.protocol === 'https:' && location.hostname === this.hostname;
  }

  async initialize(): Promise<void> {}
  dispose(): void {}

  getCapabilities(): ReadonlySet<PlatformCapability> {
    return new Set();
  }

  async getCurrentAccountScope(): Promise<string> {
    return 'anonymous';
  }

  async getCurrentConversation(): Promise<PlatformConversation | null> {
    return null;
  }

  async findComposer(): Promise<ComposerHandle | null> {
    return null;
  }

  async readComposer(): Promise<string> {
    throw new CapabilityUnavailableError('composer.read');
  }

  async writeComposer(): Promise<void> {
    throw new CapabilityUnavailableError('composer.write');
  }

  observeComposer(): () => void {
    return () => undefined;
  }

  async getMessages(): Promise<PlatformMessage[]> {
    return [];
  }

  observeMessages(): () => void {
    return () => undefined;
  }

  async scrollToMessage(): Promise<void> {
    throw new CapabilityUnavailableError('messages.scroll');
  }

  async getSidebarRoot(): Promise<HTMLElement | null> {
    return null;
  }

  async getConversationListRoot(): Promise<HTMLElement | null> {
    return null;
  }

  async getConversationItems(): Promise<PlatformConversation[]> {
    return [];
  }

  async openConversation(): Promise<void> {
    throw new CapabilityUnavailableError('conversation.list');
  }
}
