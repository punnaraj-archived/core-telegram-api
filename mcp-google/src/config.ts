import { decodeBase64 } from "./crypto/e2ee.js";

export interface Config {
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;
  googleRedirectUri: string;
  localSecretKey: Uint8Array;
  peerPublicKey: Uint8Array;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Run "npm run oauth-setup" to authorize this app against ` +
        `your Google account and obtain a refresh token, and "npm run keygen" for the MCP transport keypair ` +
        `(see mcp-google/README.md).`,
    );
  }
  return value;
}

export function loadConfig(): Config {
  return {
    googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
    googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    googleRefreshToken: requireEnv("GOOGLE_REFRESH_TOKEN"),
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:8085/oauth2callback",
    localSecretKey: decodeBase64(requireEnv("MCP_LOCAL_SECRET_KEY")),
    peerPublicKey: decodeBase64(requireEnv("MCP_PEER_PUBLIC_KEY")),
  };
}
