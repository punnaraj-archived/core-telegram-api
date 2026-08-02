# MAGGA-001 — Coding-Agent Handoff

**Target repository:** `punnaraj-dev/core-telegram-api`  
**Design authority:** `docs/design/MAGGA-001_TELEGRAM_PERSPECTIVE_FABRIC_DESIGN_v0.1.0.md`  
**Requested scope:** Increment 1 and Increment 2 only  
**Date:** 2026-08-02

## Goal

Introduce the smallest working foundation for a Telegram conversation fabric without adding model inference yet.

The implementation must produce:

1. normalized Telegram conversation events;
2. logical conversation identity and routing;
3. tests and fixtures proving the behavior;
4. durable records of the implementation process.

## Required working behavior

Before editing code, create a starting-state note containing:

- current `mcp-server` structure;
- existing Telegram tools;
- transport assumptions;
- current single-peer key relationship;
- configuration inputs;
- existing tests and missing tests;
- the proposed smallest implementation path.

Then implement:

### Increment 1 — Event normalization

- Define typed normalized events for Telegram updates.
- Preserve original chat, topic, message, sender, reply, and timestamp identifiers where available.
- Keep original raw update available by reference or optional retained payload.
- Separate transport parsing from semantic interpretation.
- Add deterministic fixtures and tests.

### Increment 2 — Conversation identity and routing

- Define logical `conversation_id` independent of physical runtime location.
- Map Telegram chats/topics to declared logical participants.
- Add an explicit allowed-chat or routing configuration surface.
- Return visible errors for unmapped or unauthorized conversations.
- Record routing decisions in a form suitable for later trace storage.

## Boundaries

Do not yet:

- call a language model;
- create an autonomous perspective agent;
- add broad Telegram API coverage unrelated to the increments;
- replace the existing encrypted transport without evidence that the increments require it;
- make Telegram the canonical record;
- remove or break the current MCP tools without a documented necessity.

## Required artifacts

Create and commit:

- starting-state record;
- implementation plan;
- source changes;
- tests and fixtures;
- implementation outcome record;
- error or correction record when applicable;
- explicit list of unresolved questions.

## Review emphasis

The owner and MAGGA-001 will inspect not only whether the code works, but how the coding agent moves from the starting state to the result.

Preserve evidence of:

- decomposition choices;
- assumptions;
- alternatives considered;
- authority and scope decisions;
- failures;
- corrections;
- and reasons for leaving work unresolved.

This is an implementation study. A wrong result with an honest, reconstructable action chain remains useful evidence. A plausible result with hidden reasoning, hidden cost, or missing provenance does not satisfy the handoff.
