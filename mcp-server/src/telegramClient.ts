// Thin wrapper around a running Telegram Bot API server (this repository's
// C++ server, or https://api.telegram.org) so MCP tools can call bot
// methods over plain HTTP. This is deliberately separate from the MCP
// transport encryption: the bot token already grants full control of the
// bot, so this client is expected to talk to a server on localhost or over
// TLS, while the E2eeSession protects the MCP conversation with the other
// agent asking us to make these calls.
export interface TelegramClientOptions {
  /** Base URL of the Bot API server, e.g. "http://localhost:8081" or "https://api.telegram.org". */
  baseUrl: string;
  /** Bot token, as issued by @BotFather. */
  token: string;
}

export class TelegramApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly errorCode: number | undefined,
    description: string,
  ) {
    super(`Telegram Bot API method "${method}" failed${errorCode ? ` (${errorCode})` : ""}: ${description}`);
  }
}

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: TelegramClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.baseUrl}/bot${this.token}/${method}`;
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) body[key] = value;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      result?: T;
      error_code?: number;
      description?: string;
    };

    if (!payload.ok) {
      throw new TelegramApiError(method, payload.error_code, payload.description ?? "unknown error");
    }
    return payload.result as T;
  }
}
