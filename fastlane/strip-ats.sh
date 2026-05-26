#!/usr/bin/env bash
#
# strip-ats.sh – Entfernt die Dev-only App Transport Security Ausnahmen aus Info.plist
# vor einem App Store Release-Build, damit Apple die Submission nicht ablehnt.
#
# Wird automatisch von der Fastlane `release_ios` Lane aufgerufen.
#
# Was passiert:
#   - NSAllowsArbitraryLoads wird entfernt
#   - NSAllowsLocalNetworking wird entfernt
#   - Das gesamte NSAppTransportSecurity dict wird entfernt
#
# Nach erfolgreichem Upload zu App Store Connect wird das Original durch `restore-ats.sh`
# zurückgespielt (für lokales Live-Reload-Development).

set -euo pipefail

PLIST="ios/App/App/Info.plist"
BACKUP="ios/App/App/Info.plist.bak"

if [[ ! -f "$PLIST" ]]; then
  echo "❌ Info.plist nicht gefunden: $PLIST"
  exit 1
fi

# Backup anlegen
cp "$PLIST" "$BACKUP"

# NSAppTransportSecurity dict komplett entfernen
/usr/libexec/PlistBuddy -c "Delete :NSAppTransportSecurity" "$PLIST" 2>/dev/null || true

echo "✅ App Transport Security Dev-Exceptions aus $PLIST entfernt (Backup: $BACKUP)"
echo "ℹ️  Wiederherstellen mit: fastlane/restore-ats.sh"
