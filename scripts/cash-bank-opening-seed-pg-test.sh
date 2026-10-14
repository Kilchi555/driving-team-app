#!/usr/bin/env bash
# Disposable proof that a cash-to-bank transfer is not seeded as opening income.
# Drops its database on exit. Does not touch a hosted database.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="simy_opening_seed"
export PGHOST="${PGHOST:-/var/run/postgresql}"
export PGUSER="${PGUSER:-postgres}"

if ! pg_lsclusters --no-header 2>/dev/null | awk '$1==16 && $2=="main" && $4=="online"' | grep -q .; then
  sudo pg_ctlcluster 16 main start
fi

cleanup() {
  sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB};" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB};"
sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB};"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/cash-bank-phase1-pg-stub.sql"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/migrations/20261013_cash_bank_deposit_reports.sql"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/migrations/20261013_cash_bank_phase1_remediation.sql"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/cash-bank-opening-seed-pg.sql"
echo "PASS disposable postgres: opening seed excludes transfers, reversal restores balances, failed confirm rolls back"
