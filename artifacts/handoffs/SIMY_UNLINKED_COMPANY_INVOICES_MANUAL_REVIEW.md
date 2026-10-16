# SIMY — Unverknüpfte Firmenrechnungen: manuelle Prüfliste

Abschlussurteil: `PASS — REVIEW LIST COMPLETE`

Dieser Bericht ist eine Arbeitsliste für Menschen. Er ist kein Backfill, keine Zuordnung und keine Freigabe für ein Datenbank-Update.

Es wurde nichts zugeordnet. Es gab nur Lesezugriffe. Keine Migration, kein Backfill und keine Produktionsänderung.

## Fallzahlen

| Kennzahl | Anzahl |
| --- | ---: |
| Rechnungen `document_kind = invoice` | 167 |
| Davon Prüffälle in dieser Liste | 64 |
| `billing_type = company` und `company_id IS NULL` | 60 |
| Davon Snapshot ohne Firmennamen | 17 |
| Davon Snapshot mit Firmennamen | 43 |
| `billing_type = individual`, `company_id IS NULL`, Firmenname nicht leer | 4 |
| Bereits verknüpfte Firmenrechnungen (Kontrollgruppe, nicht in den 64) | 11 |
| Prüffälle mit mindestens einem gleich-Tenant-Firmenkandidaten | 32 |
| Prüffälle ohne gleich-Tenant-Kandidaten | 32 |
| Prüffälle mit einem Kandidaten, dessen Datensatz zum Rechnungszeitpunkt schon existierte | 16 |
| Prüffälle ohne solchen zum Rechnungszeitpunkt existierenden Kandidaten | 48 |
| Prüffälle, deren Kandidaten sämtlich nachträglich angelegt wurden | 16 |
| Prüffälle mit mehreren gleich-Tenant-Kandidaten | 0 |
| Prüffälle mit Fremd-Tenant-Treffer | 0 |
| Prüffälle, bei denen `update_invoice_status` den Zahlungsstatus ändern würde | 15 |
| Davon mit exaktem Namen und heutiger Mitgliedschaft auf dieselbe Firma | 9 |

„Kandidat“ bedeutet hier nur: gleiche Tenant-ID und entweder exakter normalisierter Name oder aktuelle `users.company_id`. „Zum Rechnungszeitpunkt existent“ bedeutet nur, dass `companies.created_at` nicht nach `invoices.created_at` und nicht nach dem Rechnungsdatum liegt. Beides ist keine bestätigte Zuordnung.

## 1. Abfragezeitpunkt und Produktionsprojekt

| Angabe | Wert |
| --- | --- |
| Projekt | Supabase `unyjaetebnaexaflpyoc` |
| Zugriff | `execute_sql` mit `SELECT`, Katalogabfragen und `pg_get_functiondef` / `pg_get_triggerdef` |
| Erste Bestandzählung | 2026-10-16 15:56:28 Europe/Zurich (13:56:28 UTC), `CURRENT_DATE` = 2026-10-16 |
| Zeilenextrakt der 64 Prüffälle | dieselbe Sitzung, unmittelbar nach der Bestandzählung |
| Bestätigung der ID-Menge | 2026-10-16 16:05 Europe/Zurich (14:05 UTC): weiterhin 167 Rechnungen, 60 unverknüpfte Firmenrechnungen, 4 Individualrechnungen mit Firmennamen, 4 Offerten |
| Prüfsumme der 64 IDs | `md5` der sortierten ID-Liste = `afdf9bd401cdd3d70a8040e3945ec48e`, identisch im Zeilenextrakt und in der Bestätigungsabfrage |

`artifacts/handoffs/SIMY_COMPANY_INVOICE_LINKING_SYSTEM_AUDIT.md` liegt weder auf `origin/main` noch auf dem Branch von PR #459. Die historischen Zählwerte aus dem Auftrag und aus `artifacts/handoffs/HISTORICAL_COMPANY_INVOICE_LINKING.md` auf PR #459 wurden neu gerechnet und nicht als Ist-Stand übernommen. PR #459 wurde nicht geändert.

| Kennzahl | Früherer Stand vom 16. Oktober 2026 | Dieser Lauf |
| --- | ---: | ---: |
| Unverknüpfte Firmenrechnungen | 60 | 60 |
| Verknüpfte Firmenrechnungen | 11 | 11 |
| Status-Trigger in den unverknüpften Firmenrechnungen | 15 | 15 |
| Namens- und Mitgliedschaftstreffer innerhalb dieser Triggergruppe | 5 | 9 |

Der Wert 5 gilt nicht mehr. Aktuell liegen 9 der 15 Triggerfälle zugleich bei exaktem Namen und heutiger Mitgliedschaft.

## 2. Methodik

Gelesene Tabellen und Spalten:

| Tabelle | Verwendete Spalten |
| --- | --- |
| `invoices` | `id`, `invoice_number`, `document_kind`, `quote_number`, `tenant_id`, `user_id`, `company_id`, `billing_type`, `billing_company_name`, `billing_zip`, `billing_city`, `invoice_date`, `due_date`, `created_at`, `status`, `payment_status`, `total_amount_rappen`, `paid_amount_rappen`, `subtotal_rappen`, `vat_rate`, `vat_amount_rappen`, `discount_amount_rappen`, `dunning_level`, `dunning_paused`, `credit_applied_rappen`, `appointment_id`, `product_sale_id` |
| `tenants` | `id`, `name`, `slug` |
| `users` | `id`, `first_name`, `last_name`, `tenant_id`, `company_id`, `default_company_billing_address_id` |
| `companies` | `id`, `tenant_id`, `name`, `zip`, `city`, `created_at`, `is_active` |
| `company_billing_addresses` | `id`, `user_id`, `tenant_id`, `company_name`, `zip`, `city`, `created_at`, `is_active` |
| `course_registrations` | `invoice_id`, `course_id` |
| `course_invoice_bindings` | `invoice_id`, `registration_id` |
| `courses` | `id`, `company_id` |
| `invoice_items` | `invoice_id`, `appointment_id` (nur Anzahl) |
| `vehicle_bookings`, `room_bookings` | `invoice_id` (nur Existenz) |

Nicht gelesen und nicht in den Bericht aufgenommen: Strasse, Hausnummer, E-Mail, Telefon, UID/MWST, Kontaktperson, Zahlungsreferenz, IBAN, Mahntext, interne Notizen.

Normalisierung für den Namensvergleich, angelehnt an `flattenCompanyName`: trimmen, Zeilenumbrüche und Tabs zu Leerzeichen, mehrfache Leerzeichen zusammenziehen, dann Kleinbuchstaben. Ein Treffer ist nur Gleichheit nach dieser Normalisierung. Enthaltung, Tippfehler und ähnliche Namen sind kein Treffer. Im Datenbestand gab es keine solche Enthaltung.

Ortsvergleich: PLZ ohne Leerzeichen und Ort nach derselben Textnormalisierung. `NAME_AND_LOCATION_MATCH` nur wenn der Name gleich ist und PLZ und Ort auf beiden Seiten vorhanden und gleich sind.

Labelregeln, kombinierbar:

| Label | Bedingung |
| --- | --- |
| `EXACT_NAME_MATCH` | Normalisierter Snapshot-Name gleich einer Firma im selben Tenant |
| `NAME_AND_LOCATION_MATCH` | Zusätzlich PLZ und Ort gleich |
| `MEMBERSHIP_MATCH_ONLY` | `users.company_id` zeigt auf eine Firma im selben Tenant, und es gibt keinen exakten Namenstreffer |
| `MULTIPLE_CANDIDATES` | Mehr als eine verschiedene gleich-Tenant-Firma aus Name oder Mitgliedschaft |
| `NO_MATCH` | Firmenname vorhanden, aber kein gleich-Tenant-Name und keine gleich-Tenant-Mitgliedschaft |
| `CANDIDATE_CREATED_AFTER_INVOICE` | Ein gleich-Tenant-Kandidat hat `created_at` nach `invoices.created_at` oder der Zürcher Kalendertag der Firma liegt nach `invoice_date` |
| `CROSS_TENANT_CANDIDATE` | Exakter Name oder `users.company_id` liegt in einem anderen Tenant. Nie zulässig |
| `INSUFFICIENT_DATA` | Billing-Firmenname leer. Ein Namensvergleich unterbleibt dann; das ist nicht dasselbe wie `NO_MATCH` |

Geprüfte Beziehungen:

- `users.company_id` → `companies.id`. Das ist die einzige direkte Mitgliedschaft. Eine Mitgliedschaftstabelle gibt es nicht.
- `users.default_company_billing_address_id` und `company_billing_addresses.user_id`. Das sind gespeicherte Adressdatensätze, keine `companies.id`, ausser der Adressname trifft exakt eine Firma.
- Andere `invoices.company_id` desselben Users.
- `courses.company_id` über `course_registrations.invoice_id` und über `course_invoice_bindings`.

Fremd-Tenant-Firmen wurden gegen alle 24 Firmen in den drei Tenants auf exakten Namen geprüft. Kein Prüffall hat einen solchen Treffer. Kein gespeichertes `invoices.company_id` zeigt in einen anderen Tenant.

Trigger, nur gelesen:

- `trigger_calculate_invoice_vat` BEFORE INSERT OR UPDATE, Funktion `calculate_invoice_vat`.
- `trigger_update_invoice_status` BEFORE UPDATE, Funktion `update_invoice_status`. Offerten kehren sofort zurück. Sonst: überfällig wenn `due_date < CURRENT_DATE` und `status = sent` und `payment_status <> paid`; bezahlt wenn `paid_amount_rappen >= total_amount_rappen` und `payment_status <> paid`.
- `trigger_update_appointment_status_on_invoice_paid` AFTER UPDATE, nur wenn der Status neu `paid` wird.

Die Bedingungen wurden in `SELECT` nachgerechnet. Es wurde kein UPDATE ausgeführt. Für alle 64 Prüffälle schreibt die MWST-Formel dieselben Beträge, die schon gespeichert sind.

Sortierung: Tenant-Slug, Rechnungsdatum, Rechnungsnummer, dann ID. Dieselbe Rechnungsnummer kommt in mehreren Tenants vor. Die ID ist eindeutig.

Zulässige menschliche Entscheidungen, hier nicht gesetzt: `LINK_TO_COMPANY`, `KEEP_UNLINKED`, `NEEDS_MORE_EVIDENCE`, `BILLING_TYPE_REVIEW`, `ESCALATE_ACCOUNTING`.

## 3. Gesamtzahlen nach Kategorie und Tenant

Bestand `document_kind = invoice`: 167. Offerten: 4, in Abschnitt 8 getrennt.

| Tenant | Slug | Rechnungen | Unverknüpft company | Davon mit Namen | Davon ohne Namen | Individual mit Firmenname | Verknüpft company |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fahrschule Driving Team | `driving-team` | 112 | 43 | 42 | 1 | 4 | 3 |
| Fahrschule Gemperli | `fahrschule-gemperli` | 54 | 17 | 1 | 16 | 0 | 7 |
| Simy.ch | `simych` | 1 | 0 | 0 | 0 | 0 | 1 |
| Summe |  | 167 | 60 | 43 | 17 | 4 | 11 |

Weitere Kombinationen im Ist-Schema:

| Kombination | Anzahl | Behandlung |
| --- | ---: | --- |
| `billing_type = individual` und `company_id` gesetzt | 0 | kommt nicht vor |
| `billing_type` NULL | 0 | kommt nicht vor |
| Verknüpfte Rechnung mit Firma in einem anderen Tenant | 0 | kommt nicht vor |
| Verknüpfte Firmenrechnung ohne `user_id` | 11 | Kontrollgruppe, alle 11 |
| Individualrechnung ohne User und ohne Firmennamen | 3 | nicht in der Prüfliste. IDs: `5ff39b73-3aa6-4e81-8939-08a1c6bac381`, `a70f531f-acd2-4181-b133-919cd7622539`, `fe26d095-e9b9-405f-b414-22fc2e81a55e` |
| `document_kind` ausser invoice und quote | 0 | kommt nicht vor |

Vergleichslabels über die 64 Prüffälle:

| Label | Fälle |
| --- | ---: |
| `EXACT_NAME_MATCH` | 29 |
| `NAME_AND_LOCATION_MATCH` | 17 |
| `MEMBERSHIP_MATCH_ONLY` | 3 |
| `MULTIPLE_CANDIDATES` | 0 |
| `NO_MATCH` | 16 |
| `CANDIDATE_CREATED_AFTER_INVOICE` | 16 |
| `CROSS_TENANT_CANDIDATE` | 0 |
| `INSUFFICIENT_DATA` | 17 |

Jeder exakte Namenstreffer ist zugleich die aktuelle `users.company_id` derselben Firma. Einen Namenstreffer ohne diese Mitgliedschaft gibt es in den 64 Fällen nicht. Drei Fälle haben nur die Mitgliedschaft.

Von den 29 Namenstreffern haben 17 auch denselben Ort. 12 tragen den Namen „Driving Team Zürich GmbH“, der Snapshot aber PLZ 8610 Uster statt PLZ 8048 Zürich. Das bleibt `EXACT_NAME_MATCH` und ist kein Ortsgleichstand.

## 4. Prüfliste

Jede der 64 Rechnungen steht einmal im Index und einmal im Einzelabschnitt. Die Entscheidungsfelder sind leer.

