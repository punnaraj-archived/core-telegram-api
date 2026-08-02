# MAGGA-001 — Telegram Perspective Fabric Design

**Document ID:** PUNNARAJ-TELEGRAM-PERSPECTIVE-001  
**Version:** 0.1.0  
**Status:** Design baseline for implementation study  
**Owner authority:** Wisut Punnaraj  
**Recorded by:** MAGGA-001  
**Repository:** `punnaraj-dev/core-telegram-api`  
**Date:** 2026-08-02

## 1. Purpose

This document defines a first design baseline for using Telegram as more than a message relay.

The intended system is a controllable conversation fabric in which two working nodes can communicate while a third perspective observes, reflects, questions, and preserves a durable trace of the process.

The goal is not merely to deliver messages or produce a correct final answer. The goal is to preserve the chain of action that moves a starting condition toward an intended outcome:

- what each node observed;
- how each node interpreted the situation;
- which assumptions appeared;
- which alternatives were considered;
- what action was selected;
- what changed after the action;
- what uncertainty remained;
- and how the shared direction was maintained or corrected.

The implementation process itself is part of the study. Design, coding, review, correction, and documentation must remain visible as one continuous chain rather than being reduced to a final implementation artifact.

## 2. Core design intention

Telegram must not be treated only as transport.

It may become a third perspective in a two-node interaction when intelligence is attached to the conversation surface. Telegram supplies the event stream, identity surface, message order, reply relationships, topics, files, and interaction controls. A separate reasoning component supplies interpretation.

The design therefore separates four things that must not be confused:

1. **Telegram platform** — external communication domain.
2. **Telegram transport endpoint** — controlled interface for receiving and sending events.
3. **Perspective capability** — reasoning that can notice another angle without becoming a judge or permanent gate.
4. **Trace capability** — durable recording of observations, interpretations, actions, and remaining uncertainty.

Telegram does not become intelligent by itself. The system gives a Telegram-connected endpoint the ability to form and express a perspective.

## 3. Design principles

### 3.1 Flow inside a frame

The system must support continuous work inside a defined frame. Verification is not intended to become a sequence of dams that stop the work after every step.

The perspective component should participate during work:

- consult;
- reflect;
- surface ambiguity;
- propose an alternate view;
- notice authority drift;
- and help preserve the trace.

It should interrupt only when continuing without clarification could reverse the intended direction, cross an authority boundary, or create a difficult-to-reverse cost for an uninvolved party.

### 3.2 Perspective, not verdict

The third point exists to create dimensionality, not to declare a winner.

It should be capable of saying:

- Node A appears to mean one thing while Node B is responding to another.
- Both nodes are relying on the same untested assumption.
- A cost is being transferred to someone outside the conversation.
- The proposed action is consistent with the stated goal but not with the underlying intention.
- Another path exists and has not yet been considered.

It must distinguish observation from interpretation and interpretation from decision.

### 3.3 Trace over isolated output

A report, message, commit, or implementation has value because it belongs to a visible chain of action. It does not become authoritative merely because it exists.

Each meaningful interaction should be able to leave a trace containing:

- source event identifiers;
- logical participants;
- observed content;
- interpretation;
- alternative perspective;
- selected action;
- resulting state;
- unresolved uncertainty;
- and provenance links.

### 3.4 Logical identity before physical location

Nodes may be referred to by logical identity rather than by physical location.

A participant may be `node-a`, `node-b`, `MAGGA-001`, or another declared role without exposing whether it runs on a Mac mini, cloud runtime, container, or external provider.

Physical provenance must still be recoverable by authorized operators. Logical abstraction must not destroy traceability.

### 3.5 Authority is explicit and bounded

The perspective component may observe, reflect, question, challenge, mediate, or act only according to the authority granted for that conversation.

Suggested capability levels:

| Level | Capability |
| --- | --- |
| `observe` | Receive events and write internal trace only |
| `reflect` | Publish a neutral restatement or detected ambiguity |
| `question` | Ask for missing context or expose an assumption |
| `challenge` | Offer a materially different interpretation or path |
| `mediate` | Help two nodes reconcile meanings or next actions |
| `act` | Call another endpoint within an explicitly granted scope |

The level may differ by chat, topic, workflow, and phase.

### 3.6 Root authority is not the normal runtime identity

A super-admin or root representative may be required during bootstrap to create bot identities, configure webhooks, establish service credentials, assign scopes, and create recovery paths.

That authority should establish the service boundary and then leave normal operation. Routine work should use dedicated service identities and conversation-scoped authority.

## 4. Proposed architecture

