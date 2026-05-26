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
# Capacitor: https://capacitorjs.com/docs/ios/deploying-to-app-store#xcode-cloud
#
# IMPORTANT: This script lives next to the .xcodeproj (ios/App/) — that's
# where Xcode Cloud looks for the ci_scripts directory.

set -e
set -x

echo "📦 [Xcode Cloud] Installing Node.js…"

# Homebrew is preinstalled in Xcode Cloud
brew install node@20
brew link --overwrite --force node@20

echo "✅ Node version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Repo root is two levels up from this script's location (ios/App/ci_scripts)
REPO_ROOT="$CI_WORKSPACE"
if [ -z "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT" ]; then
  # Fallback for newer Xcode Cloud variable
  REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
fi

echo "📂 Repo root: $REPO_ROOT"
cd "$REPO_ROOT"

echo "📥 [Xcode Cloud] Installing npm dependencies…"
npm ci --prefer-offline --no-audit --no-fund

echo "🛠  [Xcode Cloud] Generating capacitor.config.json for simy…"
CLIENT=simy node scripts/gen-cap-config.mjs

echo "🔁 [Xcode Cloud] Syncing Capacitor iOS project…"
npx cap sync ios --no-build

echo "🎉 [Xcode Cloud] Pre-build complete."
