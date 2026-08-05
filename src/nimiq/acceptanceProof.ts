import type { AcceptanceRecord, AcceptanceVerification } from '../domain/model';
import { buildAcceptanceMessage, type AcceptanceIntent } from './acceptance';

const DEFAULT_RPC_URL = 'https://rpc.nimiqwatch.com';
const MASK_64 = (1n << 64n) - 1n;
const NIMIQ_BASE32 = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

const BLAKE2B_IV = [
  0x6a09e667f3bcc908n,
  0xbb67ae8584caa73bn,
  0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n,
  0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn,
  0x5be0cd19137e2179n,
] as const;

const BLAKE2B_SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
] as const;

function rpcUrl(): string {
  const configured = import.meta.env.VITE_NIMIQ_RPC_URL;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_RPC_URL;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeEncodedBytes(value: string, expectedLength: number, label: string): Uint8Array {
  const trimmed = value.trim();
  const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  let bytes: Uint8Array;

  if (/^[0-9a-f]+$/iu.test(hex) && hex.length % 2 === 0) {
    bytes = Uint8Array.from(hex.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
  } else {
    try {
      const normalized = trimmed.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const binary = atob(padded);
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      throw new Error(`The acceptance ${label} has an unsupported encoding.`);
    }
  }

  if (bytes.length !== expectedLength) {
    throw new Error(`The acceptance ${label} must contain exactly ${expectedLength} bytes.`);
  }
  return bytes;
}

function rotateRight(value: bigint, bits: bigint): bigint {
  return ((value >> bits) | (value << (64n - bits))) & MASK_64;
}

function readUint64LE(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let index = 0; index < 8; index += 1) {
    value |= BigInt(bytes[offset + index] ?? 0) << BigInt(index * 8);
  }
  return value;
}

function mix(
  state: bigint[],
  a: number,
  b: number,
  c: number,
  d: number,
  x: bigint,
  y: bigint,
): void {
  state[a] = (state[a] + state[b] + x) & MASK_64;
  state[d] = rotateRight(state[d] ^ state[a], 32n);
  state[c] = (state[c] + state[d]) & MASK_64;
  state[b] = rotateRight(state[b] ^ state[c], 24n);
  state[a] = (state[a] + state[b] + y) & MASK_64;
  state[d] = rotateRight(state[d] ^ state[a], 16n);
  state[c] = (state[c] + state[d]) & MASK_64;
  state[b] = rotateRight(state[b] ^ state[c], 63n);
}

function blake2b(input: Uint8Array, outputLength = 32): Uint8Array {
  if (outputLength < 1 || outputLength > 64) throw new Error('Invalid BLAKE2b output length.');

  const hash = [...BLAKE2B_IV];
  hash[0] ^= 0x01010000n ^ BigInt(outputLength);

  let offset = 0;
  let total = 0n;
  do {
    const remaining = input.length - offset;
    const blockLength = Math.min(128, Math.max(remaining, 0));
    const block = new Uint8Array(128);
    block.set(input.subarray(offset, offset + blockLength));
    total += BigInt(blockLength);

    const message = Array.from({ length: 16 }, (_, index) => readUint64LE(block, index * 8));
    const state = [...hash, ...BLAKE2B_IV];
    state[12] ^= total & MASK_64;
    state[13] ^= total >> 64n;

    const isLast = offset + blockLength >= input.length;
    if (isLast) state[14] = (~state[14]) & MASK_64;

    for (let round = 0; round < 12; round += 1) {
      const sigma = BLAKE2B_SIGMA[round % 10];
      mix(state, 0, 4, 8, 12, message[sigma[0]], message[sigma[1]]);
      mix(state, 1, 5, 9, 13, message[sigma[2]], message[sigma[3]]);
      mix(state, 2, 6, 10, 14, message[sigma[4]], message[sigma[5]]);
      mix(state, 3, 7, 11, 15, message[sigma[6]], message[sigma[7]]);
      mix(state, 0, 5, 10, 15, message[sigma[8]], message[sigma[9]]);
      mix(state, 1, 6, 11, 12, message[sigma[10]], message[sigma[11]]);
      mix(state, 2, 7, 8, 13, message[sigma[12]], message[sigma[13]]);
      mix(state, 3, 4, 9, 14, message[sigma[14]], message[sigma[15]]);
    }

    for (let index = 0; index < 8; index += 1) {
      hash[index] = hash[index] ^ state[index] ^ state[index + 8];
    }

    offset += blockLength;
    if (isLast) break;
  } while (offset < input.length);

  const output = new Uint8Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    output[index] = Number((hash[Math.floor(index / 8)] >> BigInt((index % 8) * 8)) & 0xffn);
  }
  return output;
}

