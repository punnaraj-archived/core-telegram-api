import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TelegramClient } from "../telegramClient.js";

/** Registers a focused set of Telegram Bot API methods as MCP tools. */
export function registerTelegramTools(server: McpServer, telegram: TelegramClient): void {
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
    "telegram_send_message",
    {
      title: "Send a Telegram message",
      description: "Send a text message to a chat (sendMessage).",
      inputSchema: {
        chat_id: z.union([z.string(), z.number()]).describe("Target chat id or @username"),
        text: z.string().describe("Message text"),
        parse_mode: z.enum(["MarkdownV2", "HTML", "Markdown"]).optional(),
        reply_to_message_id: z.number().int().optional(),
      },
    },
    async (args) => textResult(await telegram.call("sendMessage", args)),
  );

  server.registerTool(
    "telegram_get_updates",
    {
      title: "Get updates",
      description: "Poll for new updates sent to the bot (getUpdates).",
      inputSchema: {
        offset: z.number().int().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        timeout: z.number().int().min(0).optional(),
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
      description: "Register a webhook URL to receive updates (setWebhook).",
      inputSchema: {
        url: z.string().url(),
        secret_token: z.string().optional(),
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
