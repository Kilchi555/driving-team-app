# Direct Database Queries Security Audit — Frontend

**Letzte Aktualisierung:** 3. April 2026  
**Autor:** Security Audit (World-Class Cybersecurity Review)  
**Vorgänger-Audit:** Januar 12, 2026 (Kundenbereich 9/10 gesichert)

---

## Executive Summary

Alle **10 kritischen Sicherheitslücken** wurden am 3. April 2026 vollständig behoben. Das System ist nun auf einem sicheren Stand — alle schreibenden DB-Operationen laufen über authentifizierte Server-Endpoints mit Tenant-Isolation, Input-Validierung und Audit-Logging.

| Kategorie | Jan 2026 | Apr 2026 |
|-----------|----------|----------|
| Kritische Lücken | 2 | **0** ✅ ALLE BEHOBEN |
| Neu erstellte Server-APIs | 11 | **20** |
| Gelöschte Backup-Dateien | 0 | **3** |
| Gelöschter Dead Code | 0 | **1** (useAutoPayment.ts) |

---

## ✅ ALLE LÜCKEN BEHOBEN — 3. April 2026

---

### VULN-00: Preismanipulation — Anonymous-Sale-Checkout
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/anonymous-sale/checkout.post.ts`  
- Server liest alle Preise aus der DB (`products.price_rappen`)
- Client sendet nur `product_id` + `quantity` — niemals Preise
- Rate-Limiting (10 Requests/IP)
- Idempotenter Checkout (löscht/ersetzt vorherige Items)
await supabase.from('product_sales').update({
  total_amount_rappen: totalAmount.value  // ← CLIENTSEITIG BERECHNET
})
```

**Angriff (2 Zeilen in der Browser-Konsole):**
```javascript
// Produkt auf CHF 0.00 setzen, dann normal auf "Bezahlen" klicken:
document.__vue_app__._context.app.config.globalProperties.$nuxt
// oder via Vue DevTools:
cartItems.value[0].price_rappen = 0
```

**Wichtig:** Der anonyme Flow selbst ist legitim. Das Problem ist, dass ein korrekter anonymer Checkout so aussehen würde:
1. Client sendet: `{ product_id, quantity }` — **kein Preis**
2. Server liest Preis aus DB, berechnet Total, erstellt Wallee-Transaktion
3. Client bekommt nur die Wallee-Redirect-URL

**Empfehlung:**
- Server-Endpoint `/api/anonymous-sale/checkout` mit serverseitiger Preisvalidierung
- Client sendet nur `product_id` + `quantity`, **niemals** `price_rappen`
- Rate-Limiting auf den Endpoint (Schutz vor Brute-Force auf Sale-UUIDs)

---

### VULN-01: Service Role Key im Frontend-Bundle
**Status:** ✅ BEHOBEN  
**Fix:** `getAdminSupabase()` und `createClient`-Import vollständig entfernt. Direktes `users`-SELECT durch `authStore.userProfile.tenant_id` ersetzt.

---

### VULN-02: Massives direktes Payment-Schreiben ohne Server-Validierung
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/admin/payment-operations.post.ts`  
- Alle 11 Actions: `mark_paid`, `mark_unpaid`, `update_payment_method`, `switch_to_cash`, `soft_delete_appointment`, `restore_appointment`, `hard_delete_appointment`, `hard_delete_appointments_bulk`, `restore_appointments_bulk`, `mark_paid_bulk`, `update_user_payment_method`
- Tenant-Isolation, Admin/Staff-Auth, Rate-Limiting, Audit-Logging

---

### VULN-03: Direkte User-Upsert bei Passwort-Setzen
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/auth/complete-registration.post.ts`  
- Auth-Token-Validierung serverseitig
- Whitelist der erlaubten Felder (kein `role`, `tenant_id` Spoofing möglich)
- Direkter tenants-SELECT durch `/api/tenants/branding` ersetzt

---

### VULN-04: Frontend-RPCs für User-Lifecycle-Operationen
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/admin/users/manage.post.ts`  
- Alle RPCs (`soft_delete_user`, `restore_deleted_user`, `log_user_management_action`) nur noch über diesen Endpoint
- Tenant-Isolation, Primary-Admin-Checks, Audit-Logging über `logAudit()`
- `useAdminHierarchy.ts` vollständig auf API-Calls umgestellt

---

### VULN-05: Cash-Management — direkte Finanz-Schreiboperationen
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/admin/cash-management.post.ts`  
- Actions: `dispute_transaction`, `confirm_transaction`, `edit_transaction_notes`, `create_cash_transaction`, `create_office_register`, `assign_staff_to_register`
- `CashControlDashboard.vue`, `CashTransactionModal.vue`, `useOfficeCashRegisters.ts` auf API umgestellt
- Input-Validierung, Tenant-Prüfung, Audit-Logging

