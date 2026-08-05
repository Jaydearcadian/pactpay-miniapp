import type { AcceptanceRecord, AcceptanceVerification } from '../domain/model';
import {
  assertAcceptanceRecordMatches,
  buildAcceptanceMessage,
  type AcceptanceIntent,
} from './acceptance';
import { deriveNimiqAddress, normalizeNimiqAddress } from './address';

const NIMIQ_SIGNED_MESSAGE_PREFIX = '\x16Nimiq Signed Message:\n';

function rpcUrl(): string {
  const configured = import.meta.env.VITE_NIMIQ_RPC_URL;
  if (typeof configured !== 'string' || !configured.trim()) {
    throw new Error('Nimiq acceptance verification is not configured. Set VITE_NIMIQ_RPC_URL and redeploy.');
  }
  return configured.trim();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeEncodedBytes(value: string, expectedLength: number, label: string): Uint8Array {
  const trimmed = value.trim();
  const hex = trimmed.replace(/^0x/iu, '');
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

async function verifySigningSemantics(
  canonicalMessage: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<{
  signatureValid: boolean;
  signingSemantics: AcceptanceVerification['signingSemantics'];
}> {
  const rawValid = await rpcVerifySignature(canonicalMessage, publicKeyHex, signatureHex, false);
  if (rawValid) return { signatureValid: true, signingSemantics: 'raw-message' };

  const prefixedPayload = `${NIMIQ_SIGNED_MESSAGE_PREFIX}${canonicalMessage.length}${canonicalMessage}`;
  const prefixedHash = await sha256Hex(prefixedPayload);
  const prefixedValid = await rpcVerifySignature(prefixedHash, publicKeyHex, signatureHex, true);
  return {
    signatureValid: prefixedValid,
    signingSemantics: 'nimiq-prefixed-sha256',
  };
}

export async function verifyAcceptanceProof(
  record: AcceptanceRecord | undefined,
  expected: AcceptanceIntent,
): Promise<AcceptanceRecord> {
  const matched = assertAcceptanceRecordMatches(record, expected);
  const canonicalMessage = buildAcceptanceMessage(expected);
  const messageMatches = matched.message === canonicalMessage;
  if (!messageMatches) {
    throw new Error('The signed acceptance message does not match the canonical PactPay message.');
  }

  const publicKeyBytes = decodeEncodedBytes(matched.publicKey, 32, 'public key');
  const signatureBytes = decodeEncodedBytes(matched.signature, 64, 'signature');
  const publicKeyHex = bytesToHex(publicKeyBytes);
  const signatureHex = bytesToHex(signatureBytes);

  const derivedAddress = deriveNimiqAddress(publicKeyHex);
  const addressMatchesPublicKey = normalizeNimiqAddress(derivedAddress)
    === normalizeNimiqAddress(expected.contributorAddress);
  if (!addressMatchesPublicKey) {
    throw new Error('The acceptance public key does not belong to the claimed contributor address.');
  }

  const signature = await verifySigningSemantics(canonicalMessage, publicKeyHex, signatureHex);
  if (!signature.signatureValid) {
    throw new Error('The contributor acceptance signature is not cryptographically valid.');
  }

  const verification: AcceptanceVerification = {
    messageMatches,
    signatureValid: true,
    addressMatchesPublicKey: true,
    derivedAddress,
    canonicalMessageHash: await sha256Hex(canonicalMessage),
    signingSemantics: signature.signingSemantics,
    verifier: 'nimiq-rpc+core-address-v1',
    verifiedAt: new Date().toISOString(),
  };

  return {
    ...matched,
    publicKey: publicKeyHex,
    signature: signatureHex,
    verification,
  };
}
