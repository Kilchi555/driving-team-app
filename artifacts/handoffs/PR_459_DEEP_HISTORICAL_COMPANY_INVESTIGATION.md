# PR #459 — Deep historical company investigation

Read-only investigation on 2026-10-16 against production Supabase `unyjaetebnaexaflpyoc`. No invoice, payment, client, company, address, or accounting row was updated. No migration, backfill, trigger change, email, or customer contact was made. PR #459 and PR #461 were not modified. The earlier evidence file `artifacts/handoffs/PR_459_HISTORICAL_COMPANY_LINK_EVIDENCE.md` is unchanged.

Invoice identity is the invoice UUID plus tenant. Invoice numbers repeat across tenants and are not used as keys.

## Scope check

The target set was re-read from production with the same definition as the evidence file: `document_kind = invoice`, `company_id` null, and either `billing_type = company` or `billing_type = individual` with a non-empty billing company name.

| Set | Expected | Recomputed | Result |
|---|---:|---:|---|
| Target invoices | 64 | 64 | Match. Sorted-id MD5 `afdf9bd401cdd3d70a8040e3945ec48e` |
| Of which company billing | 60 | 60 | Match |
| Of which individual with a company name | 4 | 4 | Match |
| Already linked company invoices | 11 | 11 | Match. All have a null client id and a same-tenant company. Not in the 64 |
| Trigger-risk subset | 15 | 15 | Match. All 15 are inside the 64. Listed again only in section F |
| Quotes | 4 | 4 | Out of scope |

Tenants in the 64: driving-team 47, fahrschule-gemperli 17. No target invoice is in simych. No discrepancy in counts or membership of the 64.

Already linked, context only:

| Invoice ID | Tenant | Number |
|---|---|---|
| `bcdec1c7-334a-4a0a-9c0c-618d69eadd0c` | driving-team | RE-2026-0057 |
| `01da38a0-97bb-4437-a77d-1890a89b22fa` | driving-team | RE-2026-0081 |
| `a619b5b8-bb04-4667-8ace-47a55ce03597` | driving-team | RE-2026-0094 |
| `16b93534-aa15-4eb8-973e-6306aee77119` | fahrschule-gemperli | RE-2026-0014 |
| `e9ab3b88-ffc7-447e-964e-8a9bfc1a6231` | fahrschule-gemperli | RE-2026-0015 |
| `9f8752bf-2238-4a28-bebc-2f5c78d0f24c` | fahrschule-gemperli | RE-2026-0016 |
| `5d943837-3bf4-499e-a3d4-8025f2676ec4` | fahrschule-gemperli | RE-2026-0023 |
| `45b5f1ef-fc00-4f7a-8b92-be3bff899d8f` | fahrschule-gemperli | RE-2026-0040 |
| `10627ea1-4cda-4e58-b363-52c8f30ccb21` | fahrschule-gemperli | RE-2026-0041 |
| `76672ad8-a9c0-44ec-8640-58aec9092e33` | fahrschule-gemperli | RE-2026-0061 |
| `da8ca444-1b61-48ea-aa1f-d2b7a59ab9b1` | simych | RE-2026-0001 |

## How a recipient was stored

Observed from the current code and from `git log` on the invoice write path:

- `server/utils/invoice-persist-and-send.ts` copies `billing_type` and `billing_company_name` onto the invoice. That file's history contains no assignment of `invoices.company_id`.
- `server/utils/auto-invoice-on-complete.ts` sets `billing_type` to company when the saved billing address has a company name. It reads `users.company_id` and `default_company_billing_address_id` and does not write `company_id` onto the invoice.
- A company picked in the company-invoice modal can send `company_id`. The 11 already linked invoices have no client id, which fits that path. The 64 do not.
- Commit `f732f466` (2026-08-13) added one-click company billing from the assigned company address. Invoices dated before that change were filled from the older profile and saved-address path.
- `server/utils/invoice-pdf.ts` and `server/api/invoices/download.post.ts` render the PDF from the snapshot columns held on the invoice at render time. A PDF generated now is a new rendering of those columns. It is not an independent copy from the invoice date.
- `company_billing_addresses` has tenant, user, and created-by foreign keys. It has no `company_id`. A saved address can supply the name that was copied into the snapshot. That makes the address and the snapshot one chain, not two independent records.
- `companies` has no `deleted_at` and no rename history. Zero companies are inactive. Four company rows have `updated_at` more than a minute after `created_at`. That is a later edit, not an old name.
- There is no membership-history table. `users.company_id` is the current membership only.

Thirty-four of the 64 invoice rows have `updated_at` on a later calendar day than `created_at`. A later update may have been status, payment, or the snapshot. This database does not store the previous snapshot. Where those dates differ, the snapshot is not proven to be the original text.

## A. Executive summary

| Result | Count |
|---|---:|
| Invoices investigated | 64 |
| Historically confirmed | 0 |
| Probable, human review required | 2 |
| Unresolved | 62 |
| Supported as a personal/private recipient | 0 |
| Grade A | 0 |
| Grade B | 3 |
| Grade C | 23 |
| Grade D | 38 |

Grade A would require a contemporaneous document that names the billed entity and a validated tenant company. None was found. Grade B is an independent dated record that agrees with the snapshot: three bank debtors do that. Two of those also match one later company master and are the only probable cases. The third bank agreement, Egli Jona AG, has no company row, so it stays unresolved. Grade C is a current name and membership match without an independent record (23). Grade D is contradictory or too thin to name a company (38): empty company snapshots, a personal name on a company billing type, a placeholder word, a name with no company row, or a bank debtor that disagrees.

Narrow disagreements inside those grades:

- Bank debtor disagrees with the snapshot: 5.
- Snapshot is the client's personal name while billing type is company: 11. None of these is classified as a private recipient. The billing type says company, and no order or email shows a private purchase.
- Name-matched company whose place differs from the snapshot: 12.
- Name-matched company row created after the invoice record: 15.
- Invoice row updated after its creation day: 34.
- Cancelled target invoices: 10. Cancellation does not identify the recipient.

No invoice has sufficient evidence for an automatic company id. Two invoices have sufficient evidence to propose a company id for a human decision. That proposal is not a write.

### Sources inspected

| Source | What was done | Result for the 64 |
|---|---|---|
| `invoices`, `invoice_items`, `users`, `companies`, `company_billing_addresses`, `tenants` | Re-read. Name match uses the same normalization as `flattenCompanyName` | 29 snapshots match exactly one same-tenant company. 14 of those company rows existed at the invoice record. 0 match more than one company. 0 match another tenant |
| `payments`, `payments.invoice_address`, `payments.company_billing_address_id` | Address chain checked again | An address id is not a company id. A payment-address name was not treated as new proof |
| `payment_audit_logs` | 464 rows on 132 payments of these invoices | 0 contain a `company_id` value. 132 contain a billing-address id |
| `payment_logs` | Table counted | 0 rows in the table |
| `bank_import_records` | Joined on `invoice_id` and tenant. Debtor text compared, not copied | 9 rows on 8 invoices. 3 debtors equal the snapshot. 5 invoices have a debtor that does not |
| `accounting_entries` | Joined through `linked_payment_id`. Description compared with the snapshot, not copied | 69 entries on 23 invoices. One description contains the snapshot, and that snapshot is a person name |
| `imported_invoices` | Number plus tenant | 17,934 import rows, 0 matches |
| `audit_logs` | `resource_id` and invoice resource type | 0 rows for these invoice ids. 0 company-update actions |
| `invoice_dunning_log` | Counted per invoice | 5 target invoices have a dunning row. The log has no company id. Bodies were not copied |
| `email_messages` | 78 rows, by client id and by invoice number in subject or body | 0 |
| `correspondence`, `correspondence_messages` | 66 and 77 rows, by client id | 0 correspondence for these clients, 0 with a company id |
| `outbound_messages_queue` | 18,804 rows, by invoice id in `context_data` and by invoice number in subject or body | 0 |
| `reminder_logs` | 16 rows, by payment or client | 0 |
| `sms_logs` | 708 rows, by invoice number in the message | 0 |
| `user_documents` | 44 rows, by client, file name, title, or storage path | 0 |
| `storage.objects` bucket `receipts` | Counted and classified. File bytes were not downloaded | 162 objects under `invoices/`, 3 under `dunning/`. Keys that contain an invoice number do not contain a tenant id or a client id. All 55 strict number matches against the 64 also match the same number in another tenant, so none was attributed |
| `public_course_invoice_mail_claims`, course registration and binding | Counted | 0 |
| Appointments via `invoice_items.appointment_id` | Counted | 63 invoices have at least one appointment item. 1 has none. Appointments carry the client id, not a company id |
| Git history of the invoice write path | `git log -S company_id` and the 2026-08-13 billing commit | The ordinary save path has never stored `company_id` |

### Sources not available

