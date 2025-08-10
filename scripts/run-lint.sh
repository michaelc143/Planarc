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
BACKEND_SKIPPED=0

echo "==> Frontend lint"
if [ -d "$ROOT_DIR/frontend" ] && [ -f "$ROOT_DIR/frontend/package.json" ]; then
  pushd "$ROOT_DIR/frontend" >/dev/null
  set +e
  if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
    pnpm run -s lint
    FRONTEND_STATUS=$?
    if [ $FRONTEND_STATUS -ne 0 ]; then
      # Fallback to direct eslint if no lint script
      if command -v pnpm >/dev/null 2>&1 && pnpm dlx --yes eslint -v >/dev/null 2>&1; then
        pnpm dlx eslint . --max-warnings=0
        FRONTEND_STATUS=$?
      fi
    fi
  elif command -v yarn >/dev/null 2>&1 && [ -f yarn.lock ]; then
    yarn -s lint
    FRONTEND_STATUS=$?
    if [ $FRONTEND_STATUS -ne 0 ]; then
      npx -y eslint . --max-warnings=0
      FRONTEND_STATUS=$?
    fi
  else
    npm run -s lint
    FRONTEND_STATUS=$?
    if [ $FRONTEND_STATUS -ne 0 ]; then
      npx -y eslint . --max-warnings=0
      FRONTEND_STATUS=$?
    fi
  fi
  set -e
  popd >/dev/null
else
  echo "Skipping frontend: frontend/package.json not found"
  FRONTEND_SKIPPED=1
fi

echo
echo "==> Backend lint"
BACKEND_TOOLS_FOUND=0
BACKEND_FAIL=0

run_backend_tool() {
  local name="$1"; shift
  if command -v "$1" >/dev/null 2>&1; then
    BACKEND_TOOLS_FOUND=1
    echo "-- $name"
    set +e
    "$@"
    local st=$?
    set -e
    if [ $st -ne 0 ]; then
      echo "   $name: ${RED}FAILED (exit $st)${RESET}"
      BACKEND_FAIL=1
    else
      echo "   $name: ${GREEN}PASSED${RESET}"
    fi
  fi
}

pushd "$ROOT_DIR" >/dev/null

run_backend_tool "pylint" pylint --rcfile "$ROOT_DIR/backend/.pylintrc" --fail-under=8 **/*.py

if [ $BACKEND_TOOLS_FOUND -eq 0 ]; then
  echo "Skipping backend: no Python linters found (try installing ruff, flake8, black, isort, or pylint)"
  BACKEND_SKIPPED=1
else
  BACKEND_STATUS=$BACKEND_FAIL
fi
popd >/dev/null

echo
echo "==> Summary"
if [ "$FRONTEND_SKIPPED" -eq 1 ]; then
  echo "- Frontend lint: ${YELLOW}SKIPPED${RESET}"
else
  if [ "$FRONTEND_STATUS" -eq 0 ]; then
    echo "- Frontend lint: ${GREEN}PASSED${RESET}"
  else
    echo "- Frontend lint: ${RED}FAILED (exit $FRONTEND_STATUS)${RESET}"
  fi
fi

if [ "$BACKEND_SKIPPED" -eq 1 ]; then
  echo "- Backend lint:  ${YELLOW}SKIPPED${RESET}"
else
  if [ "$BACKEND_STATUS" -eq 0 ]; then
    echo "- Backend lint:  ${GREEN}PASSED${RESET}"
  else
    echo "- Backend lint:  ${RED}FAILED${RESET}"
  fi
fi

# Exit non-zero if any suite failed
if { [ "$FRONTEND_SKIPPED" -eq 0 ] && [ "$FRONTEND_STATUS" -ne 0 ]; } || { [ "$BACKEND_SKIPPED" -eq 0 ] && [ "$BACKEND_STATUS" -ne 0 ]; }; then
  exit 1
fi

echo
echo "==> Lint completed"