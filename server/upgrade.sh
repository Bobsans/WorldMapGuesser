#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' \
  'The legacy Python updater has been retired.' \
  'Build the standalone Go application with: go -C server run ./cmd/build -target linux/amd64' \
  'The new production deployment workflow must be configured before updating the service.' >&2
exit 1
