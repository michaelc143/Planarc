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

FRONTEND_STATUS=0
FRONTEND_SKIPPED=0
BACKEND_STATUS=0

echo "==> Frontend tests"
if [ -d "$ROOT_DIR/frontend" ] && [ -f "$ROOT_DIR/frontend/package.json" ]; then
  pushd "$ROOT_DIR/frontend" >/dev/null
  set +e
  if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
    CI=1 pnpm test
    FRONTEND_STATUS=$?
  elif command -v yarn >/dev/null 2>&1 && [ -f yarn.lock ]; then
    CI=1 yarn test
    FRONTEND_STATUS=$?
  else
    CI=1 npm test --silent
    FRONTEND_STATUS=$?
  fi
  set -e
  popd >/dev/null
else
  echo "Skipping frontend: frontend/package.json not found"
  FRONTEND_SKIPPED=1
fi

echo
echo "==> Backend tests"
pushd "$ROOT_DIR" >/dev/null
set +e
python3 -m unittest discover -s backend/tests -p "test_*.py" -v
BACKEND_STATUS=$?
set -e
popd >/dev/null

echo
echo "==> Summary"
if [ "$FRONTEND_SKIPPED" -eq 1 ]; then
  echo "- Frontend: ${YELLOW}SKIPPED${RESET}"
else
  if [ "$FRONTEND_STATUS" -eq 0 ]; then
    echo "- Frontend: ${GREEN}PASSED${RESET}"
  else
    echo "- Frontend: ${RED}FAILED (exit $FRONTEND_STATUS)${RESET}"
  fi
fi

if [ "$BACKEND_STATUS" -eq 0 ]; then
  echo "- Backend:  ${GREEN}PASSED${RESET}"
else
  echo "- Backend:  ${RED}FAILED (exit $BACKEND_STATUS)${RESET}"
fi

# Exit non-zero if any suite failed
if [ "$FRONTEND_SKIPPED" -eq 0 ] && [ "$FRONTEND_STATUS" -ne 0 ] || [ "$BACKEND_STATUS" -ne 0 ]; then
  exit 1
fi

echo
echo "==> All tests completed"