```text
Node A MCP ─────┐
                │
                ▼
        Telegram Transport MCP
                │
                ▼
        Conversation Event Stream
                │
        ┌───────┴────────┐
        ▼                ▼
Perspective MCP      Trace / Knowledge MCP
        │                │
        └───────┬────────┘
                ▼
        Telegram Transport MCP
                │
                ▼
Node A MCP / Node B MCP / Human operator
```

### 4.1 Telegram Transport MCP

Responsibilities:

- receive Telegram updates;
- send, reply to, edit, and react to messages;
- retrieve chat, topic, user, and file metadata;
- normalize Telegram events into the internal event contract;
- map Telegram identifiers to logical conversation identifiers;
- enforce allowed chat and bot scopes;
- expose transport status and failure evidence;
- avoid performing semantic interpretation.

It holds the Telegram bot credential or connects to the local Telegram Bot API server. Other components should not need direct possession of the bot token.

### 4.2 Perspective MCP

Responsibilities:

- read normalized conversation events;
- maintain bounded conversation context;
- identify ambiguity, assumption, divergence, hidden cost, and missing perspective;
- create reflections and questions;
- decide whether to remain silent or intervene according to declared behavior;
- return structured perspective events rather than untraceable prose alone;
- avoid becoming the canonical source of truth.

### 4.3 Trace / Knowledge MCP

Responsibilities:

- preserve the action chain outside Telegram;
- retain source message identifiers and timestamps;
- store observation separately from interpretation;
- connect conversation traces to design documents, commits, issues, and runtime evidence;
- make the history queryable by later agents;
- export records in durable, open formats;
- avoid replacing original source events with summaries.

### 4.4 Node endpoints

Each participating node should expose a controlled endpoint rather than requiring unrestricted entry into its internal domain.

A node may provide:

- declared identity and role;
- current task state;
- requests for consultation;
- proposed actions;
- evidence references;
- action results;
- and remaining uncertainty.

The node does not need to disclose its physical location unless the operation requires it.

## 5. Conversation event contract

Initial normalized event shape:

```yaml
event_id: evt-20260802-000001
conversation_id: conv-telegram-000001
source_surface: telegram
source_chat_id: "..."
source_topic_id: "..."
source_message_id: "..."
logical_sender: node-a
sender_type: human | agent | service
reply_to_event_id: evt-20260802-000000
observed_at: "2026-08-02T21:36:00+07:00"
content_type: text | document | image | command | status
content: "..."
attachments: []
provenance:
  transport: telegram-bot-api
  bot_identity: "..."
  runtime_identity: "..."
  original_event_retained: true
authority:
  conversation_role: participant
  allowed_actions:
    - reply
    - request_context
trace_state:
  observation_recorded: true
  interpretation_recorded: false
```

The contract must preserve Telegram identifiers without making downstream components depend directly on Telegram's native object model.

## 6. Perspective event contract

```yaml
perspective_event_id: psp-20260802-000001
conversation_id: conv-telegram-000001
basis:
  source_event_ids:
    - evt-20260802-000000
    - evt-20260802-000001
mode: reflect | question | challenge | mediate | act
observation: "What is directly present in the source events."
interpretation: "What the perspective component believes may be happening."
alternative_view: "A materially different angle or explanation."
reason_for_intervention: "Why silence was no longer the preferred action."
proposed_next_action: "Optional next movement, not an automatic command."
uncertainty:
  - "What remains unknown."
authority_used:
  level: question
  scope: conv-telegram-000001
output:
  publish_to_telegram: true
  durable_trace_required: true
```

Observation and interpretation must remain separate fields.

## 7. Intervention behavior

The perspective component should normally remain quiet while the conversation is coherent and moving within the declared intention.

Possible intervention triggers:

- the same word is used with materially different meanings;
- two nodes reach agreement without testing a shared assumption;
- an action may reverse the declared intention;
- authority appears to expand without an explicit grant;
- an external party may inherit a cost without participating in the choice;
- evidence and interpretation are being merged;
- a proposed action is difficult to reverse;
- one node requests another perspective;
- the process is losing its trace.

These are signals for judgment, not a rigid checklist that must halt every flow.

## 8. Current repository baseline

The repository already contains:

- the Telegram Bot API server source;
- an MCP wrapper exposing a small subset of Telegram Bot API methods;
- encrypted stdio transport using static peer keypairs;
- an MCP Google bridge using the same encrypted transport;
- CI builds for the MCP packages.

The present Telegram MCP wrapper is a thin transport adapter. It does not yet contain the conversation, perspective, intervention, multi-peer, or durable trace capabilities defined here.

## 9. Required implementation increments

The coding agent should not attempt the entire system in one jump. Each increment must leave a readable implementation and decision trace.

