import { blake2b } from '@noble/hashes/blake2b';
import type { AcceptanceRecord, AcceptanceVerification } from '../domain/model';
import {
  assertAcceptanceRecordMatches,
  buildAcceptanceMessage,
  type AcceptanceIntent,
} from './acceptance';

const NIMIQ_BASE32_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY';
const NIMIQ_SIGNED_MESSAGE_PREFIX = '\x16Nimiq Signed Message:\n';

function rpcUrl(): string {
  const configured = import.meta.env.VITE_NIMIQ_RPC_URL;
  if (typeof configured !== 'string' || !configured.trim()) {
    throw new Error('Nimiq acceptance verification is not configured. Set VITE_NIMIQ_RPC_URL and redeploy.');
  }
  return configured.trim();
}

function normalizeAddress(value: string): string {
  return value.replaceAll('_', '').replace(/\s+/gu, '').toUpperCase();
}

function hexToBytes(value: string, expectedLength: number, label: string): Uint8Array {
  const normalized = value.trim().replace(/^0x/iu, '');
  if (normalized.length !== expectedLength * 2 || !/^[0-9a-f]+$/iu.test(normalized)) {
    throw new Error(`${label} must be ${expectedLength} bytes encoded as hexadecimal.`);
  }

  const pairs = normalized.match(/.{2}/gu) ?? [];
  return Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function base32Encode(bytes: Uint8Array): string {
  let result = '';
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += NIMIQ_BASE32_ALPHABET[(buffer >>> bits) & 31];
      buffer &= (1 << bits) - 1;
    }
  }

  if (bits > 0) result += NIMIQ_BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return result;
}

function ibanNumeric(value: string): string {
  return Array.from(value.toUpperCase(), (character) => {
    if (/\d/u.test(character)) return character;
    const code = character.charCodeAt(0) - 55;
    if (code < 10 || code > 35) throw new Error('The generated Nimiq address contains an unsupported character.');
    return String(code);
  }).join('');
}

function mod97(value: string): number {
  let remainder = 0;
  for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder;
}

function formatUserFriendlyAddress(rawAddress: Uint8Array): string {
  if (rawAddress.length !== 20) throw new Error('A Nimiq address must contain exactly 20 bytes.');
  const bban = base32Encode(rawAddress);
  if (bban.length !== 32) throw new Error('The generated Nimiq address has an invalid base32 length.');

  const checksum = String(98 - mod97(ibanNumeric(`${bban}NQ00`))).padStart(2, '0');
  const compact = `NQ${checksum}${bban}`;
  return compact.match(/.{1,4}/gu)?.join(' ') ?? compact;
}

export function deriveNimiqAddress(publicKey: string): string {
  const publicKeyBytes = hexToBytes(publicKey, 32, 'Acceptance public key');
  const publicKeyHash = blake2b(publicKeyBytes, { dkLen: 32 });
  return formatUserFriendlyAddress(publicKeyHash.slice(0, 20));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function unwrapBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  for (const key of ['data', 'value', 'valid', 'result']) {
    const nested = unwrapBoolean(record[key]);
    if (nested !== null) return nested;
  }
  return null;
}

async function verifySignatureRpc(input: {
  message: string;
  publicKey: string;
  signature: string;
  isHex: boolean;
}): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'verifySignature',
        params: [input.message, input.publicKey, input.signature, input.isHex],
        id: 1,
      }),
    });
  } catch {
    throw new Error('The configured Nimiq RPC endpoint could not be reached for acceptance verification.');
  }

  if (!response.ok) throw new Error(`Nimiq RPC returned HTTP ${response.status} while verifying acceptance.`);
  const body = await response.json() as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || 'Nimiq RPC rejected the acceptance verification request.');

  const valid = unwrapBoolean(body.result);
  if (valid === null) throw new Error('Nimiq RPC returned an unsupported signature-verification response.');
  return valid;
}

async function verifySignatureModes(record: AcceptanceRecord, canonicalMessage: string): Promise<{
  valid: boolean;
  semantics: AcceptanceVerification['signingSemantics'];
}> {
  const rawValid = await verifySignatureRpc({
    message: canonicalMessage,
    publicKey: record.publicKey,
    signature: record.signature,
    isHex: false,
  });
  if (rawValid) return { valid: true, semantics: 'raw-message' };

  const prefixedPayload = `${NIMIQ_SIGNED_MESSAGE_PREFIX}${canonicalMessage.length}${canonicalMessage}`;
  const prefixedHash = await sha256Hex(prefixedPayload);
  const prefixedValid = await verifySignatureRpc({
    message: prefixedHash,
    publicKey: record.publicKey,
    signature: record.signature,
    isHex: true,
  });
  return { valid: prefixedValid, semantics: 'nimiq-prefixed-sha256' };
}

export async function verifyAcceptanceProof(
  record: AcceptanceRecord | undefined,
  expected: AcceptanceIntent,
): Promise<AcceptanceRecord> {
  const matched = assertAcceptanceRecordMatches(record, expected);
  const canonicalMessage = buildAcceptanceMessage(expected);
  const derivedAddress = deriveNimiqAddress(matched.publicKey);
  const addressMatchesPublicKey = normalizeAddress(derivedAddress) === normalizeAddress(expected.contributorAddress);

  if (!addressMatchesPublicKey) {
    throw new Error('The acceptance public key does not derive to the claimed contributor address.');
  }

  const signature = await verifySignatureModes(matched, canonicalMessage);
  if (!signature.valid) {
    throw new Error('The contributor acceptance signature is not cryptographically valid.');
  }

  const verification: AcceptanceVerification = {
    messageMatches: matched.message === canonicalMessage,
    signatureValid: true,
    addressMatchesPublicKey: true,
    derivedAddress,
    canonicalMessageHash: await sha256Hex(canonicalMessage),
    signingSemantics: signature.semantics,
    verifier: 'nimiq-rpc+core-address-v1',
    verifiedAt: new Date().toISOString(),
  };

  return { ...matched, verification };
}
