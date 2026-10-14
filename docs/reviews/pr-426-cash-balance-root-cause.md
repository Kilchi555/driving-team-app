# SIMY PR #426 — Cash-balance root cause

**Verdict: BLOCKED**

The function and trigger bodies are not in any source this investigation was allowed to use. No overwrite behavior was proven, and no fix was written.

PR: https://github.com/Kilchi555/driving-team-app/pull/426
Branch: `cursor/cash-to-bank-phase1-6a22`
HEAD: `f1995d673085332a2b4a15c03561ff0f029cf16b`
Base: `main`
PR state at investigation time: open draft

No database writes, migrations, deployments, recalculation calls, code edits, commits, or PR changes were performed during the investigation.

## 1. Verified repository baseline

| Check | Result |
|---|---|
| Repository | `Kilchi555/driving-team-app` |
| Branch | `cursor/cash-to-bank-phase1-6a22` |
| HEAD | `f1995d673085332a2b4a15c03561ff0f029cf16b` |
| Parent | `33e09cf43d80495e1609b30349b99c13cbd371d0` |
| Working tree | clean |
| PR #426 | open draft, base `main`, head SHA matches |

The expected HEAD matched.

## 2. Authoritative evidence source

Searched in the required order:

1. Versioned SQL and git history. The four names appear only as grant targets, comments, and a test that asserts they are absent after the cash-to-bank migrations. No `CREATE FUNCTION` body exists on this branch or in the commits that introduced those comments.
2. Local schema dumps and snapshots. None. The local PostgreSQL 16 cluster has only the `postgres` database. No restored application schema is loaded.
3. A read-only replica. None is configured. The environment contains privileged production Supabase keys. Those were not used. No new connection was opened.

`TRIGGER_ANALYSIS.md`, `TRIGGER_VISUAL_GUIDE.md`, and the comment in `utils/staff-cash-balance.ts` describe the names. They are not function definitions and were not used as one.

## 3. Function definitions

Absent from the inspected source. No signature, owner, return type, or security property could be read.

| Name | In versioned SQL | `pg_get_functiondef` |
|---|---|---|
| `public.calculate_cash_balance` | name only, `migrations/20260826_rls_wave4_access.sql` line 131 | not available |
| `public.update_cash_balance` | name only, line 160 | not available |
| `public.trigger_update_cash_balance` | name only, line 158 | not available |
| `public.trigger_update_cash_balance_from_movements` | name only, line 159 | not available |

The versioned migration revokes and grants those names only when `pg_proc` already contains them. It does not create them.

The only versioned trigger on `cash_balances` is `update_cash_balances_updated_at` in `database_migration_cash_control.sql` lines 417–420: `BEFORE UPDATE FOR EACH ROW`, calling `update_updated_at_column()`. That sets a timestamp. It does not assign `current_balance_rappen`. Whether that trigger still exists on the hosted database was not checked.

## 4. Trigger inventory

Not available. `pg_trigger` was not queried because the only database present is an empty local cluster, and the hosted database was not opened.

From versioned files alone, these writers of `current_balance_rappen` exist:

- `top_up_cash_balance` and the withdrawal function in `database_migration_cash_control.sql`
- office deposit and withdrawal functions in `office_cash_functions.sql`
- `cash_bank_apply_drawer_effect` in `migrations/20261013_cash_bank_phase1_remediation.sql` lines 379–384

No versioned trigger order can be stated. Same-timing alphabetical order on the hosted database is unknown.

## 5. Can a recalculation overwrite the drawer?

**Unresolved.** Reading the versioned transfer function does not prove what a later hosted function does.

What the versioned confirmation does, as SQL text, not as a new runtime run:

