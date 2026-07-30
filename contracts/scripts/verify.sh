#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FORGE_STD_REF="v1.16.2"
LOG_DIR="$ROOT_DIR/verification"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$LOG_DIR/verify-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"
exec > >(tee "$LOG_FILE") 2>&1

printf 'PactPay contract verification\n'
printf 'UTC timestamp: %s\n' "$TIMESTAMP"
printf 'Git commit: %s\n' "$(git rev-parse HEAD)"
printf 'Git branch: %s\n' "$(git branch --show-current)"
printf '\nToolchain\n'
forge --version
cast --version
anvil --version

if [[ ! -d lib/forge-std ]]; then
  forge install --no-git "foundry-rs/forge-std@$FORGE_STD_REF"
fi

printf '\nDependency\n'
printf 'forge-std commit: %s\n' "$(git -C lib/forge-std rev-parse HEAD)"

printf '\nFormatting\n'
forge fmt --check

printf '\nClean build\n'
forge clean
forge build --sizes

printf '\nTests\n'
forge test -vvv

printf '\nRepository state\n'
git status --short --untracked-files=no

printf '\nVerification complete\n'
printf 'Log: %s\n' "$LOG_FILE"
