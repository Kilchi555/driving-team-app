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

echo "🔢 Setting CFBundleVersion to $BUILD_NUMBER in $INFO_PLIST"

if [ ! -f "$INFO_PLIST" ]; then
  echo "❌ Info.plist not found at $INFO_PLIST — aborting."
  exit 1
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"

echo "✅ CFBundleVersion is now: $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$INFO_PLIST")"