- No Gmail, Resend, Drive, or other mailbox connector is connected. In-app mail tables were searched. External mailboxes were not.
- No accounting package outside this database is connected. `accounting_entries` and `bank_import_records` were the accounting sources.
- No backup, point-in-time snapshot, or archived database was available to read. Nothing was restored.
- Stored PDF bytes were not opened. The object key is not tenant-scoped, and current downloads use a random UUID, so a file could not be assigned to one invoice id.
- Public company registries were not used. They can show that a legal name exists. They cannot show that the entity was the customer on one of these invoices.

## B. Invoice-by-invoice evidence matrix

The table is the main target matrix. Each of the 64 invoice ids appears once. The notes under it give the dated evidence, the conflict, the rationale, and the next evidence for that same id.

<!-- MATRIX_START -->
| Invoice ID | Tenant | Number | Invoice date | Record created | Billing type | Snapshot recipient | Place | Candidate company | Company ID | Company row created | Existed at invoice record | Grade | Classification | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `9364490e-7c25-4f4a-a5d6-35b3299fff86` | driving-team | 2026-000005 | 2026-02-09 | 2026-02-09 | company | Baugenossenschaft Schönheim | 8047 Zürich | Baugenossenschaft Schönheim | `525bf160-906c-4886-9284-b6e68eb6195c` | 2026-08-13 | no | C | UNRESOLVED | low |
| `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` | driving-team | 2026-000006 | 2026-02-12 | 2026-02-12 | company | Heilsarmee Zürich | 8004 Zürich | Heilsarmee Zürich | `948dbd85-11a6-46f3-a119-e331b1a14c9d` | 2026-08-13 | no | C | UNRESOLVED | low |
| `e7bdb323-9762-486a-9751-391714727483` | driving-team | 2026-000007 | 2026-02-25 | 2026-02-25 | company | Thomann Nutzfahrzeuge | 8716 Schmerikon | Thomann Nutzfahrzeuge | `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` | 2026-08-13 | no | C | UNRESOLVED | low |
| `e1ac8880-0a40-4053-82c9-28effd878ba9` | driving-team | RE-2026-0009 | 2026-04-18 | 2026-04-18 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | no | C | UNRESOLVED | low |
| `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | driving-team | RE-2026-0010 | 2026-04-19 | 2026-04-19 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | no | C | UNRESOLVED | low |
| `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | driving-team | RE-2026-0011 | 2026-04-19 | 2026-04-19 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | no | C | UNRESOLVED | low |
| `23c3a657-ed02-46ac-8a51-69cf3c534448` | driving-team | RE-2026-0012 | 2026-04-19 | 2026-04-19 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | no | C | UNRESOLVED | low |
| `1ce513c6-cf04-4bdf-a981-22787be2c1ca` | driving-team | RE-2026-0013 | 2026-04-19 | 2026-04-19 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | no | C | UNRESOLVED | low |
| `b4e68f95-197e-446c-a556-14a968266060` | driving-team | RE-2026-0014 | 2026-04-19 | 2026-04-19 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | no | C | UNRESOLVED | low |
| `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | driving-team | RE-2026-0016 | 2026-05-28 | 2026-05-28 | individual | Netconstruction GmbH | 8600 Dübendorf | Netconstruction GmbH | `4d70d768-fbb8-40a1-84af-3336b52c50ab` | 2026-08-13 | no | C | UNRESOLVED | low |
| `2feb765f-b7e3-46e5-ae37-94c914af0065` | driving-team | RE-2026-0017 | 2026-06-09 | 2026-06-09 | company | Netconstruction GmbH | 8600 Dübendorf | Netconstruction GmbH | `4d70d768-fbb8-40a1-84af-3336b52c50ab` | 2026-08-13 | no | B | PROBABLE — HUMAN REVIEW REQUIRED | medium |
| `01261371-4d06-47be-ba34-692e75893b6b` | driving-team | RE-2026-0019 | 2026-07-07 | 2026-07-07 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `0a906dbe-84b3-4546-8eb8-148911220f6a` | driving-team | RE-2026-0020 | 2026-07-08 | 2026-07-08 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `7914f05f-cf63-488d-89c7-af15900fdf95` | driving-team | RE-2026-0025 | 2026-07-13 | 2026-07-13 | company | (empty) | 5432 Neuenhof | — | — | — | no company row | D | UNRESOLVED | low |
| `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` | driving-team | RE-2026-0026 | 2026-07-14 | 2026-07-14 | company | Netconstruction GmbH | 8600 Dübendorf | Netconstruction GmbH | `4d70d768-fbb8-40a1-84af-3336b52c50ab` | 2026-08-13 | no | B | PROBABLE — HUMAN REVIEW REQUIRED | medium |
| `585ee4fc-51f0-4475-821f-6c7c27055ba5` | driving-team | RE-2026-0027 | 2026-07-14 | 2026-07-14 | company | Shathees | 8427 Freienstein | — | — | — | no company row | D | UNRESOLVED | low |
| `262a9f98-a0ce-41e0-bf70-7d71617692ce` | driving-team | RE-2026-0028 | 2026-07-20 | 2026-07-20 | company | Hans-Jörg Bowald | 8730 Uznach | — | — | — | no company row | D | UNRESOLVED | low |
| `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` | driving-team | RE-2026-0029 | 2026-07-21 | 2026-07-21 | company | Auto-Mels GmbH | 8853 Lachen | Auto-Mels GmbH | `f55df494-5bd7-4bba-b354-1b9bc302e33c` | 2026-08-13 | no | D | UNRESOLVED | low |
| `54e47472-b5ba-4877-acc7-d4afabd2978c` | driving-team | RE-2026-0031 | 2026-07-21 | 2026-07-21 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` | driving-team | RE-2026-0034 | 2026-07-21 | 2026-07-21 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `a0432aca-430b-4a0c-8735-264c801907fa` | driving-team | RE-2026-0036 | 2026-07-22 | 2026-07-22 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | driving-team | RE-2026-0037 | 2026-07-22 | 2026-07-22 | company | Driving Team Zürich GmbH | 8610 Uster | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `ff401ad9-f26b-4315-98ae-db8fe65dc219` | driving-team | RE-2026-0043 | 2026-07-24 | 2026-07-24 | company | Frau | 8854 Galgenen | — | — | — | no company row | D | UNRESOLVED | low |
| `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | driving-team | RE-2026-0045 | 2026-07-29 | 2026-07-29 | company | Pranvera Latifaj | 8852 altendorf | — | — | — | no company row | D | UNRESOLVED | low |
| `4ebce689-5261-4dc2-96f5-29b804ac50e8` | driving-team | RE-2026-0046 | 2026-07-29 | 2026-07-29 | company | Pranvera Latifaj | 8852 altendorf | — | — | — | no company row | D | UNRESOLVED | low |
| `3400bd0b-786b-4444-8352-884c2d357f89` | driving-team | RE-2026-0047 | 2026-07-30 | 2026-07-30 | individual | Firma | 8000 Zürich | — | — | — | no company row | D | UNRESOLVED | low |
| `3c3b6620-b1e4-4735-994b-b5b73164bf27` | driving-team | RE-2026-0050 | 2026-08-04 | 2026-08-04 | individual | Edelweiss Garten- und Grabenservice | 8804 Au bei Wädenswil | Edelweiss Garten- und Grabenservice | `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a` | 2026-08-13 | no | D | UNRESOLVED | low |
| `67dca57f-362e-4069-be6f-3c39ad1fa436` | driving-team | RE-2026-0051 | 2026-08-06 | 2026-08-06 | company | Pascal Kilchenmann | 8610 Uster | — | — | — | no company row | D | UNRESOLVED | low |
| `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` | driving-team | RE-2026-0053 | 2026-08-08 | 2026-08-08 | company | Pascal Kilchenmann | 8610 Uster | — | — | — | no company row | D | UNRESOLVED | low |
| `64be3632-165a-455c-98d1-4e7a85bf45e1` | driving-team | RE-2026-0054 | 2026-08-13 | 2026-08-13 | company | Driving Team Zürich GmbH | 8048 Zürich | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `157c0e30-7bc0-43c9-a933-9a9063af2330` | driving-team | RE-2026-0055 | 2026-08-13 | 2026-08-13 | company | Driving Team Zürich GmbH | 8048 Zürich | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `249db0f5-3b10-4827-92b0-a8ff70a19edd` | driving-team | RE-2026-0056 | 2026-08-13 | 2026-08-13 | company | Driving Team Zürich GmbH | 8048 Zürich | Driving Team Zürich GmbH | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | 2026-07-07 | yes | C | UNRESOLVED | low |
| `84a81a5b-7b26-40d1-9161-ccec6373f118` | driving-team | RE-2026-0058 | 2026-08-21 | 2026-08-21 | company | MKW Swiss AG | 5325 Leibstadt | — | — | — | no company row | D | UNRESOLVED | low |
| `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` | driving-team | RE-2026-0061 | 2026-08-21 | 2026-08-21 | company | Egli Jona AG | 8645 Jona | — | — | — | no company row | B | UNRESOLVED | low |
| `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` | driving-team | RE-2026-0068 | 2026-08-27 | 2026-08-27 | company | samuel samuel | 5432 Neuenhof | samuel samuel | `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` | 2026-08-27 | yes | C | UNRESOLVED | low |
| `ac308c69-91d1-43ca-a47c-a7c85029d93e` | driving-team | RE-2026-0069 | 2026-08-28 | 2026-08-28 | individual | Thomann Nutzfahrzeuge | 8716 Schmerikon | Thomann Nutzfahrzeuge | `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` | 2026-08-13 | yes | D | UNRESOLVED | low |
| `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | driving-team | RE-2026-0073 | 2026-08-31 | 2026-08-31 | company | Yvonne Bettkober-Oum | 8806 Bäch-SZ | — | — | — | no company row | D | UNRESOLVED | low |
| `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | driving-team | RE-2026-0075 | 2026-09-01 | 2026-09-01 | company | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur | 3000 Bern | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur | `a7aca99e-b132-4327-aa52-9f788e51dc4a` | 2026-08-13 | yes | C | UNRESOLVED | low |
| `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | driving-team | RE-2026-0085 | 2026-09-18 | 2026-09-18 | company | Yvonne Bettkober-Oum | 8806 Bäch-SZ | — | — | — | no company row | D | UNRESOLVED | low |
| `6addae71-24f5-49a0-aad7-d93650645da3` | driving-team | RE-2026-0086 | 2026-09-18 | 2026-09-18 | company | Tsering Ngodup | 8640 Rapperswil | Tsering Ngodup | `45f7abc5-158b-4d6a-b559-736024d2cf2e` | 2026-09-21 | no | D | UNRESOLVED | low |
| `7173f7e2-f714-4581-82dc-d26ee82cd03c` | driving-team | RE-2026-0090 | 2026-09-24 | 2026-09-24 | company | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 | 8001 Zürich | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 | `32a4dccc-82ba-44d2-8286-9d967005fd10` | 2026-09-24 | yes | C | UNRESOLVED | low |
| `0209bc4b-fea5-4af8-914e-ec3a1612d134` | driving-team | RE-2026-0096 | 2026-09-30 | 2026-09-30 | company | Mohamed Ahrram akel | 6417 Sattel | — | — | — | no company row | D | UNRESOLVED | low |
| `617cc446-45ec-467d-953d-4bd2fa03ba9c` | driving-team | RE-2026-0099 | 2026-10-08 | 2026-10-08 | company | Viorel Manolache | 8310 Grafstal | — | — | — | no company row | D | UNRESOLVED | low |
| `2e854034-50f3-48b4-9fc3-b8bdd348337c` | driving-team | RE-2026-0103 | 2026-10-12 | 2026-10-12 | company | Viorel Manolache | 8310 Grafstal | — | — | — | no company row | D | UNRESOLVED | low |
| `fbee557f-b631-4193-a40a-28b889ca54c5` | driving-team | RE-2026-0104 | 2026-10-15 | 2026-10-15 | company | SBB/CFF/FFS | 8001 Zürich | SBB/CFF/FFS | `60a9dd26-742c-44c9-ae51-8ecf331b5529` | 2026-10-15 | yes | C | UNRESOLVED | low |
| `f8ea72e0-7756-4db5-ae39-79dfb318434c` | driving-team | RE-2026-0105 | 2026-10-16 | 2026-10-16 | company | Viorel Manolache | 8310 Grafstal | — | — | — | no company row | D | UNRESOLVED | low |
| `6e07fe3e-1c78-406f-b134-175e4a12154c` | driving-team | RE-2026-0106 | 2026-10-16 | 2026-10-16 | company | Viorel Manolache | 8310 Grafstal | — | — | — | no company row | D | UNRESOLVED | low |
| `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | fahrschule-gemperli | RE-2026-0010 | 2026-07-22 | 2026-07-22 | company | (empty) | 8864 Reichenburg | — | — | — | no company row | D | UNRESOLVED | low |
| `be80a098-7039-4c18-8843-e2d43fc00931` | fahrschule-gemperli | RE-2026-0012 | 2026-07-22 | 2026-07-22 | company | (empty) | 8864 Reichenburg | — | — | — | no company row | D | UNRESOLVED | low |
| `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | fahrschule-gemperli | RE-2026-0013 | 2026-07-29 | 2026-07-29 | company | (empty) | 8864 Reichenburg | — | — | — | no company row | D | UNRESOLVED | low |
| `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | fahrschule-gemperli | RE-2026-0021 | 2026-09-25 | 2026-09-25 | company | (empty) | 8853 Lachen | — | — | — | no company row | D | UNRESOLVED | low |
| `4a832b6c-15f5-4035-973c-8b8c11276216` | fahrschule-gemperli | RE-2026-0024 | 2026-09-25 | 2026-09-25 | company | (empty) | 8717 Benken | — | — | — | no company row | D | UNRESOLVED | low |
| `1454bed1-e68a-4444-9af6-4d92ef8e980f` | fahrschule-gemperli | RE-2026-0025 | 2026-09-25 | 2026-09-25 | company | (empty) | 8855 Wangen | — | — | — | no company row | D | UNRESOLVED | low |
| `33d4b7e1-0ecd-45db-9717-df471a167db3` | fahrschule-gemperli | RE-2026-0026 | 2026-09-25 | 2026-09-25 | company | (empty) | 8730 Uznach | — | — | — | no company row | D | UNRESOLVED | low |
| `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | fahrschule-gemperli | RE-2026-0028 | 2026-09-25 | 2026-09-25 | company | (empty) | 8855 Nuolen | — | — | — | no company row | D | UNRESOLVED | low |
| `f524dea2-25da-43fd-9194-6d5c201170de` | fahrschule-gemperli | RE-2026-0029 | 2026-09-25 | 2026-09-25 | company | (empty) | 8856 Tuggen | — | — | — | no company row | D | UNRESOLVED | low |
| `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | fahrschule-gemperli | RE-2026-0030 | 2026-09-25 | 2026-09-25 | company | (empty) | 8855 Altendorf | — | — | — | no company row | D | UNRESOLVED | low |
| `a84d6fac-0efb-408d-9cf3-f156715c681b` | fahrschule-gemperli | RE-2026-0035 | 2026-09-25 | 2026-09-25 | company | Hutter Manfred GmbH | 8864 Reichenburg | — | — | — | no company row | D | UNRESOLVED | low |
| `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | fahrschule-gemperli | RE-2026-0036 | 2026-09-25 | 2026-09-25 | company | (empty) | 8854 Siebnen | — | — | — | no company row | D | UNRESOLVED | low |
| `c32e038d-942c-49c6-82fe-ff7a9f4add61` | fahrschule-gemperli | RE-2026-0037 | 2026-09-25 | 2026-09-25 | company | (empty) | 8854 Schübelbach | — | — | — | no company row | D | UNRESOLVED | low |
| `e6654110-120a-40c6-a3cf-0468fc2af62d` | fahrschule-gemperli | RE-2026-0044 | 2026-10-03 | 2026-10-03 | company | (empty) | 8840 Einsiedelm | — | — | — | no company row | D | UNRESOLVED | low |
| `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | fahrschule-gemperli | RE-2026-0045 | 2026-10-04 | 2026-10-04 | company | (empty) | 8807 Freienbach | — | — | — | no company row | D | UNRESOLVED | low |
| `c373fb40-06d4-4821-b40a-85bf55e43e63` | fahrschule-gemperli | RE-2026-0048 | 2026-10-04 | 2026-10-04 | company | (empty) | 8854 Siebnen | — | — | — | no company row | D | UNRESOLVED | low |
| `d12a4229-c50b-4016-a964-41857f8b2304` | fahrschule-gemperli | RE-2026-0049 | 2026-10-04 | 2026-10-04 | company | (empty) | 8854 Siebnen | — | — | — | no company row | D | UNRESOLVED | low |
<!-- MATRIX_END -->

### Notes for each invoice

#### `9364490e-7c25-4f4a-a5d6-35b3299fff86` · driving-team · 2026-000005

- Dated evidence: invoice date 2026-02-09; invoice record 2026-02-09; last invoice update 2026-06-24; bank entry none; company row 2026-08-13; saved same-name addresses on or before the invoice date: 2; appointment items: 7; dunning rows: 0.
- Conflicting evidence: matching company row was created after this invoice; invoice row updated on 2026-06-24 after creation on 2026-02-09; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Baugenossenschaft Schönheim (525bf160-906c-4886-9284-b6e68eb6195c), and the client's current membership is that same company. The company row was created 2026-08-13, after the invoice. Place matches the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` · driving-team · 2026-000006

