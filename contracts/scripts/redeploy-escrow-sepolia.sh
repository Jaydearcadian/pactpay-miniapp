#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  printf 'Missing contracts/.env. Run scripts/setup-sepolia.sh first.\n' >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${SEPOLIA_RPC_URL:?SEPOLIA_RPC_URL is required}"
: "${DEPLOYER_ACCOUNT:?DEPLOYER_ACCOUNT is required}"
: "${DEPLOYER_ADDRESS:?DEPLOYER_ADDRESS is required}"

CURRENT_COMMIT="$(git rev-parse HEAD)"
CURRENT_BRANCH="$(git branch --show-current)"

if [[ "$CURRENT_BRANCH" != "fix/escrow-deadline-model" ]]; then
  printf 'Refusing to deploy: expected branch fix/escrow-deadline-model, received %s.\n' "$CURRENT_BRANCH" >&2
  exit 1
fi

if [[ -n "$(git status --short)" ]]; then
  printf 'Refusing to deploy: repository is not clean.\n' >&2
  git status --short >&2
  exit 1
fi

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
printf 'Branch: %s\n' "$CURRENT_BRANCH"
printf 'Source commit: %s\n' "$CURRENT_COMMIT"
printf 'Account: %s\n' "$DEPLOYER_ACCOUNT"
printf 'Deployer: %s\n' "$DEPLOYER_ADDRESS"
printf 'Balance: %s wei\n' "$BALANCE_WEI"
printf 'Existing pUSDC: 0x543b3e6038D10d92648D529200C432f8FdAB63e3\n'
printf 'Action: deploy corrected PactPayEscrow only\n'

if [[ "$BALANCE_WEI" == "0" ]]; then
  printf 'Refusing to deploy: deployer has no Sepolia ETH for gas.\n' >&2
  exit 1
fi

forge script script/RedeployEscrowSepolia.s.sol:RedeployEscrowSepolia \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --account "$DEPLOYER_ACCOUNT" \
  --sender "$DEPLOYER_ADDRESS" \
  --broadcast \
  -vvvv

printf '\nBroadcast complete. Inspect:\n'
printf '  %s/broadcast/RedeployEscrowSepolia.s.sol/11155111/run-latest.json\n' "$ROOT_DIR"
