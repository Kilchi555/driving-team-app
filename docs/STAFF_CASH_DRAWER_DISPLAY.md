# Staff cash drawer display balance (`cash_handover`)

Verified from `main` after merge of `22aadcb1` (#423).

**When to use:** Staff Settings shows «Aktueller Kassenstand» too high after a Kassenabgabe; admin cash UI already subtracted handovers; persisted `cash_balances` / balance sheet still ignore handovers.

Open draft [#372](https://github.com/Kilchi555/driving-team-app/pull/372) `CASH_LEDGER_ATTRIBUTION` covers **who took the cash** (`cashier_staff_id` / attribution). This runbook is **display math for the staff drawer header only** — do not fold into #372.

---

## Intent

Before #423, staff UI counted:

`deposit − withdrawal + pending`

Recorded `cash_handover` movements appeared in the feed (often as a minus) but **stayed in the header total**. Admin UI (`CashBalanceManager.calculatedCurrentBalance` and `load_staff_balances`) already treated `cash_handover` like a withdrawal.

#423 extracts the staff formula into `utils/staff-cash-balance.ts` and subtracts `cash_handover` once per row:

`deposit − withdrawal − cash_handover + pending cash_transactions`

---

## Contract

### Shared calculator (`calculateStaffCashBalance`)

| Input | Effect on total |
|-------|-----------------|
| `movement_type === 'deposit'` | `+ amount_rappen` |
| `movement_type === 'withdrawal'` | `− amount_rappen` |
| `movement_type === 'cash_handover'` | `− amount_rappen` |
| Other movement types (`adjustment`, `system_init`, `cash_transaction`, …) | ignored |
| `cash_transactions` with `status === 'pending'` | `+ amount_rappen` |
| `confirmed` / `disputed` (and any non-pending) receipts | ignored |

Non-finite / non-number amounts count as `0`.

### Three balances (do not conflate)

| Surface | Formula / source | Handovers |
|---------|------------------|-----------|
| Staff «Aktueller Kassenstand» | `calculateStaffCashBalance` in browser | Subtracted (#423) |
| Admin calculated / `load_staff_balances` | Same movement types + pending-only | Already subtracted |
| Persisted `cash_balances` / `public.calculate_cash_balance` | Deposit + pending + confirmed (DB function not in this repo) | **Ignored** — balance sheet unchanged |

A green staff header does **not** mean the persisted snapshot or accounting balance sheet was corrected.

### Authz / data scope (unchanged)

`POST /api/staff/cash-balance` (`loadMovements` / `loadTransactions`):

- `requireTenantStaff`
- `loadStaffInTenant` + `assertSelfOrTenantAdmin`
- `.eq('tenant_id', actor.tenant_id)` and `.eq('instructor_id', instructor.id)` on both loads

The calculator does **not** filter by tenant. Callers must pass rows the API already scoped.

Admin `load_staff_balances` scopes movements by caller `tenant_id`, but loads `cash_transactions` by `instructor_id` **without** a `tenant_id` filter (legacy null-tenant rows). Staff path keeps both filters.

---

## Constraints & pitfalls

1. **Feed vs header** — A handover line can still show a minus in the list; the header must not add it a second time. The feed rendering is unchanged.
2. **No dedupe** — Two `cash_handover` rows both subtract. `staff_cash_handover` has no idempotency key; the write path was not changed.
3. **Confirmed cash credits stay out** — Including known CHF 0.15 cash-credit and large invoice-credit deposits recorded as confirmed `cash_transactions`.
4. **Refunded-but-still-pending** receipts still increase the display total; target behaviour is undecided here.
5. **Do not edit** `server/api/staff/cash-balance.post.ts`, `staff_cash_handover`, or migrations for display math — #423 is client-side formula only.
6. **Ignore** `movement_type === 'cash_transaction'` in the calculator — counting it plus dropping confirmed receipts would double-subtract.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/staff-cash-balance.ts` | `calculateStaffCashBalance` |
| `utils/__tests__/staff-cash-balance.test.ts` | Formula + wiring contracts |
| `components/StaffCashBalance.vue` | «Aktueller Kassenstand»; calls calculator after load |
| `POST /api/staff/cash-balance` | Scoped movements/transactions only |
| `components/admin/CashBalanceManager.vue` | Admin calculated balance (handovers already in withdrawals) |
| `server/api/admin/cash-management.post.ts` | `load_staff_balances`, `staff_cash_handover` |

---

## Verify

```bash
npx vitest run utils/__tests__/staff-cash-balance.test.ts
```
