#!/usr/bin/env bash
set -euo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
binary="$(cd -- "$(dirname -- "${1:?Pass the built Linux executable}")" && pwd)/$(basename -- "$1")"
package_dir="$(mktemp -d)"
work_dir="$(mktemp -d)"
log_file="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/world-map-guesser.log"
server_pid=""
base_url=""

stop_server() {
  if [[ -n "$server_pid" ]]; then
    kill -TERM "$server_pid"
    wait "$server_pid"
    server_pid=""
  fi
}

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill -TERM "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf -- "${package_dir:?}" "${work_dir:?}"
}
trap cleanup EXIT

cp -- "$binary" "$package_dir/world-map-guesser"
chmod +x "$package_dir/world-map-guesser"

start_server() {
  (
    cd -- "$work_dir"
    exec env -u PATH "$package_dir/world-map-guesser" -addr 127.0.0.1:0
  ) >"$log_file" 2>&1 &
  server_pid=$!
  for ((attempt = 0; attempt < 100; attempt++)); do
    if ! kill -0 "$server_pid" 2>/dev/null; then
      cat -- "$log_file"
      return 1
    fi
    address="$(grep 'msg="server ready"' "$log_file" | grep -oE 'address=127\.0\.0\.1:[0-9]+' | tail -n 1 | cut -d= -f2 || true)"
    if [[ -n "$address" ]]; then
      base_url="http://${address}/"
      if curl --silent --fail "${base_url}api/health" >/dev/null; then
        return
      fi
    fi
    sleep 0.1
  done
  cat -- "$log_file"
  return 1
}

start_server
curl --silent --show-error --fail "${base_url}api/scores" \
  -H 'Content-Type: application/json' \
  --data '{"user":"Packaged smoke","result":1,"time":20,"rights":["AD"],"wrongs":["BR"]}' \
  | grep '"success":true'
stop_server
start_server
curl --silent --show-error --fail "${base_url}api/scores" | grep 'Packaged smoke'
E2E_BASE_URL="$base_url" npm --prefix "$root/web" run test:e2e
stop_server
test "$(find "$package_dir" -maxdepth 1 -type f | wc -l)" -eq 2
test -f "$package_dir/db.sqlite"
test -z "$(find "$work_dir" -mindepth 1 -print -quit)"
printf '%s\n' 'Packaged server passed: executable and SQLite only, no Node/Go in PATH, data preserved after restart.'
