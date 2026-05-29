#!/bin/sh
#
# Xcode Cloud Pre-Build Script
# Runs after the repo is cloned, before Xcode resolves SPM packages.
#
# Capacitor's SPM dependencies (CapApp-SPM/Package.swift) reference
# node_modules/@capacitor/*, which don't exist on a fresh clone.
# This script installs Node, runs `npm ci`, generates capacitor.config.json
# for the Simy client, and syncs the iOS project.
#
# Apple docs: https://developer.apple.com/documentation/xcode/writing-custom-build-scripts
# Capacitor:  https://capacitorjs.com/docs/ios/deploying-to-app-store#xcode-cloud
#
# IMPORTANT: This script lives next to the .xcodeproj (ios/App/) — that's
# where Xcode Cloud looks for the ci_scripts directory.

set -e
set -x

# Print which step we died on — makes a failed build's log unambiguous even
# when the only surfaced message is Apple's generic "script failed (exit 1)".
CURRENT_STEP="startup"
on_exit() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "=================================================="
    echo "❌ ci_post_clone.sh FAILED during step: ${CURRENT_STEP} (exit ${status})"
    echo "=================================================="
  fi
}
trap on_exit EXIT

# Speeds up brew and avoids cleanup-related failures in CI (Apple/Capacitor docs)
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "=================================================="
echo "🏗  Xcode Cloud pre-build script"
echo "=================================================="
echo "Date:       $(date)"
echo "User:       $(whoami)"
echo "Shell:      $SHELL"
echo "PWD:        $(pwd)"
echo "CI_WORKSPACE:                ${CI_WORKSPACE:-<unset>}"
echo "CI_PRIMARY_REPOSITORY_PATH:  ${CI_PRIMARY_REPOSITORY_PATH:-<unset>}"
echo "=================================================="

# ───────────────────────────────────────────────────────
# 1) Ensure Homebrew is on PATH (Apple Silicon vs Intel)
# ───────────────────────────────────────────────────────
CURRENT_STEP="1) homebrew on PATH"
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

echo "✅ Homebrew: $(brew --version | head -1)"

# ───────────────────────────────────────────────────────
# 2) Install Node 20 (idempotent — won't fail if present)
# ───────────────────────────────────────────────────────
CURRENT_STEP="2) install node@20"
echo "📦 Installing Node.js 20…"
if ! brew list node@20 >/dev/null 2>&1; then
  brew install node@20
fi
brew link --overwrite --force node@20 || true

# Make sure node@20 wins on PATH even if another node is preinstalled
export PATH="$(brew --prefix node@20)/bin:$PATH"

echo "✅ Node version: $(node -v)"
echo "✅ npm  version: $(npm -v)"

# ───────────────────────────────────────────────────────
# 3) Locate repo root
# ───────────────────────────────────────────────────────
CURRENT_STEP="3) locate repo root"
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$CI_WORKSPACE}"
if [ -z "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT" ]; then
  # Last-resort fallback: derive from script location.
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi
echo "📂 Repo root resolved to: $REPO_ROOT"

if [ ! -f "$REPO_ROOT/package.json" ]; then
  echo "❌ package.json not found at $REPO_ROOT — aborting."
  ls -la "$REPO_ROOT" || true
  exit 1
fi

cd "$REPO_ROOT"

# ───────────────────────────────────────────────────────
# 4) Install npm dependencies
#    Use `npm ci` for reproducible installs. If the lockfile
#    is out of sync, fall back to `npm install` so the build
#    doesn't die — but loudly, so we know to fix the lockfile.
# ───────────────────────────────────────────────────────
CURRENT_STEP="4) npm install"
echo "📥 Installing npm dependencies…"
# Limit parallel sockets — more reliable on CI networks (Capacitor CI guides).
npm config set maxsockets 3 || true
# --ignore-scripts: skip lifecycle scripts (notably our "postinstall": "nuxt prepare").
# `cap sync` only needs node_modules/@capacitor/* present — it does NOT need a
# Nuxt build/prepare for this hosted-shell app. nuxt prepare in CI is an
# unnecessary failure vector (env/memory), so we skip all install scripts here.
if ! npm ci --prefer-offline --no-audit --no-fund --ignore-scripts; then
  echo "⚠️  npm ci failed (lockfile mismatch or peer conflict). Falling back to npm install --legacy-peer-deps."
  npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts
fi

# ───────────────────────────────────────────────────────
# 5) Generate capacitor.config.json for the Simy client
# ───────────────────────────────────────────────────────
CURRENT_STEP="5) gen capacitor.config.json"
echo "🛠  Generating capacitor.config.json for client=simy…"
CLIENT=simy node scripts/gen-cap-config.mjs

# ───────────────────────────────────────────────────────
# 5b) Ensure the Capacitor webDir exists.
#     Simy is a hosted-shell app (loads from serverUrl at runtime), so the
#     bundled web assets are only a placeholder — but `cap copy` still requires
#     the webDir to exist or it exits 1. On a fresh CI clone .output/public
#     hasn't been built, so we create a minimal stub instead of running a full
#     (slow, env-dependent) Nuxt build.
# ───────────────────────────────────────────────────────
CURRENT_STEP="5b) ensure webDir stub"
WEB_DIR="$REPO_ROOT/.output/public"
if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "📄 webDir missing — creating placeholder at $WEB_DIR"
  mkdir -p "$WEB_DIR"
  cat > "$WEB_DIR/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Simy</title>
  </head>
  <body>
    <!-- Hosted-shell placeholder. The app loads from server.url at runtime. -->
  </body>
</html>
HTML
else
  echo "✅ webDir already present at $WEB_DIR"
fi

# ───────────────────────────────────────────────────────
# 6) Sync Capacitor iOS project (copy web + plugin files)
# ───────────────────────────────────────────────────────
CURRENT_STEP="6) cap sync ios"
echo "🔁 Syncing Capacitor iOS project…"
# NOTE: --no-build was removed in Capacitor 8 — passing it makes cap exit 1.
npx cap sync ios

CURRENT_STEP="done"

echo "=================================================="
echo "🎉 Pre-build complete."
echo "=================================================="
