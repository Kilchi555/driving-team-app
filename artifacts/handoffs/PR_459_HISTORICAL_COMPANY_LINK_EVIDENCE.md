# PR #459 — Historical company-link evidence

Status: evidence plan only. No invoice was updated. No company was selected. Decision fields below are blank.

Ordinary write allowlist: **empty**. `CONFIRMABLE`: 0. `PRIVATE`: 0. `UNRESOLVED`: 49. `TECHNICAL_GATE_REQUIRED`: 15.

## 1. Query and PR heads

| Item | Value |
| --- | --- |
| Production project | Supabase `unyjaetebnaexaflpyoc` |
| Read | `SELECT` plus catalog and function definitions only |
| Row extract | 2026-10-16 16:22:38 CEST, `CURRENT_DATE` 2026-10-16 |
| Target set | 64 invoice ids, `md5` `afdf9bd401cdd3d70a8040e3945ec48e` |
| PR #459 | Draft. Head `e568b2957c39bfb497d58d6172bab20107ef65fb`. Base `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`. Not modified, not synced, not undrafted. |
| PR #461 | Draft for future invoice writes. Head `88732d0020619b0e97a200066e81648a461cc3b6`. Not modified. It does not backfill these 64 rows. |
| This handoff | Does not implement a write path. |

PR #459 changes eight files and no migration: `server/utils/company-invoice-link.ts`, `POST /api/admin/invoices/link-company`, `GET /api/admin/invoices/unlinked-company`, `pages/admin/company-invoice-links.vue`, a link on the companies page, two Vitest files, and `artifacts/handoffs/HISTORICAL_COMPANY_INVOICE_LINKING.md`.

The list endpoint returns invoices with `company_id` null, `document_kind = invoice`, and `billing_type = company`. Suggestions come from the current `users.company_id` and an exact normalized billing name. Each suggestion is `authoritative: false`. The save checkbox says the suggestions do not replace review. The checkbox is UI state. It is not stored evidence and it is not a historical decision.

The save sets only `company_id` and `updated_at`, for the caller's tenant, and only while `company_id` is still null. It refuses another tenant, an already linked row, a stale `updated_at`, and a row whose VAT or status trigger would change amounts or payment status. It then audits the old and new company id. It does not require a document from the invoice period. A confirmed click is therefore not enough for this evidence plan.

PR #459 would technically accept 45 of these rows: `billing_type = company` and the status trigger would not change payment status. Those 45 stay `UNRESOLVED` here. They are not on the write allowlist. The 4 `individual` rows are rejected by PR #459 because the billing type is not `company`. The 15 trigger rows are refused by `assessCompanyInvoiceLink`.

The unit fixture reuses production id `9364490e-7c25-4f4a-a5d6-35b3299fff86` with a stand-in due date. That test does not make the production row confirmable. On 2026-10-16 that row is paid, and its discovery company was created on 2026-08-13, after the invoice date 2026-02-09.

## 2. Evidence rule

A company may be recommended as `CONFIRMABLE` only when a record from the invoice period stores that `company_id` for this invoice. The following were checked and do not meet that bar:

| Source | Result across the 64 |
| --- | --- |
| `invoices.company_id` | NULL on every target row |
| `audit_logs.resource_id = invoice id` | 0 rows |
| `correspondence.company_id` for the client | 0 rows |
| Notes and internal notes containing a same-tenant company UUID | 0 invoices. Note text was not copied |
| `payments.company_id` | Column does not exist |
| `payments.invoice_address` | No `company_id` key. Three payments have a `company_name` key. That name is snapshot text, not a company id |
| `payments.company_billing_address_id` | Set on 22 invoices. The address table has no `company_id` |
| `users.company_id` and exact name match | Discovery only |
| Saved `company_billing_addresses` | Discovery only, including addresses that already existed |
| Company created after `invoice_date` or after `invoices.created_at` | Stays unresolved |
| Company in another tenant | 0 matches. Any such match would be rejected |

`PRIVATE` is reserved for an individual invoice whose snapshot company name is empty. Those invoices are outside these 64. The 4 individual rows inside the 64 have a non-empty company name, so they stay `UNRESOLVED`. The 17 company rows with an empty snapshot name also stay `UNRESOLVED`: `billing_type` is `company`, and absence of a name does not prove a private recipient.

`company_id = users.company_id` is not a backfill rule.

## 3. Ordinary write allowlist

No invoice id is allowed to change.

| invoice_id | before company_id | after company_id |
| --- | --- | --- |
| none |  |  |

Expected status and payment_status for every target row: unchanged. The full before/after register is in section 8. Every after value for `company_id` is NULL.

## 4. Fifteen trigger rows

`update_invoice_status` runs BEFORE UPDATE on `invoices` unless `document_kind` is `quote`. On 2026-10-16 it would change 15 of the 60 unlinked company invoices. None of the 4 individual rows are in this set. `calculate_invoice_vat` matches the stored amounts on all 64, and would still run on any update. These 15 are isolated from ordinary writes. This plan does not write them and does not disable the trigger.

