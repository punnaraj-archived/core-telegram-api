# Telegram Bot API MCP Server

An [MCP](https://modelcontextprotocol.io) server that exposes a subset of the
[Telegram Bot API](https://core.telegram.org/bots/api) (as served by this
repository's `telegram-bot-api` server, or by `api.telegram.org`) as MCP
tools, and communicates with its peer over an **end-to-end encrypted**
transport rather than plain stdio.

## Why encrypted transport

MCP normally runs over plain stdio or HTTP/SSE between a client and server
that already trust their local machine's process boundary. Here the two
sides may be different agents/processes that don't share that trust (e.g.
this server's stdio is piped through a relay, container boundary, or network
link you don't fully control). `EncryptedStdioTransport`
(`src/transport/encryptedStdioTransport.ts`) wraps every JSON-RPC message in
a [NaCl `box`](https://nacl.cr.yp.to/box.html) envelope — Curve25519 key
agreement, XSalsa20 encryption, Poly1305 authentication — so only the two
parties holding the matching keypair can read or forge traffic on that pipe,
regardless of what the transport in between is.

This is peer-to-peer, pre-shared-key encryption: each server instance is
configured with exactly one remote peer's public key and refuses to decrypt
envelopes signed by any other key.

## Setup

1. Install dependencies and build:

   ```sh
   npm install
   npm run build
   ```

2. Generate a keypair for this node:

   ```sh
   npm run keygen
   ```

   This prints an `MCP_LOCAL_SECRET_KEY` (keep private) and an
   `MCP_PUBLIC_KEY` (share with your peer).

3. Exchange public keys with the MCP peer you'll be talking to, out-of-band
   (each side runs `npm run keygen` and sends the other its `MCP_PUBLIC_KEY`
   line only — never the secret key).

4. Copy `.env.example` to `.env` and fill in:
   - `TELEGRAM_BOT_API_URL` — your `telegram-bot-api` server, or
     `https://api.telegram.org`.
   - `TELEGRAM_BOT_TOKEN` — your bot's token from @BotFather.
   - `MCP_LOCAL_SECRET_KEY` — from step 2.
   - `MCP_PEER_PUBLIC_KEY` — the public key your peer gave you in step 3.

5. Run the server:

   ```sh
   npm start
   ```

   It speaks newline-delimited, encrypted JSON-RPC over stdio, so it's
   launched by an MCP client the same way any stdio MCP server is — the
   client must be configured with the *matching* keypair (its own secret
   key, and this server's public key as its peer key) to talk to it.

## Available tools

| Tool | Telegram Bot API method |
| --- | --- |
| `telegram_get_me` | `getMe` |
| `telegram_send_message` | `sendMessage` |
| `telegram_get_updates` | `getUpdates` |
| `telegram_get_chat` | `getChat` |
| `telegram_set_webhook` | `setWebhook` |
| `telegram_delete_webhook` | `deleteWebhook` |

Add more by calling `server.registerTool(...)` in `src/tools/register.ts`;
each tool just forwards to `TelegramClient.call(method, params)`.

## Design notes

- `src/crypto/e2ee.ts` — the `E2eeSession` class: precomputes a shared key
  via `nacl.box.before`, then seals/opens individual messages with a fresh
  random nonce each time. Envelopes carry the sender's public key so the
  receiver can verify it matches the configured peer before attempting to
  decrypt (constant-time compare), rather than trusting whatever nonce/key
  shows up on the wire.
- `src/transport/encryptedStdioTransport.ts` — implements the same
  `Transport` shape as the MCP SDK's built-in `StdioServerTransport`, so it
  drops into `McpServer.connect()` unchanged; only the wire format differs
  (JSON envelope instead of raw JSON-RPC).
- `src/telegramClient.ts` — plain HTTP client for the Bot API. Deliberately
  not part of the E2E layer: the bot token's secrecy is the server operator's
  responsibility (env var / secret store), while the E2E layer protects the
  *MCP conversation* about what calls to make.

## Security notes

- This scheme provides confidentiality and authenticity between two parties
  who have already exchanged public keys through a trusted channel. It does
  **not** perform any additional identity verification (no CA, no
  out-of-band fingerprint check) — verify the public key you receive really
  came from your intended peer.
- There is no forward secrecy: keys are static and long-lived. Rotate them
  (re-run `npm run keygen`, re-exchange, update env vars) periodically or if
  either secret key may have been exposed.
- Never commit `.env` or a real `MCP_LOCAL_SECRET_KEY` to version control.
