# PR 455 — Final Security and Accounting Gate

Gesamturteil: **CONDITIONAL PASS — SPECIFIC BLOCKERS**

Der Kernpfad für eine irrtümlich als bezahlt markierte Rechnungszahlung ist nachvollziehbar, tenant-gebunden und auf einem Wegwerf-Postgres getestet. Vor einem Merge bleibt ein hoher Accounting-Blocker: Guthaben, das beim Vollzahlen der Rechnung entstanden ist, wird weder zurückgenommen noch abgelehnt. Der Branch ist ausserdem hinter `main`. Diese Prüfung hat nichts geändert.

## 1. Executive Summary

Die Aktion ist kein Löschen einer Zahlung. Sie lässt die ursprüngliche `payments`-Zeile stehen, setzt ihren Status auf `invoice`, schreibt eine positive `invoice_payments`-Zeile mit Status `reversal`, zieht den Betrag einmal aus dem Zahlungseingang und legt ein markiertes Storno an, das in der Erfolgsrechnung nicht noch einmal als Aufwand zählt.

Das ist für eine Rechnung ohne Wallet-Gutschrift und ohne Staff-POS-Guthaben belegt. Sobald `mark-invoice-paid` beim Vollzahlen `credit_applied_rappen` oder ein Staff-POS-Guthaben gebucht hat, bleibt dieses Guthaben nach der Korrektur stehen. Das ist der Merge-Blocker.

## 2. Aktueller PR- und Git-Zustand

Gelesen am 2026-10-16, nach `git fetch` von `main` und dem PR-Branch.

| Punkt | Stand |
| --- | --- |
| PR | offen, https://github.com/Kilchi555/driving-team-app/pull/455 |
| Draft | ja. Diese Prüfung hat den Draft nicht geändert. |
| Aktueller Head | `335273b965fbeef68841a03811e414936df1ca22` |
| Gemeldeter Integrations-Head | `bfe04444f46a1a11278102d4ad8dbd09ce098c3c` ist der Merge-Commit davor, nicht der aktuelle Head. Darüber liegt nur die Doku `PR_455_BRANCH_UPDATE.md`. |
| Von GitHub gemeldete Base | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| Aktuelles `origin/main` | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |
| Merge-Base mit `main` | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| Mergeability | `MERGEABLE`, `mergeStateStatus` `BEHIND` |
| Review-Threads | 2 offen, beide Bugbot, keine weiteren Review-Kommentare |

`main` ist um `ecf9694f` weiter (`#457`, öffentliche Rechtsseiten). Kein Payment-, Migrations- oder Tenant-Code. Diese Prüfung fordert keine Branch-Aktualisierung an und führt keine aus. Unter der Ruleset-Regel `strict_required_status_checks_policy` kann GitHub den PR erst mergen, wenn ein Mensch den Branch nachzieht.

Ruleset `Protect main — Required CI`, gelesen live: Test and lint, E2E login, Dependency review. App-Store-Checks sind nicht enthalten.

Checks auf exakt `335273b9`:

| Check | Status | Beleg |
| --- | --- | --- |
| Test and lint | pass | Run `38903123366`, 3180 Tests, darunter `payment-receipt-reset.db.test.ts` mit 11 Tests |
| E2E login | pass | derselbe Run |
| Dependency review | pass | Run `38903123454` |
| CodeQL | pass, nicht erforderlich | |
| App \| Default | fail, nicht erforderlich | |
| App \| Default \| Archive - iOS | fail, nicht erforderlich | |

Die früher gemeldeten 3180 Tests gehören zu diesem Head, nicht nur zum älteren Merge `bfe04444`. Der Review-State-Kommentar von 12:49 UTC ist veraltet: er sah Test and lint noch als pending. Live sind die drei Pflichtchecks grün. `actionable_findings` darin ist kein Merge-Urteil.

Seit dem letzten Branch-Update-Bericht hat sich der Head nicht geändert. Geändert haben sich `main` (`BEHIND`) und die inzwischen fehlgeschlagenen App-Store-Checks.

## 3. Reset-Datenfluss

`VERIFIED IN CODE` auf Head `335273b9`.