- Dated evidence: invoice date 2026-02-12; invoice record 2026-02-12; last invoice update 2026-06-24; bank entry none; company row 2026-08-13; saved same-name addresses on or before the invoice date: 2; appointment items: 10; dunning rows: 0.
- Conflicting evidence: matching company row was created after this invoice; invoice row updated on 2026-06-24 after creation on 2026-02-12; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Heilsarmee Zürich (948dbd85-11a6-46f3-a119-e331b1a14c9d), and the client's current membership is that same company. The company row was created 2026-08-13, after the invoice. Place matches the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `e7bdb323-9762-486a-9751-391714727483` · driving-team · 2026-000007

- Dated evidence: invoice date 2026-02-25; invoice record 2026-02-25; last invoice update 2026-06-24; bank entry none; company row 2026-08-13; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: matching company row was created after this invoice; invoice row updated on 2026-06-24 after creation on 2026-02-25; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Thomann Nutzfahrzeuge (18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82), and the client's current membership is that same company. The company row was created 2026-08-13, after the invoice. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `e1ac8880-0a40-4053-82c9-28effd878ba9` · driving-team · RE-2026-0009

- Dated evidence: invoice date 2026-04-18; invoice record 2026-04-18; last invoice update 2026-04-18; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place; matching company row was created after this invoice.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row was created 2026-07-07, after the invoice. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` · driving-team · RE-2026-0010

- Dated evidence: invoice date 2026-04-19; invoice record 2026-04-19; last invoice update 2026-04-19; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 2; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place; matching company row was created after this invoice.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row was created 2026-07-07, after the invoice. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `f41239b4-55c6-4094-a30f-2c9d9de1f49f` · driving-team · RE-2026-0011

- Dated evidence: invoice date 2026-04-19; invoice record 2026-04-19; last invoice update 2026-04-19; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place; matching company row was created after this invoice.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row was created 2026-07-07, after the invoice. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `23c3a657-ed02-46ac-8a51-69cf3c534448` · driving-team · RE-2026-0012

- Dated evidence: invoice date 2026-04-19; invoice record 2026-04-19; last invoice update 2026-07-07; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place; matching company row was created after this invoice; invoice row updated on 2026-07-07 after creation on 2026-04-19; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row was created 2026-07-07, after the invoice. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `1ce513c6-cf04-4bdf-a981-22787be2c1ca` · driving-team · RE-2026-0013

- Dated evidence: invoice date 2026-04-19; invoice record 2026-04-19; last invoice update 2026-09-14; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 1.
- Conflicting evidence: snapshot place differs from the company master place; matching company row was created after this invoice; invoice row updated on 2026-09-14 after creation on 2026-04-19; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row was created 2026-07-07, after the invoice. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `b4e68f95-197e-446c-a556-14a968266060` · driving-team · RE-2026-0014

- Dated evidence: invoice date 2026-04-19; invoice record 2026-04-19; last invoice update 2026-07-07; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place; matching company row was created after this invoice; invoice row updated on 2026-07-07 after creation on 2026-04-19; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row was created 2026-07-07, after the invoice. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` · driving-team · RE-2026-0016

