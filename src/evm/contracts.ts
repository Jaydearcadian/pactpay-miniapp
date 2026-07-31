export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const escrowAbi = [
  {
    type: 'function',
    name: 'createAndFundContribution',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'contributionId', type: 'bytes32' },
          { name: 'outcomeId', type: 'bytes32' },
          { name: 'termsHash', type: 'bytes32' },
          { name: 'contributor', type: 'address' },
          { name: 'resolver', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'acceptanceDeadline', type: 'uint64' },
          { name: 'deliveryDeadline', type: 'uint64' },
          { name: 'reviewPeriod', type: 'uint32' },
        ],
      },
    ],
    outputs: [],
  },
] as const;
