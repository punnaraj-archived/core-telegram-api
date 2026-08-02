#!/usr/bin/env node
// One-time interactive setup: runs a local HTTP server to complete a Google
// OAuth2 authorization-code flow and prints the refresh token this MCP
// server needs (GOOGLE_REFRESH_TOKEN). Requires GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET (from a Google Cloud OAuth client of type "Web
// application", with http://localhost:8085/oauth2callback registered as an
// authorized redirect URI) to already be set in the environment.
import { createServer } from "node:http";
import { google } from "googleapis";
import { GOOGLE_OAUTH_SCOPES } from "./scopes.js";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:8085/oauth2callback";

if (!clientId || !clientSecret) {
  process.stderr.write(
    "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before running oauth-setup " +
      "(create an OAuth 2.0 Client ID of type \"Web application\" in Google Cloud Console, " +
      `and register ${redirectUri} as an authorized redirect URI).\n`,
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const redirectUrl = new URL(redirectUri);
const port = Number(redirectUrl.port || 80);

const server = createServer(async (req, res) => {
  try {
    if (!req.url) return;
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== redirectUrl.pathname) {
      res.writeHead(404).end();
      return;
    }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain" }).end(`Authorization failed: ${error}`);
      process.stderr.write(`Authorization failed: ${error}\n`);
      server.close();
      process.exit(1);
      return;
    }
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" }).end("Missing authorization code");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain" }).end(
      "Authorization complete. You can close this tab and return to the terminal.",
    );

    if (!tokens.refresh_token) {
      process.stderr.write(
        "\nNo refresh_token was returned. This usually means this Google account already granted this " +
          "app consent before. Revoke access at https://myaccount.google.com/permissions and re-run this " +
          "script, or delete the app's prior grant, so Google issues a fresh refresh token.\n",
      );
      server.close();
      process.exit(1);
      return;
    }

    process.stdout.write("\nAuthorization complete. Add this to your .env:\n\n");
    process.stdout.write(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    server.close();
    process.exit(0);
  } catch (err) {
    process.stderr.write(`\nError completing OAuth flow: ${err instanceof Error ? err.message : String(err)}\n`);
    server.close();
    process.exit(1);
  }
});

server.listen(port, () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on repeat authorizations
    scope: GOOGLE_OAUTH_SCOPES,
  });

  process.stdout.write("Open this URL in a browser and authorize access with the Google account you want to use:\n\n");
  process.stdout.write(`${authUrl}\n\n`);
  process.stdout.write(`Waiting for the OAuth redirect on ${redirectUri} ...\n`);
});