function validIbanChecksum(address: string): boolean {
  const rearranged = `${address.slice(4)}${address.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const numeric = /[A-Z]/u.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function decodeNimiqAddress(address: string): Uint8Array {
  const normalized = address.toUpperCase().replace(/\s+/gu, '');
  if (normalized.length !== 36 || !normalized.startsWith('NQ') || !validIbanChecksum(normalized)) {
    throw new Error('The contributor address is not a valid Nimiq address.');
  }

  const payload = normalized.slice(4);
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of payload) {
    const value = NIMIQ_BASE32.indexOf(character);
    if (value < 0) throw new Error('The contributor address contains invalid Nimiq characters.');
    buffer = (buffer << 5) | value;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }

  if (output.length !== 20) throw new Error('The contributor address has an invalid payload length.');
  return Uint8Array.from(output);
}

function publicKeyMatchesAddress(publicKey: Uint8Array, address: string): boolean {
  const derived = blake2b(publicKey, 32).slice(0, 20);
  const claimed = decodeNimiqAddress(address);
  return derived.every((byte, index) => byte === claimed[index]);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function unwrapBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  for (const key of ['data', 'bool', 'value', 'valid', 'result']) {
    const nested = unwrapBoolean(record[key]);
    if (nested !== null) return nested;
  }
  return null;
}

async function rpcVerifySignature(
  message: string,
  publicKeyHex: string,
  signatureHex: string,
  isHex: boolean,
): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'verifySignature',
        params: [message, publicKeyHex, signatureHex, isHex],
        id: 1,
      }),
    });
  } catch {
    throw new Error('The configured Nimiq RPC endpoint could not be reached for acceptance verification.');
  }

  if (!response.ok) throw new Error(`Nimiq RPC returned HTTP ${response.status} while verifying acceptance.`);
  const body = await response.json() as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || 'Nimiq RPC rejected the signature verification request.');

  const valid = unwrapBoolean(body.result);
  if (valid === null) throw new Error('Nimiq RPC returned an unsupported signature-verification response.');
  return valid;
}

export async function verifyAcceptanceProof(
  record: AcceptanceRecord,
  expected: AcceptanceIntent,
): Promise<AcceptanceRecord> {
  const canonicalMessage = buildAcceptanceMessage(expected);
  const messageMatches = record.message === canonicalMessage;
  if (!messageMatches) throw new Error('The signed acceptance message does not match the canonical PactPay message.');

  const publicKey = decodeEncodedBytes(record.publicKey, 32, 'public key');
  const signature = decodeEncodedBytes(record.signature, 64, 'signature');
  const publicKeyHex = bytesToHex(publicKey);
  const signatureHex = bytesToHex(signature);

  let signingSemantics: AcceptanceVerification['signingSemantics'] = 'raw-message';
  let signatureValid = await rpcVerifySignature(canonicalMessage, publicKeyHex, signatureHex, false);

  if (!signatureValid) {
    const prefixed = `\x16Nimiq Signed Message:\n${canonicalMessage.length}${canonicalMessage}`;
    const digestHex = await sha256Hex(prefixed);
    signatureValid = await rpcVerifySignature(digestHex, publicKeyHex, signatureHex, true);
    signingSemantics = 'nimiq-prefixed-sha256';
  }

  if (!signatureValid) throw new Error('The contributor acceptance signature is not valid.');

  const addressMatchesPublicKey = publicKeyMatchesAddress(publicKey, expected.contributorAddress);
  if (!addressMatchesPublicKey) {
    throw new Error('The acceptance public key does not belong to the claimed contributor address.');
  }

  const verification: AcceptanceVerification = {
    messageMatches,
    signatureValid,
    addressMatchesPublicKey,
    canonicalMessageHash: await sha256Hex(canonicalMessage),
    signingSemantics,
    verifier: 'nimiq-rpc',
    verifiedAt: new Date().toISOString(),
  };

  return {
    ...record,
    publicKey: publicKeyHex,
    signature: signatureHex,
    verification,
  };
}