- Dated evidence: invoice date 2026-05-28; invoice record 2026-05-28; last invoice update 2026-05-28; bank entry none; company row 2026-08-13; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 2.
- Conflicting evidence: matching company row was created after this invoice.
- Rationale: Snapshot name equals one current company in this tenant, Netconstruction GmbH (4d70d768-fbb8-40a1-84af-3336b52c50ab), and the client's current membership is that same company. The company row was created 2026-08-13, after the invoice. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: A document dated on or before the invoice that names this legal entity: the sent PDF, the sent email, or a contract. The later company master alone is not enough.

#### `2feb765f-b7e3-46e5-ae37-94c914af0065` · driving-team · RE-2026-0017

- Dated evidence: invoice date 2026-06-09; invoice record 2026-06-09; last invoice update 2026-09-14; bank entry 2026-08-28; company row 2026-08-13; saved same-name addresses on or before the invoice date: 3; appointment items: 3; dunning rows: 2.
- Conflicting evidence: matching company row was created after this invoice; invoice row updated on 2026-09-14 after creation on 2026-06-09; snapshot immutability is not proven.
- Rationale: Bank import dated 2026-08-28 has a debtor name equal to the snapshot and to Netconstruction GmbH (4d70d768-fbb8-40a1-84af-3336b52c50ab). The company row was created 2026-08-13, after invoice date 2026-06-09. Saved addresses with the same name existed on or before the invoice date (3), but those addresses have no company id and are the likely source of the snapshot. No PDF or email can be tied to this invoice id. This is not authorization to write company_id.
- Next evidence: Original sent PDF or email from the invoice date, plus a human decision that the later company master is the same entity named by the snapshot and the bank debtor.

#### `01261371-4d06-47be-ba34-692e75893b6b` · driving-team · RE-2026-0019

- Dated evidence: invoice date 2026-07-07; invoice record 2026-07-07; last invoice update 2026-07-08; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place; invoice row updated on 2026-07-08 after creation on 2026-07-07; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email showing which place was billed. The Uster snapshot and the Zürich company master disagree.

#### `0a906dbe-84b3-4546-8eb8-148911220f6a` · driving-team · RE-2026-0020

- Dated evidence: invoice date 2026-07-08; invoice record 2026-07-08; last invoice update 2026-07-08; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email showing which place was billed. The Uster snapshot and the Zürich company master disagree.

#### `7914f05f-cf63-488d-89c7-af15900fdf95` · driving-team · RE-2026-0025

- Dated evidence: invoice date 2026-07-13; invoice record 2026-07-13; last invoice update 2026-08-24; bank entry 2026-07-13; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 1; dunning rows: 0.
- Conflicting evidence: bank debtor name differs from the snapshot and matches no company in this tenant; billing type is company and the recipient snapshot is empty; invoice row updated on 2026-08-24 after creation on 2026-07-13; snapshot immutability is not proven.
- Rationale: Same-tenant bank import debtor does not equal the snapshot and does not equal any company in this tenant. The debtor text is not copied into this report. Current membership is samuel samuel (2026-08-27), which is not the invoice recipient.
- Next evidence: A human reading of the bank debtor on this invoice id, compared with the snapshot. The original PDF or sent email is still required before any company id.

#### `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` · driving-team · RE-2026-0026

- Dated evidence: invoice date 2026-07-14; invoice record 2026-07-14; last invoice update 2026-09-14; bank entry 2026-08-28; company row 2026-08-13; saved same-name addresses on or before the invoice date: 4; appointment items: 1; dunning rows: 0.
- Conflicting evidence: matching company row was created after this invoice; invoice row updated on 2026-09-14 after creation on 2026-07-14; snapshot immutability is not proven.
- Rationale: Bank import dated 2026-08-28 has a debtor name equal to the snapshot and to Netconstruction GmbH (4d70d768-fbb8-40a1-84af-3336b52c50ab). The company row was created 2026-08-13, after invoice date 2026-07-14. Saved addresses with the same name existed on or before the invoice date (4), but those addresses have no company id and are the likely source of the snapshot. No PDF or email can be tied to this invoice id. This is not authorization to write company_id.
- Next evidence: Original sent PDF or email from the invoice date, plus a human decision that the later company master is the same entity named by the snapshot and the bank debtor.

#### `585ee4fc-51f0-4475-821f-6c7c27055ba5` · driving-team · RE-2026-0027

- Dated evidence: invoice date 2026-07-14; invoice record 2026-07-14; last invoice update 2026-07-14; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 1.
- Conflicting evidence: none observed.
- Rationale: The snapshot names a recipient for which this tenant has no company row. No bank match, mail, contract, course, or attributable PDF identifies a company id.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `262a9f98-a0ce-41e0-bf70-7d71617692ce` · driving-team · RE-2026-0028