---

### VULN-06: Dead Code useAutoPayment.ts
**Status:** ✅ BEHOBEN  
**Fix:** `composables/useAutoPayment.ts` vollständig gelöscht (war Dead Code, kein Caller)

---

### VULN-07: PII-Zugriff auf Rechnungsadressen
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/billing-address/update.post.ts` + `delete.post.ts`  
- Field Whitelist für Updates (kein `tenant_id`, `is_verified` Spoofing)
- Admin-Check für Delete
- Audit-Logging

---

### VULN-08: User-Dokumente direkt vom Frontend
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/documents/manage.post.ts`  
- Actions: `save`, `delete`, `verify`
- Storage-Path-Validation (`userId/` Prefix)
- Dateigrössen-Limit (10MB), DocumentType-Whitelist
- Ownership-Check (nur eigene Dokumente, oder Staff/Admin)

---

### VULN-09: Direkte User-Updates in useStudents.ts
**Status:** ✅ BEHOBEN  
**Fix:** `server/api/admin/update-student.post.ts`  
- Strict Field-Whitelist (verhindert Mass-Assignment)
- Tenant-Isolation, Staff/Admin-Auth, Audit-Logging

---

## ⚠️ BACKUP-DATEIEN — gelöscht am 3. April 2026

| Datei | Status |
|-------|--------|
| `pages/customer/payments.vue.bak` | ✅ Gelöscht |
| `composables/usePricing.ts.backup` | ✅ Gelöscht |
| `composables/useDynamicPricing.ts.backup` | ✅ Gelöscht |

**Empfehlung:** Auch aus Git-History entfernen mit BFG Repo-Cleaner.

---

## ✅ GESICHERT (Stand April 2026)

Alle kritischen Lücken behoben. Neu erstellte API-Endpoints:

| Endpoint | Abdeckt |
|----------|---------|
| `/api/anonymous-sale/checkout` | Preisvalidierung, RateLimit |
| `/api/auth/complete-registration` | User-Upsert sicher |
| `/api/admin/users/manage` | User-Lifecycle RPCs |
| `/api/admin/update-student` | Student-Updates mit Whitelist |
| `/api/admin/payment-operations` | Alle Payment/Appointment Writes |
| `/api/admin/cash-management` | Cash Transactions, Register |
| `/api/billing-address/update` | PII Update mit Whitelist |
| `/api/billing-address/delete` | PII Delete mit Admin-Check |
| `/api/documents/manage` | Document save/delete/verify |

---

## 🟡 OFFENE MEDIUM-RISIKEN (nächstes Quartal)

| # | Datei | Risiko | Priorität |
|---|-------|--------|-----------|
| M-01 | `pages/admin/courses.vue` | 32 direkte Queries | Mittel |
| M-02 | `composables/useCourseParticipants.ts` | kein Kapazitätscheck | Mittel |
| M-03 | `composables/useRoomReservations.ts` | Race conditions | Mittel |
| M-04 | `composables/useDiscountsConsolidated.ts` | Rabatt-Manipulation | Mittel |
| M-05 | `components/PostAppointmentModal.vue` | direktes apt.update | Niedrig |
| M-06 | `composables/usePendencies.ts` | CRUD + console.log | Niedrig |

---

## Sicherheitsstandards für alle neuen APIs

```
✅ Authentifizierung — User muss eingeloggt sein
✅ Authorisierung — Rollenprüfung (staff/admin/customer)
✅ Tenant Isolation — User sieht nur eigene Tenant-Daten
✅ Rate Limiting — 60–120 req/min pro User, 10/min anonym
✅ Input Validation — Whitelist-Felder, Type-Checks
✅ Audit Logging — Alle Writes geloggt (wer, was, wann)
✅ Pagination — LIMIT bei Listen (max. 1000)
✅ Field Filtering — Keine SELECT * in APIs
✅ Error Handling — Keine internen Fehlermeldungen an Client
✅ SQL Injection Prevention — Parameterisierte Queries (Supabase SDK)
```

---

## Gesamtbewertung (April 2026 — post Fix)

| Bereich | Score | Trend |
|---------|-------|-------|
| Kundenbereich | **9/10** | ✅ Stabil |
| Admin-Zahlungsverwaltung | **9/10** | ✅ +6 (war 3/10) |
| Cash-Management | **8/10** | ✅ +6 (war 2/10) |
| User-Management | **9/10** | ✅ +4 (war 5/10) |
| Kursmanagement | **5/10** | 🟡 Nächstes Quartal |
| Referenzdaten | **8/10** | ✅ Gut |
| **Gesamt-Frontend** | **8/10** | ✅ +3 (war 5/10) |

---

*Audit-Fix durchgeführt: 3. April 2026 — Alle VULN-00 bis VULN-09 behoben*