| Tenant | Rechnung | ID | Datum | Kategorie | Kunde | Billing-Firmenname | Kandidaten | Labels | Status-Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| driving-team | [2026-000005](#9364490e-7c25-4f4a-a5d6-35b3299fff86) | `9364490e-7c25-4f4a-a5d6-35b3299fff86` | 2026-02-09 | `COMPANY_BILLING_UNLINKED` | Enrique Henriquez frias | Baugenossenschaft Schönheim | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [2026-000006](#dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb) | `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` | 2026-02-12 | `COMPANY_BILLING_UNLINKED` | Saeed SADEGHI | Heilsarmee Zürich | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [2026-000007](#e7bdb323-9762-486a-9751-391714727483) | `e7bdb323-9762-486a-9751-391714727483` | 2026-02-25 | `COMPANY_BILLING_UNLINKED` | Jitse Jeroense | Thomann Nutzfahrzeuge | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0009](#e1ac8880-0a40-4053-82c9-28effd878ba9) | `e1ac8880-0a40-4053-82c9-28effd878ba9` | 2026-04-18 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | ja |
| driving-team | [RE-2026-0010](#77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3) | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | 2026-04-19 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | ja |
| driving-team | [RE-2026-0011](#f41239b4-55c6-4094-a30f-2c9d9de1f49f) | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | 2026-04-19 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | ja |
| driving-team | [RE-2026-0012](#23c3a657-ed02-46ac-8a51-69cf3c534448) | `23c3a657-ed02-46ac-8a51-69cf3c534448` | 2026-04-19 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0013](#1ce513c6-cf04-4bdf-a981-22787be2c1ca) | `1ce513c6-cf04-4bdf-a981-22787be2c1ca` | 2026-04-19 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0014](#b4e68f95-197e-446c-a556-14a968266060) | `b4e68f95-197e-446c-a556-14a968266060` | 2026-04-19 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0016](#59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5) | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | 2026-05-28 | `INDIVIDUAL_WITH_COMPANY_NAME` | Maliqi Krenar | Netconstruction GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0017](#2feb765f-b7e3-46e5-ae37-94c914af0065) | `2feb765f-b7e3-46e5-ae37-94c914af0065` | 2026-06-09 | `COMPANY_BILLING_UNLINKED` | Maliqi Krenar | Netconstruction GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0019](#01261371-4d06-47be-ba34-692e75893b6b) | `01261371-4d06-47be-ba34-692e75893b6b` | 2026-07-07 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH | ja |
| driving-team | [RE-2026-0020](#0a906dbe-84b3-4546-8eb8-148911220f6a) | `0a906dbe-84b3-4546-8eb8-148911220f6a` | 2026-07-08 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH | ja |
| driving-team | [RE-2026-0025](#7914f05f-cf63-488d-89c7-af15900fdf95) | `7914f05f-cf63-488d-89c7-af15900fdf95` | 2026-07-13 | `COMPANY_BILLING_BLANK_NAME` | Samuel Hauser | — | 1 | MEMBERSHIP_MATCH_ONLY, CANDIDATE_CREATED_AFTER_INVOICE, INSUFFICIENT_DATA | nein |
| driving-team | [RE-2026-0026](#baa3c2c6-df08-4a2c-bfba-1beedb6bfe21) | `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` | 2026-07-14 | `COMPANY_BILLING_UNLINKED` | Maliqi Krenar | Netconstruction GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0027](#585ee4fc-51f0-4475-821f-6c7c27055ba5) | `585ee4fc-51f0-4475-821f-6c7c27055ba5` | 2026-07-14 | `COMPANY_BILLING_UNLINKED` | Paskaran Shathees | Shathees | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0028](#262a9f98-a0ce-41e0-bf70-7d71617692ce) | `262a9f98-a0ce-41e0-bf70-7d71617692ce` | 2026-07-20 | `COMPANY_BILLING_UNLINKED` | Hans-Jörg Bowald | Hans-Jörg Bowald | 0 | NO_MATCH | ja |
| driving-team | [RE-2026-0029](#dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc) | `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` | 2026-07-21 | `COMPANY_BILLING_UNLINKED` | Laugnor islami | Auto-Mels GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0031](#54e47472-b5ba-4877-acc7-d4afabd2978c) | `54e47472-b5ba-4877-acc7-d4afabd2978c` | 2026-07-21 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH | nein |
| driving-team | [RE-2026-0034](#1ea0a187-fbec-4b08-b107-e1f5fb8c27af) | `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` | 2026-07-21 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH | nein |
| driving-team | [RE-2026-0036](#a0432aca-430b-4a0c-8735-264c801907fa) | `a0432aca-430b-4a0c-8735-264c801907fa` | 2026-07-22 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH | nein |
| driving-team | [RE-2026-0037](#6f4415ac-944a-4d83-a39b-22bf2248eb8c) | `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | 2026-07-22 | `COMPANY_BILLING_UNLINKED` | Peter Muster | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH | ja |
| driving-team | [RE-2026-0043](#ff401ad9-f26b-4315-98ae-db8fe65dc219) | `ff401ad9-f26b-4315-98ae-db8fe65dc219` | 2026-07-24 | `COMPANY_BILLING_UNLINKED` | Yvonne Schwitter | Frau | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0045](#7033c4f6-dcda-4995-a614-a6e2b5ddbd70) | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | 2026-07-29 | `COMPANY_BILLING_UNLINKED` | Pranvera Latifaj | Pranvera Latifaj | 0 | NO_MATCH | ja |
| driving-team | [RE-2026-0046](#4ebce689-5261-4dc2-96f5-29b804ac50e8) | `4ebce689-5261-4dc2-96f5-29b804ac50e8` | 2026-07-29 | `COMPANY_BILLING_UNLINKED` | Pranvera Latifaj | Pranvera Latifaj | 0 | NO_MATCH | ja |
| driving-team | [RE-2026-0047](#3400bd0b-786b-4444-8352-884c2d357f89) | `3400bd0b-786b-4444-8352-884c2d357f89` | 2026-07-30 | `INDIVIDUAL_WITH_COMPANY_NAME` | NOT AVAILABLE | Firma | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0050](#3c3b6620-b1e4-4735-994b-b5b73164bf27) | `3c3b6620-b1e4-4735-994b-b5b73164bf27` | 2026-08-04 | `INDIVIDUAL_WITH_COMPANY_NAME` | Can Karaca | Edelweiss Garten- und Grabenservice | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | nein |
| driving-team | [RE-2026-0051](#67dca57f-362e-4069-be6f-3c39ad1fa436) | `67dca57f-362e-4069-be6f-3c39ad1fa436` | 2026-08-06 | `COMPANY_BILLING_UNLINKED` | Pascal Kilchenmann | Pascal Kilchenmann | 1 | MEMBERSHIP_MATCH_ONLY | nein |
| driving-team | [RE-2026-0053](#b48b91c4-8fea-4cc8-8014-18e4b8a40f1f) | `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` | 2026-08-08 | `COMPANY_BILLING_UNLINKED` | Pascal Kilchenmann | Pascal Kilchenmann | 1 | MEMBERSHIP_MATCH_ONLY | nein |
| driving-team | [RE-2026-0054](#64be3632-165a-455c-98d1-4e7a85bf45e1) | `64be3632-165a-455c-98d1-4e7a85bf45e1` | 2026-08-13 | `COMPANY_BILLING_UNLINKED` | Pascal Kilchenmann | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | nein |
| driving-team | [RE-2026-0055](#157c0e30-7bc0-43c9-a933-9a9063af2330) | `157c0e30-7bc0-43c9-a933-9a9063af2330` | 2026-08-13 | `COMPANY_BILLING_UNLINKED` | Pascal Kilchenmann | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | nein |
| driving-team | [RE-2026-0056](#249db0f5-3b10-4827-92b0-a8ff70a19edd) | `249db0f5-3b10-4827-92b0-a8ff70a19edd` | 2026-08-13 | `COMPANY_BILLING_UNLINKED` | Simon Peterhans | Driving Team Zürich GmbH | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | nein |
| driving-team | [RE-2026-0058](#84a81a5b-7b26-40d1-9161-ccec6373f118) | `84a81a5b-7b26-40d1-9161-ccec6373f118` | 2026-08-21 | `COMPANY_BILLING_UNLINKED` | Ruzhdi Ukzmaili | MKW Swiss AG | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0061](#6a321fa4-c65a-4a66-92a2-ceb1b3494d34) | `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` | 2026-08-21 | `COMPANY_BILLING_UNLINKED` | Oleksandr Sharkevych | Egli Jona AG | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0068](#3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81) | `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` | 2026-08-27 | `COMPANY_BILLING_UNLINKED` | Samuel Hauser | samuel samuel | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | nein |
| driving-team | [RE-2026-0069](#ac308c69-91d1-43ca-a47c-a7c85029d93e) | `ac308c69-91d1-43ca-a47c-a7c85029d93e` | 2026-08-28 | `INDIVIDUAL_WITH_COMPANY_NAME` | Yannis Oberholzer | Thomann Nutzfahrzeuge | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | nein |
| driving-team | [RE-2026-0073](#d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d) | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | 2026-08-31 | `COMPANY_BILLING_UNLINKED` | Yvonne Bettkober | Yvonne Bettkober-Oum | 0 | NO_MATCH | ja |
| driving-team | [RE-2026-0075](#bc2829f8-639d-48c0-baf6-9c81fd138bcc) | `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | 2026-09-01 | `COMPANY_BILLING_UNLINKED` | Andres Jud | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | ja |
| driving-team | [RE-2026-0085](#4b6bad1c-e897-49d8-b3ba-301e94376dc4) | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | 2026-09-18 | `COMPANY_BILLING_UNLINKED` | Yvonne Bettkober | Yvonne Bettkober-Oum | 0 | NO_MATCH | ja |
| driving-team | [RE-2026-0086](#6addae71-24f5-49a0-aad7-d93650645da3) | `6addae71-24f5-49a0-aad7-d93650645da3` | 2026-09-18 | `COMPANY_BILLING_UNLINKED` | Tsering Ngodup | Tsering Ngodup | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH, CANDIDATE_CREATED_AFTER_INVOICE | ja |
| driving-team | [RE-2026-0090](#7173f7e2-f714-4581-82dc-d26ee82cd03c) | `7173f7e2-f714-4581-82dc-d26ee82cd03c` | 2026-09-24 | `COMPANY_BILLING_UNLINKED` | Kushtrim Sadiku | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | ja |
| driving-team | [RE-2026-0096](#0209bc4b-fea5-4af8-914e-ec3a1612d134) | `0209bc4b-fea5-4af8-914e-ec3a1612d134` | 2026-09-30 | `COMPANY_BILLING_UNLINKED` | Mohamed Ahrram akel | Mohamed Ahrram akel | 0 | NO_MATCH | ja |
| driving-team | [RE-2026-0099](#617cc446-45ec-467d-953d-4bd2fa03ba9c) | `617cc446-45ec-467d-953d-4bd2fa03ba9c` | 2026-10-08 | `COMPANY_BILLING_UNLINKED` | Viorel Manolache | Viorel Manolache | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0103](#2e854034-50f3-48b4-9fc3-b8bdd348337c) | `2e854034-50f3-48b4-9fc3-b8bdd348337c` | 2026-10-12 | `COMPANY_BILLING_UNLINKED` | Viorel Manolache | Viorel Manolache | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0104](#fbee557f-b631-4193-a40a-28b889ca54c5) | `fbee557f-b631-4193-a40a-28b889ca54c5` | 2026-10-15 | `COMPANY_BILLING_UNLINKED` | Kujtim Masurica | SBB/CFF/FFS | 1 | EXACT_NAME_MATCH, NAME_AND_LOCATION_MATCH | nein |
| driving-team | [RE-2026-0105](#f8ea72e0-7756-4db5-ae39-79dfb318434c) | `f8ea72e0-7756-4db5-ae39-79dfb318434c` | 2026-10-16 | `COMPANY_BILLING_UNLINKED` | Viorel Manolache | Viorel Manolache | 0 | NO_MATCH | nein |
| driving-team | [RE-2026-0106](#6e07fe3e-1c78-406f-b134-175e4a12154c) | `6e07fe3e-1c78-406f-b134-175e4a12154c` | 2026-10-16 | `COMPANY_BILLING_UNLINKED` | Viorel Manolache | Viorel Manolache | 0 | NO_MATCH | nein |
| fahrschule-gemperli | [RE-2026-0010](#28a7ebe7-04cd-4676-9b83-3c2be4df0b83) | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | 2026-07-22 | `COMPANY_BILLING_BLANK_NAME` | Doris Lauber | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0012](#be80a098-7039-4c18-8843-e2d43fc00931) | `be80a098-7039-4c18-8843-e2d43fc00931` | 2026-07-22 | `COMPANY_BILLING_BLANK_NAME` | Doris Lauber | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0013](#c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f) | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | 2026-07-29 | `COMPANY_BILLING_BLANK_NAME` | Doris Lauber | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0021](#e72dc779-05b5-4dd9-9b2f-8966e7278a50) | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Reto Weber | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0024](#4a832b6c-15f5-4035-973c-8b8c11276216) | `4a832b6c-15f5-4035-973c-8b8c11276216` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Tim Egloff | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0025](#1454bed1-e68a-4444-9af6-4d92ef8e980f) | `1454bed1-e68a-4444-9af6-4d92ef8e980f` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Sandra Hälg | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0026](#33d4b7e1-0ecd-45db-9717-df471a167db3) | `33d4b7e1-0ecd-45db-9717-df471a167db3` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Alan Leyel | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0028](#65a0d6f7-48f1-4fee-8be3-749983cf11ca) | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Sky Hrasche | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0029](#f524dea2-25da-43fd-9194-6d5c201170de) | `f524dea2-25da-43fd-9194-6d5c201170de` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Rahel Bucher | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0030](#62c7bfe3-b427-4f49-9c8f-5e753c9c3589) | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Urs Keller | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0035](#a84d6fac-0efb-408d-9cf3-f156715c681b) | `a84d6fac-0efb-408d-9cf3-f156715c681b` | 2026-09-25 | `COMPANY_BILLING_UNLINKED` | David Hegner | Hutter Manfred GmbH | 0 | NO_MATCH | nein |
| fahrschule-gemperli | [RE-2026-0036](#c0b93f3e-fe62-4923-8b35-2c2a467ccc91) | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Kai Burri | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0037](#c32e038d-942c-49c6-82fe-ff7a9f4add61) | `c32e038d-942c-49c6-82fe-ff7a9f4add61` | 2026-09-25 | `COMPANY_BILLING_BLANK_NAME` | Florian Schnyder | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0044](#e6654110-120a-40c6-a3cf-0468fc2af62d) | `e6654110-120a-40c6-a3cf-0468fc2af62d` | 2026-10-03 | `COMPANY_BILLING_BLANK_NAME` | Gurdin Diethelm | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0045](#a27a1ace-d3f6-4c32-987e-d25b45ca4b1d) | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | 2026-10-04 | `COMPANY_BILLING_BLANK_NAME` | Sina Bürgi | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0048](#c373fb40-06d4-4821-b40a-85bf55e43e63) | `c373fb40-06d4-4821-b40a-85bf55e43e63` | 2026-10-04 | `COMPANY_BILLING_BLANK_NAME` | Dario Reumer | — | 0 | INSUFFICIENT_DATA | nein |
| fahrschule-gemperli | [RE-2026-0049](#d12a4229-c50b-4016-a964-41857f8b2304) | `d12a4229-c50b-4016-a964-41857f8b2304` | 2026-10-04 | `COMPANY_BILLING_BLANK_NAME` | Nina Vogt | — | 0 | INSUFFICIENT_DATA | nein |

## 5. Einzelprüfung

<a id="9364490e-7c25-4f4a-a5d6-35b3299fff86"></a>
### 2026-000005 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `9364490e-7c25-4f4a-a5d6-35b3299fff86` |
| Rechnungsnummer | 2026-000005 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `61250d85-045d-42ef-82ed-3c0765cb1861` |
| Kundenname | Enrique Henriquez frias |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Baugenossenschaft Schönheim |
| PLZ und Ort im Snapshot | 8047 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-02-09 |
| Erstellt | 2026-02-09 09:07:35 CET |
| Fällig | 2026-03-11 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 20.14 |
| Bezahlt | CHF 20.14 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (7). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `525bf160-906c-4886-9284-b6e68eb6195c` „Baugenossenschaft Schönheim“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `e53dd179-201e-41b0-9923-3dc020466b68`: Name „Baugenossenschaft Schönheim “, PLZ 8047, Ort Zürich, erstellt 2025-12-18 10:31:09 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `525bf160-906c-4886-9284-b6e68eb6195c`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `1787aa2d-41b4-4455-8d2c-d18668f41efb`: Name „Baugenossenschaft Schönheim “, PLZ 8047, Ort Zürich, erstellt 2026-02-09 09:05:04 CET, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `525bf160-906c-4886-9284-b6e68eb6195c`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `525bf160-906c-4886-9284-b6e68eb6195c` „Baugenossenschaft Schönheim“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8047 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `9364490e-7c25-4f4a-a5d6-35b3299fff86` / 2026-000005 |
| Tenant | Fahrschule Driving Team |
| Kunde | Enrique Henriquez frias / `61250d85-045d-42ef-82ed-3c0765cb1861` |
| Billing-Firmenname | Baugenossenschaft Schönheim |
| Mögliche Firmen im selben Tenant | Baugenossenschaft Schönheim (`525bf160-906c-4886-9284-b6e68eb6195c`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `525bf160-906c-4886-9284-b6e68eb6195c` (Baugenossenschaft Schönheim) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb"></a>
### 2026-000006 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` |
| Rechnungsnummer | 2026-000006 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `6c8a410e-4897-4cd8-94e3-1bfe81901e56` |
| Kundenname | Saeed SADEGHI |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Heilsarmee Zürich |
| PLZ und Ort im Snapshot | 8004 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-02-12 |
| Erstellt | 2026-02-12 15:44:40 CET |
| Fällig | 2026-03-14 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 13.03 |
| Bezahlt | CHF 13.03 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (10). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `948dbd85-11a6-46f3-a119-e331b1a14c9d` „Heilsarmee Zürich“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `57869120-9503-493c-9cab-03425aa4ef4b`: Name „Heilsarmee Zürich“, PLZ 8004, Ort Zürich, erstellt 2026-01-13 13:02:41 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `948dbd85-11a6-46f3-a119-e331b1a14c9d`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `283b68a7-c446-46bc-a056-f0c00e633c24`: Name „Heilsarmee Zürich“, PLZ 8004, Ort Zürich, erstellt 2026-02-05 10:55:04 CET, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `948dbd85-11a6-46f3-a119-e331b1a14c9d`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `948dbd85-11a6-46f3-a119-e331b1a14c9d` „Heilsarmee Zürich“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8004 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` / 2026-000006 |
| Tenant | Fahrschule Driving Team |
| Kunde | Saeed SADEGHI / `6c8a410e-4897-4cd8-94e3-1bfe81901e56` |
| Billing-Firmenname | Heilsarmee Zürich |
| Mögliche Firmen im selben Tenant | Heilsarmee Zürich (`948dbd85-11a6-46f3-a119-e331b1a14c9d`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `948dbd85-11a6-46f3-a119-e331b1a14c9d` (Heilsarmee Zürich) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="e7bdb323-9762-486a-9751-391714727483"></a>
### 2026-000007 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `e7bdb323-9762-486a-9751-391714727483` |
| Rechnungsnummer | 2026-000007 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `921a7b2c-bfa2-4f7f-baf2-9112fee8223c` |
| Kundenname | Jitse Jeroense |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Thomann Nutzfahrzeuge |
| PLZ und Ort im Snapshot | 8716 Schmerikon |
| company_id | NULL |
| Rechnungsdatum | 2026-02-25 |
| Erstellt | 2026-02-25 16:34:18 CET |
| Fällig | 2026-03-27 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 12.82 |
| Bezahlt | CHF 12.82 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` „Thomann Nutzfahrzeuge“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `6bab460f-3b51-4a6c-8846-7b8593f84adb`: Name „Thomann Nutzfahrzeuge“, PLZ 8716, Ort Schmerikon, erstellt 2026-01-20 07:44:29 CET, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` „Thomann Nutzfahrzeuge“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8716 Schmerikon. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `e7bdb323-9762-486a-9751-391714727483` / 2026-000007 |
| Tenant | Fahrschule Driving Team |
| Kunde | Jitse Jeroense / `921a7b2c-bfa2-4f7f-baf2-9112fee8223c` |
| Billing-Firmenname | Thomann Nutzfahrzeuge |
| Mögliche Firmen im selben Tenant | Thomann Nutzfahrzeuge (`18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` (Thomann Nutzfahrzeuge) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="e1ac8880-0a40-4053-82c9-28effd878ba9"></a>
### RE-2026-0009 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `e1ac8880-0a40-4053-82c9-28effd878ba9` |
| Rechnungsnummer | RE-2026-0009 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-04-18 |
| Erstellt | 2026-04-18 18:27:15 CEST |
| Fällig | 2026-05-18 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 95.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `e1ac8880-0a40-4053-82c9-28effd878ba9` / RE-2026-0009 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3"></a>
### RE-2026-0010 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` |
| Rechnungsnummer | RE-2026-0010 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-04-19 |
| Erstellt | 2026-04-19 06:00:44 CEST |
| Fällig | 2026-05-19 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 210.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` / RE-2026-0010 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="f41239b4-55c6-4094-a30f-2c9d9de1f49f"></a>
### RE-2026-0011 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` |
| Rechnungsnummer | RE-2026-0011 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-04-19 |
| Erstellt | 2026-04-19 09:35:42 CEST |
| Fällig | 2026-05-19 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 94.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` / RE-2026-0011 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="23c3a657-ed02-46ac-8a51-69cf3c534448"></a>
### RE-2026-0012 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `23c3a657-ed02-46ac-8a51-69cf3c534448` |
| Rechnungsnummer | RE-2026-0012 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-04-19 |
| Erstellt | 2026-04-19 14:27:32 CEST |
| Fällig | 2026-05-19 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 95.00 |
| Bezahlt | CHF 95.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `23c3a657-ed02-46ac-8a51-69cf3c534448` / RE-2026-0012 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="1ce513c6-cf04-4bdf-a981-22787be2c1ca"></a>
### RE-2026-0013 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `1ce513c6-cf04-4bdf-a981-22787be2c1ca` |
| Rechnungsnummer | RE-2026-0013 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-04-19 |
| Erstellt | 2026-04-19 14:32:08 CEST |
| Fällig | 2026-05-19 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `overdue` |
| Gesamtbetrag | CHF 105.00 |
| Bezahlt | CHF 45.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `1ce513c6-cf04-4bdf-a981-22787be2c1ca` / RE-2026-0013 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Mahnstufe 1 ist gesetzt. Darf eine spätere Korrektur den Mahn- und Zahlungsstatus unberührt lassen? |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="b4e68f95-197e-446c-a556-14a968266060"></a>
### RE-2026-0014 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `b4e68f95-197e-446c-a556-14a968266060` |
| Rechnungsnummer | RE-2026-0014 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-04-19 |
| Erstellt | 2026-04-19 14:50:03 CEST |
| Fällig | 2026-05-19 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 95.00 |
| Bezahlt | CHF 95.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `b4e68f95-197e-446c-a556-14a968266060` / RE-2026-0014 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5"></a>
### RE-2026-0016 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` |
| Rechnungsnummer | RE-2026-0016 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| Kundenname | Maliqi Krenar |
| billing_type | `individual` |
| Kategorie | `INDIVIDUAL_WITH_COMPANY_NAME` |
| Billing-Firmenname | Netconstruction GmbH |
| PLZ und Ort im Snapshot | 8600 Dübendorf |
| company_id | NULL |
| Rechnungsdatum | 2026-05-28 |
| Erstellt | 2026-05-28 15:53:10 CEST |
| Fällig | 2026-06-27 |
| Rechnungsstatus | `overdue` |
| Zahlungsstatus | `overdue` |
| Gesamtbetrag | CHF 620.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist individual und company_id ist NULL, obwohl billing_company_name nicht leer ist. Typ und Snapshot widersprechen sich. Das ist kein belegter Firmenkunde. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `4d70d768-fbb8-40a1-84af-3336b52c50ab` „Netconstruction GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `cbe0c869-5e1d-4f62-9c59-5c6b603bcfc6`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-05-28 15:53:10 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `115c16e8-0e91-456e-9b6f-369c5ca43469`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-06-08 18:16:26 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `903ab8d4-ad17-40cf-86ca-4a649e277ccb`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-06-09 11:13:25 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `aab44b58-cb5d-484d-a99d-a99993b0c575`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-07-14 14:20:31 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `4d70d768-fbb8-40a1-84af-3336b52c50ab` „Netconstruction GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8600 Dübendorf. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` / RE-2026-0016 |
| Tenant | Fahrschule Driving Team |
| Kunde | Maliqi Krenar / `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| Billing-Firmenname | Netconstruction GmbH |
| Mögliche Firmen im selben Tenant | Netconstruction GmbH (`4d70d768-fbb8-40a1-84af-3336b52c50ab`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | Soll der Empfänger fachlich eine Privatperson bleiben, oder ist der gespeicherte Firmenname der gewollte Rechnungsempfänger? `4d70d768-fbb8-40a1-84af-3336b52c50ab` (Netconstruction GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mahnstufe 2 ist gesetzt. Darf eine spätere Korrektur den Mahn- und Zahlungsstatus unberührt lassen? |
| Nächster Prüfschritt | Fachlich klären, ob billing_type individual richtig ist. Das Entscheidungsfeld nicht vorausfüllen. Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="2feb765f-b7e3-46e5-ae37-94c914af0065"></a>
### RE-2026-0017 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `2feb765f-b7e3-46e5-ae37-94c914af0065` |
| Rechnungsnummer | RE-2026-0017 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| Kundenname | Maliqi Krenar |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Netconstruction GmbH |
| PLZ und Ort im Snapshot | 8600 Dübendorf |
| company_id | NULL |
| Rechnungsdatum | 2026-06-09 |
| Erstellt | 2026-06-09 20:25:38 CEST |
| Fällig | 2026-07-09 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 801.35 |
| Bezahlt | CHF 801.35 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `4d70d768-fbb8-40a1-84af-3336b52c50ab` „Netconstruction GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `cbe0c869-5e1d-4f62-9c59-5c6b603bcfc6`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-05-28 15:53:10 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `115c16e8-0e91-456e-9b6f-369c5ca43469`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-06-08 18:16:26 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `903ab8d4-ad17-40cf-86ca-4a649e277ccb`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-06-09 11:13:25 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `aab44b58-cb5d-484d-a99d-a99993b0c575`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-07-14 14:20:31 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `4d70d768-fbb8-40a1-84af-3336b52c50ab` „Netconstruction GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8600 Dübendorf. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `2feb765f-b7e3-46e5-ae37-94c914af0065` / RE-2026-0017 |
| Tenant | Fahrschule Driving Team |
| Kunde | Maliqi Krenar / `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| Billing-Firmenname | Netconstruction GmbH |
| Mögliche Firmen im selben Tenant | Netconstruction GmbH (`4d70d768-fbb8-40a1-84af-3336b52c50ab`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `4d70d768-fbb8-40a1-84af-3336b52c50ab` (Netconstruction GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="01261371-4d06-47be-ba34-692e75893b6b"></a>
### RE-2026-0019 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `01261371-4d06-47be-ba34-692e75893b6b` |
| Rechnungsnummer | RE-2026-0019 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-07-07 |
| Erstellt | 2026-07-07 20:24:07 CEST |
| Fällig | 2026-09-06 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 95.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `01261371-4d06-47be-ba34-692e75893b6b` / RE-2026-0019 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH` |
| Offene Fragen | Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Name und abweichenden Ort gegeneinander prüfen. Den Ort nicht als Bestätigung werten. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="0a906dbe-84b3-4546-8eb8-148911220f6a"></a>
### RE-2026-0020 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `0a906dbe-84b3-4546-8eb8-148911220f6a` |
| Rechnungsnummer | RE-2026-0020 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-07-08 |
| Erstellt | 2026-07-08 12:54:25 CEST |
| Fällig | 2026-08-20 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 196.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `0a906dbe-84b3-4546-8eb8-148911220f6a` / RE-2026-0020 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH` |
| Offene Fragen | Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Name und abweichenden Ort gegeneinander prüfen. Den Ort nicht als Bestätigung werten. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="7914f05f-cf63-488d-89c7-af15900fdf95"></a>
### RE-2026-0025 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `7914f05f-cf63-488d-89c7-af15900fdf95` |
| Rechnungsnummer | RE-2026-0025 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `d82dd55b-1034-4727-9429-a433fd799830` |
| Kundenname | Samuel Hauser |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 5432 Neuenhof |
| company_id | NULL |
| Rechnungsdatum | 2026-07-13 |
| Erstellt | 2026-07-13 11:36:32 CEST |
| Fällig | 2026-08-12 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 360.00 |
| Bezahlt | CHF 360.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` „samuel samuel“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-27 09:13:48 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `85a3fadb-13fd-4f70-98c7-18cabe5d605f`: Name „samuel samuel“, PLZ 5432, Ort Neuenhof, erstellt 2026-07-11 14:10:40 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `dd5861dd-2003-48bc-881f-491c45e98cdd`: Name „samuel samuel“, PLZ 5432, Ort Neuenhof, erstellt 2026-07-13 11:06:29 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` „samuel samuel“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-27 09:13:48 CEST, Beziehung: users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 5432 Neuenhof. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `MEMBERSHIP_MATCH_ONLY`, `CANDIDATE_CREATED_AFTER_INVOICE`, `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `7914f05f-cf63-488d-89c7-af15900fdf95` / RE-2026-0025 |
| Tenant | Fahrschule Driving Team |
| Kunde | Samuel Hauser / `d82dd55b-1034-4727-9429-a433fd799830` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | samuel samuel (`0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`, nachträglich angelegt) |
| Vergleichsergebnisse | `MEMBERSHIP_MATCH_ONLY`, `CANDIDATE_CREATED_AFTER_INVOICE`, `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` (samuel samuel) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="baa3c2c6-df08-4a2c-bfba-1beedb6bfe21"></a>
### RE-2026-0026 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` |
| Rechnungsnummer | RE-2026-0026 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| Kundenname | Maliqi Krenar |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Netconstruction GmbH |
| PLZ und Ort im Snapshot | 8600 Dübendorf |
| company_id | NULL |
| Rechnungsdatum | 2026-07-14 |
| Erstellt | 2026-07-14 21:28:19 CEST |
| Fällig | 2026-08-13 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 360.00 |
| Bezahlt | CHF 360.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `4d70d768-fbb8-40a1-84af-3336b52c50ab` „Netconstruction GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `cbe0c869-5e1d-4f62-9c59-5c6b603bcfc6`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-05-28 15:53:10 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `115c16e8-0e91-456e-9b6f-369c5ca43469`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-06-08 18:16:26 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `903ab8d4-ad17-40cf-86ca-4a649e277ccb`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-06-09 11:13:25 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `aab44b58-cb5d-484d-a99d-a99993b0c575`: Name „Netconstruction GmbH“, PLZ 8600, Ort Dübendorf, erstellt 2026-07-14 14:20:31 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `4d70d768-fbb8-40a1-84af-3336b52c50ab`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `4d70d768-fbb8-40a1-84af-3336b52c50ab` „Netconstruction GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8600 Dübendorf. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` / RE-2026-0026 |
| Tenant | Fahrschule Driving Team |
| Kunde | Maliqi Krenar / `9c42c51a-fa44-4108-b94b-f3d06380ba5d` |
| Billing-Firmenname | Netconstruction GmbH |
| Mögliche Firmen im selben Tenant | Netconstruction GmbH (`4d70d768-fbb8-40a1-84af-3336b52c50ab`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `4d70d768-fbb8-40a1-84af-3336b52c50ab` (Netconstruction GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="585ee4fc-51f0-4475-821f-6c7c27055ba5"></a>
### RE-2026-0027 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `585ee4fc-51f0-4475-821f-6c7c27055ba5` |
| Rechnungsnummer | RE-2026-0027 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `115152c3-c88f-455b-8fd7-b4627e0ad196` |
| Kundenname | Paskaran Shathees |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Shathees |
| PLZ und Ort im Snapshot | 8427 Freienstein |
| company_id | NULL |
| Rechnungsdatum | 2026-07-14 |
| Erstellt | 2026-07-14 22:24:33 CEST |
| Fällig | 2026-08-13 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 240.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `7c470951-bda6-49a9-819a-5baefc0de20c`: Name „Shathees “, PLZ 8427, Ort Freienstein, erstellt 2026-07-14 21:56:42 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `585ee4fc-51f0-4475-821f-6c7c27055ba5` / RE-2026-0027 |
| Tenant | Fahrschule Driving Team |
| Kunde | Paskaran Shathees / `115152c3-c88f-455b-8fd7-b4627e0ad196` |
| Billing-Firmenname | Shathees |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Mahnstufe 1 ist gesetzt. Darf eine spätere Korrektur den Mahn- und Zahlungsstatus unberührt lassen? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="262a9f98-a0ce-41e0-bf70-7d71617692ce"></a>
### RE-2026-0028 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `262a9f98-a0ce-41e0-bf70-7d71617692ce` |
| Rechnungsnummer | RE-2026-0028 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `daa461ec-be44-44db-9743-2ee1a80a7be6` |
| Kundenname | Hans-Jörg Bowald |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Hans-Jörg Bowald |
| PLZ und Ort im Snapshot | 8730 Uznach |
| company_id | NULL |
| Rechnungsdatum | 2026-07-20 |
| Erstellt | 2026-07-20 17:55:50 CEST |
| Fällig | 2026-08-19 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 279.20 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `ccadf9dd-4f51-4865-b0df-7a35812681f0`: Name „Hans-Jörg Bowald“, PLZ 8730, Ort Uznach, erstellt 2026-07-20 17:54:23 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `262a9f98-a0ce-41e0-bf70-7d71617692ce` / RE-2026-0028 |
| Tenant | Fahrschule Driving Team |
| Kunde | Hans-Jörg Bowald / `daa461ec-be44-44db-9743-2ee1a80a7be6` |
| Billing-Firmenname | Hans-Jörg Bowald |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc"></a>
### RE-2026-0029 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` |
| Rechnungsnummer | RE-2026-0029 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `957c55e8-a0c2-438f-86a7-75b03227c6a6` |
| Kundenname | Laugnor islami |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Auto-Mels GmbH |
| PLZ und Ort im Snapshot | 8853 Lachen |
| company_id | NULL |
| Rechnungsdatum | 2026-07-21 |
| Erstellt | 2026-07-21 13:53:22 CEST |
| Fällig | 2026-08-20 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 190.00 |
| Bezahlt | CHF 190.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `f55df494-5bd7-4bba-b354-1b9bc302e33c` „Auto-Mels GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `63c1c3d8-01e7-4347-8804-09e72f37cc6c`: Name „Auto-Mels GmbH“, PLZ 8853, Ort Lachen, erstellt 2026-07-21 13:51:50 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `f55df494-5bd7-4bba-b354-1b9bc302e33c`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `f55df494-5bd7-4bba-b354-1b9bc302e33c` „Auto-Mels GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8853 Lachen. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` / RE-2026-0029 |
| Tenant | Fahrschule Driving Team |
| Kunde | Laugnor islami / `957c55e8-a0c2-438f-86a7-75b03227c6a6` |
| Billing-Firmenname | Auto-Mels GmbH |
| Mögliche Firmen im selben Tenant | Auto-Mels GmbH (`f55df494-5bd7-4bba-b354-1b9bc302e33c`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | `f55df494-5bd7-4bba-b354-1b9bc302e33c` (Auto-Mels GmbH) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="54e47472-b5ba-4877-acc7-d4afabd2978c"></a>
### RE-2026-0031 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `54e47472-b5ba-4877-acc7-d4afabd2978c` |
| Rechnungsnummer | RE-2026-0031 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-07-21 |
| Erstellt | 2026-07-21 19:51:28 CEST |
| Fällig | 2026-08-20 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 294.34 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `54e47472-b5ba-4877-acc7-d4afabd2978c` / RE-2026-0031 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH` |
| Offene Fragen | Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Name und abweichenden Ort gegeneinander prüfen. Den Ort nicht als Bestätigung werten. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="1ea0a187-fbec-4b08-b107-e1f5fb8c27af"></a>
### RE-2026-0034 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` |
| Rechnungsnummer | RE-2026-0034 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-07-21 |
| Erstellt | 2026-07-21 21:35:39 CEST |
| Fällig | 2026-08-20 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 102.32 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `1ea0a187-fbec-4b08-b107-e1f5fb8c27af` / RE-2026-0034 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH` |
| Offene Fragen | Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Name und abweichenden Ort gegeneinander prüfen. Den Ort nicht als Bestätigung werten. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="a0432aca-430b-4a0c-8735-264c801907fa"></a>
### RE-2026-0036 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `a0432aca-430b-4a0c-8735-264c801907fa` |
| Rechnungsnummer | RE-2026-0036 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-07-22 |
| Erstellt | 2026-07-22 05:03:39 CEST |
| Fällig | 2026-08-21 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 306.95 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `a0432aca-430b-4a0c-8735-264c801907fa` / RE-2026-0036 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH` |
| Offene Fragen | Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Name und abweichenden Ort gegeneinander prüfen. Den Ort nicht als Bestätigung werten. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="6f4415ac-944a-4d83-a39b-22bf2248eb8c"></a>
### RE-2026-0037 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `6f4415ac-944a-4d83-a39b-22bf2248eb8c` |
| Rechnungsnummer | RE-2026-0037 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Kundenname | Peter Muster |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-07-22 |
| Erstellt | 2026-07-22 17:19:01 CEST |
| Fällig | 2026-08-21 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 0.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `c7ff5ef4-87b0-4283-aad2-b0dd0fee97b3`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-03-20 14:31:17 CET, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `d73052b3-588b-4c95-9869-bf06d10b6fe6`: Name „Driving Team Zürich GmbH“, PLZ 8610, Ort Uster, erstellt 2026-04-17 08:48:25 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `6f4415ac-944a-4d83-a39b-22bf2248eb8c` / RE-2026-0037 |
| Tenant | Fahrschule Driving Team |
| Kunde | Peter Muster / `725320ad-6252-48e9-b84b-0a7fd28ba11c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH` |
| Offene Fragen | Name gleich, Ort verschieden: Snapshot 8610 Uster, Firma 8048 Zürich. Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Falls der Status dadurch auf paid wechselt, würde trigger_update_appointment_status_on_invoice_paid verknüpfte Termine ebenfalls auf paid setzen. Name und abweichenden Ort gegeneinander prüfen. Den Ort nicht als Bestätigung werten. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="ff401ad9-f26b-4315-98ae-db8fe65dc219"></a>
### RE-2026-0043 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `ff401ad9-f26b-4315-98ae-db8fe65dc219` |
| Rechnungsnummer | RE-2026-0043 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `29b70261-9927-4472-9a7c-d8f57900aea2` |
| Kundenname | Yvonne Schwitter |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Frau |
| PLZ und Ort im Snapshot | 8854 Galgenen |
| company_id | NULL |
| Rechnungsdatum | 2026-07-24 |
| Erstellt | 2026-07-24 11:21:36 CEST |
| Fällig | 2026-08-03 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 126.65 |
| Bezahlt | CHF 126.65 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `20d9d7c1-f2d7-4bfe-86a4-d4ca411a1d30`: Name „Frau“, PLZ 8854, Ort Galgenen, erstellt 2026-07-24 11:18:51 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `ff401ad9-f26b-4315-98ae-db8fe65dc219` / RE-2026-0043 |
| Tenant | Fahrschule Driving Team |
| Kunde | Yvonne Schwitter / `29b70261-9927-4472-9a7c-d8f57900aea2` |
| Billing-Firmenname | Frau |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="7033c4f6-dcda-4995-a614-a6e2b5ddbd70"></a>
### RE-2026-0045 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` |
| Rechnungsnummer | RE-2026-0045 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `e55d8dd2-a75b-4ffe-beaf-da1353485229` |
| Kundenname | Pranvera Latifaj |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Pranvera Latifaj |
| PLZ und Ort im Snapshot | 8852 altendorf |
| company_id | NULL |
| Rechnungsdatum | 2026-07-29 |
| Erstellt | 2026-07-29 11:52:00 CEST |
| Fällig | 2026-08-31 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 253.30 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `59cd523e-f722-44fc-aa57-556e8dfcfa4c`: Name „Pranvera Latifaj“, PLZ 8852, Ort altendorf, erstellt 2026-07-29 11:51:08 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` / RE-2026-0045 |
| Tenant | Fahrschule Driving Team |
| Kunde | Pranvera Latifaj / `e55d8dd2-a75b-4ffe-beaf-da1353485229` |
| Billing-Firmenname | Pranvera Latifaj |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="4ebce689-5261-4dc2-96f5-29b804ac50e8"></a>
### RE-2026-0046 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `4ebce689-5261-4dc2-96f5-29b804ac50e8` |
| Rechnungsnummer | RE-2026-0046 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `e55d8dd2-a75b-4ffe-beaf-da1353485229` |
| Kundenname | Pranvera Latifaj |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Pranvera Latifaj |
| PLZ und Ort im Snapshot | 8852 altendorf |
| company_id | NULL |
| Rechnungsdatum | 2026-07-29 |
| Erstellt | 2026-07-29 11:52:36 CEST |
| Fällig | 2026-09-30 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 411.65 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `59cd523e-f722-44fc-aa57-556e8dfcfa4c`: Name „Pranvera Latifaj“, PLZ 8852, Ort altendorf, erstellt 2026-07-29 11:51:08 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `4ebce689-5261-4dc2-96f5-29b804ac50e8` / RE-2026-0046 |
| Tenant | Fahrschule Driving Team |
| Kunde | Pranvera Latifaj / `e55d8dd2-a75b-4ffe-beaf-da1353485229` |
| Billing-Firmenname | Pranvera Latifaj |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="3400bd0b-786b-4444-8352-884c2d357f89"></a>
### RE-2026-0047 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `3400bd0b-786b-4444-8352-884c2d357f89` |
| Rechnungsnummer | RE-2026-0047 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | NOT AVAILABLE |
| Kundenname | NOT AVAILABLE |
| billing_type | `individual` |
| Kategorie | `INDIVIDUAL_WITH_COMPANY_NAME` |
| Billing-Firmenname | Firma |
| PLZ und Ort im Snapshot | 8000 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-07-30 |
| Erstellt | 2026-07-30 10:25:57 CEST |
| Fällig | 2026-08-09 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 4.99 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist individual und company_id ist NULL, obwohl billing_company_name nicht leer ist. Typ und Snapshot widersprechen sich. Das ist kein belegter Firmenkunde. |
| Herkunft | NOT AVAILABLE. Kein Strukturlink auf Kurs, Termin, Produktverkauf, Fahrzeug- oder Raumbuchung. imported_invoices hat keinen Fremdschlüssel auf invoices; eine Herkunft über die Rechnungsnummer wurde nicht abgeleitet. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- Kunde: NOT AVAILABLE. users.company_id, Adressen und weitere Rechnungen des Kunden können nicht gelesen werden.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `3400bd0b-786b-4444-8352-884c2d357f89` / RE-2026-0047 |
| Tenant | Fahrschule Driving Team |
| Kunde | NOT AVAILABLE / NOT AVAILABLE |
| Billing-Firmenname | Firma |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Soll der Empfänger fachlich eine Privatperson bleiben, oder ist der gespeicherte Firmenname der gewollte Rechnungsempfänger? Welcher Kunde gehört zu dieser Rechnung? users.company_id ist ohne User NOT AVAILABLE. Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Fachlich klären, ob billing_type individual richtig ist. Das Entscheidungsfeld nicht vorausfüllen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="3c3b6620-b1e4-4735-994b-b5b73164bf27"></a>
### RE-2026-0050 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `3c3b6620-b1e4-4735-994b-b5b73164bf27` |
| Rechnungsnummer | RE-2026-0050 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `85ca5ee5-2120-450a-b9ba-a97f43c86482` |
| Kundenname | Can Karaca |
| billing_type | `individual` |
| Kategorie | `INDIVIDUAL_WITH_COMPANY_NAME` |
| Billing-Firmenname | Edelweiss Garten- und Grabenservice |
| PLZ und Ort im Snapshot | 8804 Au bei Wädenswil |
| company_id | NULL |
| Rechnungsdatum | 2026-08-04 |
| Erstellt | 2026-08-04 11:35:43 CEST |
| Fällig | 2026-08-14 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 3'940.00 |
| Bezahlt | CHF 3'940.00 |
| Grund der fehlenden Zuordnung | billing_type ist individual und company_id ist NULL, obwohl billing_company_name nicht leer ist. Typ und Snapshot widersprechen sich. Das ist kein belegter Firmenkunde. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (7). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a` „Edelweiss Garten- und Grabenservice“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `6fd6f1e4-ede2-4c6f-8192-f68a2686ec3f`: Name „Edelweiss Garten- und Grabenservice“, PLZ 8804, Ort Au bei Wädenswil, erstellt 2026-08-04 11:35:44 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a` „Edelweiss Garten- und Grabenservice“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8804 Au bei Wädenswil. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `3c3b6620-b1e4-4735-994b-b5b73164bf27` / RE-2026-0050 |
| Tenant | Fahrschule Driving Team |
| Kunde | Can Karaca / `85ca5ee5-2120-450a-b9ba-a97f43c86482` |
| Billing-Firmenname | Edelweiss Garten- und Grabenservice |
| Mögliche Firmen im selben Tenant | Edelweiss Garten- und Grabenservice (`fbaffae2-6bc5-4227-a55f-b49a13aa6e5a`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | Soll der Empfänger fachlich eine Privatperson bleiben, oder ist der gespeicherte Firmenname der gewollte Rechnungsempfänger? `fbaffae2-6bc5-4227-a55f-b49a13aa6e5a` (Edelweiss Garten- und Grabenservice) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? |
| Nächster Prüfschritt | Fachlich klären, ob billing_type individual richtig ist. Das Entscheidungsfeld nicht vorausfüllen. Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="67dca57f-362e-4069-be6f-3c39ad1fa436"></a>
### RE-2026-0051 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `67dca57f-362e-4069-be6f-3c39ad1fa436` |
| Rechnungsnummer | RE-2026-0051 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `013190f1-b87f-4d96-887e-545765a76d03` |
| Kundenname | Pascal Kilchenmann |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Pascal Kilchenmann |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-08-06 |
| Erstellt | 2026-08-06 03:18:57 CEST |
| Fällig | 2026-08-16 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 126.65 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `58458c7a-7c46-4ad5-8e62-c811594e3539`: Name „Driving Team Zürich GmbH“, PLZ 8048, Ort Zürich, erstellt 2026-07-31 07:54:35 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `MEMBERSHIP_MATCH_ONLY`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `67dca57f-362e-4069-be6f-3c39ad1fa436` / RE-2026-0051 |
| Tenant | Fahrschule Driving Team |
| Kunde | Pascal Kilchenmann / `013190f1-b87f-4d96-887e-545765a76d03` |
| Billing-Firmenname | Pascal Kilchenmann |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `MEMBERSHIP_MATCH_ONLY` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Heute zeigt users.company_id auf „Driving Team Zürich GmbH“, der Snapshot nennt „Pascal Kilchenmann“. Welche Angabe gilt für diese Rechnung? Gespeicherte Firmenadressen enthalten mindestens einen anderen Namen als der Rechnungs-Snapshot. Welche Adresse galt am Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Snapshot-Name und heutige Mitgliedschaft einzeln gegen Belege halten. Keine der beiden Angaben allein übernehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="b48b91c4-8fea-4cc8-8014-18e4b8a40f1f"></a>
### RE-2026-0053 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` |
| Rechnungsnummer | RE-2026-0053 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `013190f1-b87f-4d96-887e-545765a76d03` |
| Kundenname | Pascal Kilchenmann |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Pascal Kilchenmann |
| PLZ und Ort im Snapshot | 8610 Uster |
| company_id | NULL |
| Rechnungsdatum | 2026-08-08 |
| Erstellt | 2026-08-08 20:00:53 CEST |
| Fällig | 2026-08-18 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 126.65 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `58458c7a-7c46-4ad5-8e62-c811594e3539`: Name „Driving Team Zürich GmbH“, PLZ 8048, Ort Zürich, erstellt 2026-07-31 07:54:35 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: nein. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `MEMBERSHIP_MATCH_ONLY`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `b48b91c4-8fea-4cc8-8014-18e4b8a40f1f` / RE-2026-0053 |
| Tenant | Fahrschule Driving Team |
| Kunde | Pascal Kilchenmann / `013190f1-b87f-4d96-887e-545765a76d03` |
| Billing-Firmenname | Pascal Kilchenmann |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `MEMBERSHIP_MATCH_ONLY` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Heute zeigt users.company_id auf „Driving Team Zürich GmbH“, der Snapshot nennt „Pascal Kilchenmann“. Welche Angabe gilt für diese Rechnung? Gespeicherte Firmenadressen enthalten mindestens einen anderen Namen als der Rechnungs-Snapshot. Welche Adresse galt am Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Snapshot-Name und heutige Mitgliedschaft einzeln gegen Belege halten. Keine der beiden Angaben allein übernehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="64be3632-165a-455c-98d1-4e7a85bf45e1"></a>
### RE-2026-0054 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `64be3632-165a-455c-98d1-4e7a85bf45e1` |
| Rechnungsnummer | RE-2026-0054 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `013190f1-b87f-4d96-887e-545765a76d03` |
| Kundenname | Pascal Kilchenmann |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8048 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-08-13 |
| Erstellt | 2026-08-13 07:36:32 CEST |
| Fällig | 2026-08-23 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 126.65 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `58458c7a-7c46-4ad5-8e62-c811594e3539`: Name „Driving Team Zürich GmbH“, PLZ 8048, Ort Zürich, erstellt 2026-07-31 07:54:35 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `64be3632-165a-455c-98d1-4e7a85bf45e1` / RE-2026-0054 |
| Tenant | Fahrschule Driving Team |
| Kunde | Pascal Kilchenmann / `013190f1-b87f-4d96-887e-545765a76d03` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="157c0e30-7bc0-43c9-a933-9a9063af2330"></a>
### RE-2026-0055 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `157c0e30-7bc0-43c9-a933-9a9063af2330` |
| Rechnungsnummer | RE-2026-0055 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `013190f1-b87f-4d96-887e-545765a76d03` |
| Kundenname | Pascal Kilchenmann |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8048 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-08-13 |
| Erstellt | 2026-08-13 08:41:20 CEST |
| Fällig | 2026-08-23 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 21.15 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `58458c7a-7c46-4ad5-8e62-c811594e3539`: Name „Driving Team Zürich GmbH“, PLZ 8048, Ort Zürich, erstellt 2026-07-31 07:54:35 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `157c0e30-7bc0-43c9-a933-9a9063af2330` / RE-2026-0055 |
| Tenant | Fahrschule Driving Team |
| Kunde | Pascal Kilchenmann / `013190f1-b87f-4d96-887e-545765a76d03` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="249db0f5-3b10-4827-92b0-a8ff70a19edd"></a>
### RE-2026-0056 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `249db0f5-3b10-4827-92b0-a8ff70a19edd` |
| Rechnungsnummer | RE-2026-0056 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `d13439ab-8034-4731-9fa8-81f636e3440c` |
| Kundenname | Simon Peterhans |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| PLZ und Ort im Snapshot | 8048 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-08-13 |
| Erstellt | 2026-08-13 08:43:59 CEST |
| Fällig | 2026-08-23 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 80.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-07-07 08:11:45 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `f3a3c296-f9bf-4955-9497-305cc45973eb`: Name „Driving Team Zürich GmbH“, PLZ 8048, Ort Zürich, erstellt 2026-08-13 08:42:28 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `5ec738cc-fc27-424a-9934-af5cbb8069ca`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `5ec738cc-fc27-424a-9934-af5cbb8069ca` „Driving Team Zürich GmbH“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-07-07 08:11:45 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8048 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `249db0f5-3b10-4827-92b0-a8ff70a19edd` / RE-2026-0056 |
| Tenant | Fahrschule Driving Team |
| Kunde | Simon Peterhans / `d13439ab-8034-4731-9fa8-81f636e3440c` |
| Billing-Firmenname | Driving Team Zürich GmbH |
| Mögliche Firmen im selben Tenant | Driving Team Zürich GmbH (`5ec738cc-fc27-424a-9934-af5cbb8069ca`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="84a81a5b-7b26-40d1-9161-ccec6373f118"></a>
### RE-2026-0058 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `84a81a5b-7b26-40d1-9161-ccec6373f118` |
| Rechnungsnummer | RE-2026-0058 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `57d59f7b-c0ee-4255-9286-a5656392f86c` |
| Kundenname | Ruzhdi Ukzmaili |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | MKW Swiss AG |
| PLZ und Ort im Snapshot | 5325 Leibstadt |
| company_id | NULL |
| Rechnungsdatum | 2026-08-21 |
| Erstellt | 2026-08-21 12:30:28 CEST |
| Fällig | 2026-08-31 |
| Rechnungsstatus | `overdue` |
| Zahlungsstatus | `overdue` |
| Gesamtbetrag | CHF 1'141.90 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Keine Zeile in company_billing_addresses für diesen Kunden.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `84a81a5b-7b26-40d1-9161-ccec6373f118` / RE-2026-0058 |
| Tenant | Fahrschule Driving Team |
| Kunde | Ruzhdi Ukzmaili / `57d59f7b-c0ee-4255-9286-a5656392f86c` |
| Billing-Firmenname | MKW Swiss AG |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="6a321fa4-c65a-4a66-92a2-ceb1b3494d34"></a>
### RE-2026-0061 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` |
| Rechnungsnummer | RE-2026-0061 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `ee2228c9-ebf6-4a8f-9b48-6bed91191ded` |
| Kundenname | Oleksandr Sharkevych |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Egli Jona AG |
| PLZ und Ort im Snapshot | 8645 Jona |
| company_id | NULL |
| Rechnungsdatum | 2026-08-21 |
| Erstellt | 2026-08-21 12:59:54 CEST |
| Fällig | 2026-08-31 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 1'200.00 |
| Bezahlt | CHF 1'200.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (5). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `eaada120-046e-4de3-a09a-dc6f1ddc1437`: Name „Oleksandr Sharkevych“, PLZ 8730, Ort Uznach, erstellt 2026-08-21 12:49:20 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` / RE-2026-0061 |
| Tenant | Fahrschule Driving Team |
| Kunde | Oleksandr Sharkevych / `ee2228c9-ebf6-4a8f-9b48-6bed91191ded` |
| Billing-Firmenname | Egli Jona AG |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Gespeicherte Firmenadressen enthalten mindestens einen anderen Namen als der Rechnungs-Snapshot. Welche Adresse galt am Rechnungsdatum? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81"></a>
### RE-2026-0068 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` |
| Rechnungsnummer | RE-2026-0068 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `d82dd55b-1034-4727-9429-a433fd799830` |
| Kundenname | Samuel Hauser |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | samuel samuel |
| PLZ und Ort im Snapshot | 5432 Neuenhof |
| company_id | NULL |
| Rechnungsdatum | 2026-08-27 |
| Erstellt | 2026-08-27 09:14:20 CEST |
| Fällig | 2026-09-06 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 301.35 |
| Bezahlt | CHF 301.35 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` „samuel samuel“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-27 09:13:48 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `85a3fadb-13fd-4f70-98c7-18cabe5d605f`: Name „samuel samuel“, PLZ 5432, Ort Neuenhof, erstellt 2026-07-11 14:10:40 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Adresse `dd5861dd-2003-48bc-881f-491c45e98cdd`: Name „samuel samuel“, PLZ 5432, Ort Neuenhof, erstellt 2026-07-13 11:06:29 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9` „samuel samuel“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-27 09:13:48 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 5432 Neuenhof. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `3b7f8cff-d5cf-4b25-a3eb-eedfd1c0ad81` / RE-2026-0068 |
| Tenant | Fahrschule Driving Team |
| Kunde | Samuel Hauser / `d82dd55b-1034-4727-9429-a433fd799830` |
| Billing-Firmenname | samuel samuel |
| Mögliche Firmen im selben Tenant | samuel samuel (`0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="ac308c69-91d1-43ca-a47c-a7c85029d93e"></a>
### RE-2026-0069 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `ac308c69-91d1-43ca-a47c-a7c85029d93e` |
| Rechnungsnummer | RE-2026-0069 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `78d3cf71-109b-4a68-bb18-2cd5b888a356` |
| Kundenname | Yannis Oberholzer |
| billing_type | `individual` |
| Kategorie | `INDIVIDUAL_WITH_COMPANY_NAME` |
| Billing-Firmenname | Thomann Nutzfahrzeuge |
| PLZ und Ort im Snapshot | 8716 Schmerikon |
| company_id | NULL |
| Rechnungsdatum | 2026-08-28 |
| Erstellt | 2026-08-28 10:25:29 CEST |
| Fällig | 2026-09-07 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 2'550.00 |
| Bezahlt | CHF 2'550.00 |
| Grund der fehlenden Zuordnung | billing_type ist individual und company_id ist NULL, obwohl billing_company_name nicht leer ist. Typ und Snapshot widersprechen sich. Das ist kein belegter Firmenkunde. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |

Verrechnetes Guthaben: CHF 1'020.00.

Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` „Thomann Nutzfahrzeuge“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `f748a42d-736b-4e2c-b2ef-d3ff48985216`: Name „Thomann Nutzfahrzeuge“, PLZ 8716, Ort Schmerikon, erstellt 2026-08-28 10:28:28 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82` „Thomann Nutzfahrzeuge“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8716 Schmerikon. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `ac308c69-91d1-43ca-a47c-a7c85029d93e` / RE-2026-0069 |
| Tenant | Fahrschule Driving Team |
| Kunde | Yannis Oberholzer / `78d3cf71-109b-4a68-bb18-2cd5b888a356` |
| Billing-Firmenname | Thomann Nutzfahrzeuge |
| Mögliche Firmen im selben Tenant | Thomann Nutzfahrzeuge (`18e69dd3-c3a0-45e3-bbcc-cb21aaf14d82`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Soll der Empfänger fachlich eine Privatperson bleiben, oder ist der gespeicherte Firmenname der gewollte Rechnungsempfänger? Ein Guthaben ist verrechnet. Der Status-Trigger betrachtet das Guthaben nicht separat. |
| Nächster Prüfschritt | Fachlich klären, ob billing_type individual richtig ist. Das Entscheidungsfeld nicht vorausfüllen. Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d"></a>
### RE-2026-0073 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` |
| Rechnungsnummer | RE-2026-0073 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `b5274670-f062-4c9f-8956-cc60bc1a03e8` |
| Kundenname | Yvonne Bettkober |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Yvonne Bettkober-Oum |
| PLZ und Ort im Snapshot | 8806 Bäch-SZ |
| company_id | NULL |
| Rechnungsdatum | 2026-08-31 |
| Erstellt | 2026-08-31 10:59:07 CEST |
| Fällig | 2026-09-10 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 340.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `efbe584c-1d7e-4599-afd6-4eb00b0d615d`: Name „Yvonne Bettkober-Oum“, PLZ 8806, Ort Bäch-SZ, erstellt 2026-08-31 10:55:20 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` / RE-2026-0073 |
| Tenant | Fahrschule Driving Team |
| Kunde | Yvonne Bettkober / `b5274670-f062-4c9f-8956-cc60bc1a03e8` |
| Billing-Firmenname | Yvonne Bettkober-Oum |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="bc2829f8-639d-48c0-baf6-9c81fd138bcc"></a>
### RE-2026-0075 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `bc2829f8-639d-48c0-baf6-9c81fd138bcc` |
| Rechnungsnummer | RE-2026-0075 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `091cfdbe-affa-4bfb-afd6-185b5fc83e3e` |
| Kundenname | Andres Jud |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur |
| PLZ und Ort im Snapshot | 3000 Bern |
| company_id | NULL |
| Rechnungsdatum | 2026-09-01 |
| Erstellt | 2026-09-01 16:06:44 CEST |
| Fällig | 2026-09-11 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 1'150.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (4). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `a7aca99e-b132-4327-aa52-9f788e51dc4a` „Schweizerische Bundesbahn SBB Kreditoren Infrastruktur“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-08-13 06:38:59 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `2cb6a9d3-0a44-4ff0-bafe-0ab1894fc0ac`: Name „Schweizerische Bundesbahn SBB Kreditoren Infrastruktur“, PLZ 3000, Ort Bern, erstellt 2026-07-28 16:13:06 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `a7aca99e-b132-4327-aa52-9f788e51dc4a`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `a7aca99e-b132-4327-aa52-9f788e51dc4a` „Schweizerische Bundesbahn SBB Kreditoren Infrastruktur“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-08-13 06:38:59 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 3000 Bern. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `bc2829f8-639d-48c0-baf6-9c81fd138bcc` / RE-2026-0075 |
| Tenant | Fahrschule Driving Team |
| Kunde | Andres Jud / `091cfdbe-affa-4bfb-afd6-185b5fc83e3e` |
| Billing-Firmenname | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur |
| Mögliche Firmen im selben Tenant | Schweizerische Bundesbahn SBB Kreditoren Infrastruktur (`a7aca99e-b132-4327-aa52-9f788e51dc4a`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="4b6bad1c-e897-49d8-b3ba-301e94376dc4"></a>
### RE-2026-0085 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` |
| Rechnungsnummer | RE-2026-0085 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `b5274670-f062-4c9f-8956-cc60bc1a03e8` |
| Kundenname | Yvonne Bettkober |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Yvonne Bettkober-Oum |
| PLZ und Ort im Snapshot | 8806 Bäch-SZ |
| company_id | NULL |
| Rechnungsdatum | 2026-09-18 |
| Erstellt | 2026-09-18 09:10:13 CEST |
| Fällig | 2026-09-28 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 1'220.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `efbe584c-1d7e-4599-afd6-4eb00b0d615d`: Name „Yvonne Bettkober-Oum“, PLZ 8806, Ort Bäch-SZ, erstellt 2026-08-31 10:55:20 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` / RE-2026-0085 |
| Tenant | Fahrschule Driving Team |
| Kunde | Yvonne Bettkober / `b5274670-f062-4c9f-8956-cc60bc1a03e8` |
| Billing-Firmenname | Yvonne Bettkober-Oum |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="6addae71-24f5-49a0-aad7-d93650645da3"></a>
### RE-2026-0086 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `6addae71-24f5-49a0-aad7-d93650645da3` |
| Rechnungsnummer | RE-2026-0086 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `497d0ef4-0772-4de0-a196-b05e45f5429f` |
| Kundenname | Tsering Ngodup |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Tsering Ngodup |
| PLZ und Ort im Snapshot | 8640 Rapperswil |
| company_id | NULL |
| Rechnungsdatum | 2026-09-18 |
| Erstellt | 2026-09-18 09:26:46 CEST |
| Fällig | 2026-09-28 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 240.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `45f7abc5-158b-4d6a-b559-736024d2cf2e` „Tsering Ngodup“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-09-21 11:51:24 CEST. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `24dc3877-70fe-4e0c-9d08-1916cbc1b310`: Name „Tsering Ngodup“, PLZ 8640, Ort Rapperswil, erstellt 2026-09-18 09:08:34 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `45f7abc5-158b-4d6a-b559-736024d2cf2e`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `45f7abc5-158b-4d6a-b559-736024d2cf2e` „Tsering Ngodup“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-09-21 11:51:24 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8640 Rapperswil. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: nein. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: nein. NACHTRÄGLICH ANGELEGT.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `6addae71-24f5-49a0-aad7-d93650645da3` / RE-2026-0086 |
| Tenant | Fahrschule Driving Team |
| Kunde | Tsering Ngodup / `497d0ef4-0772-4de0-a196-b05e45f5429f` |
| Billing-Firmenname | Tsering Ngodup |
| Mögliche Firmen im selben Tenant | Tsering Ngodup (`45f7abc5-158b-4d6a-b559-736024d2cf2e`, nachträglich angelegt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`, `CANDIDATE_CREATED_AFTER_INVOICE` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? `45f7abc5-158b-4d6a-b559-736024d2cf2e` (Tsering Ngodup) wurde nach der Rechnung angelegt. Was belegt die Beziehung zum Rechnungsdatum? Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Die vorhandenen Firmenkandidaten sind nachträglich angelegt. Einen Beleg aus der Rechnungszeit suchen und den späteren Firmenstammsatz nicht als historischen Beweis nehmen. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="7173f7e2-f714-4581-82dc-d26ee82cd03c"></a>
### RE-2026-0090 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `7173f7e2-f714-4581-82dc-d26ee82cd03c` |
| Rechnungsnummer | RE-2026-0090 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `1eb5a3d8-c7dd-4113-8589-6b238ba6ceee` |
| Kundenname | Kushtrim Sadiku |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 |
| PLZ und Ort im Snapshot | 8001 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-09-24 |
| Erstellt | 2026-09-24 11:08:17 CEST |
| Fällig | 2026-10-04 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 600.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `32a4dccc-82ba-44d2-8286-9d967005fd10` „SBB, Abt. PP-BP- CTL- TSP1- ZUE2“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-09-24 11:06:31 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `9e2bf09d-a90b-4fe9-aae4-58cf19d99184`: Name „SBB, Abt. PP-BP- CTL- TSP1- ZUE2“, PLZ 8001, Ort Zürich, erstellt 2026-09-24 11:06:32 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `32a4dccc-82ba-44d2-8286-9d967005fd10`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `32a4dccc-82ba-44d2-8286-9d967005fd10` „SBB, Abt. PP-BP- CTL- TSP1- ZUE2“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-09-24 11:06:31 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8001 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `7173f7e2-f714-4581-82dc-d26ee82cd03c` / RE-2026-0090 |
| Tenant | Fahrschule Driving Team |
| Kunde | Kushtrim Sadiku / `1eb5a3d8-c7dd-4113-8589-6b238ba6ceee` |
| Billing-Firmenname | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 |
| Mögliche Firmen im selben Tenant | SBB, Abt. PP-BP- CTL- TSP1- ZUE2 (`32a4dccc-82ba-44d2-8286-9d967005fd10`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="0209bc4b-fea5-4af8-914e-ec3a1612d134"></a>
### RE-2026-0096 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `0209bc4b-fea5-4af8-914e-ec3a1612d134` |
| Rechnungsnummer | RE-2026-0096 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `3506e031-1cb2-43cc-a854-5b6acd7fc9c2` |
| Kundenname | Mohamed Ahrram akel |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Mohamed Ahrram akel |
| PLZ und Ort im Snapshot | 6417 Sattel |
| company_id | NULL |
| Rechnungsdatum | 2026-09-30 |
| Erstellt | 2026-09-30 08:50:35 CEST |
| Fällig | 2026-10-10 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 95.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `b80e09e8-abcb-420a-bfca-aadeb088c394`: Name „Mohamed Ahrram akel“, PLZ 6417, Ort Sattel, erstellt 2026-09-29 14:25:30 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `0209bc4b-fea5-4af8-914e-ec3a1612d134` / RE-2026-0096 |
| Tenant | Fahrschule Driving Team |
| Kunde | Mohamed Ahrram akel / `3506e031-1cb2-43cc-a854-5b6acd7fc9c2` |
| Billing-Firmenname | Mohamed Ahrram akel |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? Ein gewöhnliches UPDATE würde den Zahlungsstatus ändern. Wer gibt den technischen Schritt frei, bevor company_id gesetzt wird? |
| Nächster Prüfschritt | Zuerst einen separaten technischen Freigabeschritt planen. trigger_update_invoice_status würde bei einem gewöhnlichen Update Status oder Zahlungsstatus ändern. Diesen Trigger nicht umgehen. Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="617cc446-45ec-467d-953d-4bd2fa03ba9c"></a>
### RE-2026-0099 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `617cc446-45ec-467d-953d-4bd2fa03ba9c` |
| Rechnungsnummer | RE-2026-0099 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Kundenname | Viorel Manolache |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Viorel Manolache |
| PLZ und Ort im Snapshot | 8310 Grafstal |
| company_id | NULL |
| Rechnungsdatum | 2026-10-08 |
| Erstellt | 2026-10-08 19:36:35 CEST |
| Fällig | 2026-10-18 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 240.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `e0e002d0-239c-4528-871b-f3eef7e08275`: Name „Viorel Manolache“, PLZ 8310, Ort Grafstal, erstellt 2026-10-08 19:35:42 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `617cc446-45ec-467d-953d-4bd2fa03ba9c` / RE-2026-0099 |
| Tenant | Fahrschule Driving Team |
| Kunde | Viorel Manolache / `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Billing-Firmenname | Viorel Manolache |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="2e854034-50f3-48b4-9fc3-b8bdd348337c"></a>
### RE-2026-0103 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `2e854034-50f3-48b4-9fc3-b8bdd348337c` |
| Rechnungsnummer | RE-2026-0103 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Kundenname | Viorel Manolache |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Viorel Manolache |
| PLZ und Ort im Snapshot | 8310 Grafstal |
| company_id | NULL |
| Rechnungsdatum | 2026-10-12 |
| Erstellt | 2026-10-12 17:14:16 CEST |
| Fällig | 2026-10-22 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 240.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `e0e002d0-239c-4528-871b-f3eef7e08275`: Name „Viorel Manolache“, PLZ 8310, Ort Grafstal, erstellt 2026-10-08 19:35:42 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `2e854034-50f3-48b4-9fc3-b8bdd348337c` / RE-2026-0103 |
| Tenant | Fahrschule Driving Team |
| Kunde | Viorel Manolache / `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Billing-Firmenname | Viorel Manolache |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="fbee557f-b631-4193-a40a-28b889ca54c5"></a>
### RE-2026-0104 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `fbee557f-b631-4193-a40a-28b889ca54c5` |
| Rechnungsnummer | RE-2026-0104 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `8a35c9d5-119b-42e6-a93e-7f0e799cb7d5` |
| Kundenname | Kujtim Masurica |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | SBB/CFF/FFS |
| PLZ und Ort im Snapshot | 8001 Zürich |
| company_id | NULL |
| Rechnungsdatum | 2026-10-15 |
| Erstellt | 2026-10-15 13:43:12 CEST |
| Fällig | 2026-10-25 |
| Rechnungsstatus | `sent` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 680.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id` = `60a9dd26-742c-44c9-ae51-8ecf331b5529` „SBB/CFF/FFS“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant wie die Rechnung: ja, aktiv: ja, Firma erstellt: 2026-10-15 13:39:36 CEST. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `ea31fa78-4fb1-4a82-92a2-e77a7a060035`: Name „SBB/CFF/FFS“, PLZ 8001, Ort Zürich, erstellt 2026-10-15 13:34:22 CEST, selber Tenant: ja, Standardadresse des Users: ja, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: `60a9dd26-742c-44c9-ae51-8ecf331b5529`. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- `60a9dd26-742c-44c9-ae51-8ecf331b5529` „SBB/CFF/FFS“, Tenant `64259d68-195a-4c68-8875-f1b44d962830`, selber Tenant: ja, aktiv: ja, erstellt 2026-10-15 13:39:36 CEST, Beziehung: exakter normalisierter Name im selben Tenant; users.company_id (heutige Mitgliedschaft). PLZ/Ort Firma: 8001 Zürich. Ortsgleichstand bei Namensgleichstand: ja. Datensatz vor oder bei Rechnungserstellung: ja. Kalendertag Europe/Zurich am oder vor Rechnungsdatum: ja.
- Vergleichslabels: `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `fbee557f-b631-4193-a40a-28b889ca54c5` / RE-2026-0104 |
| Tenant | Fahrschule Driving Team |
| Kunde | Kujtim Masurica / `8a35c9d5-119b-42e6-a93e-7f0e799cb7d5` |
| Billing-Firmenname | SBB/CFF/FFS |
| Mögliche Firmen im selben Tenant | SBB/CFF/FFS (`60a9dd26-742c-44c9-ae51-8ecf331b5529`, Datensatz existierte zum Rechnungszeitpunkt) |
| Vergleichsergebnisse | `EXACT_NAME_MATCH`, `NAME_AND_LOCATION_MATCH` |
| Offene Fragen | Mindestens eine gespeicherte Firmenadresse mit demselben Namen existierte schon am oder vor der Rechnungserstellung. Das ist kein company_id und kein Beweis, dass der spätere Firmenstammsatz damals schon die richtige Zuordnung war. |
| Nächster Prüfschritt | Einen zeitnahen Beleg verlangen, der diese company_id oder denselben Firmenempfänger zum Rechnungsdatum trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="f8ea72e0-7756-4db5-ae39-79dfb318434c"></a>
### RE-2026-0105 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `f8ea72e0-7756-4db5-ae39-79dfb318434c` |
| Rechnungsnummer | RE-2026-0105 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Kundenname | Viorel Manolache |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Viorel Manolache |
| PLZ und Ort im Snapshot | 8310 Grafstal |
| company_id | NULL |
| Rechnungsdatum | 2026-10-16 |
| Erstellt | 2026-10-16 07:51:54 CEST |
| Fällig | 2026-10-26 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 240.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `e0e002d0-239c-4528-871b-f3eef7e08275`: Name „Viorel Manolache“, PLZ 8310, Ort Grafstal, erstellt 2026-10-08 19:35:42 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `f8ea72e0-7756-4db5-ae39-79dfb318434c` / RE-2026-0105 |
| Tenant | Fahrschule Driving Team |
| Kunde | Viorel Manolache / `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Billing-Firmenname | Viorel Manolache |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="6e07fe3e-1c78-406f-b134-175e4a12154c"></a>
### RE-2026-0106 — Fahrschule Driving Team

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `6e07fe3e-1c78-406f-b134-175e4a12154c` |
| Rechnungsnummer | RE-2026-0106 |
| tenant_id | `64259d68-195a-4c68-8875-f1b44d962830` |
| Tenant | Fahrschule Driving Team (`driving-team`) |
| Kunden-ID | `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Kundenname | Viorel Manolache |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Viorel Manolache |
| PLZ und Ort im Snapshot | 8310 Grafstal |
| company_id | NULL |
| Rechnungsdatum | 2026-10-16 |
| Erstellt | 2026-10-16 07:52:25 CEST |
| Fällig | 2026-10-26 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 480.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (1). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Adresse `e0e002d0-239c-4528-871b-f3eef7e08275`: Name „Viorel Manolache“, PLZ 8310, Ort Grafstal, erstellt 2026-10-08 19:35:42 CEST, selber Tenant: ja, Standardadresse des Users: nein, aktive Adresse: ja. Namensgleichstand mit companies im Rechnungstenant: kein exakter Namensgleichstand mit einer Firma im Rechnungstenant. Beziehung: company_billing_addresses.user_id, nicht users.company_id.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `6e07fe3e-1c78-406f-b134-175e4a12154c` / RE-2026-0106 |
| Tenant | Fahrschule Driving Team |
| Kunde | Viorel Manolache / `cca5536f-ff6f-4201-b715-b8ab54a392d8` |
| Billing-Firmenname | Viorel Manolache |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Der Snapshot-Firmenname entspricht dem Kundennamen. Ist das eine Firma oder der Personenname im Firmenfeld? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="28a7ebe7-04cd-4676-9b83-3c2be4df0b83"></a>
### RE-2026-0010 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` |
| Rechnungsnummer | RE-2026-0010 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `25738075-4814-4627-84ec-0af53627caad` |
| Kundenname | Doris Lauber |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8864 Reichenburg |
| company_id | NULL |
| Rechnungsdatum | 2026-07-22 |
| Erstellt | 2026-07-22 16:33:36 CEST |
| Fällig | 2026-08-21 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 2'152.22 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (4). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` / RE-2026-0010 |
| Tenant | Fahrschule Gemperli |
| Kunde | Doris Lauber / `25738075-4814-4627-84ec-0af53627caad` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="be80a098-7039-4c18-8843-e2d43fc00931"></a>
### RE-2026-0012 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `be80a098-7039-4c18-8843-e2d43fc00931` |
| Rechnungsnummer | RE-2026-0012 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `25738075-4814-4627-84ec-0af53627caad` |
| Kundenname | Doris Lauber |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8864 Reichenburg |
| company_id | NULL |
| Rechnungsdatum | 2026-07-22 |
| Erstellt | 2026-07-22 17:28:32 CEST |
| Fällig | 2026-08-21 |
| Rechnungsstatus | `cancelled` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 2'152.22 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (4). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `be80a098-7039-4c18-8843-e2d43fc00931` / RE-2026-0012 |
| Tenant | Fahrschule Gemperli |
| Kunde | Doris Lauber / `25738075-4814-4627-84ec-0af53627caad` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f"></a>
### RE-2026-0013 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` |
| Rechnungsnummer | RE-2026-0013 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `25738075-4814-4627-84ec-0af53627caad` |
| Kundenname | Doris Lauber |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8864 Reichenburg |
| company_id | NULL |
| Rechnungsdatum | 2026-07-29 |
| Erstellt | 2026-07-29 11:02:54 CEST |
| Fällig | 2026-08-08 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 1'998.35 |
| Bezahlt | CHF 1'998.35 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (4). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` / RE-2026-0013 |
| Tenant | Fahrschule Gemperli |
| Kunde | Doris Lauber / `25738075-4814-4627-84ec-0af53627caad` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="e72dc779-05b5-4dd9-9b2f-8966e7278a50"></a>
### RE-2026-0021 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` |
| Rechnungsnummer | RE-2026-0021 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `93aafe9f-4f0f-4fcc-9ca4-34ff31aeb138` |
| Kundenname | Reto Weber |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8853 Lachen |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:02:42 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 4'088.35 |
| Bezahlt | CHF 4'088.35 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (11). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` / RE-2026-0021 |
| Tenant | Fahrschule Gemperli |
| Kunde | Reto Weber / `93aafe9f-4f0f-4fcc-9ca4-34ff31aeb138` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="4a832b6c-15f5-4035-973c-8b8c11276216"></a>
### RE-2026-0024 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `4a832b6c-15f5-4035-973c-8b8c11276216` |
| Rechnungsnummer | RE-2026-0024 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `45f1230d-d4c7-418c-a751-8fc88a8bece5` |
| Kundenname | Tim Egloff |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8717 Benken |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:11:58 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 310.00 |
| Bezahlt | CHF 310.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (2). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `4a832b6c-15f5-4035-973c-8b8c11276216` / RE-2026-0024 |
| Tenant | Fahrschule Gemperli |
| Kunde | Tim Egloff / `45f1230d-d4c7-418c-a751-8fc88a8bece5` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="1454bed1-e68a-4444-9af6-4d92ef8e980f"></a>
### RE-2026-0025 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `1454bed1-e68a-4444-9af6-4d92ef8e980f` |
| Rechnungsnummer | RE-2026-0025 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `49eb2477-aea0-46d6-98d4-9a543e6cd7e5` |
| Kundenname | Sandra Hälg |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8855 Wangen |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:12:54 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 930.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (7). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `1454bed1-e68a-4444-9af6-4d92ef8e980f` / RE-2026-0025 |
| Tenant | Fahrschule Gemperli |
| Kunde | Sandra Hälg / `49eb2477-aea0-46d6-98d4-9a543e6cd7e5` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="33d4b7e1-0ecd-45db-9717-df471a167db3"></a>
### RE-2026-0026 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `33d4b7e1-0ecd-45db-9717-df471a167db3` |
| Rechnungsnummer | RE-2026-0026 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `9353ac8e-e31a-4585-9347-420ec51c9052` |
| Kundenname | Alan Leyel |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8730 Uznach |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:13:18 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 671.65 |
| Bezahlt | CHF 671.65 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (5). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `33d4b7e1-0ecd-45db-9717-df471a167db3` / RE-2026-0026 |
| Tenant | Fahrschule Gemperli |
| Kunde | Alan Leyel / `9353ac8e-e31a-4585-9347-420ec51c9052` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="65a0d6f7-48f1-4fee-8be3-749983cf11ca"></a>
### RE-2026-0028 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` |
| Rechnungsnummer | RE-2026-0028 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `fa801286-4717-4048-a1fd-7324e1e6ba42` |
| Kundenname | Sky Hrasche |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8855 Nuolen |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:14:15 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 806.00 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (6). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` / RE-2026-0028 |
| Tenant | Fahrschule Gemperli |
| Kunde | Sky Hrasche / `fa801286-4717-4048-a1fd-7324e1e6ba42` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="f524dea2-25da-43fd-9194-6d5c201170de"></a>
### RE-2026-0029 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `f524dea2-25da-43fd-9194-6d5c201170de` |
| Rechnungsnummer | RE-2026-0029 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `c335664d-4635-4aa6-87f2-b25facfc7ac3` |
| Kundenname | Rahel Bucher |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8856 Tuggen |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:14:44 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 558.00 |
| Bezahlt | CHF 558.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (4). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `f524dea2-25da-43fd-9194-6d5c201170de` / RE-2026-0029 |
| Tenant | Fahrschule Gemperli |
| Kunde | Rahel Bucher / `c335664d-4635-4aa6-87f2-b25facfc7ac3` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="62c7bfe3-b427-4f49-9c8f-5e753c9c3589"></a>
### RE-2026-0030 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` |
| Rechnungsnummer | RE-2026-0030 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `96cc9316-f2fa-4d1f-8c43-b115c33bf9c4` |
| Kundenname | Urs Keller |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8855 Altendorf |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 06:16:50 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 1'333.35 |
| Bezahlt | CHF 1'333.35 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (4). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` / RE-2026-0030 |
| Tenant | Fahrschule Gemperli |
| Kunde | Urs Keller / `96cc9316-f2fa-4d1f-8c43-b115c33bf9c4` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="a84d6fac-0efb-408d-9cf3-f156715c681b"></a>
### RE-2026-0035 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `a84d6fac-0efb-408d-9cf3-f156715c681b` |
| Rechnungsnummer | RE-2026-0035 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `3aac1035-a338-474e-b1d7-b5b8fa74321c` |
| Kundenname | David Hegner |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_UNLINKED` |
| Billing-Firmenname | Hutter Manfred GmbH |
| PLZ und Ort im Snapshot | 8864 Reichenburg |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 09:30:26 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 613.35 |
| Bezahlt | CHF 613.35 |
| Grund der fehlenden Zuordnung | billing_type ist company, der Snapshot enthält einen Firmennamen, und company_id ist NULL. Die Rechnung speichert den Empfänger nur im Billing-Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- Keine Zeile in company_billing_addresses für diesen Kunden.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `NO_MATCH`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `a84d6fac-0efb-408d-9cf3-f156715c681b` / RE-2026-0035 |
| Tenant | Fahrschule Gemperli |
| Kunde | David Hegner / `3aac1035-a338-474e-b1d7-b5b8fa74321c` |
| Billing-Firmenname | Hutter Manfred GmbH |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `NO_MATCH` |
| Offene Fragen | Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Im Firmenstamm desselben Tenants nach dem Snapshot-Namen suchen. Eine Firma eines anderen Tenants nicht verwenden. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="c0b93f3e-fe62-4923-8b35-2c2a467ccc91"></a>
### RE-2026-0036 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` |
| Rechnungsnummer | RE-2026-0036 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `a45c9f25-4ce8-4889-ab53-0b836943613e` |
| Kundenname | Kai Burri |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8854 Siebnen |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 09:30:56 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 469.00 |
| Bezahlt | CHF 469.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` / RE-2026-0036 |
| Tenant | Fahrschule Gemperli |
| Kunde | Kai Burri / `a45c9f25-4ce8-4889-ab53-0b836943613e` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="c32e038d-942c-49c6-82fe-ff7a9f4add61"></a>
### RE-2026-0037 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `c32e038d-942c-49c6-82fe-ff7a9f4add61` |
| Rechnungsnummer | RE-2026-0037 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `ac756996-42d0-4ce7-87e2-88d506030f95` |
| Kundenname | Florian Schnyder |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8854 Schübelbach |
| company_id | NULL |
| Rechnungsdatum | 2026-09-25 |
| Erstellt | 2026-09-25 09:31:45 CEST |
| Fällig | 2026-10-05 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 626.65 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `c32e038d-942c-49c6-82fe-ff7a9f4add61` / RE-2026-0037 |
| Tenant | Fahrschule Gemperli |
| Kunde | Florian Schnyder / `ac756996-42d0-4ce7-87e2-88d506030f95` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="e6654110-120a-40c6-a3cf-0468fc2af62d"></a>
### RE-2026-0044 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `e6654110-120a-40c6-a3cf-0468fc2af62d` |
| Rechnungsnummer | RE-2026-0044 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `808d204c-a4a2-4450-ac63-8bb19eeb8be9` |
| Kundenname | Gurdin Diethelm |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8840 Einsiedelm |
| company_id | NULL |
| Rechnungsdatum | 2026-10-03 |
| Erstellt | 2026-10-03 20:36:30 CEST |
| Fällig | 2026-10-13 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 847.30 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (6). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `e6654110-120a-40c6-a3cf-0468fc2af62d` / RE-2026-0044 |
| Tenant | Fahrschule Gemperli |
| Kunde | Gurdin Diethelm / `808d204c-a4a2-4450-ac63-8bb19eeb8be9` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="a27a1ace-d3f6-4c32-987e-d25b45ca4b1d"></a>
### RE-2026-0045 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` |
| Rechnungsnummer | RE-2026-0045 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `d3f62966-933c-493d-b8c4-f1bdbe43cf39` |
| Kundenname | Sina Bürgi |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8807 Freienbach |
| company_id | NULL |
| Rechnungsdatum | 2026-10-04 |
| Erstellt | 2026-10-04 14:35:30 CEST |
| Fällig | 2026-10-14 |
| Rechnungsstatus | `pdf_created` |
| Zahlungsstatus | `pending` |
| Gesamtbetrag | CHF 766.30 |
| Bezahlt | CHF 0.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (6). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` / RE-2026-0045 |
| Tenant | Fahrschule Gemperli |
| Kunde | Sina Bürgi / `d3f62966-933c-493d-b8c4-f1bdbe43cf39` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="c373fb40-06d4-4821-b40a-85bf55e43e63"></a>
### RE-2026-0048 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `c373fb40-06d4-4821-b40a-85bf55e43e63` |
| Rechnungsnummer | RE-2026-0048 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `3d0e2daa-3b0b-4a36-87e6-0d81b80459ec` |
| Kundenname | Dario Reumer |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8854 Siebnen |
| company_id | NULL |
| Rechnungsdatum | 2026-10-04 |
| Erstellt | 2026-10-04 14:55:39 CEST |
| Fällig | 2026-10-14 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 403.00 |
| Bezahlt | CHF 403.00 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `c373fb40-06d4-4821-b40a-85bf55e43e63` / RE-2026-0048 |
| Tenant | Fahrschule Gemperli |
| Kunde | Dario Reumer / `3d0e2daa-3b0b-4a36-87e6-0d81b80459ec` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

<a id="d12a4229-c50b-4016-a964-41857f8b2304"></a>
### RE-2026-0049 — Fahrschule Gemperli

| Feld | Wert |
| --- | --- |
| Rechnungs-ID | `d12a4229-c50b-4016-a964-41857f8b2304` |
| Rechnungsnummer | RE-2026-0049 |
| tenant_id | `660b72a9-c67b-4763-85d7-b7ba6605e59e` |
| Tenant | Fahrschule Gemperli (`fahrschule-gemperli`) |
| Kunden-ID | `c0b54e28-5dbb-4ff3-9349-50522606be11` |
| Kundenname | Nina Vogt |
| billing_type | `company` |
| Kategorie | `COMPANY_BILLING_BLANK_NAME` |
| Billing-Firmenname | NOT AVAILABLE |
| PLZ und Ort im Snapshot | 8854 Siebnen |
| company_id | NULL |
| Rechnungsdatum | 2026-10-04 |
| Erstellt | 2026-10-04 15:01:36 CEST |
| Fällig | 2026-10-14 |
| Rechnungsstatus | `paid` |
| Zahlungsstatus | `paid` |
| Gesamtbetrag | CHF 392.65 |
| Bezahlt | CHF 392.65 |
| Grund der fehlenden Zuordnung | billing_type ist company und company_id ist NULL. Der gespeicherte Billing-Firmenname ist leer, deshalb fehlt auch ein Namensbeleg im Snapshot. |
| Herkunft | Strukturlinks: invoice_items.appointment_id (3). Der Erstellungsweg (manuell, Auto-Invoice, Import) ist daraus nicht zuverlässig ableitbar und bleibt NOT AVAILABLE. |


Firmenbeziehungen des Kunden. Eine heutige Beziehung ist kein Beweis für diese Rechnung.

- `users.company_id`: NULL. Keine aktuelle Mitgliedschaft.
- Eine separate Mitgliedschaftstabelle existiert im Schema nicht.
- 1 Adressdatensatz/Datensätze ohne Firmennamen. Daraus folgt keine Firma.
- Andere Rechnungen desselben Kunden mit gesetztem company_id: keine.
- courses.company_id über course_registrations.invoice_id oder course_invoice_bindings: keine.
- Fremd-Tenant-Kandidat mit exaktem Namen oder über users.company_id: keiner.

Vergleich mit dem Firmenstamm. Labels sind Vergleichsergebnisse, keine Zuordnung.

- Zulässige Kandidaten im selben Tenant: keine.
- Vergleichslabels: `INSUFFICIENT_DATA`.

| Prüffeld | Inhalt |
| --- | --- |
| Rechnung | `d12a4229-c50b-4016-a964-41857f8b2304` / RE-2026-0049 |
| Tenant | Fahrschule Gemperli |
| Kunde | Nina Vogt / `c0b54e28-5dbb-4ff3-9349-50522606be11` |
| Billing-Firmenname | NOT AVAILABLE |
| Mögliche Firmen im selben Tenant | keine zulässige gleich-Tenant-Firma |
| Vergleichsergebnisse | `INSUFFICIENT_DATA` |
| Offene Fragen | Der Billing-Snapshot hat keinen Firmennamen. Welcher Beleg ausserhalb der heutigen Mitgliedschaft nennt die Firma zum Rechnungsdatum? Es gibt keinen gleich-Tenant-Kandidaten. Existiert die Firma überhaupt im Firmenstamm dieses Tenants, oder wurde sie nur als Freitext erfasst? |
| Nächster Prüfschritt | Rechnungs-PDF oder Korrespondenz zum Rechnungsdatum suchen, weil der Snapshot keinen Firmennamen trägt. HUMAN_DECISION, EVIDENCE_REFERENCE, REVIEWED_BY und REVIEW_DATE bleiben leer. |
| HUMAN_DECISION | |
| EVIDENCE_REFERENCE | |
| REVIEWED_BY | |
| REVIEW_DATE | |

## 6. Mehrere Kandidaten und fehlende Evidenz

Mehrere gleich-Tenant-Kandidaten: keine.

Fremd-Tenant-Kandidaten: keine.

Fälle ohne gleich-Tenant-Kandidaten:

| Tenant | Rechnung | ID | Datum |
| --- | --- | --- | --- |
| driving-team | [RE-2026-0027](#585ee4fc-51f0-4475-821f-6c7c27055ba5) | `585ee4fc-51f0-4475-821f-6c7c27055ba5` | 2026-07-14 |
| driving-team | [RE-2026-0028](#262a9f98-a0ce-41e0-bf70-7d71617692ce) | `262a9f98-a0ce-41e0-bf70-7d71617692ce` | 2026-07-20 |
| driving-team | [RE-2026-0043](#ff401ad9-f26b-4315-98ae-db8fe65dc219) | `ff401ad9-f26b-4315-98ae-db8fe65dc219` | 2026-07-24 |
| driving-team | [RE-2026-0045](#7033c4f6-dcda-4995-a614-a6e2b5ddbd70) | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | 2026-07-29 |
| driving-team | [RE-2026-0046](#4ebce689-5261-4dc2-96f5-29b804ac50e8) | `4ebce689-5261-4dc2-96f5-29b804ac50e8` | 2026-07-29 |
| driving-team | [RE-2026-0047](#3400bd0b-786b-4444-8352-884c2d357f89) | `3400bd0b-786b-4444-8352-884c2d357f89` | 2026-07-30 |
| driving-team | [RE-2026-0058](#84a81a5b-7b26-40d1-9161-ccec6373f118) | `84a81a5b-7b26-40d1-9161-ccec6373f118` | 2026-08-21 |
| driving-team | [RE-2026-0061](#6a321fa4-c65a-4a66-92a2-ceb1b3494d34) | `6a321fa4-c65a-4a66-92a2-ceb1b3494d34` | 2026-08-21 |
| driving-team | [RE-2026-0073](#d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d) | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | 2026-08-31 |
| driving-team | [RE-2026-0085](#4b6bad1c-e897-49d8-b3ba-301e94376dc4) | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | 2026-09-18 |
| driving-team | [RE-2026-0096](#0209bc4b-fea5-4af8-914e-ec3a1612d134) | `0209bc4b-fea5-4af8-914e-ec3a1612d134` | 2026-09-30 |
| driving-team | [RE-2026-0099](#617cc446-45ec-467d-953d-4bd2fa03ba9c) | `617cc446-45ec-467d-953d-4bd2fa03ba9c` | 2026-10-08 |
| driving-team | [RE-2026-0103](#2e854034-50f3-48b4-9fc3-b8bdd348337c) | `2e854034-50f3-48b4-9fc3-b8bdd348337c` | 2026-10-12 |
| driving-team | [RE-2026-0105](#f8ea72e0-7756-4db5-ae39-79dfb318434c) | `f8ea72e0-7756-4db5-ae39-79dfb318434c` | 2026-10-16 |
| driving-team | [RE-2026-0106](#6e07fe3e-1c78-406f-b134-175e4a12154c) | `6e07fe3e-1c78-406f-b134-175e4a12154c` | 2026-10-16 |
| fahrschule-gemperli | [RE-2026-0010](#28a7ebe7-04cd-4676-9b83-3c2be4df0b83) | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | 2026-07-22 |
| fahrschule-gemperli | [RE-2026-0012](#be80a098-7039-4c18-8843-e2d43fc00931) | `be80a098-7039-4c18-8843-e2d43fc00931` | 2026-07-22 |
| fahrschule-gemperli | [RE-2026-0013](#c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f) | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | 2026-07-29 |
| fahrschule-gemperli | [RE-2026-0021](#e72dc779-05b5-4dd9-9b2f-8966e7278a50) | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0024](#4a832b6c-15f5-4035-973c-8b8c11276216) | `4a832b6c-15f5-4035-973c-8b8c11276216` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0025](#1454bed1-e68a-4444-9af6-4d92ef8e980f) | `1454bed1-e68a-4444-9af6-4d92ef8e980f` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0026](#33d4b7e1-0ecd-45db-9717-df471a167db3) | `33d4b7e1-0ecd-45db-9717-df471a167db3` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0028](#65a0d6f7-48f1-4fee-8be3-749983cf11ca) | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0029](#f524dea2-25da-43fd-9194-6d5c201170de) | `f524dea2-25da-43fd-9194-6d5c201170de` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0030](#62c7bfe3-b427-4f49-9c8f-5e753c9c3589) | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0035](#a84d6fac-0efb-408d-9cf3-f156715c681b) | `a84d6fac-0efb-408d-9cf3-f156715c681b` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0036](#c0b93f3e-fe62-4923-8b35-2c2a467ccc91) | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0037](#c32e038d-942c-49c6-82fe-ff7a9f4add61) | `c32e038d-942c-49c6-82fe-ff7a9f4add61` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0044](#e6654110-120a-40c6-a3cf-0468fc2af62d) | `e6654110-120a-40c6-a3cf-0468fc2af62d` | 2026-10-03 |
| fahrschule-gemperli | [RE-2026-0045](#a27a1ace-d3f6-4c32-987e-d25b45ca4b1d) | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | 2026-10-04 |
| fahrschule-gemperli | [RE-2026-0048](#c373fb40-06d4-4821-b40a-85bf55e43e63) | `c373fb40-06d4-4821-b40a-85bf55e43e63` | 2026-10-04 |
| fahrschule-gemperli | [RE-2026-0049](#d12a4229-c50b-4016-a964-41857f8b2304) | `d12a4229-c50b-4016-a964-41857f8b2304` | 2026-10-04 |

Fälle, deren Kandidaten sämtlich nach der Rechnung angelegt wurden:

| Tenant | Rechnung | ID | Datum |
| --- | --- | --- | --- |
| driving-team | [2026-000005](#9364490e-7c25-4f4a-a5d6-35b3299fff86) | `9364490e-7c25-4f4a-a5d6-35b3299fff86` | 2026-02-09 |
| driving-team | [2026-000006](#dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb) | `dfe8750e-19f6-4d4e-b9f1-44a2a0f0a4cb` | 2026-02-12 |
| driving-team | [2026-000007](#e7bdb323-9762-486a-9751-391714727483) | `e7bdb323-9762-486a-9751-391714727483` | 2026-02-25 |
| driving-team | [RE-2026-0009](#e1ac8880-0a40-4053-82c9-28effd878ba9) | `e1ac8880-0a40-4053-82c9-28effd878ba9` | 2026-04-18 |
| driving-team | [RE-2026-0010](#77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3) | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | 2026-04-19 |
| driving-team | [RE-2026-0011](#f41239b4-55c6-4094-a30f-2c9d9de1f49f) | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | 2026-04-19 |
| driving-team | [RE-2026-0012](#23c3a657-ed02-46ac-8a51-69cf3c534448) | `23c3a657-ed02-46ac-8a51-69cf3c534448` | 2026-04-19 |
| driving-team | [RE-2026-0013](#1ce513c6-cf04-4bdf-a981-22787be2c1ca) | `1ce513c6-cf04-4bdf-a981-22787be2c1ca` | 2026-04-19 |
| driving-team | [RE-2026-0014](#b4e68f95-197e-446c-a556-14a968266060) | `b4e68f95-197e-446c-a556-14a968266060` | 2026-04-19 |
| driving-team | [RE-2026-0016](#59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5) | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | 2026-05-28 |
| driving-team | [RE-2026-0017](#2feb765f-b7e3-46e5-ae37-94c914af0065) | `2feb765f-b7e3-46e5-ae37-94c914af0065` | 2026-06-09 |
| driving-team | [RE-2026-0025](#7914f05f-cf63-488d-89c7-af15900fdf95) | `7914f05f-cf63-488d-89c7-af15900fdf95` | 2026-07-13 |
| driving-team | [RE-2026-0026](#baa3c2c6-df08-4a2c-bfba-1beedb6bfe21) | `baa3c2c6-df08-4a2c-bfba-1beedb6bfe21` | 2026-07-14 |
| driving-team | [RE-2026-0029](#dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc) | `dab5cc6c-40b1-4d8d-9ed5-09a3196e24dc` | 2026-07-21 |
| driving-team | [RE-2026-0050](#3c3b6620-b1e4-4735-994b-b5b73164bf27) | `3c3b6620-b1e4-4735-994b-b5b73164bf27` | 2026-08-04 |
| driving-team | [RE-2026-0086](#6addae71-24f5-49a0-aad7-d93650645da3) | `6addae71-24f5-49a0-aad7-d93650645da3` | 2026-09-18 |

Fälle mit leerem Billing-Firmennamen (`INSUFFICIENT_DATA`):

| Tenant | Rechnung | ID | Datum |
| --- | --- | --- | --- |
| driving-team | [RE-2026-0025](#7914f05f-cf63-488d-89c7-af15900fdf95) | `7914f05f-cf63-488d-89c7-af15900fdf95` | 2026-07-13 |
| fahrschule-gemperli | [RE-2026-0010](#28a7ebe7-04cd-4676-9b83-3c2be4df0b83) | `28a7ebe7-04cd-4676-9b83-3c2be4df0b83` | 2026-07-22 |
| fahrschule-gemperli | [RE-2026-0012](#be80a098-7039-4c18-8843-e2d43fc00931) | `be80a098-7039-4c18-8843-e2d43fc00931` | 2026-07-22 |
| fahrschule-gemperli | [RE-2026-0013](#c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f) | `c6d6d8a5-23e8-4b0e-a20a-c5d9126d8f9f` | 2026-07-29 |
| fahrschule-gemperli | [RE-2026-0021](#e72dc779-05b5-4dd9-9b2f-8966e7278a50) | `e72dc779-05b5-4dd9-9b2f-8966e7278a50` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0024](#4a832b6c-15f5-4035-973c-8b8c11276216) | `4a832b6c-15f5-4035-973c-8b8c11276216` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0025](#1454bed1-e68a-4444-9af6-4d92ef8e980f) | `1454bed1-e68a-4444-9af6-4d92ef8e980f` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0026](#33d4b7e1-0ecd-45db-9717-df471a167db3) | `33d4b7e1-0ecd-45db-9717-df471a167db3` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0028](#65a0d6f7-48f1-4fee-8be3-749983cf11ca) | `65a0d6f7-48f1-4fee-8be3-749983cf11ca` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0029](#f524dea2-25da-43fd-9194-6d5c201170de) | `f524dea2-25da-43fd-9194-6d5c201170de` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0030](#62c7bfe3-b427-4f49-9c8f-5e753c9c3589) | `62c7bfe3-b427-4f49-9c8f-5e753c9c3589` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0036](#c0b93f3e-fe62-4923-8b35-2c2a467ccc91) | `c0b93f3e-fe62-4923-8b35-2c2a467ccc91` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0037](#c32e038d-942c-49c6-82fe-ff7a9f4add61) | `c32e038d-942c-49c6-82fe-ff7a9f4add61` | 2026-09-25 |
| fahrschule-gemperli | [RE-2026-0044](#e6654110-120a-40c6-a3cf-0468fc2af62d) | `e6654110-120a-40c6-a3cf-0468fc2af62d` | 2026-10-03 |
| fahrschule-gemperli | [RE-2026-0045](#a27a1ace-d3f6-4c32-987e-d25b45ca4b1d) | `a27a1ace-d3f6-4c32-987e-d25b45ca4b1d` | 2026-10-04 |
| fahrschule-gemperli | [RE-2026-0048](#c373fb40-06d4-4821-b40a-85bf55e43e63) | `c373fb40-06d4-4821-b40a-85bf55e43e63` | 2026-10-04 |
| fahrschule-gemperli | [RE-2026-0049](#d12a4229-c50b-4016-a964-41857f8b2304) | `d12a4229-c50b-4016-a964-41857f8b2304` | 2026-10-04 |

`billing_type = individual` mit Firmennamen im Snapshot:

| Tenant | Rechnung | ID | Datum |
| --- | --- | --- | --- |
| driving-team | [RE-2026-0016](#59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5) | `59a90dd6-2ee6-4bcf-817f-a27e1ef1e6a5` | 2026-05-28 |
| driving-team | [RE-2026-0047](#3400bd0b-786b-4444-8352-884c2d357f89) | `3400bd0b-786b-4444-8352-884c2d357f89` | 2026-07-30 |
| driving-team | [RE-2026-0050](#3c3b6620-b1e4-4735-994b-b5b73164bf27) | `3c3b6620-b1e4-4735-994b-b5b73164bf27` | 2026-08-04 |
| driving-team | [RE-2026-0069](#ac308c69-91d1-43ca-a47c-a7c85029d93e) | `ac308c69-91d1-43ca-a47c-a7c85029d93e` | 2026-08-28 |

Bei den 16 Gemperli-Rechnungen ohne Firmennamen ist auch `users.company_id` leer. Die gespeicherten `company_billing_addresses` dieser Kunden haben ebenfalls keinen Firmennamen. Ein Firmenkandidat ist daraus nicht ableitbar.

Zwei Driving-Team-Rechnungen (`RE-2026-0051`, `RE-2026-0053`) haben als Snapshot-Namen den Kundennamen Pascal Kilchenmann und als heutige Mitgliedschaft `5ec738cc-fc27-424a-9934-af5cbb8069ca` (Driving Team Zürich GmbH). Das ist `MEMBERSHIP_MATCH_ONLY`.

`RE-2026-0025` hat keinen Snapshot-Namen. Die heutige Mitgliedschaft ist `0a66d0a6-5ca1-4d01-aff5-d600c1b7e9e9`, Firmenname im Stamm „samuel samuel“. Das ist ein Hinweis, kein Beleg.

`RE-2026-0047` hat keinen Kunden-User. Der Snapshot-Name ist „Firma“, PLZ 8000 Zürich. Kein Firmenstamm trifft diesen Namen.

Die eine Gemperli-Firmenrechnung mit Namen, `RE-2026-0035`, Snapshot „Hutter Manfred GmbH“, hat keinen gleich-Tenant-Treffer und keine Mitgliedschaft.

## 7. Zahlungsstatus-Trigger

Neu gerechnet am Abfragetag, nicht aus dem früheren Bericht übernommen. 15 der 60 unverknüpften Firmenrechnungen, und keine der 4 Individualrechnungen, erfüllen die Bedingung von `update_invoice_status`. 14 würden auf overdue gestellt, weil `due_date` vor dem 16. Oktober 2026 liegt, `status = sent` und `payment_status` nicht paid ist. Eine würde auf paid gestellt, weil bezahlter Betrag und Total beide 0 sind und der Zahlungsstatus noch pending ist.

9 dieser 15 haben zusätzlich exakten Namen und heutige Mitgliedschaft auf dieselbe Firma. Die früheren 5 sind nicht der aktuelle Bestand.

Die MWST-Trigger-Formel ändert bei keinem der 64 Beträge. Sie läuft bei einem Update trotzdem.

| Tenant | Rechnung | ID | Datum |
| --- | --- | --- | --- |
| driving-team | [RE-2026-0009](#e1ac8880-0a40-4053-82c9-28effd878ba9) | `e1ac8880-0a40-4053-82c9-28effd878ba9` | 2026-04-18 |
| driving-team | [RE-2026-0010](#77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3) | `77c9eb7f-d985-4fa8-b8c1-fb71f56cadc3` | 2026-04-19 |
| driving-team | [RE-2026-0011](#f41239b4-55c6-4094-a30f-2c9d9de1f49f) | `f41239b4-55c6-4094-a30f-2c9d9de1f49f` | 2026-04-19 |
| driving-team | [RE-2026-0019](#01261371-4d06-47be-ba34-692e75893b6b) | `01261371-4d06-47be-ba34-692e75893b6b` | 2026-07-07 |
| driving-team | [RE-2026-0020](#0a906dbe-84b3-4546-8eb8-148911220f6a) | `0a906dbe-84b3-4546-8eb8-148911220f6a` | 2026-07-08 |
| driving-team | [RE-2026-0028](#262a9f98-a0ce-41e0-bf70-7d71617692ce) | `262a9f98-a0ce-41e0-bf70-7d71617692ce` | 2026-07-20 |
| driving-team | [RE-2026-0037](#6f4415ac-944a-4d83-a39b-22bf2248eb8c) | `6f4415ac-944a-4d83-a39b-22bf2248eb8c` | 2026-07-22 |
| driving-team | [RE-2026-0045](#7033c4f6-dcda-4995-a614-a6e2b5ddbd70) | `7033c4f6-dcda-4995-a614-a6e2b5ddbd70` | 2026-07-29 |
| driving-team | [RE-2026-0046](#4ebce689-5261-4dc2-96f5-29b804ac50e8) | `4ebce689-5261-4dc2-96f5-29b804ac50e8` | 2026-07-29 |
| driving-team | [RE-2026-0073](#d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d) | `d8b4daaa-4a2d-44d0-bc61-99ad7eb1602d` | 2026-08-31 |
| driving-team | [RE-2026-0075](#bc2829f8-639d-48c0-baf6-9c81fd138bcc) | `bc2829f8-639d-48c0-baf6-9c81fd138bcc` | 2026-09-01 |
| driving-team | [RE-2026-0085](#4b6bad1c-e897-49d8-b3ba-301e94376dc4) | `4b6bad1c-e897-49d8-b3ba-301e94376dc4` | 2026-09-18 |
| driving-team | [RE-2026-0086](#6addae71-24f5-49a0-aad7-d93650645da3) | `6addae71-24f5-49a0-aad7-d93650645da3` | 2026-09-18 |
| driving-team | [RE-2026-0090](#7173f7e2-f714-4581-82dc-d26ee82cd03c) | `7173f7e2-f714-4581-82dc-d26ee82cd03c` | 2026-09-24 |
| driving-team | [RE-2026-0096](#0209bc4b-fea5-4af8-914e-ec3a1612d134) | `0209bc4b-fea5-4af8-914e-ec3a1612d134` | 2026-09-30 |

`6f4415ac-944a-4d83-a39b-22bf2248eb8c` (`RE-2026-0037`, Driving Team) hat Total CHF 0.00 und bezahlt CHF 0.00, Status `pdf_created`, Zahlungsstatus `pending`. Die Bezahlt-Bedingung ist damit wahr. Ein Rechnungsposten verweist auf einen Termin. Ein Statuswechsel auf paid würde `trigger_update_appointment_status_on_invoice_paid` für diesen Termin auslösen.

Für diese 15 Fälle braucht eine spätere Verknüpfung einen separaten technischen Freigabeschritt. Für die übrigen 49 Prüffälle ändert die bekannte Statusbedingung den Zahlungsstatus nicht. Ein Update bleibt auch dort ein Schreibvorgang mit BEFORE-UPDATE-Triggern und braucht eine eigene Freigabe. Dieser Bericht enthält keine Korrekturabfrage.

## 8. Offerten

Offerten sind keine Rechnungen. `update_invoice_status` kehrt für `document_kind = quote` sofort zurück. Sie stehen nicht in der Prüfliste der 64.

| ID | Nummer | Tenant | billing_type | company_id | Snapshot-Firmenname | User | Namensgleichstand im Firmenstamm |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `c61cea23-67a0-4491-be86-ae32bd751e89` | OF-2026-0002 | driving-team | individual | NULL | leer | vorhanden | keiner |
| `9f017386-8d71-4e3c-9218-3d43dfe9a7e8` | OF-2026-0003 | driving-team | individual | NULL | leer | vorhanden | keiner |
| `cc326d43-8d2f-4b42-9465-303e8d93077e` | OF-2026-0004 | driving-team | company | NULL | Giada Ilardo AG, 8001 Zürich | NOT AVAILABLE | keiner, auch nicht in einem anderen Tenant |
| `5defbcd9-a406-4d9c-a62c-42adff31544e` | OF-2026-0005 | driving-team | individual | NULL | leer | vorhanden | keiner |

`OF-2026-0004` ist eine unverknüpfte Firmenofferte. Es gibt dafür keinen Kunden und keine Firma dieses Namens. Eine Zuordnung ist aus diesen Daten nicht möglich. Sie wird hier nicht als Rechnung gezählt.

## 9. Kontrollgruppe: bereits verknüpfte Firmenrechnungen

11 Rechnungen haben `document_kind = invoice`, `billing_type = company` und ein gesetztes `company_id`. Alle 11 Firmen liegen im selben Tenant. Name und PLZ/Ort stimmen mit dem Firmenstamm überein. Alle 11 haben `user_id` NULL. Deshalb können sie die Kunden der 64 Prüffälle nicht bestätigen: ein Join über den Kunden findet sie nicht.

| ID | Nummer | Tenant | company_id | Firma | Datum | Status | Zahlungsstatus | Total | Status-Trigger bei gewöhnlichem Update |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| `bcdec1c7-334a-4a0a-9c0c-618d69eadd0c` | RE-2026-0057 | driving-team | `5ec738cc-fc27-424a-9934-af5cbb8069ca` | Driving Team Zürich GmbH | 2026-08-19 | cancelled | pending | CHF 499.00 | nein |
| `01da38a0-97bb-4437-a77d-1890a89b22fa` | RE-2026-0081 | driving-team | `98710fcf-0d5a-433f-b0b3-a33a1299c721` | Stadt Schlieren Werke, Versorgung und Anlagen | 2026-09-15 | pdf_created | pending | CHF 1'140.00 | nein |
| `a619b5b8-bb04-4667-8ace-47a55ce03597` | RE-2026-0094 | driving-team | `c88830c3-b0cc-409a-8739-c401a5d3aaf6` | Peter Senn AG | 2026-09-28 | sent | pending | CHF 2'200.00 | ja, würde overdue setzen |
| `16b93534-aa15-4eb8-973e-6306aee77119` | RE-2026-0014 | fahrschule-gemperli | `af289ecc-6b79-4b13-9eac-3a6c425a21d4` | Road Help Abschleppdienst | 2026-07-29 | cancelled | pending | CHF 2'750.00 | nein |
| `e9ab3b88-ffc7-447e-964e-8a9bfc1a6231` | RE-2026-0015 | fahrschule-gemperli | `af289ecc-6b79-4b13-9eac-3a6c425a21d4` | Road Help Abschleppdienst | 2026-07-29 | cancelled | pending | CHF 2'750.00 | nein |
| `9f8752bf-2238-4a28-bebc-2f5c78d0f24c` | RE-2026-0016 | fahrschule-gemperli | `af289ecc-6b79-4b13-9eac-3a6c425a21d4` | Road Help Abschleppdienst | 2026-07-29 | paid | paid | CHF 3'410.00 | nein |
| `5d943837-3bf4-499e-a3d4-8025f2676ec4` | RE-2026-0023 | fahrschule-gemperli | `77cc4031-3254-47ee-b859-aff45ce8531b` | VZ Kanalreinigung | 2026-09-25 | cancelled | pending | CHF 160.00 | nein |
| `45b5f1ef-fc00-4f7a-8b92-be3bff899d8f` | RE-2026-0040 | fahrschule-gemperli | `79aebff2-e0ee-457c-aa4e-3fdfd8d878a7` | Verein pro Dorfgaden | 2026-10-03 | pdf_created | pending | CHF 180.00 | nein |
| `10627ea1-4cda-4e58-b363-52c8f30ccb21` | RE-2026-0041 | fahrschule-gemperli | `64f84be8-638c-4011-86d6-d36e3730118d` | Johann Müller AG | 2026-10-03 | sent | pending | CHF 3'703.35 | ja, würde overdue setzen |
| `76672ad8-a9c0-44ec-8640-58aec9092e33` | RE-2026-0061 | fahrschule-gemperli | `c1bbac4a-52c8-4c12-9934-6afacb382c79` | Blöchlinger AG | 2026-10-04 | pdf_created | pending | CHF 1'209.00 | nein |
| `da8ca444-1b61-48ea-aa1f-d2b7a59ab9b1` | RE-2026-0001 | simych | `b16e48d4-97b5-4810-9629-015861031591` | Wallee Group AG | 2026-07-29 | overdue | overdue | CHF 1'870.00 | nein, Status ist bereits overdue |

Bei Wallee Group AG sind `invoices.created_at` und `companies.created_at` derselbe Zeitstempel, 2026-08-02 10:22:41 Europe/Zurich. Das Rechnungsdatum ist der 29. Juli 2026. Der Firmenstammsatz existierte am Rechnungsdatum noch nicht; er entstand zusammen mit dem Rechnungsdatensatz. Die Verknüpfung ist gespeichert und wird hier nicht vorgeschlagen oder verändert.

Zwei Kontrollrechnungen, Peter Senn AG und Johann Müller AG, würden bei einem gewöhnlichen Update ebenfalls auf overdue springen. Sie sind schon verknüpft. Dieser Bericht ändert sie nicht.

## 10. Einschränkungen

- Eine Herkunftsspalte auf `invoices` existiert nicht. `imported_invoices` hat keinen Fremdschlüssel auf `invoices`. Der Erstellungsweg ist pro Zeile NOT AVAILABLE. Bekannte Codepfade, die `company_id` nicht setzen, werden deshalb keiner einzelnen Rechnung zugeordnet.
- Es gibt keine Mitgliedschaftstabelle und keine historische Mitgliedschaft. `users.company_id` ist der heutige Stand.
- `company_billing_addresses` hängt nicht an `companies.id`. Ein Adressname ist nur dann mit einer Firma verbunden, wenn der normalisierte Name im selben Tenant exakt gleich ist.
- 17 Prüffälle haben keinen Billing-Firmennamen. Dafür ist der Namensvergleich `INSUFFICIENT_DATA`.
- Mehrere Firmen teilen sich denselben `created_at`, unter anderem 2026-08-13 06:38:59 Europe/Zurich. Der Bericht benutzt nur diesen Zeitstempel. Er sagt nicht, wann die Firma ausserhalb der Datenbank entstanden ist.
- Strasse, E-Mail und Telefon wurden nicht verglichen.
- Der benannte Audit-Bericht `SIMY_COMPANY_INVOICE_LINKING_SYSTEM_AUDIT.md` war im Repository nicht vorhanden.
- Drei Individualrechnungen ohne User und ohne Firmennamen liegen ausserhalb dieser Firmenliste. Ihre IDs stehen in Abschnitt 3.

## 11. Späterer manueller Freigabeprozess

1. Einen Fall nur über die Rechnungs-ID öffnen. Die Rechnungsnummer allein ist nicht eindeutig, weil sie pro Tenant läuft.
2. Die leeren Felder `HUMAN_DECISION`, `EVIDENCE_REFERENCE`, `REVIEWED_BY` und `REVIEW_DATE` ausserhalb dieses Berichts ausfüllen. Ein Name, die heutige Mitgliedschaft oder ein ähnlicher Ort reicht als Beleg nicht.
3. Eine Firma eines anderen Tenants nie auswählen. In diesem Lauf gab es keinen solchen Treffer; die Regel bleibt.
4. Eine Firma, die nach dem Rechnungsdatum angelegt wurde, nur mit einem unabhängigen Beleg aus der Rechnungszeit verwenden. Der spätere Stammsatz ist kein solcher Beleg.
5. Bei den 15 Triggerfällen vor jedem Schreiben eine technische Freigabe einholen. Ein gewöhnliches Update ändert dort den Zahlungsstatus. Den Trigger nicht umgehen und keine Korrektur-SQL aus diesem Bericht bauen.
6. Bei den zwei bereits verknüpften Kontrollrechnungen mit derselben Triggerbedingung gilt dasselbe, falls sie später aus einem anderen Grund geändert werden.
7. `LINK_TO_COMPANY` nur mit einer `company_id` aus demselben Tenant und einem nachvollziehbaren Beleg. `KEEP_UNLINKED`, wenn die Rechnung Privatperson oder bewusst ohne Firma bleiben soll. `BILLING_TYPE_REVIEW`, wenn individual und Firmenname sich widersprechen. `NEEDS_MORE_EVIDENCE`, wenn der Beleg fehlt. `ESCALATE_ACCOUNTING`, wenn der Zahlungsstatus oder die Mahnung nicht angefasst werden darf.
8. Dieser Bericht setzt keine dieser Entscheidungen. PR #459 bleibt unverändert.

## 12. Abschlusskontrolle

| Kontrolle | Ergebnis |
| --- | --- |
| Alle 64 Zielrechnungen sind mit ID aufgeführt | ja, 60 company-NULL und 4 individual mit Firmennamen |
| ID-Menge stimmt mit der Bestätigungsabfrage überein | ja, MD5 `afdf9bd401cdd3d70a8040e3945ec48e` |
| Keine Fremd-Tenant-Firma als zulässige Zuordnung | ja, 0 solche Treffer, und keiner wurde vorgeschlagen |
| Kandidaten und bestätigte Zuordnungen getrennt | ja, Labels sind Vergleichsergebnisse; Entscheidungsfelder sind leer |
| Keine automatische Zuordnung | ja |
| Nur Lesezugriffe | ja, ausschliesslich SELECT und Katalogleseoperationen |
| Keine Migration, kein Backfill, keine Produktionsänderung | ja |
| PR #459 nicht geändert | ja |

Abschlussurteil: `PASS — REVIEW LIST COMPLETE`

Aktuelle Fallzahlen: 64 Prüffälle. Davon haben 32 mindestens einen gleich-Tenant-Firmenkandidaten. 48 haben keinen Kandidaten, der im selben Tenant schon zum Rechnungszeitpunkt als Datensatz existierte. 32 haben gar keinen gleich-Tenant-Kandidaten.