- Dated evidence: invoice date 2026-07-20; invoice record 2026-07-20; last invoice update 2026-07-20; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` · driving-team · RE-2026-0029

- Dated evidence: invoice date 2026-07-21; invoice record 2026-07-21; last invoice update 2026-07-24; bank entry 2026-07-21; company row 2026-08-13; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: bank debtor name differs from the snapshot and matches no company in this tenant; matching company row was created after this invoice; invoice row updated on 2026-07-24 after creation on 2026-07-21; snapshot immutability is not proven.
- Rationale: Same-tenant bank import debtor does not equal the snapshot and does not equal any company in this tenant. The debtor text is not copied into this report. A current name match points at Auto-Mels GmbH (f55df494-5bd7-4bba-b354-1b9bc302e33c), created 2026-08-13, which the bank debtor does not confirm.
- Next evidence: A human reading of the bank debtor on this invoice id, compared with the snapshot. The original PDF or sent email is still required before any company id.

#### `54e47472-b5ba-4877-acc7-d4afabd2978c` · driving-team · RE-2026-0031

- Dated evidence: invoice date 2026-07-21; invoice record 2026-07-21; last invoice update 2026-07-21; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 3; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email showing which place was billed. The Uster snapshot and the Zürich company master disagree.

#### `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` · driving-team · RE-2026-0034

- Dated evidence: invoice date 2026-07-21; invoice record 2026-07-21; last invoice update 2026-07-21; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email showing which place was billed. The Uster snapshot and the Zürich company master disagree.

#### `a0432aca-430b-4a0c-8735-264c801907fa` · driving-team · RE-2026-0036

- Dated evidence: invoice date 2026-07-22; invoice record 2026-07-22; last invoice update 2026-07-22; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 3; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email showing which place was billed. The Uster snapshot and the Zürich company master disagree.

#### `6f4415ac-944a-4d83-a39b-22bf2248eb8c` · driving-team · RE-2026-0037

- Dated evidence: invoice date 2026-07-22; invoice record 2026-07-22; last invoice update 2026-07-22; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot place differs from the company master place.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place does not match the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email showing which place was billed. The Uster snapshot and the Zürich company master disagree.

#### `ff401ad9-f26b-4315-98ae-db8fe65dc219` · driving-team · RE-2026-0043

- Dated evidence: invoice date 2026-07-24; invoice record 2026-07-24; last invoice update 2026-09-14; bank entry 2026-09-01; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 1.
- Conflicting evidence: bank debtor name differs from the snapshot and matches no company in this tenant; snapshot is a placeholder, not a legal name; invoice row updated on 2026-09-14 after creation on 2026-07-24; snapshot immutability is not proven.
- Rationale: Same-tenant bank import debtor does not equal the snapshot and does not equal any company in this tenant. The debtor text is not copied into this report.
- Next evidence: A human reading of the bank debtor on this invoice id, compared with the snapshot. The original PDF or sent email is still required before any company id.

#### `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` · driving-team · RE-2026-0045

- Dated evidence: invoice date 2026-07-29; invoice record 2026-07-29; last invoice update 2026-07-29; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `4ebce689-5261-4dc2-96f5-29b804ac50e8` · driving-team · RE-2026-0046

- Dated evidence: invoice date 2026-07-29; invoice record 2026-07-29; last invoice update 2026-07-29; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `3400bd0b-786b-4444-8352-884c2d357f89` · driving-team · RE-2026-0047

- Dated evidence: invoice date 2026-07-30; invoice record 2026-07-30; last invoice update 2026-09-14; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 0; dunning rows: 0.
- Conflicting evidence: snapshot is a placeholder, not a legal name; invoice row updated on 2026-09-14 after creation on 2026-07-30; snapshot immutability is not proven.
- Rationale: The snapshot is a placeholder word. There is no client on the Firma invoice, no appointment item, and no company, bank, mail, or document link.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `3c3b6620-b1e4-4735-994b-b5b73164bf27` · driving-team · RE-2026-0050

- Dated evidence: invoice date 2026-08-04; invoice record 2026-08-04; last invoice update 2026-08-24; bank entry 2026-08-21; company row 2026-08-13; saved same-name addresses on or before the invoice date: 1; appointment items: 7; dunning rows: 0.
- Conflicting evidence: bank debtor name differs from the snapshot and matches no company in this tenant; matching company row was created after this invoice; invoice row updated on 2026-08-24 after creation on 2026-08-04; snapshot immutability is not proven.
- Rationale: Same-tenant bank import debtor does not equal the snapshot and does not equal any company in this tenant. The debtor text is not copied into this report. A current name match points at Edelweiss Garten- und Grabenservice (fbaffae2-6bc5-4227-a55f-b49a13aa6e5a), created 2026-08-13, which the bank debtor does not confirm.
- Next evidence: A human reading of the bank debtor on this invoice id, compared with the snapshot. The original PDF or sent email is still required before any company id.

#### `67dca57f-362e-4069-be6f-3c39ad1fa436` · driving-team · RE-2026-0051

- Dated evidence: invoice date 2026-08-06; invoice record 2026-08-06; last invoice update 2026-09-14; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company; invoice row updated on 2026-09-14 after creation on 2026-08-06; snapshot immutability is not proven.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. Current membership is Driving Team Zürich GmbH, company row 2026-07-07. An accounting description linked through a payment contains the snapshot person name, not a separate company name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` · driving-team · RE-2026-0053

- Dated evidence: invoice date 2026-08-08; invoice record 2026-08-08; last invoice update 2026-09-14; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company; invoice row updated on 2026-09-14 after creation on 2026-08-08; snapshot immutability is not proven.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. Current membership is Driving Team Zürich GmbH, company row 2026-07-07.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `64be3632-165a-455c-98d1-4e7a85bf45e1` · driving-team · RE-2026-0054

- Dated evidence: invoice date 2026-08-13; invoice record 2026-08-13; last invoice update 2026-09-14; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-09-14 after creation on 2026-08-13; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `157c0e30-7bc0-43c9-a933-9a9063af2330` · driving-team · RE-2026-0055

- Dated evidence: invoice date 2026-08-13; invoice record 2026-08-13; last invoice update 2026-09-14; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-09-14 after creation on 2026-08-13; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `249db0f5-3b10-4827-92b0-a8ff70a19edd` · driving-team · RE-2026-0056

- Dated evidence: invoice date 2026-08-13; invoice record 2026-08-13; last invoice update 2026-09-14; bank entry none; company row 2026-07-07; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-09-14 after creation on 2026-08-13; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Driving Team Zürich GmbH (5ec738cc-fc27-424a-9934-af5cbb8069ca), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `84a81a5b-7b26-40d1-9161-ccec6373f118` · driving-team · RE-2026-0058

- Dated evidence: invoice date 2026-08-21; invoice record 2026-08-21; last invoice update 2026-10-01; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 3; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-10-01 after creation on 2026-08-21; snapshot immutability is not proven.
- Rationale: The snapshot names a recipient for which this tenant has no company row. No bank match, mail, contract, course, or attributable PDF identifies a company id.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` · driving-team · RE-2026-0061

- Dated evidence: invoice date 2026-08-21; invoice record 2026-08-21; last invoice update 2026-09-14; bank entry 2026-09-10; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 5; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-09-14 after creation on 2026-08-21; snapshot immutability is not proven.
- Rationale: Bank import dated 2026-09-10 has a debtor name equal to the snapshot, and that text has a legal-form token. No company row in this tenant carries that name, so there is no company id to propose. A public registry could show that a company of this name exists; it would not prove this invoice.
- Next evidence: A human reading of bank_import_records for this invoice id, and a decision whether this tenant should have a company master for the snapshot name. Do not create one from this report.

#### `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` · driving-team · RE-2026-0068

- Dated evidence: invoice date 2026-08-27; invoice record 2026-08-27; last invoice update 2026-09-10; bank entry none; company row 2026-08-27; saved same-name addresses on or before the invoice date: 2; appointment items: 1; dunning rows: 0.
- Conflicting evidence: company row was created minutes before the invoice record (company row 2026-08-27 09:13, invoice record 09:14); invoice row updated on 2026-09-10 after creation on 2026-08-27; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, samuel samuel (0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 2 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `ac308c69-91d1-43ca-a47c-a7c85029d93e` · driving-team · RE-2026-0069

- Dated evidence: invoice date 2026-08-28; invoice record 2026-08-28; last invoice update 2026-09-14; bank entry 2026-09-01; company row 2026-08-13; saved same-name addresses on or before the invoice date: 1; appointment items: 3; dunning rows: 0.
- Conflicting evidence: bank debtor name differs from the snapshot and matches no company in this tenant; invoice row updated on 2026-09-14 after creation on 2026-08-28; snapshot immutability is not proven.
- Rationale: Same-tenant bank import debtor does not equal the snapshot and does not equal any company in this tenant. The debtor text is not copied into this report. A current name match points at Thomann Nutzfahrzeuge (18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82), created 2026-08-13, which the bank debtor does not confirm.
- Next evidence: A human reading of the bank debtor on this invoice id, compared with the snapshot. The original PDF or sent email is still required before any company id.

#### `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` · driving-team · RE-2026-0073

- Dated evidence: invoice date 2026-08-31; invoice record 2026-08-31; last invoice update 2026-08-31; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: none observed.
- Rationale: The snapshot names a recipient for which this tenant has no company row. No bank match, mail, contract, course, or attributable PDF identifies a company id.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `bc2829f8-639d-48c0-baf6-9c81fd138bcc` · driving-team · RE-2026-0075

- Dated evidence: invoice date 2026-09-01; invoice record 2026-09-01; last invoice update 2026-09-04; bank entry none; company row 2026-08-13; saved same-name addresses on or before the invoice date: 1; appointment items: 4; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-09-04 after creation on 2026-09-01; snapshot immutability is not proven.
- Rationale: Snapshot name equals one current company in this tenant, Schweizerische Bundesbahn SBB Kreditoren Infrastruktur (a7aca99e-b132-4327-aa52-9f788e51dc4a), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `4b6bad1c-e897-49d8-b3ba-301e94376dc4` · driving-team · RE-2026-0085

- Dated evidence: invoice date 2026-09-18; invoice record 2026-09-18; last invoice update 2026-09-18; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: none observed.
- Rationale: The snapshot names a recipient for which this tenant has no company row. No bank match, mail, contract, course, or attributable PDF identifies a company id.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `6addae71-24f5-49a0-aad7-d93650645da3` · driving-team · RE-2026-0086

- Dated evidence: invoice date 2026-09-18; invoice record 2026-09-18; last invoice update 2026-09-18; bank entry none; company row 2026-09-21; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company; matching company row was created after this invoice.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. Current membership is Tsering Ngodup, company row 2026-09-21.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `7173f7e2-f714-4581-82dc-d26ee82cd03c` · driving-team · RE-2026-0090

- Dated evidence: invoice date 2026-09-24; invoice record 2026-09-24; last invoice update 2026-09-24; bank entry none; company row 2026-09-24; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: company row was created minutes before the invoice record (company row 2026-09-24 11:06, invoice record 11:08).
- Rationale: Snapshot name equals one current company in this tenant, SBB, Abt. PP-BP- CTL- TSP1- ZUE2 (32a4dccc-82ba-44d2-8286-9d967005fd10), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `0209bc4b-fea5-4af8-914e-ec3a1612d134` · driving-team · RE-2026-0096

- Dated evidence: invoice date 2026-09-30; invoice record 2026-09-30; last invoice update 2026-09-30; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `617cc446-45ec-467d-953d-4bd2fa03ba9c` · driving-team · RE-2026-0099

- Dated evidence: invoice date 2026-10-08; invoice record 2026-10-08; last invoice update 2026-10-08; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `2e854034-50f3-48b4-9fc3-b8bdd348337c` · driving-team · RE-2026-0103

- Dated evidence: invoice date 2026-10-12; invoice record 2026-10-12; last invoice update 2026-10-12; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `fbee557f-b631-4193-a40a-28b889ca54c5` · driving-team · RE-2026-0104

- Dated evidence: invoice date 2026-10-15; invoice record 2026-10-15; last invoice update 2026-10-15; bank entry none; company row 2026-10-15; saved same-name addresses on or before the invoice date: 1; appointment items: 2; dunning rows: 0.
- Conflicting evidence: company row was created minutes before the invoice record (company row 2026-10-15 13:39, invoice record 13:43).
- Rationale: Snapshot name equals one current company in this tenant, SBB/CFF/FFS (60a9dd26-742c-44c9-ae51-8ecf331b5529), and the client's current membership is that same company. The company row existed at the invoice record. Place matches the company master. 1 saved address(es) with the same name existed on or before the invoice date; an address is not a company id and is the likely source of the snapshot. No independent bank, mail, contract, or attributable PDF confirms it.
- Next evidence: The sent PDF or email from the invoice date. Current name and membership agreement is not enough.

#### `f8ea72e0-7756-4db5-ae39-79dfb318434c` · driving-team · RE-2026-0105

- Dated evidence: invoice date 2026-10-16; invoice record 2026-10-16; last invoice update 2026-10-16; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `6e07fe3e-1c78-406f-b134-175e4a12154c` · driving-team · RE-2026-0106

- Dated evidence: invoice date 2026-10-16; invoice record 2026-10-16; last invoice update 2026-10-16; bank entry none; company row none; saved same-name addresses on or before the invoice date: 1; appointment items: 1; dunning rows: 0.
- Conflicting evidence: snapshot is the client's personal name while billing type is company.
- Rationale: The stored recipient is the person, while billing type is company. Membership does not show who was billed. No current company membership.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` · fahrschule-gemperli · RE-2026-0010

