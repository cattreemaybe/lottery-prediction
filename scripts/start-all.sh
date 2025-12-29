#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

echo "🚀 启动数据库与缓存（Docker Compose）..."
(cd "$ROOT_DIR" && docker compose up -d postgres redis >/dev/null)

wait_for_pid() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "⚠️  $name 已在运行 (PID $pid)，请先执行 scripts/stop-all.sh"
      exit 1
    else
      rm -f "$pid_file"
    fi
  fi
}

start_ml_service() {
  wait_for_pid "ml-service"
  if [[ ! -d "$ROOT_DIR/ml-service/.venv" ]]; then
    echo "❌ 未找到 ml-service/.venv，先进入 ml-service 目录创建虚拟环境并安装依赖："
    echo "   python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
  fi
  (
    cd "$ROOT_DIR/ml-service"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    echo "▶️  启动 FastAPI (ml-service)..."
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 \
      >"$LOG_DIR/ml-service.log" 2>&1 &
    echo $! >"$PID_DIR/ml-service.pid"
  )
}

start_backend() {
  wait_for_pid "backend"
  (
    cd "$ROOT_DIR/backend"
    echo "▶️  启动 Express 后端..."
    nohup npm run dev >"$LOG_DIR/backend.log" 2>&1 &
    echo $! >"$PID_DIR/backend.pid"
  )
}

start_scheduler() {
  wait_for_pid "ssq-scheduler"
  (
    cd "$ROOT_DIR/backend"
    echo "▶️  启动 双色球开奖同步定时器..."
    nohup npm run sync:ssq:schedule >"$LOG_DIR/ssq-scheduler.log" 2>&1 &
    echo $! >"$PID_DIR/ssq-scheduler.pid"
  )
}

start_frontend() {
  wait_for_pid "frontend"
  (
    cd "$ROOT_DIR/frontend"
    echo "▶️  启动前端 (Vite)..."
    nohup npm run dev >"$LOG_DIR/frontend.log" 2>&1 &
    echo $! >"$PID_DIR/frontend.pid"
  )
}

start_ml_service
start_backend
start_scheduler
start_frontend

echo "✅ 所有服务已启动。日志位于 ${LOG_DIR:-.logs}："
echo "   - ml-service.log"
echo "   - backend.log"
echo "   - ssq-scheduler.log"
echo "   - frontend.log"
echo ""
echo "ℹ️  若要停止服务，请执行 scripts/stop-all.sh"
