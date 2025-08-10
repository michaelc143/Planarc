#!/usr/bin/env bash
set -euo pipefail

# Colors (only if TTY)
if [ -t 1 ]; then
  GREEN="$(tput setaf 2)"; RED="$(tput setaf 1)"; YELLOW="$(tput setaf 3)"; BOLD="$(tput bold)"; RESET="$(tput sgr0)"
else
  GREEN=""; RED=""; YELLOW=""; BOLD=""; RESET=""
fi

# Resolve repo root regardless of current working directory
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Running lint and tests"
 echo "Root: $ROOT_DIR"

# Lint
LINT_START=$(date +%s)
set +e
"$SCRIPT_DIR/run-lint.sh"
LINT_STATUS=$?
set -e
LINT_END=$(date +%s)
LINT_TIME=$((LINT_END - LINT_START))

echo

# Tests
TEST_START=$(date +%s)
set +e
"$SCRIPT_DIR/run-tests.sh"
TEST_STATUS=$?
set -e
TEST_END=$(date +%s)
TEST_TIME=$((TEST_END - TEST_START))

echo
echo "==> Pipeline Summary"
if [ "$LINT_STATUS" -eq 0 ]; then
  echo "- Lint:  ${GREEN}PASSED${RESET} (${LINT_TIME}s)"
else
  echo "- Lint:  ${RED}FAILED${RESET} (${LINT_TIME}s)"
fi

if [ "$TEST_STATUS" -eq 0 ]; then
  echo "- Tests: ${GREEN}PASSED${RESET} (${TEST_TIME}s)"
else
  echo "- Tests: ${RED}FAILED${RESET} (${TEST_TIME}s)"
fi

if [ "$LINT_STATUS" -eq 0 ] && [ "$TEST_STATUS" -eq 0 ]; then
  echo
  echo "${BOLD}${GREEN}All checks passed${RESET}"
  exit 0
else
  echo
  echo "${BOLD}${RED}One or more checks failed${RESET}"
  exit 1
fi