- Dated evidence: invoice date 2026-07-22; invoice record 2026-07-22; last invoice update 2026-07-22; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 4; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `be80a098-7039-4c18-8843-e2d43fc00931` · fahrschule-gemperli · RE-2026-0012

- Dated evidence: invoice date 2026-07-22; invoice record 2026-07-22; last invoice update 2026-07-22; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 4; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` · fahrschule-gemperli · RE-2026-0013

- Dated evidence: invoice date 2026-07-29; invoice record 2026-07-29; last invoice update 2026-08-18; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 4; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-08-18 after creation on 2026-07-29; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `e72dc779-05b5-4dd9-9b2f-8966e7278a50` · fahrschule-gemperli · RE-2026-0021

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-12; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 11; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-12 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `4a832b6c-15f5-4035-973c-8b8c11276216` · fahrschule-gemperli · RE-2026-0024

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-09; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 2; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-09 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `1454bed1-e68a-4444-9af6-4d92ef8e980f` · fahrschule-gemperli · RE-2026-0025

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-09-25; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 7; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `33d4b7e1-0ecd-45db-9717-df471a167db3` · fahrschule-gemperli · RE-2026-0026

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-05; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 5; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-05 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `65a0d6f7-48f1-4fee-8be3-749983cf11ca` · fahrschule-gemperli · RE-2026-0028

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-09-25; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 6; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `f524dea2-25da-43fd-9194-6d5c201170de` · fahrschule-gemperli · RE-2026-0029

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-05; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 4; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-05 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` · fahrschule-gemperli · RE-2026-0030

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-05; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 4; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-05 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `a84d6fac-0efb-408d-9cf3-f156715c681b` · fahrschule-gemperli · RE-2026-0035

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-05; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 3; dunning rows: 0.
- Conflicting evidence: invoice row updated on 2026-10-05 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: The snapshot names a recipient for which this tenant has no company row. No bank match, mail, contract, course, or attributable PDF identifies a company id.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` · fahrschule-gemperli · RE-2026-0036

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-10-05; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 3; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-05 after creation on 2026-09-25; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `c32e038d-942c-49c6-82fe-ff7a9f4add61` · fahrschule-gemperli · RE-2026-0037

- Dated evidence: invoice date 2026-09-25; invoice record 2026-09-25; last invoice update 2026-09-25; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 3; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `e6654110-120a-40c6-a3cf-0468fc2af62d` · fahrschule-gemperli · RE-2026-0044

- Dated evidence: invoice date 2026-10-03; invoice record 2026-10-03; last invoice update 2026-10-03; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 6; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` · fahrschule-gemperli · RE-2026-0045

- Dated evidence: invoice date 2026-10-04; invoice record 2026-10-04; last invoice update 2026-10-04; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 6; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `c373fb40-06d4-4821-b40a-85bf55e43e63` · fahrschule-gemperli · RE-2026-0048

- Dated evidence: invoice date 2026-10-04; invoice record 2026-10-04; last invoice update 2026-10-09; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 3; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-09 after creation on 2026-10-04; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

#### `d12a4229-c50b-4016-a964-41857f8b2304` · fahrschule-gemperli · RE-2026-0049

- Dated evidence: invoice date 2026-10-04; invoice record 2026-10-04; last invoice update 2026-10-09; bank entry none; company row none; saved same-name addresses on or before the invoice date: 0; appointment items: 3; dunning rows: 0.
- Conflicting evidence: billing type is company and the recipient snapshot is empty; invoice row updated on 2026-10-09 after creation on 2026-10-04; snapshot immutability is not proven.
- Rationale: Empty company snapshot. No same-tenant company candidate, no saved company address used as proof, and no mail, document, bank, or accounting name.
- Next evidence: The original sent invoice PDF or the sent email, with its recipient block, from the invoice date.

## C. Timelines

A candidate here is a current company row whose normalized name equals the snapshot. Dates are the observed timestamps. Current membership is the same company wherever `membership` was true in the extract; it is not a separate historical record.

### Auto-Mels GmbH

Company id `f55df494-5bd7-4bba-b354-1b9bc302e33c`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0029 `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` | 2026-07-21 | 2026-07-21 | no | yes | debtor differs on 2026-07-21 | UNRESOLVED |

### Baugenossenschaft Schönheim

Company id `525bf160-906c-4886-9284-b6e68eb6195c`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| 2026-000005 `9364490e-7c25-4f4a-a5d6-35b3299fff86` | 2026-02-09 | 2026-02-09 | no | yes | none | UNRESOLVED |

### Driving Team Zürich GmbH

