#!/usr/bin/env bash
# scripts/build-client.sh
# Local build script for a single white-label client.
# Usage: ./scripts/build-client.sh [client-id]
# Example: ./scripts/build-client.sh driving-team

set -euo pipefail

CLIENT="${1:-driving-team}"
CONFIG_FILE="clients/${CLIENT}/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Config not found: $CONFIG_FILE"
  echo "   Available clients: $(ls clients/ | grep -v _template | tr '\n' ' ')"
  exit 1
fi

APP_NAME=$(node -e "console.log(require('./${CONFIG_FILE}').appName)")
BUNDLE_ID=$(node -e "console.log(require('./${CONFIG_FILE}').bundleId)")

echo ""
echo "📱 Building white-label app"
echo "   Client:    $CLIENT"
echo "   App Name:  $APP_NAME"
echo "   Bundle ID: $BUNDLE_ID"
echo ""

# 1. Generate icons and splash screens (if assets exist)
if [ -f "clients/${CLIENT}/icon.png" ]; then
  echo "🎨 Generating icons and splash screens..."
  CLIENT="$CLIENT" node scripts/generate-icons.mjs
else
  echo "⚠️  No icon.png found in clients/${CLIENT}/ — skipping icon generation"
  echo "   Add a 1024×1024px PNG as clients/${CLIENT}/icon.png"
fi

# 2. Static build with Nuxt
echo ""
echo "🔨 Running nuxt generate..."
CLIENT="$CLIENT" npx nuxt generate

# 3. Sync into native projects
echo ""
echo "🔄 Syncing to native projects..."
CLIENT="$CLIENT" npx cap sync

echo ""
echo "✅ Build complete for $APP_NAME ($CLIENT)"
echo ""
echo "Next steps:"
echo "  iOS:     npx cap open ios"
echo "  Android: npx cap open android"
