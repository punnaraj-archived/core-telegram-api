// Thin wrapper around a running Telegram Bot API server (this repository's
// C++ server, or https://api.telegram.org). The E2EE layer protects the MCP
// conversation; this client independently requires HTTPS for remote Bot API
// endpoints through config validation.
export interface TelegramClientOptions {
  /** Base URL of the Bot API server, e.g. "http://localhost:8081" or "https://api.telegram.org". */
  baseUrl: string;
  /** Bot token, as issued by @BotFather. */
  token: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
}

export class TelegramApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly errorCode: number | undefined,
    description: string,
  ) {
    super(`Telegram Bot API method "${method}" failed${errorCode ? ` (${errorCode})` : ""}: ${description}`);
    this.name = "TelegramApiError";
  }
}

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(options: TelegramClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 120_000) {
      throw new Error("Telegram client timeout must be an integer between 1 and 120000 ms");
    }
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(method)) {
      throw new Error("Invalid Telegram Bot API method name");
    }

    const url = `${this.baseUrl}/bot${this.token}/${method}`;
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) body[key] = value;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new TelegramApiError(method, undefined, err instanceof Error ? err.message : "network request failed");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new TelegramApiError(method, response.status, "server returned a non-JSON response");
    }

    if (!isTelegramResponse<T>(payload)) {
      throw new TelegramApiError(method, response.status, "server returned an invalid Bot API response shape");
    }

    if (!response.ok || !payload.ok) {
      throw new TelegramApiError(method, payload.error_code ?? response.status, payload.description ?? "unknown error");
    }
    if (!("result" in payload)) {
      throw new TelegramApiError(method, response.status, "successful response omitted result");
    }
    return payload.result as T;
  }
}

function isTelegramResponse<T>(value: unknown): value is {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.ok === "boolean" &&
    (record.error_code === undefined || typeof record.error_code === "number") &&
    (record.description === undefined || typeof record.description === "string")
  );
}