Company id `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Company row created 2026-07-07.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0009 `e1ac8880-0a40-4053-82c9-28effd878ba9` | 2026-04-18 | 2026-04-18 | no | no | none | UNRESOLVED |
| RE-2026-0010 `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | 2026-04-19 | 2026-04-19 | no | no | none | UNRESOLVED |
| RE-2026-0011 `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | 2026-04-19 | 2026-04-19 | no | no | none | UNRESOLVED |
| RE-2026-0012 `23c3a657-ed02-46ac-8a51-69cf3c534448` | 2026-04-19 | 2026-04-19 | no | no | none | UNRESOLVED |
| RE-2026-0013 `1ce513c6-cf04-4bdf-a981-22787be2c1ca` | 2026-04-19 | 2026-04-19 | no | no | none | UNRESOLVED |
| RE-2026-0014 `b4e68f95-197e-446c-a556-14a968266060` | 2026-04-19 | 2026-04-19 | no | no | none | UNRESOLVED |
| RE-2026-0019 `01261371-4d06-47be-ba34-692e75893b6b` | 2026-07-07 | 2026-07-07 | yes | no | none | UNRESOLVED |
| RE-2026-0020 `0a906dbe-84b3-4546-8eb8-148911220f6a` | 2026-07-08 | 2026-07-08 | yes | no | none | UNRESOLVED |
| RE-2026-0031 `54e47472-b5ba-4877-acc7-d4afabd2978c` | 2026-07-21 | 2026-07-21 | yes | no | none | UNRESOLVED |
| RE-2026-0034 `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` | 2026-07-21 | 2026-07-21 | yes | no | none | UNRESOLVED |
| RE-2026-0036 `a0432aca-430b-4a0c-8735-264c801907fa` | 2026-07-22 | 2026-07-22 | yes | no | none | UNRESOLVED |
| RE-2026-0037 `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | 2026-07-22 | 2026-07-22 | yes | no | none | UNRESOLVED |
| RE-2026-0054 `64be3632-165a-455c-98d1-4e7a85bf45e1` | 2026-08-13 | 2026-08-13 | yes | yes | none | UNRESOLVED |
| RE-2026-0055 `157c0e30-7bc0-43c9-a933-9a9063af2330` | 2026-08-13 | 2026-08-13 | yes | yes | none | UNRESOLVED |
| RE-2026-0056 `249db0f5-3b10-4827-92b0-a8ff70a19edd` | 2026-08-13 | 2026-08-13 | yes | yes | none | UNRESOLVED |

The company master is dated 2026-07-07 08:11 Europe/Zurich. Snapshots dated before that morning cannot be explained by this row. Several snapshots say 8610 Uster. The company master place is 8048 Zürich. The shared name leaves that place conflict open.

### Edelweiss Garten- und Grabenservice

Company id `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0050 `3c3b6620-b1e4-4735-994b-b5b73164bf27` | 2026-08-04 | 2026-08-04 | no | yes | debtor differs on 2026-08-21 | UNRESOLVED |

### Heilsarmee Zürich

Company id `948dbd85-11a6-46f3-a119-e331b1a14c9d`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| 2026-000006 `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` | 2026-02-12 | 2026-02-12 | no | yes | none | UNRESOLVED |

### Netconstruction GmbH

Company id `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0016 `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | 2026-05-28 | 2026-05-28 | no | yes | none | UNRESOLVED |
| RE-2026-0017 `2feb765f-b7e3-46e5-ae37-94c914af0065` | 2026-06-09 | 2026-06-09 | no | yes | debtor equals snapshot on 2026-08-28 | PROBABLE — HUMAN REVIEW REQUIRED |
| RE-2026-0026 `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` | 2026-07-14 | 2026-07-14 | no | yes | debtor equals snapshot on 2026-08-28 | PROBABLE — HUMAN REVIEW REQUIRED |

The company master was inserted on 2026-08-13 06:38 with a batch of other company rows. Two invoices have a later bank debtor equal to this name. RE-2026-0016 has the same snapshot and no bank row. None of the three company rows existed on the invoice date.

### SBB, Abt. PP-BP- CTL- TSP1- ZUE2

Company id `32a4dccc-82ba-44d2-8286-9d967005fd10`. Company row created 2026-09-24.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0090 `7173f7e2-f714-4581-82dc-d26ee82cd03c` | 2026-09-24 | 2026-09-24 | yes | yes | none | UNRESOLVED |

### SBB/CFF/FFS

Company id `60a9dd26-742c-44c9-ae51-8ecf331b5529`. Company row created 2026-10-15.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0104 `fbee557f-b631-4193-a40a-28b889ca54c5` | 2026-10-15 | 2026-10-15 | yes | yes | none | UNRESOLVED |

### Schweizerische Bundesbahn SBB Kreditoren Infrastruktur

Company id `a7aca99e-b132-4327-aa52-9f788e51dc4a`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0075 `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | 2026-09-01 | 2026-09-01 | yes | yes | none | UNRESOLVED |

### Thomann Nutzfahrzeuge

Company id `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`. Company row created 2026-08-13.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| 2026-000007 `e7bdb323-9762-486a-9751-391714727483` | 2026-02-25 | 2026-02-25 | no | yes | none | UNRESOLVED |
| RE-2026-0069 `ac308c69-91d1-43ca-a47c-a7c85029d93e` | 2026-08-28 | 2026-08-28 | yes | yes | debtor differs on 2026-09-01 | UNRESOLVED |

### Tsering Ngodup

Company id `45f7abc5-158b-4d6a-b559-736024d2cf2e`. Company row created 2026-09-21.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0086 `6addae71-24f5-49a0-aad7-d93650645da3` | 2026-09-18 | 2026-09-18 | no | yes | none | UNRESOLVED |

### samuel samuel

