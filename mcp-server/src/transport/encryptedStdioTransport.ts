// An MCP Transport that speaks newline-delimited JSON over stdio, exactly
// like the SDK's built-in StdioServerTransport, except every JSON-RPC
// message is wrapped in an E2eeSession envelope before it hits the wire.
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createInterface, type Interface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { E2eeSession, isEncryptedEnvelope } from "../crypto/e2ee.js";

export interface Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

const DEFAULT_MAX_FRAME_BYTES = 1024 * 1024;

export class EncryptedStdioTransport implements Transport {
  private readline?: Interface;
  private started = false;
  private closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private readonly session: E2eeSession,
    private readonly input: Readable = process.stdin,
    private readonly output: Writable = process.stdout,
    private readonly maxFrameBytes = DEFAULT_MAX_FRAME_BYTES,
  ) {
    if (!Number.isSafeInteger(maxFrameBytes) || maxFrameBytes < 1024) {
      throw new Error("maxFrameBytes must be a safe integer of at least 1024 bytes");
    }
  }

  async start(): Promise<void> {
    if (this.started) throw new Error("EncryptedStdioTransport already started");
    if (this.closed) throw new Error("EncryptedStdioTransport is closed");
    this.started = true;

    this.readline = createInterface({ input: this.input, terminal: false });
    this.readline.on("line", (line) => this.handleLine(line));
    this.readline.on("close", () => {
      if (!this.closed) {
        this.closed = true;
        this.onclose?.();
      }
    });
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    try {
      if (Buffer.byteLength(trimmed, "utf8") > this.maxFrameBytes) {
        throw new Error(`Encrypted MCP frame exceeds ${this.maxFrameBytes} byte limit`);
      }
      const parsed: unknown = JSON.parse(trimmed);
      if (!isEncryptedEnvelope(parsed)) {
        throw new Error("Received a plaintext/malformed frame on an end-to-end encrypted transport; refusing to process it");
      }
      const message = this.session.open(parsed) as JSONRPCMessage;
      this.onmessage?.(message);
    } catch (err) {
      this.onerror?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.started || this.closed) throw new Error("EncryptedStdioTransport is not open");
    const envelope = this.session.seal(message);
    const line = JSON.stringify(envelope);
    if (Buffer.byteLength(line, "utf8") > this.maxFrameBytes) {
      throw new Error(`Encrypted MCP frame exceeds ${this.maxFrameBytes} byte limit`);
    }
    await new Promise<void>((resolve, reject) => {
      this.output.write(line + "\n", (err) => (err ? reject(err) : resolve()));
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.readline?.close();
    this.onclose?.();
  }
}
