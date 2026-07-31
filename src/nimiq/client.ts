import { init } from '@nimiq/mini-app-sdk';

function providerErrorMessage(value: unknown): string {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'description']) {
      if (typeof record[key] === 'string' && record[key]) return record[key];
    }
  }
  return 'Nimiq Pay returned an unexpected response.';
}

export async function connectNimiq(): Promise<string> {
  const nimiq = await init({ timeout: 10_000 });
  const response = await nimiq.listAccounts();
  if (!Array.isArray(response)) throw new Error(providerErrorMessage(response));
  const account = response[0];
  if (typeof account !== 'string' || !account) throw new Error('No Nimiq account was selected.');
  return account;
}

export async function sendNim(input: {
  recipient: string;
  amountNim: number;
  contributionId: string;
  evidenceHash: string;
}): Promise<string> {
  if (!input.recipient.trim()) throw new Error('A contributor Nimiq address is required.');
  if (!Number.isFinite(input.amountNim) || input.amountNim <= 0) throw new Error('The NIM amount must be greater than zero.');

  const nimiq = await init({ timeout: 10_000 });
  const data = `PACTPAY|${input.contributionId.slice(0, 8)}|${input.evidenceHash.slice(0, 20)}`.slice(0, 64);
  const response = await nimiq.sendBasicTransactionWithData({
    recipient: input.recipient.trim(),
    value: Math.round(input.amountNim * 100_000),
    data,
  });

  if (typeof response !== 'string' || !response) throw new Error(providerErrorMessage(response));
  return response;
}
