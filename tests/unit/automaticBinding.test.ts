import { afterEach, describe, expect, it } from 'vitest';

import {
  discoverAutomaticBinding,
  discoverAutomaticMessages,
} from '../../src/platforms/base/AutomaticBinding';

afterEach(() => {
  document.body.innerHTML = '';
});

function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      left: 100,
      right: 700,
      top: 500,
      bottom: 560,
      width: 600,
      height: 60,
      x: 100,
      y: 500,
      toJSON: () => ({}),
      ...rect,
    }),
  });
}

describe('discoverAutomaticBinding', () => {
  it('detects a high-confidence composer and nearby semantic send button', () => {
    document.body.innerHTML = `
      <form id="chat-form">
        <textarea id="prompt-box" placeholder="Message the AI"></textarea>
        <button id="send-button" type="submit" aria-label="Send message">Send</button>
      </form>
    `;
    setRect(document.querySelector('#prompt-box')!, {});
    setRect(document.querySelector('#send-button')!, {
      left: 710,
      right: 750,
      top: 510,
      bottom: 550,
      width: 40,
      height: 40,
    });

    expect(discoverAutomaticBinding(document)).toMatchObject({
      composerSelector: '#prompt-box',
      sendButtonSelector: '#send-button',
    });
  });

  it('does not guess when two composer candidates have similar confidence', () => {
    document.body.innerHTML = `
      <textarea id="first" placeholder="Message the AI"></textarea>
      <textarea id="second" placeholder="Message the AI"></textarea>
    `;

    expect(discoverAutomaticBinding(document)).toBeNull();
  });

  it('ignores a search field and low-confidence generic inputs', () => {
    document.body.innerHTML = `
      <textarea id="search" aria-label="Search conversations"></textarea>
      <input id="generic" type="text" />
    `;

    expect(discoverAutomaticBinding(document)).toBeNull();
  });

  it('supports plaintext-only rich composers and a disabled semantic send button', () => {
    document.body.innerHTML = `
      <form>
        <div id="rich-composer" contenteditable="plaintext-only" aria-label="输入消息"></div>
        <button id="send" type="submit" aria-label="发送" disabled></button>
      </form>
    `;
    setRect(document.querySelector('#rich-composer')!, {});
    setRect(document.querySelector('#send')!, { width: 40, height: 40 });

    expect(discoverAutomaticBinding(document)).toMatchObject({
      composerSelector: '#rich-composer',
      sendButtonSelector: '#send',
    });
  });

  it('discovers repeated semantic prompt and response elements while ignoring the sidebar', () => {
    document.body.innerHTML = `
      <aside><div class="query-text">Search result, not a prompt</div></aside>
      <main>
        <section class="user-query"><p>First prompt</p></section>
        <section class="model-response"><p>First answer</p></section>
        <section class="user-query"><p>Second prompt</p></section>
        <section class="model-response"><p>Second answer</p></section>
      </main>
      <form>
        <textarea id="prompt-box" placeholder="Message the AI"></textarea>
        <button type="submit" aria-label="Send message">Send</button>
      </form>
    `;

    expect(discoverAutomaticMessages(document)).toMatchObject({
      userMessageSelector: '.user-query',
      assistantMessageSelector: '.model-response',
    });
    expect(discoverAutomaticBinding(document)).toMatchObject({
      userMessageSelector: '.user-query',
      assistantMessageSelector: '.model-response',
    });
  });

  it('does not treat user profile or search-query chrome as conversation prompts', () => {
    document.body.innerHTML = `
      <main>
        <div class="user-profile">Account owner</div>
        <div class="user-avatar">CY</div>
        <div class="search-query">Search conversations</div>
      </main>
    `;

    expect(discoverAutomaticMessages(document)).toBeNull();
  });

  it('recognizes localized semantic role attributes without reading message bodies as selectors', () => {
    document.body.innerHTML = `
      <main>
        <article data-message-role="用户"><p>问题正文</p></article>
        <article data-message-role="助手"><p>回答正文</p></article>
      </main>
    `;

    expect(discoverAutomaticMessages(document)).toMatchObject({
      userMessageSelector: '[data-message-role="用户"]',
      assistantMessageSelector: '[data-message-role="助手"]',
    });
  });
});