1. `PaymentReceiptResetDialog.vue` öffnet sich mit einer neuen Idempotenz-UUID und zeigt eine Vorschau über `POST /api/admin/payments/receipt-reset-preview`.
2. Die Vorschau liest den eingeloggten Benutzer, dann `users` über `auth_user_id`. Tenant und Rolle kommen aus diesem Profil, nicht aus dem Body.
3. `loadReceiptResetSnapshot` lädt Zahlung, Rechnung, Positionen, Geschwister, Settlements, Buchungen, Bargeld und Bankimport nur mit `tenant_id` des Aufrufers.
4. `evaluateReceiptReset` ist rein. Fehlende Geschäftsentscheide blockieren. `detach` ist verboten.
5. `POST /api/admin/payments/receipt-reset` ruft die SQL-Funktion nur auf, wenn der Planer Status 200 und RPC-Argumente liefert. Sonst gibt es 401, 403, 404 oder 409 und keinen RPC.
6. `admin_reset_mistaken_receipt` ist `SECURITY DEFINER`, `search_path` ist fest, und wiederholt Rolle, Tenant, Betrag, Settlement und gesperrte Kanäle. `EXECUTE` hat nur `service_role`.

Was eine erfolgreiche Korrektur schreibt:

- `payments`: nur diese Zeile, `payment_status = invoice`, `paid_at` leer. Die Zeile bleibt.
- `invoices.paid_amount_rappen`: Summe der anderen Zahlungen desselben Tenants und derselben Rechnung mit Status `completed` oder `paid`.
- Rechnungsstatus: `partial` plus `sent` oder, bei überschrittenem `CURRENT_DATE`, `overdue`. `paid_at` wird geleert, wenn der Rest den Total nicht mehr deckt.
- `invoice_payments`: eine neue Zeile, Betrag positiv, Status `reversal`, Referenz ist die Payment-ID. Das bestehende Settlement mit Status `completed` bleibt.
- `accounting_entries`: ein Aufwand-Storno mit `external_reference = payment-receipt-reset`, plus gespiegelte Journalzeilen, wenn das Original welche hat. Die Originalbuchung wird gesperrt, nicht gelöscht.
- `payment_receipt_resets`: Akteur, Grund, vorher/nachher, Reversal, Storno.
- Termin: nur wenn die Disposition `set_status` ist und der Status auf der Allowlist steht. Standard im Dialog ist eine bewusste Wahl; `leave_unchanged` ändert den Termin nicht.

Was unverändert bleibt: Geschwisterzahlungen, Rechnungspositionen, das ursprüngliche Settlement, die ursprüngliche Einnahmenzeile, Bargeld, Wallee, Bankimport, Rückerstattungsbetrag, `student_credits`, `credit_transactions`, `invoices.credit_applied_rappen`.

## 4. Betroffene Tabellen und Felder

| Objekt | Wirkung |
| --- | --- |
| `payments` | eine Zeile: Status `invoice`, `paid_at` null |
| `invoices` | `paid_amount_rappen`, `payment_status`, `status`, `paid_at` |
| `invoice_payments` | Insert `reversal`; Check um `reversal` erweitert |
| `accounting_entries` | ein Storno; Original `locked_at` |
| `accounting_journal_lines` | Soll/Haben getauscht auf das Storno kopiert |
| `appointments` | optional, nur bei `set_status` |
| `payment_receipt_resets` | neue Audittabelle, RLS an, kein Zugriff für `anon`/`authenticated` |
| `invoice_items`, Bargeld, Bankimport, Refunds | nur gelesen, als Sperre |
| `student_credits`, `credit_transactions`, `credit_applied_rappen` | nicht gelesen und nicht geschrieben |

## 5. Sicherheitsbefunde

### Hoch — keines im Berechtigungspfad

Autorisierung ist serverseitig. Erlaubte Rollen im Planer und in der Funktion: `admin`, `tenant_admin`, aktiv, nicht gelöscht, gleicher Tenant. Staff und fehlende Rolle ergeben `forbidden`, ohne RPC. Eine fremde Payment-ID im eigenen Tenant ergibt `payment_not_found`. Ein fremder Akteur ergibt `forbidden`. `authenticated` hat kein `EXECUTE`. Beleg: `authorizeReceiptReset` in `server/utils/payment-receipt-reset.ts`, der Rollenblock in `migrations/20261016_admin_reset_mistaken_receipt.sql`, Test `does not let another tenant or a staff actor change the payment`. `TESTED` und auf diesem Head `CI VERIFIED`.

