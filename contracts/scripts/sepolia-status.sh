#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
EXPECTED_CHAIN_ID="11155111"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

require_command cast

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Missing %s. Run bash scripts/setup-sepolia.sh first.\n' "$ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${SEPOLIA_RPC_URL:?SEPOLIA_RPC_URL is required}"
: "${DEPLOYER_ACCOUNT:?DEPLOYER_ACCOUNT is required}"
: "${DEPLOYER_ADDRESS:?DEPLOYER_ADDRESS is required}"

while true; do
  printf '\nPactPay Sepolia status\n'
  printf '----------------------\n'
  printf '1) Check network and balance\n'
  printf '2) Show deployer address\n'
  printf '3) Show latest block\n'
  printf '4) Exit\n'
  read -rp 'Choose [1-4]: ' CHOICE

  case "$CHOICE" in
    1)
      CHAIN_ID="$(cast chain-id --rpc-url "$SEPOLIA_RPC_URL")"
      BLOCK_NUMBER="$(cast block-number --rpc-url "$SEPOLIA_RPC_URL")"
      KEYSTORE_ADDRESS="$(cast wallet address --account "$DEPLOYER_ACCOUNT")"
      BALANCE_WEI="$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$SEPOLIA_RPC_URL")"
      BALANCE_ETH="$(cast to-unit "$BALANCE_WEI" ether)"

      printf '\nNetwork:  %s\n' "$CHAIN_ID"
      printf 'Expected: %s\n' "$EXPECTED_CHAIN_ID"
      printf 'Block:    %s\n' "$BLOCK_NUMBER"
      printf 'Account:  %s\n' "$DEPLOYER_ACCOUNT"
      printf 'Address:  %s\n' "$DEPLOYER_ADDRESS"
      printf 'Keystore: %s\n' "$KEYSTORE_ADDRESS"
      printf 'Balance:  %s ETH (%s wei)\n' "$BALANCE_ETH" "$BALANCE_WEI"

      if [[ "$CHAIN_ID" != "$EXPECTED_CHAIN_ID" ]]; then
        printf 'Status:   WRONG NETWORK\n'
      elif [[ "${KEYSTORE_ADDRESS,,}" != "${DEPLOYER_ADDRESS,,}" ]]; then
        printf 'Status:   ACCOUNT/ADDRESS MISMATCH\n'
      elif [[ "$BALANCE_WEI" == "0" ]]; then
        printf 'Status:   READY, BUT UNFUNDED\n'
      else
        printf 'Status:   READY TO DEPLOY\n'
      fi
      ;;
    2)
      printf '\n%s\n' "$DEPLOYER_ADDRESS"
      ;;
    3)
      printf '\nLatest Sepolia block: %s\n' "$(cast block-number --rpc-url "$SEPOLIA_RPC_URL")"
      ;;
    4)
      exit 0
      ;;
    *)
      printf 'Invalid choice.\n' >&2
      ;;
  esac
done
