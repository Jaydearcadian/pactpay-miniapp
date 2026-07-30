#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/.." && pwd)"
cd "$ROOT_DIR"

FORGE_STD_REPO="https://github.com/foundry-rs/forge-std.git"
FORGE_STD_REF="bf647bd6046f2f7da30d0c2bf435e5c76a780c1b"
LOG_DIR="$ROOT_DIR/verification"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$LOG_DIR/verify-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"
exec > >(tee "$LOG_FILE") 2>&1

printf 'PactPay contract verification\n'
printf 'UTC timestamp: %s\n' "$TIMESTAMP"
printf 'Git commit: %s\n' "$(git rev-parse HEAD)"
printf 'Git branch: %s\n' "$(git branch --show-current)"

printf '\nInitial repository state\n'
INITIAL_STATUS="$(git -C "$REPO_DIR" status --short)"
if [[ -n "$INITIAL_STATUS" ]]; then
  printf '%s\n' "$INITIAL_STATUS"
  printf 'Verification failed: start from a clean repository.\n'
  exit 1
fi
printf 'clean\n'

printf '\nToolchain\n'
forge --version
cast --version
anvil --version

INSTALLED_REF=""
if [[ -d lib/forge-std/.git ]]; then
  INSTALLED_REF="$(git -C lib/forge-std rev-parse HEAD)"
fi

if [[ "$INSTALLED_REF" != "$FORGE_STD_REF" ]]; then
  rm -rf lib/forge-std
  mkdir -p lib/forge-std
  git -C lib/forge-std init -q
  git -C lib/forge-std remote add origin "$FORGE_STD_REPO"
  git -C lib/forge-std fetch -q --depth 1 origin "$FORGE_STD_REF"
  git -C lib/forge-std checkout -q --detach FETCH_HEAD
fi

if [[ ! -f lib/forge-std/src/Test.sol ]]; then
  printf 'Verification failed: forge-std installation is incomplete.\n'
  exit 1
fi

INSTALLED_REF="$(git -C lib/forge-std rev-parse HEAD)"
if [[ "$INSTALLED_REF" != "$FORGE_STD_REF" ]]; then
  printf 'Verification failed: expected forge-std %s, found %s.\n' "$FORGE_STD_REF" "$INSTALLED_REF"
  exit 1
fi

printf '\nDependency\n'
printf 'forge-std pinned ref: %s\n' "$INSTALLED_REF"

printf '\nFormatting\n'
forge fmt --check

printf '\nClean build\n'
forge clean
forge build --sizes

printf '\nTests\n'
forge test -vvv

printf '\nFinal repository state\n'
FINAL_STATUS="$(git -C "$REPO_DIR" status --short)"
if [[ -n "$FINAL_STATUS" ]]; then
  printf '%s\n' "$FINAL_STATUS"
  printf 'Verification failed: verification changed or exposed repository files.\n'
  exit 1
fi
printf 'clean\n'

printf '\nVerification complete\n'
printf 'Log: %s\n' "$LOG_FILE"
