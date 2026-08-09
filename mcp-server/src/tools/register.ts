import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { E2eeSession } from "../crypto/e2ee.js";
import type { TelegramClient } from "../telegramClient.js";
import { decodeTelegramBoardMessage, encodeTelegramBoardMessage } from "../telegramBoardE2ee.js";

export interface TelegramToolPolicy {
  allowPlaintextSend?: boolean;
}

/** Registers a focused set of Telegram Bot API methods as MCP tools. */
export function registerTelegramTools(
  server: McpServer,
  telegram: TelegramClient,
  boardSession: E2eeSession,
  policy: TelegramToolPolicy = {},
): void {
  server.registerTool(
    "telegram_get_me",
    {
      title: "Get bot info",
      description: "Fetch basic information about the bot account (getMe).",
      inputSchema: {},
    },
    async () => textResult(await telegram.call("getMe")),
  );

  server.registerTool(
    "telegram_send_e2ee_message",
    {
      title: "Send an end-to-end encrypted Telegram board message",
      description:
        "Encrypt message content at the application layer before calling Telegram sendMessage. Telegram receives only a versioned ciphertext envelope.",
      inputSchema: {
        chat_id: z.union([z.string(), z.number()]).describe("Target chat id or @username"),
        text: z.string().min(1).max(2500).describe("Plaintext to encrypt for the configured MCP peer"),
        reply_to_message_id: z.number().int().optional(),
      },
    },
    async (args) => {
      const encryptedText = encodeTelegramBoardMessage(boardSession, args.text);
      return textResult(
        await telegram.call("sendMessage", {
          chat_id: args.chat_id,
          text: encryptedText,
          reply_to_message_id: args.reply_to_message_id,
        }),
      );
    },
  );

  server.registerTool(
    "telegram_decrypt_e2ee_message",
    {
      title: "Decrypt an end-to-end encrypted Telegram board message",
      description: "Authenticate and decrypt an RAOS-E2EE/1 Telegram board payload from the configured MCP peer.",
      inputSchema: {
        text: z.string().min(1),
      },
    },
    async ({ text }) => textResult({ text: decodeTelegramBoardMessage(boardSession, text) }),
  );

  // Plaintext sending is deliberately absent by default. It can be enabled
  // only as an explicit compatibility exception in configuration.
  if (policy.allowPlaintextSend) {
    server.registerTool(
      "telegram_send_message",
      {
        title: "Send a plaintext Telegram message (compatibility mode)",
        description: "Send plaintext through Telegram. Disabled by default because it bypasses board-level E2EE.",
        inputSchema: {
          chat_id: z.union([z.string(), z.number()]).describe("Target chat id or @username"),
          text: z.string().min(1).max(4096),
          parse_mode: z.enum(["MarkdownV2", "HTML", "Markdown"]).optional(),
          reply_to_message_id: z.number().int().optional(),
        },
      },
      async (args) => textResult(await telegram.call("sendMessage", args)),
    );
  }

  server.registerTool(
    "telegram_get_updates",
    {
      title: "Get updates",
      description: "Poll for new updates sent to the bot (getUpdates).",
      inputSchema: {
        offset: z.number().int().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        timeout: z.number().int().min(0).max(60).optional(),
      },
    },
    async (args) => textResult(await telegram.call("getUpdates", args)),
  );

  server.registerTool(
    "telegram_get_chat",
    {
      title: "Get chat",
      description: "Fetch up to date information about a chat (getChat).",
      inputSchema: {
        chat_id: z.union([z.string(), z.number()]),
      },
    },
    async (args) => textResult(await telegram.call("getChat", args)),
  );

  server.registerTool(
    "telegram_set_webhook",
    {
      title: "Set webhook",
      description: "Register an HTTPS webhook URL to receive updates (setWebhook).",
      inputSchema: {
        url: z.string().url().refine((value) => value.startsWith("https://"), "Webhook URL must use HTTPS"),
        secret_token: z.string().min(1).max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),
      },
    },
    async (args) => textResult(await telegram.call("setWebhook", args)),
  );

  server.registerTool(
    "telegram_delete_webhook",
    {
      title: "Delete webhook",
      description: "Remove the currently configured webhook (deleteWebhook).",
      inputSchema: {
        drop_pending_updates: z.boolean().optional(),
      },
    },
    async (args) => textResult(await telegram.call("deleteWebhook", args)),
  );
}

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}
