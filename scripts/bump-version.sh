#!/usr/bin/env bash
# scripts/bump-version.sh
# Bumps the version in all client configs and package.json, then creates a git tag.
# Usage: ./scripts/bump-version.sh [patch|minor|major]

set -euo pipefail

BUMP="${1:-patch}"
CURRENT=$(node -e "console.log(require('./package.json').version)")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *)     echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "📦 Bumping version: $CURRENT → $NEW_VERSION"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update all client configs
for config in clients/*/config.json; do
  [ -f "$config" ] || continue
  node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('$config', 'utf-8'));
cfg.version = '$NEW_VERSION';
fs.writeFileSync('$config', JSON.stringify(cfg, null, 2) + '\n');
"
  echo "  ✅ $config → $NEW_VERSION"
done

# Git tag
git add -A
git commit -m "chore: bump version to $NEW_VERSION"
git tag "v$NEW_VERSION"

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo "   Run 'git push && git push --tags' to trigger CI/CD builds"
