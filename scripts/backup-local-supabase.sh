#!/bin/sh
# scripts/backup-local-supabase.sh
#
# This repo enforces "Cloud Supabase only" — a local `supabase/` directory
# (from `supabase init`/`supabase start`, or Edge Function drafts, etc.) must
# never be committed. Previously this was enforced by unconditionally running
# `rm -rf supabase/`, which permanently destroyed uncommitted work with no
# way to recover it (this happened once — see incident below — and must
# never happen again).
#
# This script instead MOVES any local `supabase/` directory (and stray
# `supabase_*.tar.gz` archives) to a timestamped backup folder OUTSIDE the
# repo. Nothing is ever deleted. If you didn't mean for this to run, your
# files are safe in $BACKUP_ROOT below.
#
# Used by:
#   - .git/hooks/pre-commit  (blocks commits until the working tree is clean)
#   - package.json "clean:local-supabase" (runs before every `npm run dev`)

set -e

BACKUP_ROOT="$HOME/.driving-team-app-local-backups/supabase"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
MOVED=0

echo "🔍 Checking for local Supabase files..."

if [ -d "supabase" ]; then
  BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
  mkdir -p "$BACKUP_DIR"
  echo "⚠️  Local 'supabase/' directory found — moving it (NOT deleting)."
  mv supabase "$BACKUP_DIR/supabase"
  echo "📦 Backed up to: $BACKUP_DIR/supabase"
  echo "   Restore with: mv \"$BACKUP_DIR/supabase\" ./supabase"
  MOVED=1
fi

# Use a glob loop instead of `[ -f "supabase_*.tar.gz" ]` (that never matched —
# shell test doesn't expand globs, so old archives were silently never touched).
for archive in supabase_*.tar.gz; do
  [ -e "$archive" ] || continue
  BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
  mkdir -p "$BACKUP_DIR"
  mv "$archive" "$BACKUP_DIR/"
  echo "📦 Backed up archive to: $BACKUP_DIR/$archive"
  MOVED=1
done

if [ -d "supabase" ] || ls supabase_*.tar.gz >/dev/null 2>&1; then
  echo "❌ ERROR: Local Supabase files still present after backup attempt."
  echo "🚫 Please check $BACKUP_ROOT and remove manually if needed."
  exit 1
fi

if [ "$MOVED" = "1" ]; then
  echo "✅ Local Supabase files safely backed up (never deleted) — see $BACKUP_ROOT"
else
  echo "✅ No local Supabase files found."
fi

echo "🎯 Remember: ONLY use Cloud Supabase in this repo!"
exit 0