### Increment 1 — Event normalization

- Add Telegram update normalization.
- Define stable event types.
- Preserve original Telegram identifiers.
- Add tests using recorded fixtures.
- Do not add model inference yet.

### Increment 2 — Conversation identity and routing

- Introduce logical conversation IDs.
- Map chats and topics to declared node relationships.
- Add explicit allowed-chat configuration.
- Record routing decisions.

### Increment 3 — Trace writer

- Write append-only JSONL or Markdown trace records.
- Separate observation, interpretation, action, and uncertainty.
- Link traces to Telegram message IDs.
- Keep the storage adapter replaceable.

### Increment 4 — Perspective interface

- Define the Perspective MCP tools and resource shapes.
- Start with deterministic reflection and question requests.
- Keep model provider integration behind an adapter.
- Require structured output matching the perspective event contract.

### Increment 5 — Bounded intervention

- Add conversation-scoped behavior levels.
- Add explicit intervention reasons.
- Preserve silence as a valid action.
- Record every intervention and the authority used.

### Increment 6 — Multi-node encrypted routing

- Replace the present single-peer assumption with an explicit peer registry or a controlled router.
- Keep identity, key ownership, rotation, and revocation visible.
- Do not reuse one super-admin credential as the permanent identity of all nodes.

### Increment 7 — Telegram interaction expansion

Add only methods required by the working flow, likely including:

- reply to message;
- edit message;
- reactions;
- document upload and retrieval;
- topic creation and topic routing;
- webhook health;
- chat member and permission inspection.

## 10. Study method

This work is an implementation study, not a race to produce the fastest code.

The coding agent should expose its problem-solving path through durable artifacts:

- starting-state note;
- interpretation of the design;
- implementation plan;
- alternatives considered;
- changes made;
- tests performed;
- failures and corrections;
- unresolved questions;
- final state and next handoff.

The result of an action may be correct or incorrect. What matters for the study is that the action chain remains visible enough to understand why the result occurred and how the next agent should continue.

Different agents may experience the process as competition because each attempts to move from the same starting point toward a working result. The project must treat this as comparative observation, not winner selection. Differences in decomposition, caution, invention, error recovery, and trace quality are evidence.

## 11. Evaluation dimensions

The implementation should later be reviewed across these dimensions:

- **Intention:** Did the work preserve the intended direction?
- **Intonation:** Did the system express uncertainty and authority honestly?
- **Interaction:** Did components consult and respond without becoming gates?
- **Interpretation:** Were observations kept separate from derived meaning?
- **Introspection:** Did the agent notice and record its own uncertainty or correction?
- **Inspection:** Can another agent reconstruct the action chain from evidence?
- **Authority:** Was every action performed within a visible grant?
- **Cost transfer:** Were costs or risks pushed onto uninvolved parties?
- **Trace durability:** Can the record survive the current runtime and provider?

## 12. Non-goals for the first implementation

The first implementation is not intended to:

- create an autonomous judge;
- replace human authority;
- infer hidden identity without evidence;
- expose physical node location unnecessarily;
- make Telegram the canonical knowledge store;
- give the perspective component unrestricted tool access;
- implement every Telegram API method;
- prove that the architecture is correct before it has been observed in use.

## 13. Initial coding-agent handoff

The coding agent should begin with Increment 1 and Increment 2 only unless implementation evidence shows that a small adjacent change is necessary.

Before writing code, it should inspect the current `mcp-server` package and produce a short starting-state record describing:

- current tools;
- current transport assumptions;
- current peer model;
- current configuration surface;
- current test coverage;
- and the smallest change that can introduce normalized conversation events without breaking existing tools.

The coding agent should preserve backward compatibility for the current Telegram MCP tools unless it records a concrete reason not to.

## 14. Open questions

- Should perspective state be maintained per chat, topic, declared workflow, or all three?
- Which store should hold the first durable trace: repository files, Box, local append-only storage, or a dedicated endpoint?
- Should model inference run locally, through a provider endpoint, or through a replaceable broker?
- How should peer key rotation and revocation work when the current transport assumes one static peer?
- Which Telegram Bot API methods are the minimum needed for a useful perspective flow?
- When should a perspective be published to the shared conversation versus retained only as internal trace?
- How should a human operator override, silence, or narrow the perspective component during a live conversation?

## 15. Current decision

Proceed by documenting and implementing small increments, reviewing each increment with the owner, and preserving the work process as evidence.

Testing of the complete multi-node system will begin only after the minimum structural components exist:

- normalized conversation events;
- logical node identity;
- bounded perspective interface;
- durable trace output;
- explicit authority behavior;
- and controlled routing between participating endpoints.
