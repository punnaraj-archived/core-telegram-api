export interface Env {
  TELEGRAM_WEBHOOK_SECRET: string;
  UPSTREAM_URL?: string;
  UPSTREAM_AUTH_TOKEN?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "punnaraj-telegram-edge" });
    }

    if (request.method !== "POST" || url.pathname !== "/telegram/webhook") {
      return new Response("Not Found", { status: 404 });
    }

    const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const rawBody = await request.text();
    try {
      JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!env.UPSTREAM_URL) {
      return new Response(null, { status: 204 });
    }

    const headers = new Headers({
      "content-type": "application/json",
      "x-punnaraj-source": "telegram",
    });
    if (env.UPSTREAM_AUTH_TOKEN) {
      headers.set("authorization", `Bearer ${env.UPSTREAM_AUTH_TOKEN}`);
    }

    const upstream = await fetch(env.UPSTREAM_URL, {
      method: "POST",
      headers,
      body: rawBody,
    });

    if (!upstream.ok) {
      return json({ ok: false, upstream_status: upstream.status }, 502);
    }

    return new Response(null, { status: 204 });
  },
};
