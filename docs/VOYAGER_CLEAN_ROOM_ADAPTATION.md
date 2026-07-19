# Voyager clean-room adaptation

## Purpose

This project learns from Voyager's publicly documented product model without using Voyager source code, CSS, selectors, icons, assets, translations, or internal implementation details. The result is an independent implementation that keeps Multi-AI Workspace's cross-platform, manual-binding, bilingual, and privacy-first constraints.

Public references reviewed on 2026-07-13 and 2026-07-14:

- [GPT-Voyager public product requirements](https://raw.githubusercontent.com/Duang777/GPT-Voyager/main/PRD.md)
- [GPT-Voyager public repository landing page](https://github.com/Duang777/GPT-Voyager)
- [Voyager product overview](https://voyager.nagi.fun/en/)
- [Plugin Marketplace](https://voyager.nagi.fun/en/plugins)
- [Conversation Fork](https://voyager.nagi.fun/en/guide/fork.html)
- [GPT-Voyager Chrome Web Store listing](https://chromewebstore.google.com/detail/gpt-voyager/ofhnmgjaffpdldimjdenjoneocicolfi?hl=en)
- [Voyager repository and GPL-3.0 license](https://github.com/Nagi-ovo/gemini-voyager)

## Public idea to independent architecture mapping

| Public product idea                               | Multi-AI Workspace implementation                                                                               | Safety difference                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A workspace made from small, focused capabilities | `PlatformAdapter` capabilities plus `FeatureRegistry` evaluation                                                | Features never rely on an unverified DOM selector                                                       |
| Selected-text shortcuts                           | A Shadow DOM action toolbar for rewrite, quote reply, conversation pins, and non-mutating persistent highlights | Quote never submits; highlight and pin anchors store offsets and a verification hash, not message text  |
| Pins inside one long conversation                 | Exact selected-range anchors with a separate dot rail, hover list, removal, and previous/next navigation        | Pins are conversation-scoped, local-only, content-free, bounded, and independent from timeline metadata |
| Page-level message navigation                     | A right-side rail generated from adapter-validated visible messages                                             | Links only call the adapter's scroll method and never change the site's route                           |
| Declarative support for other sites               | User-authorized custom origins, semantic detection, and manual correction                                       | No third-party selectors or marketplace code is imported                                                |
| Safe experimentation with branching               | Reserved adapter capabilities for native/manual fork flows                                                      | A future implementation must confirm first and must not mutate the source conversation                  |

This mapping is an architectural inference from public documentation, not a description of Voyager's internal code.

## Implemented in this iteration

1. The selected-text toolbar offers Prompt Rewrite without binding and Quote Reply only when composer write capability is validated.
2. Detected user Prompts receive a deduplicated dot rail whose summaries appear on hover or keyboard focus, and selected ranges can be highlighted without modifying host message DOM.
3. A selected range inside a response can be pinned locally; when message selectors are unavailable, an explicit-selection structure-path anchor provides the same navigation without guessing a private selector. Exact-range navigation remains separate from Prompt dots and timeline metadata, and no selected text is stored.

## Explicitly excluded

- Voyager source files, build output, CSS, selectors, icons, assets, and localized strings.
- Automatic or hidden sending of project instructions.
- Cloud storage, cross-device synchronization, or any third-party relay server.
- Rebranding or redistributing Voyager code as this project.

## Next clean-room extensions

1. Add an AI organizer loop that copies a user-reviewed organization prompt and imports a validated JSON plan; no automatic conversation upload.
2. Add manual conversation fork export with a confirmation step and explicit branch metadata.
3. Expose a declarative local module catalog for capability, permission, and data-policy inspection.

Any future change in these areas must be designed from the public behavior specification and this repository's own types and tests.
