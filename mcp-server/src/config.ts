import { decodeBase64 } from "./crypto/e2ee.js";

export interface Config {
  telegramBaseUrl: string;
  telegramToken: string;
  localSecretKey: Uint8Array;
  peerPublicKey: Uint8Array;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Run "npm run keygen" to generate a keypair, ` +
        `exchange public keys with your MCP peer out-of-band, and set the required env vars ` +
        `(see mcp-server/README.md).`,
    );
  }
  return value;
}

export function loadConfig(): Config {
  return {
    telegramBaseUrl: process.env.TELEGRAM_BOT_API_URL ?? "https://api.telegram.org",
    telegramToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    localSecretKey: decodeBase64(requireEnv("MCP_LOCAL_SECRET_KEY")),
    peerPublicKey: decodeBase64(requireEnv("MCP_PEER_PUBLIC_KEY")),
  };
}
