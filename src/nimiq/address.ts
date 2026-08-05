const MASK_64 = (1n << 64n) - 1n;

const IV = [
  0x6a09e667f3bcc908n,
  0xbb67ae8584caa73bn,
  0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n,
  0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn,
  0x5be0cd19137e2179n,
] as const;

const SIGMA = [
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
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
] as const;

const NIMIQ_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

function rotateRight(value: bigint, bits: bigint): bigint {
  return ((value >> bits) | (value << (64n - bits))) & MASK_64;
}

function readU64Le(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let index = 0; index < 8; index += 1) {
    value |= BigInt(bytes[offset + index] ?? 0) << BigInt(index * 8);
  }
  return value;
}

function writeU64Le(value: bigint, output: Uint8Array, offset: number): void {
  for (let index = 0; index < 8; index += 1) {
    output[offset + index] = Number((value >> BigInt(index * 8)) & 0xffn);
  }
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

function compress(hash: bigint[], block: Uint8Array, count: bigint, isFinal: boolean): void {
  const message = Array.from({ length: 16 }, (_, index) => readU64Le(block, index * 8));
  const state = [...hash, ...IV];
  state[12] ^= count & MASK_64;
  state[13] ^= (count >> 64n) & MASK_64;
  if (isFinal) state[14] ^= MASK_64;

  for (const permutation of SIGMA) {
    mix(state, 0, 4, 8, 12, message[permutation[0]], message[permutation[1]]);
    mix(state, 1, 5, 9, 13, message[permutation[2]], message[permutation[3]]);
    mix(state, 2, 6, 10, 14, message[permutation[4]], message[permutation[5]]);
    mix(state, 3, 7, 11, 15, message[permutation[6]], message[permutation[7]]);
    mix(state, 0, 5, 10, 15, message[permutation[8]], message[permutation[9]]);
    mix(state, 1, 6, 11, 12, message[permutation[10]], message[permutation[11]]);
    mix(state, 2, 7, 8, 13, message[permutation[12]], message[permutation[13]]);
    mix(state, 3, 4, 9, 14, message[permutation[14]], message[permutation[15]]);
  }

  for (let index = 0; index < 8; index += 1) {
    hash[index] = (hash[index] ^ state[index] ^ state[index + 8]) & MASK_64;
  }
}

export function blake2b256(input: Uint8Array): Uint8Array {
  const outputLength = 32;
  const hash = [...IV];
  hash[0] ^= 0x01010000n ^ BigInt(outputLength);

  let offset = 0;
  let count = 0n;
  while (offset + 128 < input.length) {
    const block = input.slice(offset, offset + 128);
    count += 128n;
    compress(hash, block, count, false);
    offset += 128;
  }

  const finalBlock = new Uint8Array(128);
  const remaining = input.slice(offset);
  finalBlock.set(remaining);
  count += BigInt(remaining.length);
  compress(hash, finalBlock, count, true);

  const full = new Uint8Array(64);
  hash.forEach((word, index) => writeU64Le(word, full, index * 8));
  return full.slice(0, outputLength);
}

function decodePublicKey(value: string): Uint8Array {
  const trimmed = value.trim();
  const hex = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-f]{64}$/iu.test(hex)) {
    return Uint8Array.from(hex.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
  }

  try {
    const normalized = trimmed.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (bytes.length === 32) return bytes;
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error('The Nimiq acceptance public key is not a 32-byte Ed25519 key.');
}

function encodeBase32(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);

  let output = '';
  for (let index = 0; index < 32; index += 1) {
    const shift = BigInt((31 - index) * 5);
    output += NIMIQ_ALPHABET[Number((value >> shift) & 31n)];
  }
  return output;
}

function ibanChecksum(value: string): number {
  const rearranged = `${value.slice(4)}${value.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const numeric = /[0-9]/u.test(character)
      ? character
      : String(character.toUpperCase().charCodeAt(0) - 55);
    for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

export function deriveNimiqAddress(publicKey: string): string {
  const keyBytes = decodePublicKey(publicKey);
  const addressBytes = blake2b256(keyBytes).slice(0, 20);
  const base32 = encodeBase32(addressBytes);
  const checksum = String(98 - ibanChecksum(`NQ00${base32}`)).padStart(2, '0');
  return (`NQ${checksum}${base32}`.match(/.{1,4}/gu) ?? []).join(' ');
}

export function normalizeNimiqAddress(value: string): string {
  return value.replace(/\s+/gu, '').toUpperCase();
}
