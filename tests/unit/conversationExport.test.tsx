import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import browser from 'webextension-polyfill';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ChatGptExportButton,
  findChatGptShareControl,
} from '../../src/content/ChatGptExportButton';
import { serializeConversation } from '../../src/content/conversationExport';
import type { UserBoundPlatformAdapter } from '../../src/platforms/base/UserBoundPlatformAdapter';
import type { PlatformMessage } from '../../src/shared/types/platform';

function message(
  role: PlatformMessage['role'],
  order: number,
  html: string,
  timestamp: number | null,
): PlatformMessage {
  const element = document.createElement('article');
  element.innerHTML = html;
  document.body.append(element);
  return {
    platform: 'chatgpt',
    conversationId: 'conversation',
    messageId: `message-${order}`,
    runtimeMessageId: `${role}:${order}`,
    role,
    plainText: element.textContent ?? '',
    html: element.innerHTML,
    timestamp,
    timestampSource: timestamp === null ? 'unknown' : 'platform',
    element,
    order,
  };
}

function exportMessages(): PlatformMessage[] {
  return [
    message('user', 0, '<p>Build &amp; explain this.</p>', Date.UTC(2026, 0, 2, 3, 4, 5)),
    message(
      'assistant',
      1,
      '<p data-content-type="reasoning">I will run Python first.</p><section data-testid="code-interpreter"><pre><code class="language-python">print(42)</code></pre><p>Tool output: 42</p></section><p><strong>Final answer</strong></p>',
      Date.UTC(2026, 0, 2, 3, 4, 6),
    ),
    message('tool', 2, '<p>Private tool trace</p>', null),
  ];
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('conversation export formats', () => {
  it('keeps full readable content in standard Markdown', () => {
    const serialized = serializeConversation(
      'markdown-standard',
      'Export test',
      'https://chatgpt.com/c/conversation',
      exportMessages(),
      Date.UTC(2026, 0, 2),
    );

    expect(serialized.extension).toBe('md');
    expect(serialized.content).toContain('I will run Python first.');
    expect(serialized.content).toContain('```python\nprint(42)\n```');
    expect(serialized.content).toContain('Tool output: 42');
    expect(serialized.content).toContain('## Tool');
    expect(serialized.content).toContain('2026-01-02T03:04:06.000Z');
  });

  it.each(['markdown-simple', 'json-simple', 'html-simple'] as const)(
    'keeps only simplified user/final-answer content for %s',
    (format) => {
      const serialized = serializeConversation(
        format,
        'Export test',
        'https://chatgpt.com/c/conversation',
        exportMessages(),
        Date.UTC(2026, 0, 2),
      );

      expect(serialized.content).toContain('Build &');
      expect(serialized.content).toContain('Final answer');
      expect(serialized.content).toContain('2026-01-02T03:04:05.000Z');
      expect(serialized.content).not.toContain('I will run Python first.');
      expect(serialized.content).not.toContain('print(42)');
      expect(serialized.content).not.toContain('Tool output: 42');
      expect(serialized.content).not.toContain('Private tool trace');
    },
  );

  it('exports complete normalized visible-message JSON without claiming private API mapping', () => {
    const serialized = serializeConversation(
      'json-standard',
      'Export test',
      'https://chatgpt.com/c/conversation',
      exportMessages(),
      Date.UTC(2026, 0, 2),
    );
    const parsed = JSON.parse(serialized.content) as {
      source: string;
      messages: Array<{ role: string; content: { markdown: string } }>;
    };

    expect(parsed.source).toBe('visible-page-normalized');
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages[1].content.markdown).toContain('print(42)');
  });
});

describe('ChatGPT top-bar export control', () => {
  it('finds the visible Share control and inserts a working adjacent download button', async () => {
    document.body.innerHTML =
      '<header><button aria-label="Share conversation">Share</button></header>';
    const share = screen.getByRole('button', { name: 'Share conversation' });
    expect(findChatGptShareControl(document)).toBe(share);
    const messages = exportMessages();
    const adapter = {
      getMessages: vi.fn().mockResolvedValue(messages),
      getCurrentConversation: vi.fn().mockResolvedValue({
        platform: 'chatgpt',
        accountScopeId: 'anonymous',
        conversationId: 'conversation',
        url: 'https://chatgpt.com/c/conversation',
        title: 'Top bar export',
        createdAt: null,
        updatedAt: null,
      }),
      getCurrentAccountScope: vi.fn().mockResolvedValue('anonymous'),
      id: 'chatgpt',
    } as unknown as UserBoundPlatformAdapter;
    let downloadedFilename = '';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download;
    });
    vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue({ ok: true, value: {} });

    const { unmount } = render(
      <ChatGptExportButton
        adapter={adapter}
        enabled
        format="json-simple"
        label="Download conversation"
        successLabel="Export created"
        errorLabel="Export failed"
      />,
    );
    const download = await screen.findByRole('button', { name: 'Download conversation' });
    expect(share.nextElementSibling).toBe(download);
    fireEvent.click(download);

    await waitFor(() => expect(downloadedFilename).toBe('Top bar export.json'));
    expect(adapter.getMessages).toHaveBeenCalledOnce();
    unmount();
    expect(screen.queryByRole('button', { name: 'Download conversation' })).toBeNull();
  });
});