- `confirm_cash_bank_deposit` calls `cash_bank_apply_drawer_effect` with the deposit amount and then `cash_bank_apply_bank_effect` with the same amount (`migrations/20261013_cash_bank_phase1_remediation.sql` lines 787–790).
- The drawer update sets `current_balance_rappen` to the locked balance minus that amount (lines 350–384).
- The bank update adds that amount to the locked `tenants.bank_balance_rappen`.
- The journal is Dr 1020 / Cr 1000 for that amount (lines 792–804).
- Reversal adds the amount back to the locked drawer, subtracts it from the locked bank, and posts Dr 1000 / Cr 1020 (lines 892–913). A second reversal is stopped by status and the one-storno index.

For a staff drawer, the movement insert happens before that absolute snapshot update, so an `AFTER INSERT` trigger on `cash_movements` in the same statement would be overwritten by the following `UPDATE`. That is an ordering claim about this function. It is not proof that no later, separate call recalculates the row.

An office drawer gets the snapshot update and no `cash_movements` row (lines 364–377). Nothing in this function prevents a later statement from setting `current_balance_rappen` again.

## 6. Office-drawer reconstruction

**Unconfirmed, and `cash_movements` is not a sufficient source.**

The versioned office path records the transfer on `cash_balances.current_balance_rappen` and in `cash_bank_transfer_journals` (`cash_balance_id`, `amount_rappen`, `storno_of_id`). It does not record it in `cash_movements`. A recalculation that rebuilds a drawer only from movements cannot see an office transfer. The missing source, if a rebuild is required, is `cash_bank_transfer_journals` joined to the drawer id. That is not a license to invent the hosted function’s formula.

## 7. Opening-bank PDF, separate finding

Confirmed from code. Not changed.

`server/utils/accounting-year-pdf.ts` lines 44–46 load entries without `external_reference` or `document_kind`. Line 62 keeps every `type === 'income'` row for the Einnahmen list. `computeSimpleBookIncome` would exclude `external_reference = 'opening-bank'` through `isAccountingPlEntry` (`server/utils/accounting.ts` lines 72–75), but the PDF never loads that column, so the exclusion does not run. The opening seed is `type = 'income'`, has no `linked_payment_id`, and is dated 1 January of the seed year, so it falls inside that year’s PDF.

The listed Einnahmen, the Einnahmen total, and the Jahresergebnis can therefore include the opening bank amount. This is independent of the cash-to-bank journal. No PDF was rendered and no production row was read.

Recommended separate change: select `external_reference` and `document_kind`, and use `isAccountingPlEntry` for both the income list and the total. Add a unit test with an `opening-bank` row and assert it is absent from both. Do not mix that into the cash-balance work.

## 8. Proposed remediation

No cash-balance code change is justified yet. The smallest next step is a read-only catalog export from an authorized replica, with no function execution:

```sql
SELECT n.nspname, p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS result,
       p.prosecdef, p.provolatile, r.rolname AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_cash_balance',
    'update_cash_balance',
    'trigger_update_cash_balance',
    'trigger_update_cash_balance_from_movements'
  );

SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_cash_balance',
    'update_cash_balance',
    'trigger_update_cash_balance',
    'trigger_update_cash_balance_from_movements'
  );

SELECT n.nspname, c.relname, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND c.relname IN ('cash_balances', 'cash_movements', 'cash_transactions')
ORDER BY c.relname, t.tgname;
```

After those definitions exist, a regression can confirm a transfer, call only the discovered recalculation if it does not itself post money, and assert the office snapshot still reflects `cash_bank_transfer_journals`. Until then, do not add a replacement function.

## 9. Remaining uncertainty and follow-up

An authorized human needs to provide either those catalog results or a schema dump taken without executing the functions. The hosted project must not be assumed to match the repository. Do not run `calculate_cash_balance` or `update_cash_balance` as a probe: they may write `current_balance_rappen`.

## 10. What was not done

No database writes, migrations, deployments, recalculation calls, or code edits were performed for the investigation. PR #426 remained an open draft at `f1995d673085332a2b4a15c03561ff0f029cf16b` when this report was written.
