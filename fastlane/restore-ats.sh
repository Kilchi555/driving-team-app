#!/usr/bin/env bash
#
# restore-ats.sh – Stellt das Info.plist Backup wieder her (nach Release-Build)
# damit lokales Live-Reload-Development wieder funktioniert.

set -euo pipefail

PLIST="ios/App/App/Info.plist"
BACKUP="ios/App/App/Info.plist.bak"

if [[ ! -f "$BACKUP" ]]; then
  echo "⚠️  Kein Backup gefunden ($BACKUP) – nichts zu tun."
  exit 0
fi

mv "$BACKUP" "$PLIST"
echo "✅ Info.plist Backup wiederhergestellt – Live-Reload Dev-Exceptions sind wieder aktiv."
