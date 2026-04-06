#!/usr/bin/env bash

set -euo pipefail

SKIP_INSTALL=false
FRONTEND_PORT=5173
BACKEND_PORT=8000

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    --frontend-port)
      FRONTEND_PORT="${2:-}"
      shift 2
      ;;
    --backend-port)
      BACKEND_PORT="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./quick-start.sh [--skip-install] [--frontend-port <port>] [--backend-port <port>]"
      exit 1
      ;;
  esac
done

assert_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Required command '$name' was not found in PATH."
    exit 1
  fi
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

assert_command bun
assert_command uv

if [[ "$SKIP_INSTALL" == "false" ]]; then
  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && bun install)
  fi

  if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
    echo "Creating backend virtual environment..."
    (cd "$BACKEND_DIR" && uv venv -p 3.12)
  fi

  echo "Syncing backend dependencies..."
  (cd "$BACKEND_DIR" && uv sync)
fi

if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
  echo "Creating backend virtual environment..."
  (cd "$BACKEND_DIR" && uv venv -p 3.12)
fi

echo "Starting frontend..."
(cd "$FRONTEND_DIR" && bun run dev --host 0.0.0.0 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

echo "Starting backend..."
(
  cd "$BACKEND_DIR"
  uv sync
  ./.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

cleanup() {
  echo
  echo "Stopping services..."
  kill "$FRONTEND_PID" "$BACKEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo
echo "TimeSand quick start is running."
echo "Frontend: http://127.0.0.1:$FRONTEND_PORT"
echo "Backend:  http://127.0.0.1:$BACKEND_PORT"
echo "Health:   http://127.0.0.1:$BACKEND_PORT/api/health"
echo
echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID:  $BACKEND_PID"
echo
echo "Press Ctrl+C to stop both services."

wait "$FRONTEND_PID" "$BACKEND_PID"
