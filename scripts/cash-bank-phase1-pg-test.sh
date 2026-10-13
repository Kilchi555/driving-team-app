#!/usr/bin/env bash
# Disposable local Postgres proof for cash-to-bank remediation. Drops its database on exit.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="simy_cash_bank_remediation"
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
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/migrations/20261013_cash_bank_phase1_remediation.sql"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/cash-bank-phase1-pg-cases.sql"

# anon cannot execute the money functions
set +e
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "SET ROLE anon; SELECT public.confirm_cash_bank_deposit('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');" >/tmp/cash-bank-anon.out 2>&1
anon_code=$?
set -e
if [[ "$anon_code" -eq 0 ]]; then
  echo "FAIL anon was allowed to confirm" >&2
  exit 1
fi
if ! grep -q "permission denied" /tmp/cash-bank-anon.out; then
  echo "FAIL anon error was not permission denied" >&2
  cat /tmp/cash-bank-anon.out >&2
  exit 1
fi

# Two real transactions confirm the same deposit. The second must not post again.
TENANT="11111111-1111-4111-8111-111111111111"
ADMIN="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.cash_balances (id, instructor_id, tenant_id, current_balance_rappen, office_cash_register_id, register_type)
SELECT 'd3000000-0000-4000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', 20000, 'e2000000-0000-4000-8000-000000000002', 'office'
WHERE NOT EXISTS (SELECT 1 FROM public.cash_balances WHERE id = 'd3000000-0000-4000-8000-000000000003');
SQL

RACE_JSON="$(sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT row_to_json(x) FROM (
  WITH reported AS (
    SELECT public.report_cash_bank_deposit(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'race-same-deposit-key',
      'business', NULL, 3000, DATE '2026-10-08', NULL
    ) AS report
  ), line AS (
    SELECT public.persist_cash_bank_statement_lines(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'csv',
      jsonb_build_array(jsonb_build_object(
        'dedupe_key', public.cash_bank_statement_dedupe_key('RACE-1', DATE '2026-10-08', 3000, '', ''),
        'amount_rappen', 3000,
        'currency', 'CHF',
        'direction', 'credit',
        'entry_date', '2026-10-08',
        'reference', '',
        'remittance', (SELECT report->>'reference_token' FROM reported),
        'debtor_name', '',
        'bank_ref', 'RACE-1'
      ))
    ) AS batch
  )
  SELECT
    (SELECT report->>'deposit_id' FROM reported) AS deposit_id,
    (SELECT batch->'lines'->0->>'statement_line_id' FROM line) AS line_id
) x;
SQL
)"
DEP1="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["deposit_id"])' "$RACE_JSON")"
LINE1="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["line_id"])' "$RACE_JSON")"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "SELECT public.select_cash_bank_deposit_candidate('${TENANT}', '${ADMIN}', '${DEP1}', '${LINE1}');" >/dev/null

sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "BEGIN; SELECT public.confirm_cash_bank_deposit('${TENANT}', '${ADMIN}', '${DEP1}'); SELECT pg_sleep(3); COMMIT;" >/tmp/cash-bank-race-a.out 2>&1 &
race_a=$!
sleep 0.4
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "SELECT public.confirm_cash_bank_deposit('${TENANT}', '${ADMIN}', '${DEP1}');" >/tmp/cash-bank-race-b.out 2>&1
wait "$race_a"
if ! grep -q "already_reconciled" /tmp/cash-bank-race-b.out; then
  echo "FAIL concurrent second confirm did not return already_reconciled" >&2
  cat /tmp/cash-bank-race-a.out /tmp/cash-bank-race-b.out >&2
  exit 1
fi
LIVE="$(sudo -u postgres psql -d "$DB" -At -c "SELECT count(*) FROM public.cash_bank_transfer_journals WHERE deposit_id = '${DEP1}' AND storno_of_id IS NULL;")"
if [[ "$LIVE" != "1" ]]; then
  echo "FAIL concurrent confirm posted ${LIVE} live journals" >&2
  exit 1
fi

# Two deposits, one persisted line, two overlapping transactions.
PAIR="$(sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT row_to_json(x) FROM (
  WITH a AS (
    SELECT public.report_cash_bank_deposit(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'race-line-deposit-a', 'business', NULL, 4000, DATE '2026-10-09', NULL
    ) AS report
  ), b AS (
    SELECT public.report_cash_bank_deposit(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'race-line-deposit-b', 'business', NULL, 4000, DATE '2026-10-09', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    ) AS report
  ), line AS (
    SELECT public.persist_cash_bank_statement_lines(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'csv',
      jsonb_build_array(jsonb_build_object(
        'dedupe_key', public.cash_bank_statement_dedupe_key('RACE-2', DATE '2026-10-09', 4000, '', ''),
        'amount_rappen', 4000, 'currency', 'CHF', 'direction', 'credit', 'entry_date', '2026-10-09',
        'reference', '', 'remittance', (SELECT report->>'reference_token' FROM a) || ' ' || (SELECT report->>'reference_token' FROM b),
        'debtor_name', '', 'bank_ref', 'RACE-2'
      ))
    ) AS batch
  )
  SELECT
    (SELECT report->>'deposit_id' FROM a) AS deposit_a,
    (SELECT report->>'deposit_id' FROM b) AS deposit_b,
    (SELECT batch->'lines'->0->>'statement_line_id' FROM line) AS line_id
) x;
SQL
)"
DEPA="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["deposit_a"])' "$PAIR")"
DEPB="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["deposit_b"])' "$PAIR")"
LINE2="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["line_id"])' "$PAIR")"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "SELECT public.select_cash_bank_deposit_candidate('${TENANT}', '${ADMIN}', '${DEPA}', '${LINE2}');" >/dev/null
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "SELECT public.select_cash_bank_deposit_candidate('${TENANT}', '${ADMIN}', '${DEPB}', '${LINE2}');" >/dev/null

sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "BEGIN; SELECT public.confirm_cash_bank_deposit('${TENANT}', '${ADMIN}', '${DEPA}'); SELECT pg_sleep(3); COMMIT;" >/tmp/cash-bank-pair-a.out 2>&1 &
pair_a=$!
sleep 0.4
set +e
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -c "SELECT public.confirm_cash_bank_deposit('${TENANT}', '${ADMIN}', '${DEPB}');" >/tmp/cash-bank-pair-b.out 2>&1
pair_b=$?
set -e
wait "$pair_a"
if [[ "$pair_b" -eq 0 ]] || ! grep -q "bank_line_used" /tmp/cash-bank-pair-b.out; then
  echo "FAIL concurrent second deposit claimed the same bank line" >&2
  cat /tmp/cash-bank-pair-a.out /tmp/cash-bank-pair-b.out >&2
  exit 1
fi
CLAIMED="$(sudo -u postgres psql -d "$DB" -At -c "SELECT count(*) FROM public.cash_deposit_reports WHERE id IN ('${DEPA}', '${DEPB}') AND status = 'reconciled';")"
if [[ "$CLAIMED" != "1" ]]; then
  echo "FAIL expected one reconciled deposit, got ${CLAIMED}" >&2
  exit 1
fi

echo "PASS disposable postgres: balances, storno, idempotency, and concurrent claims"