Company id `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. Company row created 2026-08-27.

| Invoice | Invoice date | Record created | Existed then | Place match | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0068 `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` | 2026-08-27 | 2026-08-27 | yes | yes | none | UNRESOLVED |

### No company row

These invoices have no same-tenant company whose normalized name equals the snapshot. A membership name is shown only as a current fact.

| Invoice | Invoice date | Snapshot | Current membership | Membership row | Bank | Class |
|---|---|---|---|---|---|---|
| RE-2026-0025 `7914f05f-cf63-488d-89c7-af15900fdf95` | 2026-07-13 | (empty) | samuel samuel | 2026-08-27 | differs on 2026-07-13 | UNRESOLVED |
| RE-2026-0027 `585ee4fc-51f0-4475-821f-6c7c27055ba5` | 2026-07-14 | Shathees | — | — | none | UNRESOLVED |
| RE-2026-0028 `262a9f98-a0ce-41e0-bf70-7d71617692ce` | 2026-07-20 | Hans-Jörg Bowald | — | — | none | UNRESOLVED |
| RE-2026-0043 `ff401ad9-f26b-4315-98ae-db8fe65dc219` | 2026-07-24 | Frau | — | — | differs on 2026-09-01 | UNRESOLVED |
| RE-2026-0045 `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | 2026-07-29 | Pranvera Latifaj | — | — | none | UNRESOLVED |
| RE-2026-0046 `4ebce689-5261-4dc2-96f5-29b804ac50e8` | 2026-07-29 | Pranvera Latifaj | — | — | none | UNRESOLVED |
| RE-2026-0047 `3400bd0b-786b-4444-8352-884c2d357f89` | 2026-07-30 | Firma | — | — | none | UNRESOLVED |
| RE-2026-0051 `67dca57f-362e-4069-be6f-3c39ad1fa436` | 2026-08-06 | Pascal Kilchenmann | Driving Team Zürich GmbH | 2026-07-07 | none | UNRESOLVED |
| RE-2026-0053 `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` | 2026-08-08 | Pascal Kilchenmann | Driving Team Zürich GmbH | 2026-07-07 | none | UNRESOLVED |
| RE-2026-0058 `84a81a5b-7b26-40d1-9161-ccec6373f118` | 2026-08-21 | MKW Swiss AG | — | — | none | UNRESOLVED |
| RE-2026-0061 `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` | 2026-08-21 | Egli Jona AG | — | — | equals snapshot on 2026-09-10 | UNRESOLVED |
| RE-2026-0073 `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | 2026-08-31 | Yvonne Bettkober-Oum | — | — | none | UNRESOLVED |
| RE-2026-0085 `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | 2026-09-18 | Yvonne Bettkober-Oum | — | — | none | UNRESOLVED |
| RE-2026-0096 `0209bc4b-fea5-4af8-914e-ec3a1612d134` | 2026-09-30 | Mohamed Ahrram akel | — | — | none | UNRESOLVED |
| RE-2026-0099 `617cc446-45ec-467d-953d-4bd2fa03ba9c` | 2026-10-08 | Viorel Manolache | — | — | none | UNRESOLVED |
| RE-2026-0103 `2e854034-50f3-48b4-9fc3-b8bdd348337c` | 2026-10-12 | Viorel Manolache | — | — | none | UNRESOLVED |
| RE-2026-0105 `f8ea72e0-7756-4db5-ae39-79dfb318434c` | 2026-10-16 | Viorel Manolache | — | — | none | UNRESOLVED |
| RE-2026-0106 `6e07fe3e-1c78-406f-b134-175e4a12154c` | 2026-10-16 | Viorel Manolache | — | — | none | UNRESOLVED |
| RE-2026-0010 `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | 2026-07-22 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0012 `be80a098-7039-4c18-8843-e2d43fc00931` | 2026-07-22 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0013 `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | 2026-07-29 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0021 `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0024 `4a832b6c-15f5-4035-973c-8b8c11276216` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0025 `1454bed1-e68a-4444-9af6-4d92ef8e980f` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0026 `33d4b7e1-0ecd-45db-9717-df471a167db3` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0028 `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0029 `f524dea2-25da-43fd-9194-6d5c201170de` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0030 `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0035 `a84d6fac-0efb-408d-9cf3-f156715c681b` | 2026-09-25 | Hutter Manfred GmbH | — | — | none | UNRESOLVED |
| RE-2026-0036 `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0037 `c32e038d-942c-49c6-82fe-ff7a9f4add61` | 2026-09-25 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0044 `e6654110-120a-40c6-a3cf-0468fc2af62d` | 2026-10-03 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0045 `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | 2026-10-04 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0048 `c373fb40-06d4-4821-b40a-85bf55e43e63` | 2026-10-04 | (empty) | — | — | none | UNRESOLVED |
| RE-2026-0049 `d12a4229-c50b-4016-a964-41857f8b2304` | 2026-10-04 | (empty) | — | — | none | UNRESOLVED |

Three company rows that did exist at the invoice record were created minutes earlier the same day. That order is data-entry timing, not proof of an older legal relationship:

- `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` RE-2026-0068, snapshot and company name `samuel samuel`: company 2026-08-27 09:13, invoice record 09:14.
- `7173f7e2-f714-4581-82dc-d26ee82cd03c` RE-2026-0090: company 2026-09-24 11:06, invoice record 11:08. This invoice is also on the trigger list.
- `fbee557f-b631-4193-a40a-28b889ca54c5` RE-2026-0104, snapshot `SBB/CFF/FFS`: company 2026-10-15 13:39, invoice record 13:43.

`01261371-4d06-47be-ba34-692e75893b6b` RE-2026-0019 is a different same-day case. Driving Team Zürich GmbH already existed that morning at 08:11, and the invoice record is 20:24. The snapshot place is 8610 Uster and the company master place is 8048 Zürich.

## D. Ranked follow-up evidence

The same missing document covers most invoices: the PDF or email that was actually sent on or near the invoice date, with its recipient block. Stored files in the `receipts` bucket could not be attributed to one invoice id. No external mailbox is connected, and the in-app mail tables have no row for these invoices.

1. **Sent PDF or sent email for every unresolved invoice.** This is the evidence that could reach grade A. It is missing for all 64. The highest-value subsets are the two probable Netconstruction invoices, the 17 invoices with an empty snapshot (16 fahrschule-gemperli and 1 driving-team), the 11 invoices whose snapshot is a person's name, and the Driving Team Zürich GmbH invoices whose snapshot place is 8610 Uster.
2. **Bank debtor reading, from rows already stored.** `bank_import_records` identifies eight target invoices. For five, the debtor name disagrees with the snapshot and matches no company in the tenant. A person with production access should read `debtor_name` for those invoice ids. This report does not copy that text. Disagreeing bank rows: `7914f05f-cf63-488d-89c7-af15900fdf95` (RE-2026-0025), `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` (RE-2026-0029), `ff401ad9-f26b-4315-98ae-db8fe65dc219` (RE-2026-0043), `3c3b6620-b1e4-4735-994b-b5b73164bf27` (RE-2026-0050), `ac308c69-91d1-43ca-a47c-a7c85029d93e` (RE-2026-0069).
3. **Egli Jona AG has no company master.** Invoice `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` (RE-2026-0061, 2026-08-21) has a bank debtor equal to that snapshot on 2026-09-10. Resolving it requires a human decision about whether a company row should exist. This investigation does not create one. A public registry can show whether that legal name exists. It cannot prove the invoice.
4. **Legal names with no company row and no agreeing bank row.** MKW Swiss AG (`84a81a5b-7b26-40d1-9161-ccec6373f118`) and Hutter Manfred GmbH (`a84d6fac-0efb-408d-9cf3-f156715c681b`) need the sent PDF. A registry lookup would only show that an AG or GmbH of that name may exist.
5. **Company masters created on 2026-08-13 06:38.** Several snapshot names match rows inserted that morning, after the invoices. Earlier saved addresses use the same name and still have no company id. A document from before 2026-08-13 is required before those rows can be treated as the billed entity.
6. **Company rows created minutes before the invoice record.** RE-2026-0068, RE-2026-0090, and RE-2026-0104. Same-day creation shows the order of data entry. It does not show an older legal relationship.
7. **Placeholder snapshots.** `3400bd0b-786b-4444-8352-884c2d357f89` says Firma, has no client, and has no appointment. `ff401ad9-f26b-4315-98ae-db8fe65dc219` says Frau. Both need the sent document. The bank row on the Frau invoice disagrees with that placeholder.
8. **Name history does not exist.** `companies` has no `deleted_at` and no rename table. Four company rows have a later `updated_at`. That timestamp is not an old name. If a billed entity was renamed, the old name is not in this database.

## E. Proposed human-review list

No invoice is historically confirmed. Two invoices have enough independent agreement to put before a person. They are not an allowlist, and `company_id` stays null.

| Invoice | Date | Proposed candidate | Why a person can decide | Why it is not confirmed |
|---|---|---|---|---|
| `2feb765f-b7e3-46e5-ae37-94c914af0065` RE-2026-0017 | 2026-06-09 | Netconstruction GmbH `4d70d768-fbb8-40a1-84af-3336b52c50ab` | Snapshot, current membership, place 8600 Dübendorf, and the bank debtor on 2026-08-28 all use that name | Company row created 2026-08-13, after the invoice. No attributable PDF or email. Invoice row updated 2026-09-14 |
| `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` RE-2026-0026 | 2026-07-14 | Netconstruction GmbH `4d70d768-fbb8-40a1-84af-3336b52c50ab` | Same agreement. Bank debtor also 2026-08-28 | Same later company row. Invoice row updated 2026-09-14 |

RE-2026-0016 (`59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5`, billing type individual, same snapshot and same candidate) has no bank row. It stays unresolved and is not on this list.

Egli Jona AG is corroborated by a bank debtor and has no company id, so it is not proposed for a link.

A recommendation in this table is not authorization to write. Both invoices are outside the 15-row trigger list. That technical fact does not make the evidence sufficient.

## F. Technical write gate

`update_invoice_status` is a `BEFORE UPDATE` trigger on `invoices`. It returns immediately for quotes. On an invoice, if `due_date` is before the current date, `status` is `sent`, and `payment_status` is not `paid`, it sets both `status` and `payment_status` to `overdue`. If `paid_amount_rappen` is at least `total_amount_rappen` and `payment_status` is not `paid`, it sets the invoice to paid. A later `AFTER UPDATE` trigger runs when status becomes paid and can mark the linked appointment paid.

An ordinary update that sets only `company_id` still fires this trigger. This investigation did not disable it, did not use a replication role, and did not update any row. Historical classification and this technical gate are separate. A probable or unresolved label does not make one of these rows safe to update.

| Invoice ID | Number | Invoice date | Current status | Payment status | Branch |
|---|---|---|---|---|---|
| `e1ac8880-0a40-4053-82c9-28effd878ba9` | RE-2026-0009 | 2026-04-18 | sent | pending | overdue |
| `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | RE-2026-0010 | 2026-04-19 | sent | pending | overdue |
| `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | RE-2026-0011 | 2026-04-19 | sent | pending | overdue |
| `01261371-4d06-47be-ba34-692e75893b6b` | RE-2026-0019 | 2026-07-07 | sent | pending | overdue |
| `0a906dbe-84b3-4546-8eb8-148911220f6a` | RE-2026-0020 | 2026-07-08 | sent | pending | overdue |
| `262a9f98-a0ce-41e0-bf70-7d71617692ce` | RE-2026-0028 | 2026-07-20 | sent | pending | overdue |
| `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | RE-2026-0037 | 2026-07-22 | pdf_created | pending | paid (total 0 and paid amount 0; one appointment item would follow if status became paid) |
| `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | RE-2026-0045 | 2026-07-29 | sent | pending | overdue |
| `4ebce689-5261-4dc2-96f5-29b804ac50e8` | RE-2026-0046 | 2026-07-29 | sent | pending | overdue |
| `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | RE-2026-0073 | 2026-08-31 | sent | pending | overdue |
| `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | RE-2026-0075 | 2026-09-01 | sent | pending | overdue |
| `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | RE-2026-0085 | 2026-09-18 | sent | pending | overdue |
| `6addae71-24f5-49a0-aad7-d93650645da3` | RE-2026-0086 | 2026-09-18 | sent | pending | overdue |
| `7173f7e2-f714-4581-82dc-d26ee82cd03c` | RE-2026-0090 | 2026-09-24 | sent | pending | overdue |
| `0209bc4b-fea5-4af8-914e-ec3a1612d134` | RE-2026-0096 | 2026-09-30 | sent | pending | overdue |

Fourteen rows are `sent` / `pending` with a due date already in the past, so the overdue branch would change them. One row, `6f4415ac-944a-4d83-a39b-22bf2248eb8c`, is `pdf_created` / `pending` with both amounts at 0, so the paid branch would change it and the appointment trigger would then run.

## What this investigation does not do

It does not set `invoices.company_id`. It does not treat current membership, a matching name, a matching place, a payment status, or an employee relationship as historical proof. It does not infer a private recipient from the absence of a company. It does not infer a company in order to close the list.
