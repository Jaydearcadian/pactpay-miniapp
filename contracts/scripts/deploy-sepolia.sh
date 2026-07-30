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
: "${DEPLOYER_PRIVATE_KEY:?DEPLOYER_PRIVATE_KEY is required}"

CHAIN_ID="$(cast chain-id --rpc-url "$SEPOLIA_RPC_URL")"
if [[ "$CHAIN_ID" != "11155111" ]]; then
  printf 'Refusing to deploy: expected Sepolia chain ID 11155111, received %s.\n' "$CHAIN_ID" >&2
  exit 1
fi

DEPLOYER="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
BALANCE_WEI="$(cast balance "$DEPLOYER" --rpc-url "$SEPOLIA_RPC_URL")"

printf 'Network: Sepolia (%s)\n' "$CHAIN_ID"
printf 'Deployer: %s\n' "$DEPLOYER"
printf 'Balance: %s wei\n' "$BALANCE_WEI"

if [[ "$BALANCE_WEI" == "0" ]]; then
  printf 'Refusing to deploy: deployer has no Sepolia ETH for gas.\n' >&2
  exit 1
fi

forge script script/DeploySepolia.s.sol:DeploySepolia \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --broadcast \
  -vvvv

printf '\nBroadcast complete. Inspect:\n'
printf '  %s/broadcast/DeploySepolia.s.sol/11155111/run-latest.json\n' "$ROOT_DIR"
