#!/usr/bin/env node
// Generates a fresh Curve25519 keypair for use with the encrypted MCP
// transport. The secret key must stay local (set as MCP_LOCAL_SECRET_KEY);
// the public key is safe to share with the peer you intend to talk to, who
// sets it as their MCP_PEER_PUBLIC_KEY (and vice versa).
import { encodeBase64, generateKeyPair } from "./crypto/e2ee.js";

const keyPair = generateKeyPair();

process.stdout.write("Generated a new Curve25519 keypair for the E2E-encrypted MCP transport.\n\n");
process.stdout.write(`MCP_LOCAL_SECRET_KEY=${encodeBase64(keyPair.secretKey)}\n`);
process.stdout.write(`# Share only the line below with your peer, who sets it as MCP_PEER_PUBLIC_KEY:\n`);
process.stdout.write(`MCP_PUBLIC_KEY=${encodeBase64(keyPair.publicKey)}\n`);
