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
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

echo "✅ Homebrew: $(brew --version | head -1)"

# ───────────────────────────────────────────────────────
# 2) Install Node 20 (idempotent — won't fail if present)
# ───────────────────────────────────────────────────────
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
REPO_ROOT="${CI_WORKSPACE:-$CI_PRIMARY_REPOSITORY_PATH}"
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
echo "📥 Installing npm dependencies…"
if ! npm ci --prefer-offline --no-audit --no-fund; then
  echo "⚠️  npm ci failed (likely lockfile mismatch). Falling back to npm install."
  npm install --no-audit --no-fund
fi

# ───────────────────────────────────────────────────────
# 5) Generate capacitor.config.json for the Simy client
# ───────────────────────────────────────────────────────
echo "🛠  Generating capacitor.config.json for client=simy…"
CLIENT=simy node scripts/gen-cap-config.mjs

# ───────────────────────────────────────────────────────
# 6) Sync Capacitor iOS project (copy web + plugin files)
# ───────────────────────────────────────────────────────
echo "🔁 Syncing Capacitor iOS project…"
npx cap sync ios --no-build

echo "=================================================="
echo "🎉 Pre-build complete."
echo "=================================================="
