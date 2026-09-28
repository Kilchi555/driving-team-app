#!/usr/bin/env bash
# Run a command with the shared simy-test env file (~/.config/simy/simy-test.env).
# Secret values are never printed.
#
#   scripts/load-simy-test-env.sh --profile nuxt-dev -- nuxt dev
#   scripts/load-simy-test-env.sh --profile e2e -- playwright test
#   scripts/load-simy-test-env.sh --profile all -- <command> [args...]
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$root/scripts/with-simy-test-env.mjs" "$@"
