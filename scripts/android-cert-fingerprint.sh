#!/usr/bin/env bash
# Print the SHA-256 certificate fingerprint of an Android keystore (Play assetlinks format).
# Usage: ./scripts/android-cert-fingerprint.sh <keystore> <alias>
# Example: ./scripts/android-cert-fingerprint.sh ./client.keystore simy

set -euo pipefail

KEYSTORE="${1:-}"
ALIAS="${2:-}"

if [ -z "$KEYSTORE" ] || [ -z "$ALIAS" ]; then
  echo "Usage: $0 <keystore-file> <alias>"
  echo "Example: $0 ./client.keystore simy"
  exit 1
fi

if [ ! -f "$KEYSTORE" ]; then
  echo "❌ Keystore not found: $KEYSTORE"
  exit 1
fi

echo "Enter keystore password when prompted..."
echo ""

# keytool prints "SHA256: AB:CD:..." — extract and normalize
FINGERPRINT=$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" 2>/dev/null \
  | grep -E 'SHA256:' \
  | head -1 \
  | sed -E 's/.*SHA256:\s*//' \
  | tr -d '[:space:]' \
  | tr '[:lower:]' '[:upper:]')

if [ -z "$FINGERPRINT" ]; then
  echo "❌ Could not read SHA-256 fingerprint (wrong password or alias?)"
  exit 1
fi

echo "SHA-256 fingerprint:"
echo "$FINGERPRINT"
echo ""
echo "Add to server env ANDROID_CERT_SHA256 (comma-separated if multiple):"
echo "  ANDROID_CERT_SHA256=\"$FINGERPRINT\""
echo ""
echo "Also copy the Play Console → App integrity → App signing key certificate"
echo "SHA-256 and append it (both upload + signing certs should be listed)."