`anon` und `authenticated` haben auf `payment_receipt_resets` kein Grant. Die Funktion läuft als Definer und prüft die Finanzfakten selbst, weil `service_role` RLS umgeht. Ein Datenbankfehler nach dem ersten Schreiben wirft eine Exception ohne eigenen Commit-Handler. Der Atomaritätstest erzwingt einen Fehler beim Audit-Insert und erwartet null Reversals. `TESTED`.

### Mittel — Formular verschwindet bei einem blockierten Submit

Bugbot-Thread `4294802741`, unabhängig im Code bestätigt. `canSubmit` verlangt nur zehn Zeichen Begründung. Der Commit-Endpunkt wirft bei jedem Block einen Fehler. Der Dialog setzt dann `loadError`, und dieses Element ersetzt das Formular. Die Vorschau lässt dieselben Blocker stehen. Kein Schreibzugriff, weil der RPC in diesem Pfad nicht aufgerufen wird. Vor dem Merge beheben oder bewusst akzeptieren. Kein Datenverlust.

### Mittel — neuer Schlüssel nach erfolgter Korrektur prüft Dispositionen zu früh

Bugbot-Thread `4294802755`, unabhängig bestätigt. `evaluateReceiptReset` liefert bei schon korrigierter Zahlung `blocked: false`. `receiptResetRpcArgs` ruft die Funktion trotzdem auf. Die Funktion verlangt `remain_on_invoice` und eine Termin-Disposition, bevor sie das vorhandene Reversal sucht. Der Dialog erzeugt bei jedem Öffnen einen neuen Schlüssel und füllt diese Felder nicht vor. Der zweite Aufruf scheitert, ohne ein zweites Reversal zu schreiben. Gleicher Schlüssel kehrt vorher mit dem gespeicherten Ergebnis zurück. Das ist fail-closed, aber die Vorschau sagt Erfolg. `VERIFIED IN CODE`. Der Disposable-Test deckt den SQL-Erfolgspfad mit gesetzten Dispositionen ab, nicht diesen UI-Widerspruch.

### Mittel — Idempotenzschlüssel ist nicht an die Payment-ID gebunden

Die Funktion gibt bei gleichem Tenant und gleichem Schlüssel das gespeicherte Ergebnis zurück, ohne `p_payment_id` zu vergleichen. Ein wiederverwendeter Schlüssel korrigiert die zweite Zahlung nicht und meldet den ersten Lauf. Der Dialog würfelt pro Öffnen eine UUID. `VERIFIED IN CODE`. Kein Cross-Tenant-Pfad.

### Niedrig — Vorschau sieht Bargeld ohne Tenant nicht

Der Loader filtert `cash_transactions` mit `tenant_id`. Die Funktion sperrt jedes Bargeld zur `appointment_id`, auch mit `tenant_id` null. Die Vorschau kann freigeben, die Funktion lehnt ab. Kein Teilschreiben. `VERIFIED IN CODE`. Der DB-Test deckt die Funktion ab.

## 6. Accounting und Datenintegrität

Kanonischer bezahlter Betrag: Summe der verbleibenden `payments` mit Status `completed` oder `paid`. Historien-Netto: `completed` minus `reversal`. Ein Reversal zählt nicht als erfolgreiche Zahlung. Die UI-Beschriftung ist Korrektur. `VERIFIED IN CODE` in `utils/invoice-payment-net.ts` und `InvoiceDetailModal.vue`.

Zahlungseingang kommt aus `get_payments_monthly_summary`, im Fixture nur `payment_status = completed`. Status `invoice` fällt einmal heraus. Das markierte Storno ist in Summary, Jahres-PDF und Profitabilität ausgenommen. Ein manuelles Storno ohne dieses Merkmal zählt weiter. MwSt überspringt Storno-Zeilen. Journalpaare heben sich auf. `TESTED` auf dem Wegwerfschema, einschliesslich dekodiertem PDF `CHF 279.00 / 50.00 / 229.00`. Diese Prüfung hat die Produktionsfunktion nicht neu gelesen. `NOT VERIFIED` gegen die live Produktionsdefinition am heutigen Tag. Der Fixture-Kommentar sagt, der Text sei am 2026-10-16 mit Produktion verglichen worden.

