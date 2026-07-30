#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  printf 'Missing contracts/.env. Copy .env.example and fill it locally.\n' >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${SEPOLIA_RPC_URL:?SEPOLIA_RPC_URL is required}"
: "${DEPLOYER_ACCOUNT:?DEPLOYER_ACCOUNT is required}"
: "${DEPLOYER_ADDRESS:?DEPLOYER_ADDRESS is required}"

CHAIN_ID="$(cast chain-id --rpc-url "$SEPOLIA_RPC_URL")"
if [[ "$CHAIN_ID" != "11155111" ]]; then
  printf 'Refusing to deploy: expected Sepolia chain ID 11155111, received %s.\n' "$CHAIN_ID" >&2
  exit 1
fi

KEYSTORE_ADDRESS="$(cast wallet address --account "$DEPLOYER_ACCOUNT")"
if [[ "${KEYSTORE_ADDRESS,,}" != "${DEPLOYER_ADDRESS,,}" ]]; then
  printf 'Refusing to deploy: account %s resolves to %s, expected %s.\n' \
    "$DEPLOYER_ACCOUNT" "$KEYSTORE_ADDRESS" "$DEPLOYER_ADDRESS" >&2
  exit 1
fi

BALANCE_WEI="$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$SEPOLIA_RPC_URL")"

printf 'Network: Sepolia (%s)\n' "$CHAIN_ID"
printf 'Account: %s\n' "$DEPLOYER_ACCOUNT"
printf 'Deployer: %s\n' "$DEPLOYER_ADDRESS"
printf 'Balance: %s wei\n' "$BALANCE_WEI"

if [[ "$BALANCE_WEI" == "0" ]]; then
  printf 'Refusing to deploy: deployer has no Sepolia ETH for gas.\n' >&2
  exit 1
fi

forge script script/DeploySepolia.s.sol:DeploySepolia \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --account "$DEPLOYER_ACCOUNT" \
  --sender "$DEPLOYER_ADDRESS" \
  --broadcast \
  -vvvv

printf '\nBroadcast complete. Inspect:\n'
printf '  %s/broadcast/DeploySepolia.s.sol/11155111/run-latest.json\n' "$ROOT_DIR"
