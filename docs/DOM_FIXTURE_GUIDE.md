# DOM Fixture Guide

Live platform adapters are intentionally blocked until real DOM evidence is available. Provide a separate sanitized fixture for ChatGPT, Claude, Gemini, DeepSeek, Grok, and Kimi.

## Capture requirements

For each platform, capture DOM fragments for:

- An empty composer and a composer containing plain text plus a selection.
- The visible send button in disabled and enabled states.
- A conversation containing at least one user and one assistant message.
- A message with code, if the platform renders code differently.
- The smallest stable conversation root.
- The sidebar and conversation-list root, if present.
- The page before and after one SPA conversation route change.
- Any stable `data-*`, ARIA role, accessible name, or semantic element attributes.

Also record the browser, platform URL origin, UI language, login state (signed in or anonymous only), and capture date.

## Required sanitization

Remove or replace all:

- Names, email addresses, avatars, account/workspace identifiers, and billing details.
- Real prompt and response content.
- Conversation/message identifiers embedded in URLs or attributes.
- Tokens, cookies, headers, authorization values, and API payloads.
- Uploaded-file names and personal metadata.

Keep only enough structural context to test detection and parsing. Use stable placeholders such as `conversation-redacted`, `message-user-1`, and `Example prompt`.

## What not to provide

Do not provide credentials, browser profiles, cookies, network archives containing private headers, or private API endpoint documentation. The implementation will not use private API interception.

## Acceptance route

Each fixture will be placed under `tests/fixtures/platform-dom/<platform>/`. An adapter may expose a capability only after its fixture tests cover positive detection, missing DOM, write behavior, route change, and duplicate-injection safety, followed by manual validation on the real site.
