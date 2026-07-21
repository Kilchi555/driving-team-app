#!/usr/bin/env bash
# Builds the app and boots the built server to verify it actually starts and
# serves traffic, before the code is allowed to reach origin/main (Vercel
# deploys straight from main, so a broken build here is a broken production).
#
# Guards specifically against the class of bug that caused the 2026-07-20
# outage: a dynamic require() (e.g. via createRequire()) that Nitro's bundler
# can't trace, silently dropped from the bundle, crashing the ENTIRE
# serverless function at cold start (Nitro/Vercel bundle all API routes into
# one function — so *every* route, including /api/health, returned 500).
#
# Usage: npm run smoke-test
# Skip (emergencies only): SKIP_SMOKE_TEST=1 git push
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${SMOKE_TEST_PORT:-4173}"
LOG_FILE="$(mktemp -t smoke-test-server.XXXXXX.log)"
SERVER_PID=""
# Isolated build dir: `nuxt build` writes into buildDir before emitting .output.
# Using the default `.nuxt` here would collide with a concurrently running
# `npm run dev` on the same checkout and crash it (ENOENT .../.nuxt/dev/*.map).
SMOKE_BUILD_DIR=".nuxt-smoke-test"

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$SMOKE_BUILD_DIR"
}
trap cleanup EXIT

echo "🔧 Building app (this mirrors production closely enough to catch bundling bugs)..."
rm -rf .output "$SMOKE_BUILD_DIR"
NUXT_BUILD_DIR="$SMOKE_BUILD_DIR" npm run build

echo "🚀 Booting built server on port $PORT..."
PORT="$PORT" NODE_ENV=production node .output/server/index.mjs >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

READY=0
for _ in $(seq 1 40); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  if curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "❌ Smoke test FAILED: server did not boot / respond on /api/health in time."
  echo "--- server log ($LOG_FILE) ---"
  cat "$LOG_FILE"
  exit 1
fi

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/health")
BODY=$(curl -s "http://localhost:$PORT/api/health")

if [ "$STATUS" != "200" ]; then
  echo "❌ Smoke test FAILED: /api/health returned $STATUS (expected 200). Body: $BODY"
  echo "--- server log ($LOG_FILE) ---"
  cat "$LOG_FILE"
  exit 1
fi

echo "✅ Smoke test passed — server booted cleanly and /api/health returned 200 ($BODY)"
