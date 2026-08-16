import { E2eeSession, isEncryptedEnvelope } from "./crypto/e2ee.js";

export const TELEGRAM_BOARD_E2EE_PREFIX = "RAOS-E2EE/1:";
export const TELEGRAM_MAX_TEXT_BYTES = 4096;

interface BoardPayload {
  kind: "telegram-board-message";
  body: string;
}

/**
 * Encrypt a board message before it is handed to Telegram. Telegram receives
 * only the versioned ciphertext envelope; the intended MCP peer decrypts it
 * with the separately exchanged peer key.
 */
export function encodeTelegramBoardMessage(session: E2eeSession, body: string): string {
  const payload: BoardPayload = { kind: "telegram-board-message", body };
  const encoded = TELEGRAM_BOARD_E2EE_PREFIX + JSON.stringify(session.seal(payload));
  if (Buffer.byteLength(encoded, "utf8") > TELEGRAM_MAX_TEXT_BYTES) {
    throw new Error(`Encrypted Telegram board message exceeds ${TELEGRAM_MAX_TEXT_BYTES} byte text limit`);
  }
  return encoded;
}

/** Decrypt and validate a Telegram board payload received from the configured peer. */
export function decodeTelegramBoardMessage(session: E2eeSession, text: string): string {
  if (!text.startsWith(TELEGRAM_BOARD_E2EE_PREFIX)) {
    throw new Error("Telegram board message is not an RAOS-E2EE/1 encrypted payload");
  }
  const raw = text.slice(TELEGRAM_BOARD_E2EE_PREFIX.length);
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error("Encrypted Telegram board payload is not valid JSON");
  }
  if (!isEncryptedEnvelope(envelope)) {
    throw new Error("Encrypted Telegram board payload has an invalid envelope shape");
  }
  const payload = session.open(envelope);
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as Record<string, unknown>).kind !== "telegram-board-message" ||
    typeof (payload as Record<string, unknown>).body !== "string"
  ) {
    throw new Error("Decrypted Telegram board payload has an invalid message shape");
  }
  return (payload as BoardPayload).body;
}
