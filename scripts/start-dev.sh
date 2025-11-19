#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

DEFAULT_SERVICES=(
  api-gateway
  user-svc
  flights-svc
  hotels-svc
  cars-svc
  billing-svc
  admin-svc
  booking-svc
  concierge-svc
  notification-svc
  client
)

SERVICES=("$@")
if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=("${DEFAULT_SERVICES[@]}")
fi

PIDS=()

echo "🚀 Starting Kayak Microservices Development Environment"
echo "=================================================="
echo "Services: ${SERVICES[*]}"
echo "Logs directory: $LOG_DIR"
echo ""

start_service() {
  local service=$1
  local service_path="$ROOT_DIR/apps/$service"

  if [ ! -d "$service_path" ]; then
    echo "⚠️  Skipping $service (directory not found)"
    return
  fi

  echo "▶️  Launching $service..."
  if [ "$service" = "concierge-svc" ]; then
    (
      cd "$service_path"
      ${PYTHON_BIN:-python3} -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8007 \
        > "$LOG_DIR/${service}.log" 2>&1
    ) &
  elif [ -f "$service_path/package.json" ]; then
    (
      cd "$service_path"
      npm run dev > "$LOG_DIR/${service}.log" 2>&1
    ) &
  else
    echo "⚠️  No dev command for $service"
    return
  fi
  local pid=$!
  echo "$pid" > "$LOG_DIR/${service}.pid"
  PIDS+=("$pid")
  echo "   • $service logs → $LOG_DIR/${service}.log"
}

cleanup() {
  echo -e "\n🛑 Stopping services..."
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  echo "✅ All services stopped"
}

trap cleanup SIGINT SIGTERM EXIT

for svc in "${SERVICES[@]}"; do
  start_service "$svc"
done

echo ""
echo "✅ Services started!"
echo "📍 API Gateway: http://localhost:8000"
echo "📱 Client: http://localhost:3000"
echo "ℹ️  Press Ctrl+C to stop all services"
echo "📄 Tail logs with: tail -f $LOG_DIR/*.log"

wait
