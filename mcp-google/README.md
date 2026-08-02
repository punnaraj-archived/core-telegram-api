# mcp-google

An [MCP](https://modelcontextprotocol.io) server that exposes Google APIs —
Gmail, Calendar, Drive, Sheets, Docs, Tasks, People, and a generic
passthrough for anything else the granted OAuth scopes allow — as MCP
tools, authenticated as a single Google account via OAuth2. Like
[`../mcp-server`](../mcp-server), it talks to its MCP peer over an
**end-to-end encrypted** transport rather than plain stdio, using the same
NaCl-based scheme (see below).

## Setup

1. Install dependencies and build:

   ```sh
   npm install
   npm run build
   ```

2. Create a Google Cloud OAuth client:
   - In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
     create an OAuth 2.0 Client ID of type **Web application**.
   - Add `http://localhost:8085/oauth2callback` as an authorized redirect URI
     (or pick your own and set `GOOGLE_REDIRECT_URI` to match).
   - Enable the APIs you intend to use (Gmail, Calendar, Drive, Sheets,
     Docs, Tasks, People) in the same GCP project.
   - Copy `.env.example` to `.env` and fill in `GOOGLE_CLIENT_ID` /
     `GOOGLE_CLIENT_SECRET`.

3. Authorize the app against the Google account you want this server to act
   as, and obtain a refresh token:

   ```sh
   npm run oauth-setup
   ```

   This prints an authorization URL — open it, sign in, and approve access.
   The script catches the OAuth redirect on localhost and prints
   `GOOGLE_REFRESH_TOKEN=...`; put that in `.env`. The requested scopes are
   listed in `src/scopes.ts`; trim them there (and re-run `oauth-setup`) if
   you want to grant this server less than "all of the above."

4. Generate an MCP transport keypair and exchange public keys with your MCP
   peer, exactly as described in `../mcp-server/README.md`:

   ```sh
   npm run keygen
   ```

   Set `MCP_LOCAL_SECRET_KEY` (yours, private) and `MCP_PEER_PUBLIC_KEY`
   (your peer's, shared with you) in `.env`.

5. Run the server:

   ```sh
   npm start
   ```

## Available tools

| Tool | Backing API |
| --- | --- |
| `google_whoami` | People API (`people/me`) |
| `gmail_list_messages` / `gmail_get_message` / `gmail_send_message` | Gmail API |
| `calendar_list_events` / `calendar_create_event` | Calendar API |
| `drive_search_files` / `drive_get_file_metadata` | Drive API |
| `sheets_get_values` / `sheets_update_values` | Sheets API |
| `docs_get_document` | Docs API |
| `tasks_list` / `tasks_create` | Tasks API |
| `google_api_request` | Generic authorized REST call to any Google API path |

`google_api_request` is the catch-all: any Google API endpoint covered by
the granted scopes can be called directly (method, path, query params, JSON
body) without a dedicated tool.

## End-to-end encryption

Identical scheme to `../mcp-server`: `src/crypto/e2ee.ts` and
`src/transport/encryptedStdioTransport.ts` are the same NaCl `box`
(Curve25519 + XSalsa20-Poly1305) implementation, copied rather than shared
so each MCP server here stays an independently installable package. See
`../mcp-server/README.md`'s "Design notes" and "Security notes" sections —
they apply here unchanged.

## Security notes

- The OAuth refresh token and MCP secret key are both bearer credentials for
  sensitive access (your Google account's data, and this MCP peer
  relationship, respectively). Keep `.env` out of version control (already
  git-ignored) and out of logs.
- `oauth-setup` requests broad scopes by default (see `src/scopes.ts`) so
  this server can act as a general Google API bridge. Narrow the scope list
  to only what you need if you don't want a peer with MCP access to reach
  every connected service.
- Revoke access at any time from
  [Google Account permissions](https://myaccount.google.com/permissions).
