import {
  isAddress,
  keccak256,
  parseUnits,
  toBytes,
  type Address,
  type Hex,
} from 'viem';
import {
  MAX_REVIEW_PERIOD_SECONDS,
  MIN_REVIEW_PERIOD_SECONDS,
  PACTPAY_ESCROW_ADDRESS,
  PUSDC_ADDRESS,
  PUSDC_DECIMALS,
} from './config';
import { erc20Abi, escrowAbi } from './contracts';
import { ensureSepolia, getWalletClient, publicClient } from './provider';

export type EscrowPosition = {
  balance: bigint;
  allowance: bigint;
};

export type FundContributionInput = {
  coordinator: Address;
  contributor: Address;
  resolver: Address;
  contributionId: Hex;
  outcomeId: Hex;
  termsHash: Hex;
  amount: bigint;
  deliveryDeadline: bigint;
  reviewPeriod: number;
};

export function hashIdentifier(value: string): Hex {
  return keccak256(toBytes(value));
}

export function parsePusdc(value: string): bigint {
  return parseUnits(value, PUSDC_DECIMALS);
}

export async function readEscrowPosition(owner: Address): Promise<EscrowPosition> {
  const [balance, allowance] = await Promise.all([
    publicClient.readContract({
      address: PUSDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }),
    publicClient.readContract({
      address: PUSDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, PACTPAY_ESCROW_ADDRESS],
    }),
  ]);

  return { balance, allowance };
}

export async function approveEscrow(owner: Address, amount: bigint): Promise<Hex> {
  if (amount <= 0n) throw new Error('Approval amount must be greater than zero.');
  await ensureSepolia();

  const walletClient = getWalletClient();
  const { request } = await publicClient.simulateContract({
    account: owner,
    address: PUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [PACTPAY_ESCROW_ADDRESS, amount],
  });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function fundContribution(input: FundContributionInput): Promise<Hex> {
  if (!isAddress(input.coordinator) || !isAddress(input.contributor) || !isAddress(input.resolver)) {
    throw new Error('Coordinator, contributor and resolver must be valid EVM addresses.');
  }
  if (input.amount <= 0n) throw new Error('Contribution amount must be greater than zero.');
  if (input.deliveryDeadline <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error('Delivery deadline must be in the future.');
  }
  if (input.reviewPeriod < MIN_REVIEW_PERIOD_SECONDS || input.reviewPeriod > MAX_REVIEW_PERIOD_SECONDS) {
    throw new Error('Review period must be between one hour and 30 days.');
  }

  await ensureSepolia();
  const walletClient = getWalletClient();
  const { request } = await publicClient.simulateContract({
    account: input.coordinator,
    address: PACTPAY_ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: 'createAndFundContribution',
    args: [{
      contributionId: input.contributionId,
      outcomeId: input.outcomeId,
      termsHash: input.termsHash,
      contributor: input.contributor,
      resolver: input.resolver,
      token: PUSDC_ADDRESS,
      amount: input.amount,
      deliveryDeadline: input.deliveryDeadline,
      reviewPeriod: input.reviewPeriod,
    }],
  });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
