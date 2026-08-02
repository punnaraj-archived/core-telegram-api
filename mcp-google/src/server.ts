#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { E2eeSession, keyPairFromSecretKey } from "./crypto/e2ee.js";
import { EncryptedStdioTransport } from "./transport/encryptedStdioTransport.js";
import { GoogleClient } from "./googleClient.js";
import { registerGoogleTools } from "./tools/register.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const localKeyPair = keyPairFromSecretKey(config.localSecretKey);
  const session = new E2eeSession(localKeyPair, config.peerPublicKey);

  const google = new GoogleClient(config);

  const server = new McpServer({
    name: "mcp-google",
    version: "0.1.0",
  });
  registerGoogleTools(server, google);

  const transport = new EncryptedStdioTransport(session);
  await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);

  process.stderr.write("mcp-google: ready (end-to-end encrypted stdio transport)\n");
}

main().catch((err) => {
  process.stderr.write(`mcp-google: fatal error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
