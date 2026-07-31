import type { Address } from 'viem';
import { sepolia } from 'viem/chains';

export const PACTPAY_CHAIN = sepolia;
export const PACTPAY_CHAIN_ID_HEX = '0xaa36a7' as const;

export const PUSDC_ADDRESS = '0x543b3e6038D10d92648D529200C432f8FdAB63e3' satisfies Address;
export const PACTPAY_ESCROW_ADDRESS = '0x3F7fc504AC9096C2fFb28ef32D85d08B1034f3a6' satisfies Address;

export const PUSDC_DECIMALS = 6;
export const MIN_REVIEW_PERIOD_SECONDS = 60 * 60;
export const MAX_REVIEW_PERIOD_SECONDS = 30 * 24 * 60 * 60;