Synthetische Rechnung 46'500 mit Zahlungen 18'600, 12'400 und 15'500: nach Korrektur nur der 18'600 bleibt 27'900 bezahlt, Geschwister und Termine bleiben, bei überschrittenem Fälligkeitsdatum `overdue` / `partial`, `paid_at` leer. `TESTED`.

| Fall | Ergebnis | Evidenz |
| --- | --- | --- |
| 1. Rechnung ohne Zahlung | `payment_not_found`, kein RPC | `VERIFIED IN CODE` |
| 2. Voll bezahlt, eine Zahlung, kein Wallet-Credit | Betrag 0, Status `pending` oder `overdue`, `paid_at` leer | `VERIFIED IN CODE`. Der DB-Test deckt die Teilrechnung, nicht die Nullsumme als eigenen Fall |
| 3. Mehrere Teilzahlungen, ein Settlement | nur die gewählte Zahlung fällt weg, Geschwister bleiben | `TESTED` |
| 4. Zahlung mit verknüpfter Einnahme | eine Einnahme weniger, ein markiertes Storno, Journal netto 0 | `TESTED` |
| 5. Zahlung ohne Einnahme | Korrektur läuft, kein Storno | `VERIFIED IN CODE`. Kein eigener DB-Test |
| 6. Receipt ohne Journalzeilen | Storno entsteht, keine Journalkopie | `VERIFIED IN CODE` |
| 7. Rückerstattung oder Gutschrift | Refund und Wallee werden abgelehnt. Wallet- und Staff-POS-Guthaben nicht | Refund `TESTED`. Guthaben `VERIFIED IN CODE` als Lücke |
| 8. Bereits zurückgesetzt | gleicher Schlüssel: gespeichertes Ergebnis. Anderer Schlüssel mit Dispositionen: `already_applied`. Widerspruch bei noch `completed`: `reversal_conflict` | `TESTED` für SQL. UI-Widerspruch `VERIFIED IN CODE` |
| 9. Fehler in einem späteren Schritt | Audit-Fehler rollt Reversal, Storno und Status zurück | `TESTED` |
| 10. Gleichzeitige Korrektur und manuelles Storno | eine Reversal-Zeile, ein Storno | `TESTED` |
| 11. Fremde Tenant- oder Payment-ID | keine Änderung | `TESTED` |
| 12. Wiederholter Request nach Timeout | gleicher Schlüssel liefert das gespeicherte Ergebnis | `TESTED` |

### Blocker — Wallet- und Staff-POS-Guthaben

Schwere: hoch, Accounting.

`mark-invoice-paid` ruft bei voller Zahlung `applyInvoiceCreditOnPaid` und `applyStaffPosCreditsForPaidInvoice` auf. Ersteres schreibt `invoices.credit_applied_rappen` und eine `credit_transactions`-Zeile, wenn eine Position `credit_to_wallet` ist. Die Reset-Funktion und der Planer prüfen diese Felder nicht und schreiben sie nicht zurück. Nach der Korrektur kann die Rechnung wieder offen sein, während das Kundenguthaben aus dem irrtümlichen Vollzahlen stehen bleibt.

Minimaler Fix vor dem Merge: im Planer und in der SQL-Funktion abbrechen, wenn `credit_applied_rappen > 0`, eine lebende `credit_transactions`-Zeile mit `reference_id` der Rechnung existiert, oder die Zahlung ein Staff-POS-Guthaben ausgelöst hat. Ein echter Gegenbuchungslauf darf erst in derselben Transaktion erfolgen und braucht einen Disposable-DB-Test. Nicht nur den HTTP-Planer anpassen.

## 7. Migration und Rollback

Datei `migrations/20261016_admin_reset_mistaken_receipt.sql`. Nicht angewendet. Nicht produktionsgeprüft.

Die Migration legt `payment_receipt_resets` an, erweitert `check_payment_status` um `reversal`, erzeugt zwei partielle Unique-Indexes und ersetzt die Funktion. Grants: Audit-Tabelle `SELECT`/`INSERT` nur `service_role`; `EXECUTE` nur `service_role`. Kein Grant an `anon` oder `authenticated`. Kein `DELETE` der Zahlungszeilen.

