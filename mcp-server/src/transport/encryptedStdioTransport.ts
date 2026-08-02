// An MCP Transport that speaks newline-delimited JSON over stdio, exactly
// like the SDK's built-in StdioServerTransport, except every JSON-RPC
// message is wrapped in an E2eeSession envelope before it hits the wire and
// unwrapped on the way back in. This lets a Telegram Bot API MCP server
// exchange tool calls/results with a remote MCP peer over a channel that
// isn't itself trusted (e.g. piped through an untrusted relay or proxy),
// because only the two parties holding the matching keypairs can read the
// traffic.
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createInterface, type Interface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { E2eeSession, isEncryptedEnvelope, type EncryptedEnvelope } from "../crypto/e2ee.js";

export interface Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

export class EncryptedStdioTransport implements Transport {
  private readline?: Interface;
  private started = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private readonly session: E2eeSession,
    private readonly input: Readable = process.stdin,
    private readonly output: Writable = process.stdout,
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      throw new Error("EncryptedStdioTransport already started");
    }
    this.started = true;

    this.readline = createInterface({ input: this.input, terminal: false });
    this.readline.on("line", (line) => this.handleLine(line));
    this.readline.on("close", () => this.onclose?.());
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!isEncryptedEnvelope(parsed)) {
        throw new Error("Received a plaintext/malformed frame on an end-to-end encrypted transport; refusing to process it");
      }
      const message = this.session.open(parsed as EncryptedEnvelope) as JSONRPCMessage;
      this.onmessage?.(message);
    } catch (err) {
      this.onerror?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const envelope = this.session.seal(message);
    const line = JSON.stringify(envelope);
    await new Promise<void>((resolve, reject) => {
      this.output.write(line + "\n", (err) => (err ? reject(err) : resolve()));
    });
  }

  async close(): Promise<void> {
    this.readline?.close();
  }
}
