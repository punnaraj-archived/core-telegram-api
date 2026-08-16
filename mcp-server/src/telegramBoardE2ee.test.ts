import assert from "node:assert/strict";
import test from "node:test";
import { E2eeSession, generateKeyPair } from "./crypto/e2ee.js";
import { decodeTelegramBoardMessage, encodeTelegramBoardMessage, TELEGRAM_BOARD_E2EE_PREFIX } from "./telegramBoardE2ee.js";

function peers() {
  const a = generateKeyPair();
  const b = generateKeyPair();
  return {
    sender: new E2eeSession(a, b.publicKey),
    receiver: new E2eeSession(b, a.publicKey),
  };
}

test("Telegram receives a versioned ciphertext payload, not plaintext", () => {
  const { sender, receiver } = peers();
  const plaintext = "agent-control-message";
  const encoded = encodeTelegramBoardMessage(sender, plaintext);
  assert.ok(encoded.startsWith(TELEGRAM_BOARD_E2EE_PREFIX));
  assert.equal(encoded.includes(plaintext), false);
  assert.equal(decodeTelegramBoardMessage(receiver, encoded), plaintext);
});

test("plain Telegram text is rejected by the encrypted board decoder", () => {
  const { receiver } = peers();
  assert.throws(() => decodeTelegramBoardMessage(receiver, "hello"), /not an RAOS-E2EE/);
});

test("oversized encrypted board payload is rejected before Telegram send", () => {
  const { sender } = peers();
  assert.throws(() => encodeTelegramBoardMessage(sender, "x".repeat(5000)), /exceeds/);
});
