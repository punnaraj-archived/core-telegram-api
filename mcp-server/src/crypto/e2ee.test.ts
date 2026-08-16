import assert from "node:assert/strict";
import test from "node:test";
import { E2eeSession, decodeBase64, encodeBase64, generateKeyPair } from "./e2ee.js";

function sessions() {
  const a = generateKeyPair();
  const b = generateKeyPair();
  return {
    sender: new E2eeSession(a, b.publicKey),
    receiver: new E2eeSession(b, a.publicKey),
  };
}

test("round trip", () => {
  const { sender, receiver } = sessions();
  const value = { jsonrpc: "2.0", id: 1, method: "tools/list" };
  assert.deepEqual(receiver.open(sender.seal(value)), value);
});

test("duplicate authenticated frame is rejected", () => {
  const { sender, receiver } = sessions();
  const frame = sender.seal({ id: 1 });
  receiver.open(frame);
  assert.throws(() => receiver.open(frame), /Replay detected/);
});

test("modified ciphertext is rejected", () => {
  const { sender, receiver } = sessions();
  const frame = sender.seal({ id: 2 });
  const bytes = decodeBase64(frame.ciphertext);
  bytes[bytes.length - 1] ^= 1;
  assert.throws(() => receiver.open({ ...frame, ciphertext: encodeBase64(bytes) }), /authenticate\/decrypt/);
});

test("wrong peer key is rejected", () => {
  const a = generateKeyPair();
  const b = generateKeyPair();
  const c = generateKeyPair();
  const sender = new E2eeSession(c, b.publicKey);
  const receiver = new E2eeSession(b, a.publicKey);
  assert.throws(() => receiver.open(sender.seal({ id: 3 })), /configured peer/);
});

test("malformed base64 is rejected", () => {
  assert.throws(() => decodeBase64("not base64!"), /Invalid base64/);
});
