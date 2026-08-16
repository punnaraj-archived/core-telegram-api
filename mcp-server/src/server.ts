#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { E2eeSession, keyPairFromSecretKey } from "./crypto/e2ee.js";
import { EncryptedStdioTransport } from "./transport/encryptedStdioTransport.js";
import { TelegramClient } from "./telegramClient.js";
import { registerTelegramTools } from "./tools/register.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const localKeyPair = keyPairFromSecretKey(config.localSecretKey);
  const session = new E2eeSession(localKeyPair, config.peerPublicKey);

  const telegram = new TelegramClient({
    baseUrl: config.telegramBaseUrl,
    token: config.telegramToken,
  });

  const server = new McpServer({
    name: "telegram-bot-api-mcp-server",
    version: "0.1.0",
  });
  registerTelegramTools(server, telegram, session, {
    allowPlaintextSend: config.allowPlaintextTelegramSend,
  });

  const transport = new EncryptedStdioTransport(session);
  await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);

  process.stderr.write(
    `telegram-bot-api-mcp-server: ready (E2EE MCP transport; Telegram board plaintext send ${
      config.allowPlaintextTelegramSend ? "ENABLED by explicit compatibility override" : "disabled"
    })\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`telegram-bot-api-mcp-server: fatal error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
