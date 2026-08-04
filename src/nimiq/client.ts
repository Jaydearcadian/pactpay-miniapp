import { init } from '@nimiq/mini-app-sdk';
import { buildAcceptanceMessage, type AcceptanceRecord } from './acceptance';

const SESSION_KEY = 'pactpay-nimiq-account';

function providerErrorMessage(value: unknown): string {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'description']) {
      if (typeof record[key] === 'string' && record[key]) return record[key];
    }
  }
  return 'Nimiq Pay returned an unexpected response.';
}

async function getNimiqProvider() {
  try {
    return await init({ timeout: 10_000 });
  } catch {
    throw new Error('Open PactPay inside Nimiq Pay to use the wallet. A normal browser does not provide Nimiq wallet access.');
  }
}

function rememberAccount(account: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, account);
    window.dispatchEvent(new CustomEvent('pactpay:wallet-connected', { detail: account }));
  } catch {
    // The account remains usable for the current action.
  }
}

export function getConnectedNimiqAccount(): string {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

export async function connectNimiq(): Promise<string> {
  const nimiq = await getNimiqProvider();
  const response = await nimiq.listAccounts();
  if (!Array.isArray(response)) throw new Error(providerErrorMessage(response));

  const account = response[0];
  if (typeof account !== 'string' || !account) throw new Error('No Nimiq account was selected.');
  rememberAccount(account);
  return account;
}

export async function signContributionAcceptance(input: {
  contributionId: string;
  outcomeId: string;
  termsHash: string;
}): Promise<AcceptanceRecord> {
  const nimiq = await getNimiqProvider();
  const accounts = await nimiq.listAccounts();
  if (!Array.isArray(accounts)) throw new Error(providerErrorMessage(accounts));

  const contributorAddress = accounts[0];
  if (typeof contributorAddress !== 'string' || !contributorAddress) {
    throw new Error('No Nimiq account was selected for this acceptance.');
  }

  const acceptedAt = new Date().toISOString();
  const intent = {
    contributionId: input.contributionId,
    outcomeId: input.outcomeId,
    termsHash: input.termsHash,
    contributorAddress,
    acceptedAt,
  };
  const message = buildAcceptanceMessage(intent);
  const signed = await nimiq.sign(message);

  if (!signed || typeof signed !== 'object') throw new Error(providerErrorMessage(signed));
  const { publicKey, signature } = signed as { publicKey?: unknown; signature?: unknown };
  if (typeof publicKey !== 'string' || !publicKey || typeof signature !== 'string' || !signature) {
    throw new Error('Nimiq Pay did not return a valid acceptance signature.');
  }

  rememberAccount(contributorAddress);
  return {
    version: 1,
    network: 'nimiq',
    ...intent,
    message,
    publicKey,
    signature,
  };
}

export async function sendNim(input: {
  recipient: string;
  amountNim: number;
  contributionId: string;
  evidenceHash: string;
}): Promise<string> {
  if (!input.recipient.trim()) throw new Error('A contributor Nimiq address is required.');
  if (!Number.isFinite(input.amountNim) || input.amountNim <= 0) throw new Error('The NIM amount must be greater than zero.');

  const nimiq = await getNimiqProvider();
  const data = `PACTPAY|${input.contributionId.slice(0, 8)}|${input.evidenceHash.slice(0, 20)}`.slice(0, 64);
  const response = await nimiq.sendBasicTransactionWithData({
    recipient: input.recipient.trim(),
    value: Math.round(input.amountNim * 100_000),
    data,
  });

  if (typeof response !== 'string' || !response) throw new Error(providerErrorMessage(response));
  return response;
}
