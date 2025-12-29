#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_process() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "⏹️  停止 $name (PID $pid)..."
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

stop_process "frontend"
stop_process "ssq-scheduler"
stop_process "backend"
stop_process "ml-service"

echo "🛑 停止 Docker 中的 postgres / redis..."
(cd "$ROOT_DIR" && docker compose stop postgres redis >/dev/null || true)

echo "✅ 所有服务均已停止。"
