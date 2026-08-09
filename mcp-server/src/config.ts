import nacl from "tweetnacl";
import { decodeBase64 } from "./crypto/e2ee.js";

export interface Config {
  telegramBaseUrl: string;
  telegramToken: string;
  localSecretKey: Uint8Array;
  peerPublicKey: Uint8Array;
  allowPlaintextTelegramSend: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Run "npm run keygen" to generate a keypair, ` +
        `exchange public keys with your MCP peer out-of-band, and set the required env vars ` +
        `(see mcp-server/README.md).`,
    );
  }
  return value;
}

function parseBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TELEGRAM_BOT_API_URL must be a valid absolute URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("TELEGRAM_BOT_API_URL must use http or https");
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (url.protocol === "http:" && !localHosts.has(url.hostname)) {
    throw new Error("Refusing plaintext Telegram Bot API transport to a non-local host; use HTTPS or a localhost endpoint");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function parseBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  throw new Error(`${name} must be a boolean value`);
}

export function loadConfig(): Config {
  const localSecretKey = decodeBase64(requireEnv("MCP_LOCAL_SECRET_KEY"));
  const peerPublicKey = decodeBase64(requireEnv("MCP_PEER_PUBLIC_KEY"));

  if (localSecretKey.length !== nacl.box.secretKeyLength) {
    throw new Error(`MCP_LOCAL_SECRET_KEY must decode to ${nacl.box.secretKeyLength} bytes`);
  }
  if (peerPublicKey.length !== nacl.box.publicKeyLength) {
    throw new Error(`MCP_PEER_PUBLIC_KEY must decode to ${nacl.box.publicKeyLength} bytes`);
  }

  return {
    telegramBaseUrl: parseBaseUrl(process.env.TELEGRAM_BOT_API_URL?.trim() || "https://api.telegram.org"),
    telegramToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    localSecretKey,
    peerPublicKey,
    allowPlaintextTelegramSend: parseBoolean("ALLOW_PLAINTEXT_TELEGRAM_MESSAGES", false),
  };
}
