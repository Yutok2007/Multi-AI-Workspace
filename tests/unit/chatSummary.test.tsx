import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import browser from 'webextension-polyfill';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatSummaryPanel } from '../../src/content/ChatSummaryPanel';
import type { UserBoundPlatformAdapter } from '../../src/platforms/base/UserBoundPlatformAdapter';
import { I18nProvider } from '../../src/shared/i18n/I18nContext';
import type { ApiProfileMetadataRecord } from '../../src/shared/types/records';
import type { PlatformMessage } from '../../src/shared/types/platform';

const profile: ApiProfileMetadataRecord = {
  id: 'summary-profile',
  providerType: 'openai-compatible',
  name: 'Summary Provider',
  endpoint: 'https://api.example.test/v1/chat/completions',
  baseUrlOrigin: 'https://api.example.test',
  model: 'summary-model',
  secretStorage: 'session',
  hasSecret: true,
  createdAt: 1,
  updatedAt: 1,
};

function message(role: PlatformMessage['role'], text: string, order: number): PlatformMessage {
  const element = document.createElement('article');
  element.textContent = text;
  return {
    platform: 'chatgpt',
    conversationId: 'conversation',
    messageId: `message-${order}`,
    runtimeMessageId: `${role}:${order}`,
    role,
    plainText: text,
    html: null,
    timestamp: null,
    timestampSource: 'unknown',
    element,
    order,
  };
}

function adapter(): UserBoundPlatformAdapter {
  return {
    getCurrentConversation: vi.fn().mockResolvedValue({
      platform: 'chatgpt',
      accountScopeId: 'anonymous',
      conversationId: 'conversation',
      url: 'https://chatgpt.com/c/conversation',
      title: 'Planning chat',
      createdAt: null,
      updatedAt: null,
    }),
  } as unknown as UserBoundPlatformAdapter;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('ChatSummaryPanel', () => {
  it('sends only visible user and assistant text after confirmation and renders the result', async () => {
    const requests: unknown[] = [];
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.spyOn(browser.runtime, 'sendMessage').mockImplementation(async (request) => {
      requests.push(request);
      if ((request as { type?: string }).type === 'provider.list') {
        return { ok: true, profiles: [{ profile, unlocked: true }] };
      }
      return {
        ok: true,
        summary: {
          summary: 'The team agreed to launch a beta.',
          keyPoints: ['A beta reduces launch risk'],
          decisions: ['Launch a beta'],
          actionItems: ['Prepare invitations'],
          unansweredQuestions: ['Which users should be invited?'],
        },
      };
    });
    const messages = [
      message('system', 'Hidden system prompt', 0),
      message('user', 'How should we launch?', 1),
      message('assistant', 'Begin with a beta.', 2),
      message('tool', 'Private tool output', 3),
    ];

    render(
      <I18nProvider locale="en">
        <ChatSummaryPanel adapter={adapter()} messages={messages} />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Summarize now' }));

    await screen.findByText('The team agreed to launch a beta.');
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 visible user and AI'));
    expect(requests).toContainEqual({
      type: 'chat.summarize',
      profileId: 'summary-profile',
      request: {
        conversationTitle: 'Planning chat',
        messages: [
          { role: 'user', content: 'How should we launch?' },
          { role: 'assistant', content: 'Begin with a beta.' },
        ],
        outputLanguage: 'preserve',
      },
    });
    expect(screen.getByText('Launch a beta')).toBeVisible();
    expect(screen.queryByText('Hidden system prompt')).toBeNull();
    expect(screen.queryByText('Private tool output')).toBeNull();
  });

  it('prevents duplicate requests while a summary is running', async () => {
    let finish: ((value: unknown) => void) | undefined;
    let summaryRequests = 0;
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.spyOn(browser.runtime, 'sendMessage').mockImplementation(async (request) => {
      if ((request as { type?: string }).type === 'provider.list') {
        return { ok: true, profiles: [{ profile, unlocked: true }] };
      }
      summaryRequests += 1;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });

    render(
      <I18nProvider locale="en">
        <ChatSummaryPanel adapter={adapter()} messages={[message('user', 'Summarize this.', 0)]} />
      </I18nProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Summarize now' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(summaryRequests).toBe(1));
    finish?.({
      ok: true,
      summary: {
        summary: 'Done.',
        keyPoints: [],
        decisions: [],
        actionItems: [],
        unansweredQuestions: [],
      },
    });
    await screen.findByText('Done.');
  });

  it('does not offer a request when no readable conversation text exists', async () => {
    vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue({
      ok: true,
      profiles: [{ profile, unlocked: true }],
    });

    render(
      <I18nProvider locale="en">
        <ChatSummaryPanel adapter={adapter()} messages={[message('tool', 'Tool output', 0)]} />
      </I18nProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Summarize now' });
    expect(button).toBeDisabled();
    expect(
      screen.getByText('No readable user or AI messages are available to summarize.'),
    ).toBeVisible();
  });
});
