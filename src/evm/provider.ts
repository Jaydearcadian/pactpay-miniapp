import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type EIP1193Provider,
} from 'viem';
import { PACTPAY_CHAIN, PACTPAY_CHAIN_ID_HEX } from './config';

export const publicClient = createPublicClient({
  chain: PACTPAY_CHAIN,
  transport: http(),
});

export function getInjectedProvider(): EIP1193Provider {
  if (!window.ethereum) throw new Error('No injected EVM wallet was found.');
  return window.ethereum;
}

export async function ensureSepolia(provider = getInjectedProvider()): Promise<void> {
  const currentChainId = await provider.request({ method: 'eth_chainId' });
  if (currentChainId === PACTPAY_CHAIN_ID_HEX) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: PACTPAY_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? Number((error as { code: unknown }).code)
      : undefined;

    if (code !== 4902) throw error;

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: PACTPAY_CHAIN_ID_HEX,
        chainName: PACTPAY_CHAIN.name,
        nativeCurrency: PACTPAY_CHAIN.nativeCurrency,
        rpcUrls: PACTPAY_CHAIN.rpcUrls.default.http,
        blockExplorerUrls: PACTPAY_CHAIN.blockExplorers
          ? [PACTPAY_CHAIN.blockExplorers.default.url]
          : undefined,
      }],
    });
  }
}

export async function connectEvmWallet(): Promise<Address> {
  const provider = getInjectedProvider();
  await ensureSepolia(provider);
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
    throw new Error('The EVM wallet returned no account.');
  }
  return accounts[0] as Address;
}

export function getWalletClient(provider = getInjectedProvider()) {
  return createWalletClient({
    chain: PACTPAY_CHAIN,
    transport: custom(provider),
  });
}
