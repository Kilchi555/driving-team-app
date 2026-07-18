#!/bin/sh
# scripts/backup-local-supabase.sh
#
# This repo enforces "Cloud Supabase only" — a local Supabase CLI dev stack
# (from `supabase init`/`supabase start`: config.toml, seed.sql, .branches/,
# .temp/, etc.) must never be committed. Previously this was enforced by
# unconditionally running `rm -rf supabase/`, which permanently destroyed
# uncommitted work with no way to recover it (this happened once — see
# incident below — and must never happen again).
#
# EXCEPTION: `supabase/functions/` and `supabase/migrations/` are legitimate,
# intentionally version-controlled source (Edge Function code, SQL migrations)
# that must survive in the working tree and in git — see incident response
# plan in pages/tenant-admin/backup.vue, which relies on these being restorable
# via a plain `git checkout`. Only the local-dev-only files/dirs below are
# moved away; functions/ and migrations/ are left untouched.
#
# This script MOVES any offending local Supabase dev files (and stray
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

# Local-dev-only Supabase CLI artifacts. Deliberately does NOT include
# `functions` or `migrations` — those are meant to be committed.
LOCAL_DEV_ENTRIES="config.toml seed.sql .branches .temp .env .env.local"

echo "🔍 Checking for local Supabase dev files..."

if [ -d "supabase" ]; then
  for entry in $LOCAL_DEV_ENTRIES; do
    [ -e "supabase/$entry" ] || continue
    BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP/supabase"
    mkdir -p "$BACKUP_DIR"
    echo "⚠️  Local 'supabase/$entry' found — moving it (NOT deleting)."
    mv "supabase/$entry" "$BACKUP_DIR/$entry"
    echo "📦 Backed up to: $BACKUP_DIR/$entry"
    echo "   Restore with: mv \"$BACKUP_DIR/$entry\" ./supabase/$entry"
    MOVED=1
  done
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

STILL_PRESENT=0
for entry in $LOCAL_DEV_ENTRIES; do
  [ -e "supabase/$entry" ] && STILL_PRESENT=1
done
if [ "$STILL_PRESENT" = "1" ] || ls supabase_*.tar.gz >/dev/null 2>&1; then
  echo "❌ ERROR: Local Supabase dev files still present after backup attempt."
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
