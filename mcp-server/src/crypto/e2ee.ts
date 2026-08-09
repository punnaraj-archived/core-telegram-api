// End-to-end encryption for MCP messages exchanged with a remote peer.
//
// Uses NaCl's authenticated-encryption "box" construction
// (Curve25519 for key agreement, XSalsa20 for the stream cipher, Poly1305
// for the MAC). Every message is sealed with the sender's static secret key
// and the recipient's static public key plus a fresh random nonce, so
// messages are both confidential and authenticated as coming from the
// holder of the peer's secret key. Keys are exchanged out-of-band (see
// keygen.ts / README.md) — this module never transmits a secret key.
import nacl from "tweetnacl";

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncryptedEnvelope {
  /** Protocol version, so future changes can be detected instead of silently misparsed. */
  v: 1;
  /** Base64-encoded sender public key, so the recipient can identify/authenticate the peer. */
  senderPublicKey: string;
  /** Base64-encoded 24-byte nonce. */
  nonce: string;
  /** Base64-encoded ciphertext. */
  ciphertext: string;
}

const DEFAULT_REPLAY_WINDOW = 4096;

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function keyPairFromSecretKey(secretKey: Uint8Array): KeyPair {
  if (secretKey.length !== nacl.box.secretKeyLength) {
    throw new Error(`Invalid local secret key length: expected ${nacl.box.secretKeyLength} bytes, got ${secretKey.length}`);
  }
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function decodeBase64(b64: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) {
    throw new Error("Invalid base64 encoding");
  }
  const bytes = new Uint8Array(Buffer.from(b64, "base64"));
  if (encodeBase64(bytes) !== b64) {
    throw new Error("Non-canonical base64 encoding");
  }
  return bytes;
}

/**
 * A session bound to exactly one remote peer's public key. The shared secret
 * is precomputed once (nacl.box.before) rather than re-derived per message.
 *
 * A bounded replay window remembers recently accepted nonces. This does not
 * provide forward secrecy, but it prevents a captured valid frame from being
 * accepted twice during the lifetime of this session.
 */
export class E2eeSession {
  private readonly sharedKey: Uint8Array;
  private readonly seenNonces = new Set<string>();
  private readonly nonceOrder: string[] = [];

  constructor(
    private readonly localKeyPair: KeyPair,
    private readonly remotePublicKey: Uint8Array,
    private readonly replayWindow = DEFAULT_REPLAY_WINDOW,
  ) {
    if (localKeyPair.publicKey.length !== nacl.box.publicKeyLength) {
      throw new Error("Invalid local public key length");
    }
    if (localKeyPair.secretKey.length !== nacl.box.secretKeyLength) {
      throw new Error("Invalid local secret key length");
    }
    if (remotePublicKey.length !== nacl.box.publicKeyLength) {
      throw new Error("Invalid remote public key length");
    }
    if (!Number.isSafeInteger(replayWindow) || replayWindow < 1) {
      throw new Error("Replay window must be a positive safe integer");
    }
    this.sharedKey = nacl.box.before(remotePublicKey, localKeyPair.secretKey);
  }

  seal(plaintext: unknown): EncryptedEnvelope {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const message = Buffer.from(JSON.stringify(plaintext), "utf8");
    const ciphertext = nacl.box.after(message, nonce, this.sharedKey);
    return {
      v: 1,
      senderPublicKey: encodeBase64(this.localKeyPair.publicKey),
      nonce: encodeBase64(nonce),
      ciphertext: encodeBase64(ciphertext),
    };
  }

  open(envelope: EncryptedEnvelope): unknown {
    if (envelope.v !== 1) {
      throw new Error(`Unsupported envelope version: ${String((envelope as { v: unknown }).v)}`);
    }

    const senderPublicKey = decodeBase64(envelope.senderPublicKey);
    if (senderPublicKey.length !== nacl.box.publicKeyLength || !constantTimeEqual(senderPublicKey, this.remotePublicKey)) {
      throw new Error("Envelope sender public key does not match the configured peer; refusing to decrypt");
    }

    const nonce = decodeBase64(envelope.nonce);
    if (nonce.length !== nacl.box.nonceLength) {
      throw new Error(`Invalid nonce length: expected ${nacl.box.nonceLength} bytes, got ${nonce.length}`);
    }
    const nonceId = envelope.nonce;
    if (this.seenNonces.has(nonceId)) {
      throw new Error("Replay detected: nonce has already been accepted in this session");
    }

    const ciphertext = decodeBase64(envelope.ciphertext);
    if (ciphertext.length < nacl.box.overheadLength) {
      throw new Error("Ciphertext is too short to contain an authenticated NaCl box");
    }

    const plaintext = nacl.box.open.after(ciphertext, nonce, this.sharedKey);
    if (plaintext === null) {
      throw new Error("Failed to authenticate/decrypt message: it was tampered with, corrupted, or sealed by the wrong key");
    }

    // Record only authenticated frames. Invalid frames cannot poison the replay cache.
    this.rememberNonce(nonceId);

    try {
      return JSON.parse(Buffer.from(plaintext).toString("utf8"));
    } catch {
      throw new Error("Decrypted payload is not valid JSON");
    }
  }

  private rememberNonce(nonceId: string): void {
    this.seenNonces.add(nonceId);
    this.nonceOrder.push(nonceId);
    while (this.nonceOrder.length > this.replayWindow) {
      const oldest = this.nonceOrder.shift();
      if (oldest !== undefined) this.seenNonces.delete(oldest);
    }
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).v === 1 &&
    typeof (value as Record<string, unknown>).senderPublicKey === "string" &&
    typeof (value as Record<string, unknown>).nonce === "string" &&
    typeof (value as Record<string, unknown>).ciphertext === "string"
  );
}
