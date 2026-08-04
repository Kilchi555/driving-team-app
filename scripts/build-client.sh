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

# 1. Generate icons and splash screens
# generate-icons.mjs falls back to logo_square_url from Supabase when no local icon.png exists
echo "🎨 Generating icons and splash screens..."
CLIENT="$CLIENT" node scripts/generate-icons.mjs

# 2. Static build with Nuxt
echo ""
echo "🔨 Running nuxt generate..."
CLIENT="$CLIENT" npx nuxt generate

# 3. Generate capacitor.config.json for this client
echo ""
echo "⚙️  Generating capacitor.config.json..."
CLIENT="$CLIENT" node scripts/gen-cap-config.mjs "$CLIENT"

# 4. Sync into native projects
echo ""
echo "🔄 Syncing to native projects..."
CLIENT="$CLIENT" npx cap sync

# 5. Patch Android App Links + custom URL scheme from client config
if [ -f android/app/src/main/AndroidManifest.xml ]; then
  echo ""
  echo "🔗 Patching Android deeplinks..."
  CLIENT="$CLIENT" node scripts/patch-android-deeplinks.mjs
fi

echo ""
echo "✅ Build complete for $APP_NAME ($CLIENT)"
echo ""
echo "Next steps:"
echo "  iOS:     npx cap open ios"
echo "  Android: npx cap open android"
echo "  Fingerprint: ./scripts/android-cert-fingerprint.sh <keystore> <alias>"
echo "  Play checklist: docs/ANDROID_PLAY_SUBMISSION.md"