| Invoice ID | Number | Date | status | payment_status | Ordinary UPDATE would | Planned company_id after |
| --- | --- | --- | --- | --- | --- | --- |
| `e1ac8880-0a40-4053-82c9-28effd878ba9` | RE-2026-0009 | 2026-04-18 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | RE-2026-0010 | 2026-04-19 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | RE-2026-0011 | 2026-04-19 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `01261371-4d06-47be-ba34-692e75893b6b` | RE-2026-0019 | 2026-07-07 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `0a906dbe-84b3-4546-8eb8-148911220f6a` | RE-2026-0020 | 2026-07-08 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `262a9f98-a0ce-41e0-bf70-7d71617692ce` | RE-2026-0028 | 2026-07-20 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | RE-2026-0037 | 2026-07-22 | `pdf_created` | `pending` | set status and payment_status to paid | NULL (no write) |
| `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | RE-2026-0045 | 2026-07-29 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `4ebce689-5261-4dc2-96f5-29b804ac50e8` | RE-2026-0046 | 2026-07-29 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | RE-2026-0073 | 2026-08-31 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | RE-2026-0075 | 2026-09-01 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | RE-2026-0085 | 2026-09-18 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `6addae71-24f5-49a0-aad7-d93650645da3` | RE-2026-0086 | 2026-09-18 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `7173f7e2-f714-4581-82dc-d26ee82cd03c` | RE-2026-0090 | 2026-09-24 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |
| `0209bc4b-fea5-4af8-914e-ec3a1612d134` | RE-2026-0096 | 2026-09-30 | `sent` | `pending` | set status and payment_status to overdue | NULL (no write) |

Fourteen rows are `sent` / `pending` with `due_date` before 2026-10-16. One row, `6f4415ac-944a-4d83-a39b-22bf2248eb8c` (`RE-2026-0037`, Driving Team), has total 0 and paid 0, so the paid condition is true. One invoice item points at an appointment, so a status change to paid would also mark that appointment paid.

Nine of the 15 also have an exact name and current membership on the same company. That discovery result does not move them onto the allowlist.

### Separately gated implementation

Not built in PR #459 and not built here.

1. Keep these 15 ids out of `POST /api/admin/invoices/link-company`.
2. Require the same contemporaneous `company_id` evidence as every other row, plus a human decision. None of the 15 has that evidence today, so a future gate still has nothing to write.
3. A later design must preserve `status`, `payment_status`, `paid_at`, amounts, and appointment status. Turning triggers off, or writing under a session that skips triggers, is not part of this plan.
4. Two acceptable later paths, each needing its own review: accounting explicitly accepts the status side effect before any write, or a reviewed change to `update_invoice_status` so a company-id-only update does not recalculate payment status. Neither path is authorized by this file.

## 5. Invoice with no user

`3400bd0b-786b-4444-8352-884c2d357f89`, number `RE-2026-0047`, tenant `driving-team`, date `2026-07-30`. `user_id` is NULL. Snapshot recipient is “Firma”, 8000 Zürich. `billing_type` is `individual`. No company name matches a company in any tenant. No membership can be read. Audit, correspondence, and notes contain no company id. Recommendation: `UNRESOLVED`. It appears once in the matrix.

## 6. Already linked invoices

These 11 stay out of the missing-link write set. Read on the same day: each still has its `company_id`, and none of the ids intersect the 64. This plan does not change them. Two of them, `a619b5b8-bb04-4667-8ace-47a55ce03597` and `10627ea1-4cda-4e58-b363-52c8f30ccb21`, are `sent` / `pending` with a past due date, so a later ordinary update would mark them overdue. That observation is not a write.

| Invoice ID | Number | Tenant | company_id | status | payment_status | In the 64 |
| --- | --- | --- | --- | --- | --- | --- |
| `bcdec1c7-334a-4a0a-9c0c-618d69eadd0c` | RE-2026-0057 | driving-team | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | `cancelled` | `pending` | no |
| `01da38a0-97bb-4437-a77d-1890a89b22fa` | RE-2026-0081 | driving-team | `98710fcf-0d5a-433f-b0b3-a33a1299c721` | `pdf_created` | `pending` | no |
| `a619b5b8-bb04-4667-8ace-47a55ce03597` | RE-2026-0094 | driving-team | `c88830c3-b0cc-409a-8739-c401a5d3aaf6` | `sent` | `pending` | no |
| `16b93534-aa15-4eb8-973e-6306aee77119` | RE-2026-0014 | fahrschule-gemperli | `af289ecc-6b79-4b13-9eac-3a6c425a21d4` | `cancelled` | `pending` | no |
| `e9ab3b88-ffc7-447e-964e-8a9bfc1a6231` | RE-2026-0015 | fahrschule-gemperli | `af289ecc-6b79-4b13-9eac-3a6c425a21d4` | `cancelled` | `pending` | no |
| `9f8752bf-2238-4a28-bebc-2f5c78d0f24c` | RE-2026-0016 | fahrschule-gemperli | `af289ecc-6b79-4b13-9eac-3a6c425a21d4` | `paid` | `paid` | no |
| `5d943837-3bf4-499e-a3d4-8025f2676ec4` | RE-2026-0023 | fahrschule-gemperli | `77cc4031-3254-47ee-b859-aff45ce8531b` | `cancelled` | `pending` | no |
| `45b5f1ef-fc00-4f7a-8b92-be3bff899d8f` | RE-2026-0040 | fahrschule-gemperli | `79aebff2-e0ee-457c-aa4e-3fdfd8d878a7` | `pdf_created` | `pending` | no |
| `10627ea1-4cda-4e58-b363-52c8f30ccb21` | RE-2026-0041 | fahrschule-gemperli | `64f84be8-638c-4011-86d6-d36e3730118d` | `sent` | `pending` | no |
| `76672ad8-a9c0-44ec-8640-58aec9092e33` | RE-2026-0061 | fahrschule-gemperli | `c1bbac4a-52c8-4c12-9934-6afacb382c79` | `pdf_created` | `pending` | no |
| `da8ca444-1b61-48ea-aa1f-d2b7a59ab9b1` | RE-2026-0001 | simych | `b16e48d4-97b5-4810-9629-015861031591` | `overdue` | `overdue` | no |

## 7. Matrix

Lookup key is the invoice id. Each row is exactly one of the 64. Recommendations are not decisions, and the decision fields are empty.

| Tenant | Invoice | ID | Date | Snapshot | Discovery candidates | Recommendation |
| --- | --- | --- | --- | --- | ---: | --- |
| driving-team | [2026-000005](#9364490e-7c25-4f4a-a5d6-35b3299fff86) | `9364490e-7c25-4f4a-a5d6-35b3299fff86` | 2026-02-09 | Baugenossenschaft Schönheim | 1 | `UNRESOLVED` |
| driving-team | [2026-000006](#dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb) | `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` | 2026-02-12 | Heilsarmee Zürich | 1 | `UNRESOLVED` |
| driving-team | [2026-000007](#e7bdb323-9762-486a-9751-391714727483) | `e7bdb323-9762-486a-9751-391714727483` | 2026-02-25 | Thomann Nutzfahrzeuge | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0009](#e1ac8880-0a40-4053-82c9-28effd878ba9) | `e1ac8880-0a40-4053-82c9-28effd878ba9` | 2026-04-18 | Driving Team Zürich GmbH | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0010](#77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3) | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | 2026-04-19 | Driving Team Zürich GmbH | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0011](#f41239b4-55c6-4094-a30f-2c9d9de1f49f) | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | 2026-04-19 | Driving Team Zürich GmbH | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0012](#23c3a657-ed02-46ac-8a51-69cf3c534448) | `23c3a657-ed02-46ac-8a51-69cf3c534448` | 2026-04-19 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0013](#1ce513c6-cf04-4bdf-a981-22787be2c1ca) | `1ce513c6-cf04-4bdf-a981-22787be2c1ca` | 2026-04-19 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0014](#b4e68f95-197e-446c-a556-14a968266060) | `b4e68f95-197e-446c-a556-14a968266060` | 2026-04-19 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0016](#59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5) | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | 2026-05-28 | Netconstruction GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0017](#2feb765f-b7e3-46e5-ae37-94c914af0065) | `2feb765f-b7e3-46e5-ae37-94c914af0065` | 2026-06-09 | Netconstruction GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0019](#01261371-4d06-47be-ba34-692e75893b6b) | `01261371-4d06-47be-ba34-692e75893b6b` | 2026-07-07 | Driving Team Zürich GmbH | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0020](#0a906dbe-84b3-4546-8eb8-148911220f6a) | `0a906dbe-84b3-4546-8eb8-148911220f6a` | 2026-07-08 | Driving Team Zürich GmbH | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0025](#7914f05f-cf63-488d-89c7-af15900fdf95) | `7914f05f-cf63-488d-89c7-af15900fdf95` | 2026-07-13 | empty | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0026](#baa3c2c6-df08-4a2c-bfba-1beedb6bfe21) | `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` | 2026-07-14 | Netconstruction GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0027](#585ee4fc-51f0-4475-821f-6c7c27055ba5) | `585ee4fc-51f0-4475-821f-6c7c27055ba5` | 2026-07-14 | Shathees | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0028](#262a9f98-a0ce-41e0-bf70-7d71617692ce) | `262a9f98-a0ce-41e0-bf70-7d71617692ce` | 2026-07-20 | Hans-Jörg Bowald | 0 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0029](#dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc) | `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` | 2026-07-21 | Auto-Mels GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0031](#54e47472-b5ba-4877-acc7-d4afabd2978c) | `54e47472-b5ba-4877-acc7-d4afabd2978c` | 2026-07-21 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0034](#1ea0a187-fbec-4b08-b107-e1f5fb8c27af) | `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` | 2026-07-21 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0036](#a0432aca-430b-4a0c-8735-264c801907fa) | `a0432aca-430b-4a0c-8735-264c801907fa` | 2026-07-22 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0037](#6f4415ac-944a-4d83-a39b-22bf2248eb8c) | `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | 2026-07-22 | Driving Team Zürich GmbH | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0043](#ff401ad9-f26b-4315-98ae-db8fe65dc219) | `ff401ad9-f26b-4315-98ae-db8fe65dc219` | 2026-07-24 | Frau | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0045](#7033c4f6-dcda-4995-a614-a6e2b5ddbd70) | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | 2026-07-29 | Pranvera Latifaj | 0 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0046](#4ebce689-5261-4dc2-96f5-29b804ac50e8) | `4ebce689-5261-4dc2-96f5-29b804ac50e8` | 2026-07-29 | Pranvera Latifaj | 0 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0047](#3400bd0b-786b-4444-8352-884c2d357f89) | `3400bd0b-786b-4444-8352-884c2d357f89` | 2026-07-30 | Firma | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0050](#3c3b6620-b1e4-4735-994b-b5b73164bf27) | `3c3b6620-b1e4-4735-994b-b5b73164bf27` | 2026-08-04 | Edelweiss Garten- und Grabenservice | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0051](#67dca57f-362e-4069-be6f-3c39ad1fa436) | `67dca57f-362e-4069-be6f-3c39ad1fa436` | 2026-08-06 | Pascal Kilchenmann | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0053](#b48b91c4-8fea-4cc8-8014-18e4b8a40f1f) | `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` | 2026-08-08 | Pascal Kilchenmann | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0054](#64be3632-165a-455c-98d1-4e7a85bf45e1) | `64be3632-165a-455c-98d1-4e7a85bf45e1` | 2026-08-13 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0055](#157c0e30-7bc0-43c9-a933-9a9063af2330) | `157c0e30-7bc0-43c9-a933-9a9063af2330` | 2026-08-13 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0056](#249db0f5-3b10-4827-92b0-a8ff70a19edd) | `249db0f5-3b10-4827-92b0-a8ff70a19edd` | 2026-08-13 | Driving Team Zürich GmbH | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0058](#84a81a5b-7b26-40d1-9161-ccec6373f118) | `84a81a5b-7b26-40d1-9161-ccec6373f118` | 2026-08-21 | MKW Swiss AG | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0061](#6a321fa4-c65a-4a66-92a2-ceb1b3494d34) | `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` | 2026-08-21 | Egli Jona AG | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0068](#3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81) | `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` | 2026-08-27 | samuel samuel | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0069](#ac308c69-91d1-43ca-a47c-a7c85029d93e) | `ac308c69-91d1-43ca-a47c-a7c85029d93e` | 2026-08-28 | Thomann Nutzfahrzeuge | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0073](#d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d) | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | 2026-08-31 | Yvonne Bettkober-Oum | 0 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0075](#bc2829f8-639d-48c0-baf6-9c81fd138bcc) | `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | 2026-09-01 | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0085](#4b6bad1c-e897-49d8-b3ba-301e94376dc4) | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | 2026-09-18 | Yvonne Bettkober-Oum | 0 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0086](#6addae71-24f5-49a0-aad7-d93650645da3) | `6addae71-24f5-49a0-aad7-d93650645da3` | 2026-09-18 | Tsering Ngodup | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0090](#7173f7e2-f714-4581-82dc-d26ee82cd03c) | `7173f7e2-f714-4581-82dc-d26ee82cd03c` | 2026-09-24 | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 | 1 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0096](#0209bc4b-fea5-4af8-914e-ec3a1612d134) | `0209bc4b-fea5-4af8-914e-ec3a1612d134` | 2026-09-30 | Mohamed Ahrram akel | 0 | `TECHNICAL_GATE_REQUIRED` |
| driving-team | [RE-2026-0099](#617cc446-45ec-467d-953d-4bd2fa03ba9c) | `617cc446-45ec-467d-953d-4bd2fa03ba9c` | 2026-10-08 | Viorel Manolache | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0103](#2e854034-50f3-48b4-9fc3-b8bdd348337c) | `2e854034-50f3-48b4-9fc3-b8bdd348337c` | 2026-10-12 | Viorel Manolache | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0104](#fbee557f-b631-4193-a40a-28b889ca54c5) | `fbee557f-b631-4193-a40a-28b889ca54c5` | 2026-10-15 | SBB/CFF/FFS | 1 | `UNRESOLVED` |
| driving-team | [RE-2026-0105](#f8ea72e0-7756-4db5-ae39-79dfb318434c) | `f8ea72e0-7756-4db5-ae39-79dfb318434c` | 2026-10-16 | Viorel Manolache | 0 | `UNRESOLVED` |
| driving-team | [RE-2026-0106](#6e07fe3e-1c78-406f-b134-175e4a12154c) | `6e07fe3e-1c78-406f-b134-175e4a12154c` | 2026-10-16 | Viorel Manolache | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0010](#28a7ebe7-04cd-4676-9b83-3c2be4df0b83) | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | 2026-07-22 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0012](#be80a098-7039-4c18-8843-e2d43fc00931) | `be80a098-7039-4c18-8843-e2d43fc00931` | 2026-07-22 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0013](#c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f) | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | 2026-07-29 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0021](#e72dc779-05b5-4dd9-9b2f-8966e7278a50) | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0024](#4a832b6c-15f5-4035-973c-8b8c11276216) | `4a832b6c-15f5-4035-973c-8b8c11276216` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0025](#1454bed1-e68a-4444-9af6-4d92ef8e980f) | `1454bed1-e68a-4444-9af6-4d92ef8e980f` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0026](#33d4b7e1-0ecd-45db-9717-df471a167db3) | `33d4b7e1-0ecd-45db-9717-df471a167db3` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0028](#65a0d6f7-48f1-4fee-8be3-749983cf11ca) | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0029](#f524dea2-25da-43fd-9194-6d5c201170de) | `f524dea2-25da-43fd-9194-6d5c201170de` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0030](#62c7bfe3-b427-4f49-9c8f-5e753c9c3589) | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0035](#a84d6fac-0efb-408d-9cf3-f156715c681b) | `a84d6fac-0efb-408d-9cf3-f156715c681b` | 2026-09-25 | Hutter Manfred GmbH | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0036](#c0b93f3e-fe62-4923-8b35-2c2a467ccc91) | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0037](#c32e038d-942c-49c6-82fe-ff7a9f4add61) | `c32e038d-942c-49c6-82fe-ff7a9f4add61` | 2026-09-25 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0044](#e6654110-120a-40c6-a3cf-0468fc2af62d) | `e6654110-120a-40c6-a3cf-0468fc2af62d` | 2026-10-03 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0045](#a27a1ace-d3f6-4c32-987e-d25b45ca4b1d) | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | 2026-10-04 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0048](#c373fb40-06d4-4821-b40a-85bf55e43e63) | `c373fb40-06d4-4821-b40a-85bf55e43e63` | 2026-10-04 | empty | 0 | `UNRESOLVED` |
| fahrschule-gemperli | [RE-2026-0049](#d12a4229-c50b-4016-a964-41857f8b2304) | `d12a4229-c50b-4016-a964-41857f8b2304` | 2026-10-04 | empty | 0 | `UNRESOLVED` |

<a id="9364490e-7c25-4f4a-a5d6-35b3299fff86"></a>
### 2026-000005 — `9364490e-7c25-4f4a-a5d6-35b3299fff86`

| Field | Value |
| --- | --- |
| Invoice ID | `9364490e-7c25-4f4a-a5d6-35b3299fff86` |
| Invoice number | 2026-000005 |
| Invoice date | 2026-02-09 |
| Created | 2026-02-09 09:07:35 CET |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `61250d85-045d-42ef-82ed-3c0765cb1861` |
| billing_type | `company` |
| Snapshot recipient | Baugenossenschaft Schönheim |
| Snapshot postal code and city | 8047 Zürich |
| Current company_id | NULL |
| Discovery candidates | `525bf160-906c-4886-9284-b6e68eb6195c` Baugenossenschaft Schönheim / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `525bf160-906c-4886-9284-b6e68eb6195c` (Baugenossenschaft Schönheim), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `e53dd179-201e-41b0-9923-3dc020466b68` name “Baugenossenschaft Schönheim”, 8047 Zürich, created 2025-12-18 10:31:09 CET, same tenant, existed at or before the invoice record. Name matches company ids: `525bf160-906c-4886-9284-b6e68eb6195c`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `1787aa2d-41b4-4455-8d2c-d18668f41efb` name “Baugenossenschaft Schönheim”, 8047 Zürich, created 2026-02-09 09:05:04 CET, same tenant, existed at or before the invoice record. Name matches company ids: `525bf160-906c-4886-9284-b6e68eb6195c`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb"></a>
### 2026-000006 — `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb`

| Field | Value |
| --- | --- |
| Invoice ID | `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` |
| Invoice number | 2026-000006 |
| Invoice date | 2026-02-12 |
| Created | 2026-02-12 15:44:40 CET |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `6c8a410e-4897-4cd8-94e3-1bfe81901e56` |
| billing_type | `company` |
| Snapshot recipient | Heilsarmee Zürich |
| Snapshot postal code and city | 8004 Zürich |
| Current company_id | NULL |
| Discovery candidates | `948dbd85-11a6-46f3-a119-e331b1a14c9d` Heilsarmee Zürich / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `948dbd85-11a6-46f3-a119-e331b1a14c9d` (Heilsarmee Zürich), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `57869120-9503-493c-9cab-03425aa4ef4b` name “Heilsarmee Zürich”, 8004 Zürich, created 2026-01-13 13:02:41 CET, same tenant, existed at or before the invoice record. Name matches company ids: `948dbd85-11a6-46f3-a119-e331b1a14c9d`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `283b68a7-c446-46bc-a056-f0c00e633c24` name “Heilsarmee Zürich”, 8004 Zürich, created 2026-02-05 10:55:04 CET, same tenant, existed at or before the invoice record. Name matches company ids: `948dbd85-11a6-46f3-a119-e331b1a14c9d`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `93491969-5b50-4584-930a-5f2bdba6da0d` stores company_billing_address_id `283b68a7-c446-46bc-a056-f0c00e633c24`, payment created 2026-02-05 10:55:07 CET, address created 2026-02-05 10:55:04 CET, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Heilsarmee Zürich”, 8004 Zürich. The payment row has no company_id.
- Payment `3b2bafde-04ed-4c86-afb6-70ffd59c1b03` stores company_billing_address_id `283b68a7-c446-46bc-a056-f0c00e633c24`, payment created 2026-02-05 10:55:44 CET, address created 2026-02-05 10:55:04 CET, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Heilsarmee Zürich”, 8004 Zürich. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="e7bdb323-9762-486a-9751-391714727483"></a>
### 2026-000007 — `e7bdb323-9762-486a-9751-391714727483`

| Field | Value |
| --- | --- |
| Invoice ID | `e7bdb323-9762-486a-9751-391714727483` |
| Invoice number | 2026-000007 |
| Invoice date | 2026-02-25 |
| Created | 2026-02-25 16:34:18 CET |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `921a7b2c-bfa2-4f7f-baf2-9112fee8223c` |
| billing_type | `company` |
| Snapshot recipient | Thomann Nutzfahrzeuge |
| Snapshot postal code and city | 8716 Schmerikon |
| Current company_id | NULL |
| Discovery candidates | `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` Thomann Nutzfahrzeuge / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` (Thomann Nutzfahrzeuge), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `6bab460f-3b51-4a6c-8846-7b8593f84adb` name “Thomann Nutzfahrzeuge”, 8716 Schmerikon, created 2026-01-20 07:44:29 CET, same tenant, existed at or before the invoice record. Name matches company ids: `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="e1ac8880-0a40-4053-82c9-28effd878ba9"></a>
### RE-2026-0009 — `e1ac8880-0a40-4053-82c9-28effd878ba9`

| Field | Value |
| --- | --- |
| Invoice ID | `e1ac8880-0a40-4053-82c9-28effd878ba9` |
| Invoice number | RE-2026-0009 |
| Invoice date | 2026-04-18 |
| Created | 2026-04-18 18:27:15 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-05-18 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3"></a>
### RE-2026-0010 — `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3`

| Field | Value |
| --- | --- |
| Invoice ID | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` |
| Invoice number | RE-2026-0010 |
| Invoice date | 2026-04-19 |
| Created | 2026-04-19 06:00:44 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-05-19 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="f41239b4-55c6-4094-a30f-2c9d9de1f49f"></a>
### RE-2026-0011 — `f41239b4-55c6-4094-a30f-2c9d9de1f49f`

| Field | Value |
| --- | --- |
| Invoice ID | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` |
| Invoice number | RE-2026-0011 |
| Invoice date | 2026-04-19 |
| Created | 2026-04-19 09:35:42 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-05-19 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="23c3a657-ed02-46ac-8a51-69cf3c534448"></a>
### RE-2026-0012 — `23c3a657-ed02-46ac-8a51-69cf3c534448`

| Field | Value |
| --- | --- |
| Invoice ID | `23c3a657-ed02-46ac-8a51-69cf3c534448` |
| Invoice number | RE-2026-0012 |
| Invoice date | 2026-04-19 |
| Created | 2026-04-19 14:27:32 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="1ce513c6-cf04-4bdf-a981-22787be2c1ca"></a>
### RE-2026-0013 — `1ce513c6-cf04-4bdf-a981-22787be2c1ca`

| Field | Value |
| --- | --- |
| Invoice ID | `1ce513c6-cf04-4bdf-a981-22787be2c1ca` |
| Invoice number | RE-2026-0013 |
| Invoice date | 2026-04-19 |
| Created | 2026-04-19 14:32:08 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 1; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="b4e68f95-197e-446c-a556-14a968266060"></a>
### RE-2026-0014 — `b4e68f95-197e-446c-a556-14a968266060`

| Field | Value |
| --- | --- |
| Invoice ID | `b4e68f95-197e-446c-a556-14a968266060` |
| Invoice number | RE-2026-0014 |
| Invoice date | 2026-04-19 |
| Created | 2026-04-19 14:50:03 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5"></a>
### RE-2026-0016 — `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5`

| Field | Value |
| --- | --- |
| Invoice ID | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` |
| Invoice number | RE-2026-0016 |
| Invoice date | 2026-05-28 |
| Created | 2026-05-28 15:53:10 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| billing_type | `individual` |
| Snapshot recipient | Netconstruction GmbH |
| Snapshot postal code and city | 8600 Dübendorf |
| Current company_id | NULL |
| Discovery candidates | `4d70d768-fbb8-40a1-84af-3336b52c50ab` Netconstruction GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `4d70d768-fbb8-40a1-84af-3336b52c50ab` (Netconstruction GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `cbe0c869-5e1d-4f62-9c59-5c6b603bcfc6` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-05-28 15:53:10 CEST, same tenant, was created after the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `115c16e8-0e91-456e-9b6f-369c5ca43469` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-06-08 18:16:26 CEST, same tenant, was created after the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `903ab8d4-ad17-40cf-86ca-4a649e277ccb` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-06-09 11:13:25 CEST, same tenant, was created after the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `aab44b58-cb5d-484d-a99d-a99993b0c575` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-07-14 14:20:31 CEST, same tenant, was created after the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 2; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="2feb765f-b7e3-46e5-ae37-94c914af0065"></a>
### RE-2026-0017 — `2feb765f-b7e3-46e5-ae37-94c914af0065`

| Field | Value |
| --- | --- |
| Invoice ID | `2feb765f-b7e3-46e5-ae37-94c914af0065` |
| Invoice number | RE-2026-0017 |
| Invoice date | 2026-06-09 |
| Created | 2026-06-09 20:25:38 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| billing_type | `company` |
| Snapshot recipient | Netconstruction GmbH |
| Snapshot postal code and city | 8600 Dübendorf |
| Current company_id | NULL |
| Discovery candidates | `4d70d768-fbb8-40a1-84af-3336b52c50ab` Netconstruction GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `4d70d768-fbb8-40a1-84af-3336b52c50ab` (Netconstruction GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `cbe0c869-5e1d-4f62-9c59-5c6b603bcfc6` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-05-28 15:53:10 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `115c16e8-0e91-456e-9b6f-369c5ca43469` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-06-08 18:16:26 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `903ab8d4-ad17-40cf-86ca-4a649e277ccb` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-06-09 11:13:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `aab44b58-cb5d-484d-a99d-a99993b0c575` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-07-14 14:20:31 CEST, same tenant, was created after the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `1e0a7a8c-a69e-4f4e-87da-5a69a5a3787b` stores company_billing_address_id `115c16e8-0e91-456e-9b6f-369c5ca43469`, payment created 2026-06-08 18:16:27 CEST, address created 2026-06-08 18:16:26 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Netconstruction GmbH”, 8600 Dübendorf. The payment row has no company_id.
- Payment `2d2ca428-0866-43ae-9694-37893cc17b0b` stores company_billing_address_id `903ab8d4-ad17-40cf-86ca-4a649e277ccb`, payment created 2026-06-09 11:13:25 CEST, address created 2026-06-09 11:13:25 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Netconstruction GmbH”, 8600 Dübendorf. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 2; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="01261371-4d06-47be-ba34-692e75893b6b"></a>
### RE-2026-0019 — `01261371-4d06-47be-ba34-692e75893b6b`

| Field | Value |
| --- | --- |
| Invoice ID | `01261371-4d06-47be-ba34-692e75893b6b` |
| Invoice number | RE-2026-0019 |
| Invoice date | 2026-07-07 |
| Created | 2026-07-07 20:24:07 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-09-06 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="0a906dbe-84b3-4546-8eb8-148911220f6a"></a>
### RE-2026-0020 — `0a906dbe-84b3-4546-8eb8-148911220f6a`

| Field | Value |
| --- | --- |
| Invoice ID | `0a906dbe-84b3-4546-8eb8-148911220f6a` |
| Invoice number | RE-2026-0020 |
| Invoice date | 2026-07-08 |
| Created | 2026-07-08 12:54:25 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-08-20 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="7914f05f-cf63-488d-89c7-af15900fdf95"></a>
### RE-2026-0025 — `7914f05f-cf63-488d-89c7-af15900fdf95`

| Field | Value |
| --- | --- |
| Invoice ID | `7914f05f-cf63-488d-89c7-af15900fdf95` |
| Invoice number | RE-2026-0025 |
| Invoice date | 2026-07-13 |
| Created | 2026-07-13 11:36:32 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `d82dd55b-1034-4727-9429-a433fd799830` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 5432 Neuenhof |
| Current company_id | NULL |
| Discovery candidates | `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` samuel samuel / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-27 09:13:48 CEST / current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` (samuel samuel), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-27 09:13:48 CEST. Source: current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row was created after the invoice.
- Saved address `85a3fadb-13fd-4f70-98c7-18cabe5d605f` name “samuel samuel”, 5432 Neuenhof, created 2026-07-11 14:10:40 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `dd5861dd-2003-48bc-881f-491c45e98cdd` name “samuel samuel”, 5432 Neuenhof, created 2026-07-13 11:06:29 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `09e929bf-d7e3-480b-b63d-677d160a7ee5` stores company_billing_address_id `dd5861dd-2003-48bc-881f-491c45e98cdd`, payment created 2026-07-13 11:06:30 CEST, address created 2026-07-13 11:06:29 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “samuel samuel”, 5432 Neuenhof. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="baa3c2c6-df08-4a2c-bfba-1beedb6bfe21"></a>
### RE-2026-0026 — `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21`

| Field | Value |
| --- | --- |
| Invoice ID | `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` |
| Invoice number | RE-2026-0026 |
| Invoice date | 2026-07-14 |
| Created | 2026-07-14 21:28:19 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| billing_type | `company` |
| Snapshot recipient | Netconstruction GmbH |
| Snapshot postal code and city | 8600 Dübendorf |
| Current company_id | NULL |
| Discovery candidates | `4d70d768-fbb8-40a1-84af-3336b52c50ab` Netconstruction GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `4d70d768-fbb8-40a1-84af-3336b52c50ab` (Netconstruction GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `cbe0c869-5e1d-4f62-9c59-5c6b603bcfc6` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-05-28 15:53:10 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `115c16e8-0e91-456e-9b6f-369c5ca43469` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-06-08 18:16:26 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `903ab8d4-ad17-40cf-86ca-4a649e277ccb` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-06-09 11:13:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `aab44b58-cb5d-484d-a99d-a99993b0c575` name “Netconstruction GmbH”, 8600 Dübendorf, created 2026-07-14 14:20:31 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `8181b3ee-cf20-4588-893e-0db091c5fd31` stores company_billing_address_id `aab44b58-cb5d-484d-a99d-a99993b0c575`, payment created 2026-07-14 14:20:32 CEST, address created 2026-07-14 14:20:31 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Netconstruction GmbH”, 8600 Dübendorf. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="585ee4fc-51f0-4475-821f-6c7c27055ba5"></a>
### RE-2026-0027 — `585ee4fc-51f0-4475-821f-6c7c27055ba5`

| Field | Value |
| --- | --- |
| Invoice ID | `585ee4fc-51f0-4475-821f-6c7c27055ba5` |
| Invoice number | RE-2026-0027 |
| Invoice date | 2026-07-14 |
| Created | 2026-07-14 22:24:33 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `115152c3-c88f-455b-8fd7-b4627e0ad196` |
| billing_type | `company` |
| Snapshot recipient | Shathees |
| Snapshot postal code and city | 8427 Freienstein |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `7c470951-bda6-49a9-819a-5baefc0de20c` name “Shathees”, 8427 Freienstein, created 2026-07-14 21:56:42 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 1; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="262a9f98-a0ce-41e0-bf70-7d71617692ce"></a>
### RE-2026-0028 — `262a9f98-a0ce-41e0-bf70-7d71617692ce`

| Field | Value |
| --- | --- |
| Invoice ID | `262a9f98-a0ce-41e0-bf70-7d71617692ce` |
| Invoice number | RE-2026-0028 |
| Invoice date | 2026-07-20 |
| Created | 2026-07-20 17:55:50 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `daa461ec-be44-44db-9743-2ee1a80a7be6` |
| billing_type | `company` |
| Snapshot recipient | Hans-Jörg Bowald |
| Snapshot postal code and city | 8730 Uznach |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-08-19 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `ccadf9dd-4f51-4865-b0df-7a35812681f0` name “Hans-Jörg Bowald”, 8730 Uznach, created 2026-07-20 17:54:23 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `caa43b94-cb9a-48e3-9de8-60f47c068993` stores company_billing_address_id `ccadf9dd-4f51-4865-b0df-7a35812681f0`, payment created 2026-07-20 17:54:25 CEST, address created 2026-07-20 17:54:23 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Hans-Jörg Bowald”, 8730 Uznach. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc"></a>
### RE-2026-0029 — `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc`

| Field | Value |
| --- | --- |
| Invoice ID | `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` |
| Invoice number | RE-2026-0029 |
| Invoice date | 2026-07-21 |
| Created | 2026-07-21 13:53:22 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `957c55e8-a0c2-438f-86a7-75b03227c6a6` |
| billing_type | `company` |
| Snapshot recipient | Auto-Mels GmbH |
| Snapshot postal code and city | 8853 Lachen |
| Current company_id | NULL |
| Discovery candidates | `f55df494-5bd7-4bba-b354-1b9bc302e33c` Auto-Mels GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `f55df494-5bd7-4bba-b354-1b9bc302e33c` (Auto-Mels GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `63c1c3d8-01e7-4347-8804-09e72f37cc6c` name “Auto-Mels GmbH”, 8853 Lachen, created 2026-07-21 13:51:50 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `f55df494-5bd7-4bba-b354-1b9bc302e33c`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="54e47472-b5ba-4877-acc7-d4afabd2978c"></a>
### RE-2026-0031 — `54e47472-b5ba-4877-acc7-d4afabd2978c`

| Field | Value |
| --- | --- |
| Invoice ID | `54e47472-b5ba-4877-acc7-d4afabd2978c` |
| Invoice number | RE-2026-0031 |
| Invoice date | 2026-07-21 |
| Created | 2026-07-21 19:51:28 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="1ea0a187-fbec-4b08-b107-e1f5fb8c27af"></a>
### RE-2026-0034 — `1ea0a187-fbec-4b08-b107-e1f5fb8c27af`

| Field | Value |
| --- | --- |
| Invoice ID | `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` |
| Invoice number | RE-2026-0034 |
| Invoice date | 2026-07-21 |
| Created | 2026-07-21 21:35:39 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="a0432aca-430b-4a0c-8735-264c801907fa"></a>
### RE-2026-0036 — `a0432aca-430b-4a0c-8735-264c801907fa`

| Field | Value |
| --- | --- |
| Invoice ID | `a0432aca-430b-4a0c-8735-264c801907fa` |
| Invoice number | RE-2026-0036 |
| Invoice date | 2026-07-22 |
| Created | 2026-07-22 05:03:39 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="6f4415ac-944a-4d83-a39b-22bf2248eb8c"></a>
### RE-2026-0037 — `6f4415ac-944a-4d83-a39b-22bf2248eb8c`

| Field | Value |
| --- | --- |
| Invoice ID | `6f4415ac-944a-4d83-a39b-22bf2248eb8c` |
| Invoice number | RE-2026-0037 |
| Invoice date | 2026-07-22 |
| Created | 2026-07-22 17:19:01 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. paid_amount_rappen 0 >= total_amount_rappen 0 while payment_status is `pending`. A normal UPDATE would set status and payment_status to paid and fill paid_at when empty. invoice_items.appointment_id count is 1; a resulting status of paid would also run update_appointment_status_on_invoice_paid. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-03-20 14:31:17 CET, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `d73052b3-588b-4c95-9869-bf06d10b6fe6` name “Driving Team Zürich GmbH”, 8610 Uster, created 2026-04-17 08:48:25 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="ff401ad9-f26b-4315-98ae-db8fe65dc219"></a>
### RE-2026-0043 — `ff401ad9-f26b-4315-98ae-db8fe65dc219`

| Field | Value |
| --- | --- |
| Invoice ID | `ff401ad9-f26b-4315-98ae-db8fe65dc219` |
| Invoice number | RE-2026-0043 |
| Invoice date | 2026-07-24 |
| Created | 2026-07-24 11:21:36 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `29b70261-9927-4472-9a7c-d8f57900aea2` |
| billing_type | `company` |
| Snapshot recipient | Frau |
| Snapshot postal code and city | 8854 Galgenen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `20d9d7c1-f2d7-4bfe-86a4-d4ca411a1d30` name “Frau”, 8854 Galgenen, created 2026-07-24 11:18:51 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 1; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="7033c4f6-dcda-4995-a614-a6e2b5ddbd70"></a>
### RE-2026-0045 — `7033c4f6-dcda-4995-a614-a6e2b5ddbd70`

| Field | Value |
| --- | --- |
| Invoice ID | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` |
| Invoice number | RE-2026-0045 |
| Invoice date | 2026-07-29 |
| Created | 2026-07-29 11:52:00 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `e55d8dd2-a75b-4ffe-beaf-da1353485229` |
| billing_type | `company` |
| Snapshot recipient | Pranvera Latifaj |
| Snapshot postal code and city | 8852 altendorf |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-08-31 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `59cd523e-f722-44fc-aa57-556e8dfcfa4c` name “Pranvera Latifaj”, 8852 altendorf, created 2026-07-29 11:51:08 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="4ebce689-5261-4dc2-96f5-29b804ac50e8"></a>
### RE-2026-0046 — `4ebce689-5261-4dc2-96f5-29b804ac50e8`

| Field | Value |
| --- | --- |
| Invoice ID | `4ebce689-5261-4dc2-96f5-29b804ac50e8` |
| Invoice number | RE-2026-0046 |
| Invoice date | 2026-07-29 |
| Created | 2026-07-29 11:52:36 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `e55d8dd2-a75b-4ffe-beaf-da1353485229` |
| billing_type | `company` |
| Snapshot recipient | Pranvera Latifaj |
| Snapshot postal code and city | 8852 altendorf |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-09-30 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `59cd523e-f722-44fc-aa57-556e8dfcfa4c` name “Pranvera Latifaj”, 8852 altendorf, created 2026-07-29 11:51:08 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="3400bd0b-786b-4444-8352-884c2d357f89"></a>
### RE-2026-0047 — `3400bd0b-786b-4444-8352-884c2d357f89`

| Field | Value |
| --- | --- |
| Invoice ID | `3400bd0b-786b-4444-8352-884c2d357f89` |
| Invoice number | RE-2026-0047 |
| Invoice date | 2026-07-30 |
| Created | 2026-07-30 10:25:57 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | NOT AVAILABLE |
| billing_type | `individual` |
| Snapshot recipient | Firma |
| Snapshot postal code and city | 8000 Zürich |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | No user_id. Current membership and saved client addresses cannot be read. The snapshot alone does not contain a company_id. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="3c3b6620-b1e4-4735-994b-b5b73164bf27"></a>
### RE-2026-0050 — `3c3b6620-b1e4-4735-994b-b5b73164bf27`

| Field | Value |
| --- | --- |
| Invoice ID | `3c3b6620-b1e4-4735-994b-b5b73164bf27` |
| Invoice number | RE-2026-0050 |
| Invoice date | 2026-08-04 |
| Created | 2026-08-04 11:35:43 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `85ca5ee5-2120-450a-b9ba-a97f43c86482` |
| billing_type | `individual` |
| Snapshot recipient | Edelweiss Garten- und Grabenservice |
| Snapshot postal code and city | 8804 Au bei Wädenswil |
| Current company_id | NULL |
| Discovery candidates | `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a` Edelweiss Garten- und Grabenservice / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a` (Edelweiss Garten- und Grabenservice), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `6fd6f1e4-ede2-4c6f-8192-f68a2686ec3f` name “Edelweiss Garten- und Grabenservice”, 8804 Au bei Wädenswil, created 2026-08-04 11:35:44 CEST, same tenant, was created after the invoice record. Name matches company ids: `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="67dca57f-362e-4069-be6f-3c39ad1fa436"></a>
### RE-2026-0051 — `67dca57f-362e-4069-be6f-3c39ad1fa436`

| Field | Value |
| --- | --- |
| Invoice ID | `67dca57f-362e-4069-be6f-3c39ad1fa436` |
| Invoice number | RE-2026-0051 |
| Invoice date | 2026-08-06 |
| Created | 2026-08-06 03:18:57 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `013190f1-b87f-4d96-887e-545765a76d03` |
| billing_type | `company` |
| Snapshot recipient | Pascal Kilchenmann |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `58458c7a-7c46-4ad5-8e62-c811594e3539` name “Driving Team Zürich GmbH”, 8048 Zürich, created 2026-07-31 07:54:35 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `b8d0a028-f7e1-4f1d-8ae7-2d57f5479201` stores company_billing_address_id `58458c7a-7c46-4ad5-8e62-c811594e3539`, payment created 2026-08-06 03:18:37 CEST, address created 2026-07-31 07:54:35 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Driving Team Zürich GmbH”, 8048 Zürich. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="b48b91c4-8fea-4cc8-8014-18e4b8a40f1f"></a>
### RE-2026-0053 — `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f`

| Field | Value |
| --- | --- |
| Invoice ID | `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` |
| Invoice number | RE-2026-0053 |
| Invoice date | 2026-08-08 |
| Created | 2026-08-08 20:00:53 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `013190f1-b87f-4d96-887e-545765a76d03` |
| billing_type | `company` |
| Snapshot recipient | Pascal Kilchenmann |
| Snapshot postal code and city | 8610 Uster |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: current users.company_id. Zip or city does not match the snapshot, or was not compared as a match. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `58458c7a-7c46-4ad5-8e62-c811594e3539` name “Driving Team Zürich GmbH”, 8048 Zürich, created 2026-07-31 07:54:35 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="64be3632-165a-455c-98d1-4e7a85bf45e1"></a>
### RE-2026-0054 — `64be3632-165a-455c-98d1-4e7a85bf45e1`

| Field | Value |
| --- | --- |
| Invoice ID | `64be3632-165a-455c-98d1-4e7a85bf45e1` |
| Invoice number | RE-2026-0054 |
| Invoice date | 2026-08-13 |
| Created | 2026-08-13 07:36:32 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `013190f1-b87f-4d96-887e-545765a76d03` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8048 Zürich |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `58458c7a-7c46-4ad5-8e62-c811594e3539` name “Driving Team Zürich GmbH”, 8048 Zürich, created 2026-07-31 07:54:35 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="157c0e30-7bc0-43c9-a933-9a9063af2330"></a>
### RE-2026-0055 — `157c0e30-7bc0-43c9-a933-9a9063af2330`

| Field | Value |
| --- | --- |
| Invoice ID | `157c0e30-7bc0-43c9-a933-9a9063af2330` |
| Invoice number | RE-2026-0055 |
| Invoice date | 2026-08-13 |
| Created | 2026-08-13 08:41:20 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `013190f1-b87f-4d96-887e-545765a76d03` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8048 Zürich |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `58458c7a-7c46-4ad5-8e62-c811594e3539` name “Driving Team Zürich GmbH”, 8048 Zürich, created 2026-07-31 07:54:35 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="249db0f5-3b10-4827-92b0-a8ff70a19edd"></a>
### RE-2026-0056 — `249db0f5-3b10-4827-92b0-a8ff70a19edd`

| Field | Value |
| --- | --- |
| Invoice ID | `249db0f5-3b10-4827-92b0-a8ff70a19edd` |
| Invoice number | RE-2026-0056 |
| Invoice date | 2026-08-13 |
| Created | 2026-08-13 08:43:59 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `d13439ab-8034-4731-9fa8-81f636e3440c` |
| billing_type | `company` |
| Snapshot recipient | Driving Team Zürich GmbH |
| Snapshot postal code and city | 8048 Zürich |
| Current company_id | NULL |
| Discovery candidates | `5ec738cc-fc27-424a-9934-af5cbb8069ca` Driving Team Zürich GmbH / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-07-07 08:11:45 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-07-07 08:11:45 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `f3a3c296-f9bf-4955-9497-305cc45973eb` name “Driving Team Zürich GmbH”, 8048 Zürich, created 2026-08-13 08:42:28 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="84a81a5b-7b26-40d1-9161-ccec6373f118"></a>
### RE-2026-0058 — `84a81a5b-7b26-40d1-9161-ccec6373f118`

| Field | Value |
| --- | --- |
| Invoice ID | `84a81a5b-7b26-40d1-9161-ccec6373f118` |
| Invoice number | RE-2026-0058 |
| Invoice date | 2026-08-21 |
| Created | 2026-08-21 12:30:28 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `57d59f7b-c0ee-4255-9286-a5656392f86c` |
| billing_type | `company` |
| Snapshot recipient | MKW Swiss AG |
| Snapshot postal code and city | 5325 Leibstadt |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="6a321fa4-c65a-4a66-92a2-ceb1b3494d34"></a>
### RE-2026-0061 — `6a321fa4-c65a-4a66-92a2-ceb1b3494d34`

| Field | Value |
| --- | --- |
| Invoice ID | `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` |
| Invoice number | RE-2026-0061 |
| Invoice date | 2026-08-21 |
| Created | 2026-08-21 12:59:54 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `ee2228c9-ebf6-4a8f-9b48-6bed91191ded` |
| billing_type | `company` |
| Snapshot recipient | Egli Jona AG |
| Snapshot postal code and city | 8645 Jona |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `eaada120-046e-4de3-a09a-dc6f1ddc1437` name “Oleksandr Sharkevych”, 8730 Uznach, created 2026-08-21 12:49:20 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81"></a>
### RE-2026-0068 — `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81`

| Field | Value |
| --- | --- |
| Invoice ID | `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` |
| Invoice number | RE-2026-0068 |
| Invoice date | 2026-08-27 |
| Created | 2026-08-27 09:14:20 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `d82dd55b-1034-4727-9429-a433fd799830` |
| billing_type | `company` |
| Snapshot recipient | samuel samuel |
| Snapshot postal code and city | 5432 Neuenhof |
| Current company_id | NULL |
| Discovery candidates | `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` samuel samuel / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-27 09:13:48 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` (samuel samuel), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-27 09:13:48 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `85a3fadb-13fd-4f70-98c7-18cabe5d605f` name “samuel samuel”, 5432 Neuenhof, created 2026-07-11 14:10:40 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Saved address `dd5861dd-2003-48bc-881f-491c45e98cdd` name “samuel samuel”, 5432 Neuenhof, created 2026-07-13 11:06:29 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `ab90b570-3054-4b58-9dd3-9283d604a3b9` stores company_billing_address_id `dd5861dd-2003-48bc-881f-491c45e98cdd`, payment created 2026-08-27 09:13:50 CEST, address created 2026-07-13 11:06:29 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “samuel samuel”, 5432 Neuenhof. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="ac308c69-91d1-43ca-a47c-a7c85029d93e"></a>
### RE-2026-0069 — `ac308c69-91d1-43ca-a47c-a7c85029d93e`

| Field | Value |
| --- | --- |
| Invoice ID | `ac308c69-91d1-43ca-a47c-a7c85029d93e` |
| Invoice number | RE-2026-0069 |
| Invoice date | 2026-08-28 |
| Created | 2026-08-28 10:25:29 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `78d3cf71-109b-4a68-bb18-2cd5b888a356` |
| billing_type | `individual` |
| Snapshot recipient | Thomann Nutzfahrzeuge |
| Snapshot postal code and city | 8716 Schmerikon |
| Current company_id | NULL |
| Discovery candidates | `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` Thomann Nutzfahrzeuge / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` (Thomann Nutzfahrzeuge), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `f748a42d-736b-4e2c-b2ef-d3ff48985216` name “Thomann Nutzfahrzeuge”, 8716 Schmerikon, created 2026-08-28 10:28:28 CEST, same tenant, was created after the invoice record. Name matches company ids: `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d"></a>
### RE-2026-0073 — `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d`

| Field | Value |
| --- | --- |
| Invoice ID | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` |
| Invoice number | RE-2026-0073 |
| Invoice date | 2026-08-31 |
| Created | 2026-08-31 10:59:07 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `b5274670-f062-4c9f-8956-cc60bc1a03e8` |
| billing_type | `company` |
| Snapshot recipient | Yvonne Bettkober-Oum |
| Snapshot postal code and city | 8806 Bäch-SZ |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-09-10 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `efbe584c-1d7e-4599-afd6-4eb00b0d615d` name “Yvonne Bettkober-Oum”, 8806 Bäch-SZ, created 2026-08-31 10:55:20 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="bc2829f8-639d-48c0-baf6-9c81fd138bcc"></a>
### RE-2026-0075 — `bc2829f8-639d-48c0-baf6-9c81fd138bcc`

| Field | Value |
| --- | --- |
| Invoice ID | `bc2829f8-639d-48c0-baf6-9c81fd138bcc` |
| Invoice number | RE-2026-0075 |
| Invoice date | 2026-09-01 |
| Created | 2026-09-01 16:06:44 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `091cfdbe-affa-4bfb-afd6-185b5fc83e3e` |
| billing_type | `company` |
| Snapshot recipient | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur |
| Snapshot postal code and city | 3000 Bern |
| Current company_id | NULL |
| Discovery candidates | `a7aca99e-b132-4327-aa52-9f788e51dc4a` Schweizerische Bundesbahn SBB Kreditoren Infrastruktur / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-08-13 06:38:59 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-09-11 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `a7aca99e-b132-4327-aa52-9f788e51dc4a` (Schweizerische Bundesbahn SBB Kreditoren Infrastruktur), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-08-13 06:38:59 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `2cb6a9d3-0a44-4ff0-bafe-0ab1894fc0ac` name “Schweizerische Bundesbahn SBB Kreditoren Infrastruktur”, 3000 Bern, created 2026-07-28 16:13:06 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `a7aca99e-b132-4327-aa52-9f788e51dc4a`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `416de19d-74c1-44ff-bb3d-07c1bd6b5285` stores company_billing_address_id `2cb6a9d3-0a44-4ff0-bafe-0ab1894fc0ac`, payment created 2026-08-10 15:20:07 CEST, address created 2026-07-28 16:13:06 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Schweizerische Bundesbahn SBB Kreditoren Infrastruktur”, 3000 Bern. The payment row has no company_id.
- Payment `d470562d-cade-44d6-8c14-5141cdd045c9` stores company_billing_address_id `2cb6a9d3-0a44-4ff0-bafe-0ab1894fc0ac`, payment created 2026-09-01 15:52:55 CEST, address created 2026-07-28 16:13:06 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “Schweizerische Bundesbahn SBB Kreditoren Infrastruktur”, 3000 Bern. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="4b6bad1c-e897-49d8-b3ba-301e94376dc4"></a>
### RE-2026-0085 — `4b6bad1c-e897-49d8-b3ba-301e94376dc4`

| Field | Value |
| --- | --- |
| Invoice ID | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` |
| Invoice number | RE-2026-0085 |
| Invoice date | 2026-09-18 |
| Created | 2026-09-18 09:10:13 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `b5274670-f062-4c9f-8956-cc60bc1a03e8` |
| billing_type | `company` |
| Snapshot recipient | Yvonne Bettkober-Oum |
| Snapshot postal code and city | 8806 Bäch-SZ |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-09-28 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `efbe584c-1d7e-4599-afd6-4eb00b0d615d` name “Yvonne Bettkober-Oum”, 8806 Bäch-SZ, created 2026-08-31 10:55:20 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="6addae71-24f5-49a0-aad7-d93650645da3"></a>
### RE-2026-0086 — `6addae71-24f5-49a0-aad7-d93650645da3`

| Field | Value |
| --- | --- |
| Invoice ID | `6addae71-24f5-49a0-aad7-d93650645da3` |
| Invoice number | RE-2026-0086 |
| Invoice date | 2026-09-18 |
| Created | 2026-09-18 09:26:46 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `497d0ef4-0772-4de0-a196-b05e45f5429f` |
| billing_type | `company` |
| Snapshot recipient | Tsering Ngodup |
| Snapshot postal code and city | 8640 Rapperswil |
| Current company_id | NULL |
| Discovery candidates | `45f7abc5-158b-4d6a-b559-736024d2cf2e` Tsering Ngodup / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-09-21 11:51:24 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-09-28 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. At least one discovery candidate was created after the invoice and stays unresolved. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `45f7abc5-158b-4d6a-b559-736024d2cf2e` (Tsering Ngodup), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-09-21 11:51:24 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row was created after the invoice.
- Saved address `24dc3877-70fe-4e0c-9d08-1916cbc1b310` name “Tsering Ngodup”, 8640 Rapperswil, created 2026-09-18 09:08:34 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `45f7abc5-158b-4d6a-b559-736024d2cf2e`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="7173f7e2-f714-4581-82dc-d26ee82cd03c"></a>
### RE-2026-0090 — `7173f7e2-f714-4581-82dc-d26ee82cd03c`

| Field | Value |
| --- | --- |
| Invoice ID | `7173f7e2-f714-4581-82dc-d26ee82cd03c` |
| Invoice number | RE-2026-0090 |
| Invoice date | 2026-09-24 |
| Created | 2026-09-24 11:08:17 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `1eb5a3d8-c7dd-4113-8589-6b238ba6ceee` |
| billing_type | `company` |
| Snapshot recipient | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 |
| Snapshot postal code and city | 8001 Zürich |
| Current company_id | NULL |
| Discovery candidates | `32a4dccc-82ba-44d2-8286-9d967005fd10` SBB, Abt. PP-BP- CTL- TSP1- ZUE2 / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-09-24 11:06:31 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-10-04 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `32a4dccc-82ba-44d2-8286-9d967005fd10` (SBB, Abt. PP-BP- CTL- TSP1- ZUE2), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-09-24 11:06:31 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `9e2bf09d-a90b-4fe9-aae4-58cf19d99184` name “SBB, Abt. PP-BP- CTL- TSP1- ZUE2”, 8001 Zürich, created 2026-09-24 11:06:32 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `32a4dccc-82ba-44d2-8286-9d967005fd10`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `75029ddb-0ecb-4c56-8d55-f5a7d2fee516` stores company_billing_address_id `9e2bf09d-a90b-4fe9-aae4-58cf19d99184`, payment created 2026-09-24 11:06:34 CEST, address created 2026-09-24 11:06:32 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “SBB, Abt. PP-BP- CTL- TSP1- ZUE2”, 8001 Zürich. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="0209bc4b-fea5-4af8-914e-ec3a1612d134"></a>
### RE-2026-0096 — `0209bc4b-fea5-4af8-914e-ec3a1612d134`

| Field | Value |
| --- | --- |
| Invoice ID | `0209bc4b-fea5-4af8-914e-ec3a1612d134` |
| Invoice number | RE-2026-0096 |
| Invoice date | 2026-09-30 |
| Created | 2026-09-30 08:50:35 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `3506e031-1cb2-43cc-a854-5b6acd7fc9c2` |
| billing_type | `company` |
| Snapshot recipient | Mohamed Ahrram akel |
| Snapshot postal code and city | 6417 Sattel |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | yes. due_date 2026-10-10 is before 2026-10-16, status is `sent`, payment_status is `pending`. A normal UPDATE would set status and payment_status to overdue. |
| Recommendation | `TECHNICAL_GATE_REQUIRED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. Ordinary update is blocked because update_invoice_status would change payment status. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `b80e09e8-abcb-420a-bfca-aadeb088c394` name “Mohamed Ahrram akel”, 6417 Sattel, created 2026-09-29 14:25:30 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="617cc446-45ec-467d-953d-4bd2fa03ba9c"></a>
### RE-2026-0099 — `617cc446-45ec-467d-953d-4bd2fa03ba9c`

| Field | Value |
| --- | --- |
| Invoice ID | `617cc446-45ec-467d-953d-4bd2fa03ba9c` |
| Invoice number | RE-2026-0099 |
| Invoice date | 2026-10-08 |
| Created | 2026-10-08 19:36:35 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| billing_type | `company` |
| Snapshot recipient | Viorel Manolache |
| Snapshot postal code and city | 8310 Grafstal |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `e0e002d0-239c-4528-871b-f3eef7e08275` name “Viorel Manolache”, 8310 Grafstal, created 2026-10-08 19:35:42 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="2e854034-50f3-48b4-9fc3-b8bdd348337c"></a>
### RE-2026-0103 — `2e854034-50f3-48b4-9fc3-b8bdd348337c`

| Field | Value |
| --- | --- |
| Invoice ID | `2e854034-50f3-48b4-9fc3-b8bdd348337c` |
| Invoice number | RE-2026-0103 |
| Invoice date | 2026-10-12 |
| Created | 2026-10-12 17:14:16 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| billing_type | `company` |
| Snapshot recipient | Viorel Manolache |
| Snapshot postal code and city | 8310 Grafstal |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `e0e002d0-239c-4528-871b-f3eef7e08275` name “Viorel Manolache”, 8310 Grafstal, created 2026-10-08 19:35:42 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="fbee557f-b631-4193-a40a-28b889ca54c5"></a>
### RE-2026-0104 — `fbee557f-b631-4193-a40a-28b889ca54c5`

| Field | Value |
| --- | --- |
| Invoice ID | `fbee557f-b631-4193-a40a-28b889ca54c5` |
| Invoice number | RE-2026-0104 |
| Invoice date | 2026-10-15 |
| Created | 2026-10-15 13:43:12 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `8a35c9d5-119b-42e6-a93e-7f0e799cb7d5` |
| billing_type | `company` |
| Snapshot recipient | SBB/CFF/FFS |
| Snapshot postal code and city | 8001 Zürich |
| Current company_id | NULL |
| Discovery candidates | `60a9dd26-742c-44c9-ae51-8ecf331b5529` SBB/CFF/FFS / tenant `64259d68-195a-4c68-8875-f1b44d962830` / created 2026-10-15 13:39:36 CEST / exact normalized snapshot name and current users.company_id |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Discovery only for `60a9dd26-742c-44c9-ae51-8ecf331b5529` (SBB/CFF/FFS), tenant `64259d68-195a-4c68-8875-f1b44d962830`, created 2026-10-15 13:39:36 CEST. Source: exact normalized snapshot name and current users.company_id. Zip and city match the snapshot. Company row existed at the invoice timestamp. That still does not identify this invoice's company_id.
- Saved address `ea31fa78-4fb1-4a82-92a2-e77a7a060035` name “SBB/CFF/FFS”, 8001 Zürich, created 2026-10-15 13:34:22 CEST, same tenant, existed at or before the invoice record. Name matches company ids: `60a9dd26-742c-44c9-ae51-8ecf331b5529`. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- Payment `6883d706-207f-43b8-a37c-21a797ec3998` stores company_billing_address_id `ea31fa78-4fb1-4a82-92a2-e77a7a060035`, payment created 2026-10-15 13:39:51 CEST, address created 2026-10-15 13:34:22 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “SBB/CFF/FFS”, 8001 Zürich. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="f8ea72e0-7756-4db5-ae39-79dfb318434c"></a>
### RE-2026-0105 — `f8ea72e0-7756-4db5-ae39-79dfb318434c`

| Field | Value |
| --- | --- |
| Invoice ID | `f8ea72e0-7756-4db5-ae39-79dfb318434c` |
| Invoice number | RE-2026-0105 |
| Invoice date | 2026-10-16 |
| Created | 2026-10-16 07:51:54 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| billing_type | `company` |
| Snapshot recipient | Viorel Manolache |
| Snapshot postal code and city | 8310 Grafstal |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `e0e002d0-239c-4528-871b-f3eef7e08275` name “Viorel Manolache”, 8310 Grafstal, created 2026-10-08 19:35:42 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="6e07fe3e-1c78-406f-b134-175e4a12154c"></a>
### RE-2026-0106 — `6e07fe3e-1c78-406f-b134-175e4a12154c`

| Field | Value |
| --- | --- |
| Invoice ID | `6e07fe3e-1c78-406f-b134-175e4a12154c` |
| Invoice number | RE-2026-0106 |
| Invoice date | 2026-10-16 |
| Created | 2026-10-16 07:52:25 CEST |
| Tenant | Fahrschule Driving Team (`driving-team`, `64259d68-195a-4c68-8875-f1b44d962830`) |
| user_id | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| billing_type | `company` |
| Snapshot recipient | Viorel Manolache |
| Snapshot postal code and city | 8310 Grafstal |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Saved address `e0e002d0-239c-4528-871b-f3eef7e08275` name “Viorel Manolache”, 8310 Grafstal, created 2026-10-08 19:35:42 CEST, same tenant, existed at or before the invoice record. Name matches company ids: none. `company_billing_addresses` has no company_id. This is candidate discovery, not proof.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="28a7ebe7-04cd-4676-9b83-3c2be4df0b83"></a>
### RE-2026-0010 — `28a7ebe7-04cd-4676-9b83-3c2be4df0b83`

| Field | Value |
| --- | --- |
| Invoice ID | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` |
| Invoice number | RE-2026-0010 |
| Invoice date | 2026-07-22 |
| Created | 2026-07-22 16:33:36 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `25738075-4814-4627-84ec-0af53627caad` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8864 Reichenburg |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="be80a098-7039-4c18-8843-e2d43fc00931"></a>
### RE-2026-0012 — `be80a098-7039-4c18-8843-e2d43fc00931`

| Field | Value |
| --- | --- |
| Invoice ID | `be80a098-7039-4c18-8843-e2d43fc00931` |
| Invoice number | RE-2026-0012 |
| Invoice date | 2026-07-22 |
| Created | 2026-07-22 17:28:32 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `25738075-4814-4627-84ec-0af53627caad` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8864 Reichenburg |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f"></a>
### RE-2026-0013 — `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f`

| Field | Value |
| --- | --- |
| Invoice ID | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` |
| Invoice number | RE-2026-0013 |
| Invoice date | 2026-07-29 |
| Created | 2026-07-29 11:02:54 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `25738075-4814-4627-84ec-0af53627caad` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8864 Reichenburg |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="e72dc779-05b5-4dd9-9b2f-8966e7278a50"></a>
### RE-2026-0021 — `e72dc779-05b5-4dd9-9b2f-8966e7278a50`

| Field | Value |
| --- | --- |
| Invoice ID | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` |
| Invoice number | RE-2026-0021 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:02:42 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `93aafe9f-4f0f-4fcc-9ca4-34ff31aeb138` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8853 Lachen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="4a832b6c-15f5-4035-973c-8b8c11276216"></a>
### RE-2026-0024 — `4a832b6c-15f5-4035-973c-8b8c11276216`

| Field | Value |
| --- | --- |
| Invoice ID | `4a832b6c-15f5-4035-973c-8b8c11276216` |
| Invoice number | RE-2026-0024 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:11:58 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `45f1230d-d4c7-418c-a751-8fc88a8bece5` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8717 Benken |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `4326eff4-fa54-4e8a-8148-d899f3803985` stores company_billing_address_id `2dd0dd5a-73a5-497b-b339-cfd40f69034a`, payment created 2026-08-31 19:04:07 CEST, address created 2026-08-31 19:04:06 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8717 Benken. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="1454bed1-e68a-4444-9af6-4d92ef8e980f"></a>
### RE-2026-0025 — `1454bed1-e68a-4444-9af6-4d92ef8e980f`

| Field | Value |
| --- | --- |
| Invoice ID | `1454bed1-e68a-4444-9af6-4d92ef8e980f` |
| Invoice number | RE-2026-0025 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:12:54 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `49eb2477-aea0-46d6-98d4-9a543e6cd7e5` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8855 Wangen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `5acfe466-3f93-4556-9be6-5e66a45b6fdf` stores company_billing_address_id `afb7f10f-603e-47f1-be5f-bcd8c0e2bbfd`, payment created 2026-08-20 09:56:54 CEST, address created 2026-08-20 09:56:53 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Wangen. The payment row has no company_id.
- Payment `41b41665-f80e-4f5b-8545-f854c3f5ce3b` stores company_billing_address_id `afb7f10f-603e-47f1-be5f-bcd8c0e2bbfd`, payment created 2026-08-20 09:57:45 CEST, address created 2026-08-20 09:56:53 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Wangen. The payment row has no company_id.
- Payment `bb7f6978-e29c-45d7-b771-5cd182ba4569` stores company_billing_address_id `afb7f10f-603e-47f1-be5f-bcd8c0e2bbfd`, payment created 2026-08-28 23:34:58 CEST, address created 2026-08-20 09:56:53 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Wangen. The payment row has no company_id.
- Payment `0b8e64eb-2c20-4692-bd3a-b2befe5cca0d` stores company_billing_address_id `afb7f10f-603e-47f1-be5f-bcd8c0e2bbfd`, payment created 2026-09-11 23:33:13 CEST, address created 2026-08-20 09:56:53 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Wangen. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="33d4b7e1-0ecd-45db-9717-df471a167db3"></a>
### RE-2026-0026 — `33d4b7e1-0ecd-45db-9717-df471a167db3`

| Field | Value |
| --- | --- |
| Invoice ID | `33d4b7e1-0ecd-45db-9717-df471a167db3` |
| Invoice number | RE-2026-0026 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:13:18 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `9353ac8e-e31a-4585-9347-420ec51c9052` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8730 Uznach |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `ffa041b7-8889-4f2b-a263-6dd7322ff811` stores company_billing_address_id `327f2449-3cb9-4adb-9ba5-deadc9dbce92`, payment created 2026-09-11 15:08:00 CEST, address created 2026-09-11 15:07:59 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8730 Uznach. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="65a0d6f7-48f1-4fee-8be3-749983cf11ca"></a>
### RE-2026-0028 — `65a0d6f7-48f1-4fee-8be3-749983cf11ca`

| Field | Value |
| --- | --- |
| Invoice ID | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` |
| Invoice number | RE-2026-0028 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:14:15 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `fa801286-4717-4048-a1fd-7324e1e6ba42` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8855 Nuolen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `44439c97-bd9c-4c92-b559-a9d8b3e3ce88` stores company_billing_address_id `6ec8061e-5fc8-4a53-b633-3e218ee450ba`, payment created 2026-09-01 13:03:41 CEST, address created 2026-09-01 13:03:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Nuolen. The payment row has no company_id.
- Payment `49da0d5e-453e-48e3-9fea-e54b7f62cc29` stores company_billing_address_id `6ec8061e-5fc8-4a53-b633-3e218ee450ba`, payment created 2026-09-08 12:41:09 CEST, address created 2026-09-01 13:03:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Nuolen. The payment row has no company_id.
- Payment `29cd1c7a-92ac-4f02-b204-6d48acf268ed` stores company_billing_address_id `6ec8061e-5fc8-4a53-b633-3e218ee450ba`, payment created 2026-09-23 17:01:09 CEST, address created 2026-09-01 13:03:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Nuolen. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="f524dea2-25da-43fd-9194-6d5c201170de"></a>
### RE-2026-0029 — `f524dea2-25da-43fd-9194-6d5c201170de`

| Field | Value |
| --- | --- |
| Invoice ID | `f524dea2-25da-43fd-9194-6d5c201170de` |
| Invoice number | RE-2026-0029 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:14:44 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `c335664d-4635-4aa6-87f2-b25facfc7ac3` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8856 Tuggen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `37482c52-94b0-4065-8752-0c1c95336411` stores company_billing_address_id `ee3a2185-1c7b-40e2-b556-019783a344a4`, payment created 2026-09-01 18:50:24 CEST, address created 2026-09-01 18:50:23 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8856 Tuggen. The payment row has no company_id.
- Payment `9d8f92eb-6c9c-4436-8bea-3e56494a1181` stores company_billing_address_id `ee3a2185-1c7b-40e2-b556-019783a344a4`, payment created 2026-09-08 16:06:27 CEST, address created 2026-09-01 18:50:23 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8856 Tuggen. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="62c7bfe3-b427-4f49-9c8f-5e753c9c3589"></a>
### RE-2026-0030 — `62c7bfe3-b427-4f49-9c8f-5e753c9c3589`

| Field | Value |
| --- | --- |
| Invoice ID | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` |
| Invoice number | RE-2026-0030 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 06:16:50 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `96cc9316-f2fa-4d1f-8c43-b115c33bf9c4` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8855 Altendorf |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `d99e8047-4b07-4b6d-9f7a-46a00e11f61e` stores company_billing_address_id `0c13403a-e857-456e-a731-77a14687dd46`, payment created 2026-08-25 18:11:20 CEST, address created 2026-08-25 18:11:19 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Altendorf. The payment row has no company_id.
- Payment `388a5cfe-d6d1-4f22-a368-6253d828b179` stores company_billing_address_id `0c13403a-e857-456e-a731-77a14687dd46`, payment created 2026-08-25 18:11:59 CEST, address created 2026-08-25 18:11:19 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Altendorf. The payment row has no company_id.
- Payment `067bbce6-a08e-4e64-8900-e332c7759332` stores company_billing_address_id `0c13403a-e857-456e-a731-77a14687dd46`, payment created 2026-09-25 06:16:34 CEST, address created 2026-08-25 18:11:19 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8855 Altendorf. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="a84d6fac-0efb-408d-9cf3-f156715c681b"></a>
### RE-2026-0035 — `a84d6fac-0efb-408d-9cf3-f156715c681b`

| Field | Value |
| --- | --- |
| Invoice ID | `a84d6fac-0efb-408d-9cf3-f156715c681b` |
| Invoice number | RE-2026-0035 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 09:30:26 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `3aac1035-a338-474e-b1d7-b5b8fa74321c` |
| billing_type | `company` |
| Snapshot recipient | Hutter Manfred GmbH |
| Snapshot postal code and city | 8864 Reichenburg |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- No same-tenant company candidate. No saved company-name address. No payment billing-address id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="c0b93f3e-fe62-4923-8b35-2c2a467ccc91"></a>
### RE-2026-0036 — `c0b93f3e-fe62-4923-8b35-2c2a467ccc91`

| Field | Value |
| --- | --- |
| Invoice ID | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` |
| Invoice number | RE-2026-0036 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 09:30:56 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `a45c9f25-4ce8-4889-ab53-0b836943613e` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8854 Siebnen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `e3b4fecb-2c66-4f0f-93f7-05446bf14de2` stores company_billing_address_id `7d321d19-16b6-46d7-a498-f40f0ed2bd14`, payment created 2026-09-23 17:03:14 CEST, address created 2026-09-23 17:03:13 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Siebnen. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="c32e038d-942c-49c6-82fe-ff7a9f4add61"></a>
### RE-2026-0037 — `c32e038d-942c-49c6-82fe-ff7a9f4add61`

| Field | Value |
| --- | --- |
| Invoice ID | `c32e038d-942c-49c6-82fe-ff7a9f4add61` |
| Invoice number | RE-2026-0037 |
| Invoice date | 2026-09-25 |
| Created | 2026-09-25 09:31:45 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `ac756996-42d0-4ce7-87e2-88d506030f95` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8854 Schübelbach |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `e5bb14f4-dd92-403e-9a22-3f00782078e5` stores company_billing_address_id `7438d175-ebd0-4fc7-a39f-b9a3e30f299e`, payment created 2026-08-20 16:31:41 CEST, address created 2026-08-20 16:31:39 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Schübelbach. The payment row has no company_id.
- Payment `f9f581a2-5fc8-4164-9009-2a132647654f` stores company_billing_address_id `7438d175-ebd0-4fc7-a39f-b9a3e30f299e`, payment created 2026-08-20 20:15:52 CEST, address created 2026-08-20 16:31:39 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Schübelbach. The payment row has no company_id.
- Payment `49003e6f-9a21-4f16-ad74-9b082fd7a703` stores company_billing_address_id `7438d175-ebd0-4fc7-a39f-b9a3e30f299e`, payment created 2026-08-27 17:10:31 CEST, address created 2026-08-20 16:31:39 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Schübelbach. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="e6654110-120a-40c6-a3cf-0468fc2af62d"></a>
### RE-2026-0044 — `e6654110-120a-40c6-a3cf-0468fc2af62d`

| Field | Value |
| --- | --- |
| Invoice ID | `e6654110-120a-40c6-a3cf-0468fc2af62d` |
| Invoice number | RE-2026-0044 |
| Invoice date | 2026-10-03 |
| Created | 2026-10-03 20:36:30 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `808d204c-a4a2-4450-ac63-8bb19eeb8be9` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8840 Einsiedelm |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `463ee14a-ddb4-4a0d-8d89-c3294a8b3dd2` stores company_billing_address_id `cfaae4db-e7e0-452d-a0b6-02963026b567`, payment created 2026-08-28 23:36:03 CEST, address created 2026-08-28 23:36:57 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8840 Einsiedelm. The payment row has no company_id.
- Payment `ed119db7-51ba-4545-9357-480a9501a058` stores company_billing_address_id `cfaae4db-e7e0-452d-a0b6-02963026b567`, payment created 2026-08-29 16:06:34 CEST, address created 2026-08-28 23:36:57 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8840 Einsiedelm. The payment row has no company_id.
- Payment `dd6ef93d-650c-412c-9b6c-cdfff15eeb36` stores company_billing_address_id `cfaae4db-e7e0-452d-a0b6-02963026b567`, payment created 2026-09-08 20:04:16 CEST, address created 2026-08-28 23:36:57 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8840 Einsiedelm. The payment row has no company_id.
- Payment `b2756e9c-5432-40bc-a2c0-09c462a81460` stores company_billing_address_id `cfaae4db-e7e0-452d-a0b6-02963026b567`, payment created 2026-09-21 17:57:40 CEST, address created 2026-08-28 23:36:57 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8840 Einsiedelm. The payment row has no company_id.
- Payment `22219419-7960-40a8-9d9d-323b952e1e55` stores company_billing_address_id `cfaae4db-e7e0-452d-a0b6-02963026b567`, payment created 2026-10-01 14:18:45 CEST, address created 2026-08-28 23:36:57 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8840 Einsiedelm. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="a27a1ace-d3f6-4c32-987e-d25b45ca4b1d"></a>
### RE-2026-0045 — `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d`

| Field | Value |
| --- | --- |
| Invoice ID | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` |
| Invoice number | RE-2026-0045 |
| Invoice date | 2026-10-04 |
| Created | 2026-10-04 14:35:30 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `d3f62966-933c-493d-b8c4-f1bdbe43cf39` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8807 Freienbach |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `4a04516b-49bc-487e-b9d8-1900a3a62dec` stores company_billing_address_id `b3a864f6-cade-4749-93b1-04695062ee0c`, payment created 2026-08-17 18:04:41 CEST, address created 2026-08-17 18:04:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8807 Freienbach. The payment row has no company_id.
- Payment `c17d759f-3674-4bcd-927c-2587b488373b` stores company_billing_address_id `b3a864f6-cade-4749-93b1-04695062ee0c`, payment created 2026-08-17 18:06:08 CEST, address created 2026-08-17 18:04:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8807 Freienbach. The payment row has no company_id.
- Payment `24395031-d690-4981-af03-15ab3de51950` stores company_billing_address_id `b3a864f6-cade-4749-93b1-04695062ee0c`, payment created 2026-08-29 08:54:14 CEST, address created 2026-08-17 18:04:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8807 Freienbach. The payment row has no company_id.
- Payment `31d7af36-dcb7-488f-9f9d-9eac97824422` stores company_billing_address_id `b3a864f6-cade-4749-93b1-04695062ee0c`, payment created 2026-09-04 06:57:48 CEST, address created 2026-08-17 18:04:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8807 Freienbach. The payment row has no company_id.
- Payment `e9f3d6ef-b278-4e25-aa1b-b9e757db3c97` stores company_billing_address_id `b3a864f6-cade-4749-93b1-04695062ee0c`, payment created 2026-09-15 17:12:51 CEST, address created 2026-08-17 18:04:40 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8807 Freienbach. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="c373fb40-06d4-4821-b40a-85bf55e43e63"></a>
### RE-2026-0048 — `c373fb40-06d4-4821-b40a-85bf55e43e63`

| Field | Value |
| --- | --- |
| Invoice ID | `c373fb40-06d4-4821-b40a-85bf55e43e63` |
| Invoice number | RE-2026-0048 |
| Invoice date | 2026-10-04 |
| Created | 2026-10-04 14:55:39 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `3d0e2daa-3b0b-4a36-87e6-0d81b80459ec` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8854 Siebnen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `cab2694d-9072-42da-ac8d-ba5189805961` stores company_billing_address_id `0590ffe2-d40f-49f6-9c0c-558c24d036c4`, payment created 2026-08-29 16:22:31 CEST, address created 2026-08-29 16:22:30 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Siebnen. The payment row has no company_id.
- Payment `ae79a483-1969-4bc1-93b4-2dd8f611681a` stores company_billing_address_id `0590ffe2-d40f-49f6-9c0c-558c24d036c4`, payment created 2026-09-02 20:11:53 CEST, address created 2026-08-29 16:22:30 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Siebnen. The payment row has no company_id.
- Payment `3b0cc8dd-4019-40aa-9c48-350575c759d5` stores company_billing_address_id `0590ffe2-d40f-49f6-9c0c-558c24d036c4`, payment created 2026-09-09 19:26:03 CEST, address created 2026-08-29 16:22:30 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Siebnen. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.

<a id="d12a4229-c50b-4016-a964-41857f8b2304"></a>
### RE-2026-0049 — `d12a4229-c50b-4016-a964-41857f8b2304`

| Field | Value |
| --- | --- |
| Invoice ID | `d12a4229-c50b-4016-a964-41857f8b2304` |
| Invoice number | RE-2026-0049 |
| Invoice date | 2026-10-04 |
| Created | 2026-10-04 15:01:36 CEST |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`, `660b72a9-c67b-4763-85d7-b7ba6605e59e`) |
| user_id | `c0b54e28-5dbb-4ff3-9349-50522606be11` |
| billing_type | `company` |
| Snapshot recipient | empty |
| Snapshot postal code and city | 8854 Siebnen |
| Current company_id | NULL |
| Discovery candidates | none |
| Tenant isolation | PASS. No other-tenant company is a candidate. |
| Payment-status trigger | no. The known status condition does not fire. calculate_invoice_vat would still run and, for this row, rewrite the same amounts. |
| Recommendation | `UNRESOLVED` |
| Missing evidence | A human still has to supply evidence from the invoice period that names the company_id. Current membership and address-name matches are not that evidence. There is no same-tenant discovery candidate to confirm. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

Evidence dated against the invoice:

- Payment `f45c90d4-ab8d-493e-a697-4f6bb1d242ea` stores company_billing_address_id `4abd68db-d0a9-45c4-98ea-60c7e75889f4`, payment created 2026-09-04 13:05:09 CEST, address created 2026-09-04 13:05:07 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Siebnen. The payment row has no company_id.
- Payment `4ab9daa8-fc7e-4d56-8f45-969cfde958f6` stores company_billing_address_id `4abd68db-d0a9-45c4-98ea-60c7e75889f4`, payment created 2026-09-16 10:59:07 CEST, address created 2026-09-04 13:05:07 CEST, address existed at invoice record: yes, address tenant matches invoice: yes. Address name “NOT AVAILABLE”, 8854 Siebnen. The payment row has no company_id.
- audit_logs for this invoice id: 0. correspondence rows for this client with a company_id: 0. Notes contain a same-tenant company UUID: no. Note text was not copied. Dunning log rows: 0; that log has no company_id.
- No record from the invoice period stores this invoice's company_id. Historical company association: not established.


## 8. Before and after register

This is the planned result of the empty allowlist. It is not an executed statement.

| Invoice ID | before company_id | after company_id | before status | before payment_status | Write |
| --- | --- | --- | --- | --- | --- |
| `9364490e-7c25-4f4a-a5d6-35b3299fff86` | NULL | NULL | `paid` | `paid` | none |
| `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` | NULL | NULL | `paid` | `paid` | none |
| `e7bdb323-9762-486a-9751-391714727483` | NULL | NULL | `paid` | `paid` | none |
| `e1ac8880-0a40-4053-82c9-28effd878ba9` | NULL | NULL | `sent` | `pending` | none |
| `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | NULL | NULL | `sent` | `pending` | none |
| `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | NULL | NULL | `sent` | `pending` | none |
| `23c3a657-ed02-46ac-8a51-69cf3c534448` | NULL | NULL | `paid` | `paid` | none |
| `1ce513c6-cf04-4bdf-a981-22787be2c1ca` | NULL | NULL | `cancelled` | `overdue` | none |
| `b4e68f95-197e-446c-a556-14a968266060` | NULL | NULL | `paid` | `paid` | none |
| `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | NULL | NULL | `overdue` | `overdue` | none |
| `2feb765f-b7e3-46e5-ae37-94c914af0065` | NULL | NULL | `paid` | `paid` | none |
| `01261371-4d06-47be-ba34-692e75893b6b` | NULL | NULL | `sent` | `pending` | none |
| `0a906dbe-84b3-4546-8eb8-148911220f6a` | NULL | NULL | `sent` | `pending` | none |
| `7914f05f-cf63-488d-89c7-af15900fdf95` | NULL | NULL | `paid` | `paid` | none |
| `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` | NULL | NULL | `paid` | `paid` | none |
| `585ee4fc-51f0-4475-821f-6c7c27055ba5` | NULL | NULL | `pdf_created` | `pending` | none |
| `262a9f98-a0ce-41e0-bf70-7d71617692ce` | NULL | NULL | `sent` | `pending` | none |
| `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` | NULL | NULL | `paid` | `paid` | none |
| `54e47472-b5ba-4877-acc7-d4afabd2978c` | NULL | NULL | `pdf_created` | `pending` | none |
| `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` | NULL | NULL | `pdf_created` | `pending` | none |
| `a0432aca-430b-4a0c-8735-264c801907fa` | NULL | NULL | `cancelled` | `pending` | none |
| `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | NULL | NULL | `pdf_created` | `pending` | none |
| `ff401ad9-f26b-4315-98ae-db8fe65dc219` | NULL | NULL | `paid` | `paid` | none |
| `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | NULL | NULL | `sent` | `pending` | none |
| `4ebce689-5261-4dc2-96f5-29b804ac50e8` | NULL | NULL | `sent` | `pending` | none |
| `3400bd0b-786b-4444-8352-884c2d357f89` | NULL | NULL | `cancelled` | `pending` | none |
| `3c3b6620-b1e4-4735-994b-b5b73164bf27` | NULL | NULL | `paid` | `paid` | none |
| `67dca57f-362e-4069-be6f-3c39ad1fa436` | NULL | NULL | `cancelled` | `pending` | none |
| `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` | NULL | NULL | `cancelled` | `pending` | none |
| `64be3632-165a-455c-98d1-4e7a85bf45e1` | NULL | NULL | `cancelled` | `pending` | none |
| `157c0e30-7bc0-43c9-a933-9a9063af2330` | NULL | NULL | `cancelled` | `pending` | none |
| `249db0f5-3b10-4827-92b0-a8ff70a19edd` | NULL | NULL | `cancelled` | `pending` | none |
| `84a81a5b-7b26-40d1-9161-ccec6373f118` | NULL | NULL | `overdue` | `overdue` | none |
| `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` | NULL | NULL | `paid` | `paid` | none |
| `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` | NULL | NULL | `paid` | `paid` | none |
| `ac308c69-91d1-43ca-a47c-a7c85029d93e` | NULL | NULL | `paid` | `paid` | none |
| `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | NULL | NULL | `sent` | `pending` | none |
| `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | NULL | NULL | `sent` | `pending` | none |
| `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | NULL | NULL | `sent` | `pending` | none |
| `6addae71-24f5-49a0-aad7-d93650645da3` | NULL | NULL | `sent` | `pending` | none |
| `7173f7e2-f714-4581-82dc-d26ee82cd03c` | NULL | NULL | `sent` | `pending` | none |
| `0209bc4b-fea5-4af8-914e-ec3a1612d134` | NULL | NULL | `sent` | `pending` | none |
| `617cc446-45ec-467d-953d-4bd2fa03ba9c` | NULL | NULL | `pdf_created` | `pending` | none |
| `2e854034-50f3-48b4-9fc3-b8bdd348337c` | NULL | NULL | `pdf_created` | `pending` | none |
| `fbee557f-b631-4193-a40a-28b889ca54c5` | NULL | NULL | `sent` | `pending` | none |
| `f8ea72e0-7756-4db5-ae39-79dfb318434c` | NULL | NULL | `pdf_created` | `pending` | none |
| `6e07fe3e-1c78-406f-b134-175e4a12154c` | NULL | NULL | `pdf_created` | `pending` | none |
| `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | NULL | NULL | `cancelled` | `pending` | none |
| `be80a098-7039-4c18-8843-e2d43fc00931` | NULL | NULL | `cancelled` | `pending` | none |
| `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | NULL | NULL | `paid` | `paid` | none |
| `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | NULL | NULL | `paid` | `paid` | none |
| `4a832b6c-15f5-4035-973c-8b8c11276216` | NULL | NULL | `paid` | `paid` | none |
| `1454bed1-e68a-4444-9af6-4d92ef8e980f` | NULL | NULL | `pdf_created` | `pending` | none |
| `33d4b7e1-0ecd-45db-9717-df471a167db3` | NULL | NULL | `paid` | `paid` | none |
| `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | NULL | NULL | `pdf_created` | `pending` | none |
| `f524dea2-25da-43fd-9194-6d5c201170de` | NULL | NULL | `paid` | `paid` | none |
| `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | NULL | NULL | `paid` | `paid` | none |
| `a84d6fac-0efb-408d-9cf3-f156715c681b` | NULL | NULL | `paid` | `paid` | none |
| `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | NULL | NULL | `paid` | `paid` | none |
| `c32e038d-942c-49c6-82fe-ff7a9f4add61` | NULL | NULL | `pdf_created` | `pending` | none |
| `e6654110-120a-40c6-a3cf-0468fc2af62d` | NULL | NULL | `pdf_created` | `pending` | none |
| `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | NULL | NULL | `pdf_created` | `pending` | none |
| `c373fb40-06d4-4821-b40a-85bf55e43e63` | NULL | NULL | `paid` | `paid` | none |
| `d12a4229-c50b-4016-a964-41857f8b2304` | NULL | NULL | `paid` | `paid` | none |

## 9. Stop

PR #459 and PR #461 were not edited. No migration, trigger change, status update, merge, undraft, deployment, or branch sync was done. Production and the decision fields were left unchanged. Further implementation waits for a separate instruction and for evidence that can name a `company_id` from the invoice period.
