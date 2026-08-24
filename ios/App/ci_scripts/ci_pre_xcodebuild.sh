#!/bin/sh
#
# Xcode Cloud pre-xcodebuild script
# Runs after ci_post_clone.sh, immediately before `xcodebuild archive`.
#
# Purpose: stamp a UNIQUE, monotonically increasing build number so uploads to
# App Store Connect / TestFlight never collide. The repo's Info.plist pins a
# fixed CFBundleVersion (e.g. 202605280712) which is already uploaded — reusing
# it makes Apple reject the build with "build number already used".
#
# We use a timestamp (YYYYMMDDHHMM), matching the scheme fastlane already uses
# (Time.now.strftime('%Y%m%d%H%M')), so it's always higher than the previous one.

set -e
set -x

BUILD_NUMBER="$(date +%Y%m%d%H%M)"

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$CI_WORKSPACE}"
INFO_PLIST="$REPO_ROOT/ios/App/App/Info.plist"
CONFIG="$REPO_ROOT/clients/simy/config.json"

echo "🔢 Setting CFBundleVersion to $BUILD_NUMBER in $INFO_PLIST"

if [ ! -f "$INFO_PLIST" ]; then
  echo "❌ Info.plist not found at $INFO_PLIST — aborting."
  exit 1
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"

# Apple closes a version train after App Store approval. Stamp the marketing
# version from clients/simy/config.json so Xcode Cloud cannot resubmit 1.0.1.
if [ -f "$CONFIG" ]; then
  MARKETING_VERSION="$(python3 -c "import json; print(json.load(open('$CONFIG')).get('version') or '')")"
  if [ -n "$MARKETING_VERSION" ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MARKETING_VERSION" "$INFO_PLIST"
    echo "✅ CFBundleShortVersionString is now: $MARKETING_VERSION"
  fi
fi

echo "✅ CFBundleVersion is now: $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$INFO_PLIST")"