Der Unique-Index `accounting_entries_one_live_storno` bricht die Migration ab, wenn schon zwei lebende Stornos dieselbe `storno_of_id` haben. Das ist fail-closed, muss aber vor dem Anwenden gezählt werden.

Es gibt keine Down-Migration. `DROP FUNCTION` macht eine ausgeführte Korrektur nicht rückgängig. Die Recovery im Dateikopf ist eine neue Buchung: Reversal behalten, bei einer zu Unrecht korrigierten Zahlung eine neue `completed`-Zeile anlegen, den Payment-Status zurück auf `completed` setzen, den bezahlten Betrag neu summieren, und bei gespiegelten Journalzeilen ein neues Gegenpaar buchen. Die gesperrte Originalbuchung wird nicht an Ort geändert. Diese Strategie ist dokumentiert, nicht durch einen Test ausgeführt. `NOT VERIFIED` als ausgeführter Rollback.

## 8. Testabdeckung und Grenzen

| Art | Stand |
| --- | --- |
| Planer-Unit-Tests | vorhanden, `payment-receipt-reset.test.ts` |
| PostgreSQL-Integration | 11 Tests, echte Checks, Invoice-Trigger, Buchungsfunktion, Monatsfunktion im Fixture |
| RLS / Tenant | SQL-Test für fremden Akteur, fremde Payment-ID, fehlendes `EXECUTE` |
| Parallelität | zwei Aufrufe plus manueller Storno-Insert |
| Atomarität | erzwungener Audit-Fehler |
| E2E dieser Aktion | nicht vorhanden. E2E login auf diesem Head ist grün und prüft nicht diesen Dialog |
| CI | Pflichtchecks auf `335273b9` grün, 3180 Tests |
| Staging | `NOT VERIFIED` |
| Production | `NOT VERIFIED`. Keine Produktionszeile gelesen, keine Migration angewendet |

Ein reiner Mock-Planer gilt nicht als Nachweis für Postgres. Die 11 DB-Tests tun das für den abgedeckten Pfad. Sie enthalten kein Wallet-Guthaben und kein Staff-POS-Guthaben.

## 9. Blocker und minimale Korrekturen

1. Hoch, vor dem Merge: Reset ablehnen oder in derselben Transaktion umkehren, wenn die Rechnung Wallet-Guthaben oder die Zahlung Staff-POS-Guthaben ausgelöst hat. Disposable-DB-Test mit synthetischem `credit_applied_rappen > 0` und einer `credit_transactions`-Zeile: keine Statusänderung, kein Reversal.
2. Prozess, nicht von dieser Prüfung auszuführen: Branch auf `ecf9694f` nachziehen, danach die Pflichtchecks auf dem neuen Head neu lesen. `#457` berührt diesen Diff nicht.
3. Mittel, vor dem Merge schließen oder schriftlich akzeptieren: blockierter Submit darf das Formular nicht durch `loadError` ersetzen. Ein `already_applied`-Plan darf den RPC nicht ohne die von der Funktion verlangten Dispositionen aufrufen, oder die Funktion muss die bereits korrigierte Zahlung vor diesen Prüfungen erkennen.
4. Mittel: Idempotenzschlüssel bei Wiederholung nur akzeptieren, wenn `payment_id` übereinstimmt. Sonst ein klarer Konflikt.

Kein Merge, kein Undraft, keine Migration, keine Live-Korrektur.

## 10. Nächste Prüfung

Ein späteres Gate darf PASS nur sagen, wenn alle Punkte zutreffen:

- Der Head enthält die Guthaben-Sperre oder die Gegenbuchung, und ein Disposable-DB-Test beweist, dass kein Teilschreiben bleibt.
- Die mittleren Punkte sind behoben oder vom Menschen als akzeptiert markiert.
- Der Branch ist nicht `BEHIND`, und Test and lint, E2E login und Dependency review sind auf genau diesem neuen Head grün.
- Die Migration ist weiterhin nicht auf Produktion angewendet.
- App-Store-Fails bleiben ausserhalb der Ruleset-Pflicht, solange die live Ruleset-Liste sich nicht ändert.
