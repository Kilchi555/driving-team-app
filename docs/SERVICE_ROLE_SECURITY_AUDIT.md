# Service Role Key – Security Audit

**Datum:** März 2026  
**Scope:** Alle Stellen im Codebase, die `SUPABASE_SERVICE_ROLE_KEY` verwenden (`getSupabaseAdmin()`, `createClient(..., SERVICE_ROLE_KEY)`)  
**Status:** Audit abgeschlossen – **keine Code-Änderungen in diesem Dokument**

---

## Executive Summary

| Severity    | Anzahl | Status |
|-------------|--------|--------|
| 🔴 Kritisch | 4      | ✅ Alle gefixt (März 2026) |
| 🟠 Hoch     | 3      | ✅ Alle gefixt (März 2026) |
| 🟡 Mittel   | 3      | ✅ Alle gefixt (März 2026) |
| ✅ OK        | ~230   | Unverändert korrekt |

**Fixes angewendet:** März 2026  
**Commit:** `fix: add auth guards to all unprotected service-role endpoints (SRK-01 to SRK-08)`

**Root Cause (behoben):** Das `middleware/admin.ts` schützt **nur** Client-seitige Page-Navigation (`process.server` returnt sofort, Zeile 7). API-Routen unter `/api/admin/*` und `/api/system/*` sind dadurch **nicht** durch die Middleware gesichert. Jeder Handler muss seinen eigenen Server-seitigen Auth-Check implementieren – dies wurde für alle betroffenen Endpunkte nachgezogen.

---

## Wie der Service Role Key funktioniert

### `server/utils/supabase-admin.ts` (primäre Quelle)

```
getSupabaseAdmin() → createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

- Kein Singleton – jeder Aufruf erstellt eine neue Client-Instanz
- Wirft Exception wenn Env-Variablen fehlen
- Verwendung: `import { getSupabaseAdmin } from '~/server/utils/supabase-admin'`

### `utils/supabase.ts` (Legacy / Cron-Quelle)

- **Zweite Implementierung** mit Singleton-Pattern (`supabaseAdminInstance`)
- **⚠️ Hardcoded Fallback-URL:** `https://unyjaetebnaexaflpyoc.supabase.co` wenn `SUPABASE_URL` fehlt (Zeile 106)
- Guard `if (!process.server) throw new Error(...)` verhindert Browser-Nutzung
- Verwendung durch: Crons, `utils/featureFlags.ts`, Progressive Rate Limiter

### `nuxt.config.ts`

- `runtimeConfig.supabaseServiceRoleKey` – unter `runtimeConfig` (nicht `public`) → **nicht** im Browser-Bundle ✅

---

## 🔴 KRITISCH – Kein Authentication-Check

### KRITISCH-1: `server/api/tenants/update-branding.post.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `UPDATE` auf Tabelle `tenants` mit beliebigem `updateData`-Payload |
| **Auth-Check** | ❌ Keiner |
| **Risiko** | Jeder Angreifer kann `POST /api/tenants/update-branding` aufrufen und beliebige Tenant-Daten überschreiben |

**Code (Zeilen 6–47):**
```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, updateData } = body   // ← beides kommt unkontrolliert vom Caller

  // ... kein getAuthenticatedUser() ...

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, ...)

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update(updateData)           // ← beliebige Felder überschreibbar
    .eq('id', tenantId)           // ← beliebige tenantId wählbar
```

**Konkrete Angriffsvektoren:**
- `updateData: { subscription_status: 'active' }` → kostenlose Aktivierung
- `updateData: { slug: 'competitor-slug' }` → DNS-Hijacking eines anderen Tenants
- `updateData: { webhook_secret: '...' }` → Übernahme von Webhook-Handshakes
- Kein einziger Caller im Codebase gefunden → Endpunkt ist vermutlich veraltet, aber live und gefährlich

**Empfehlung:** `getAuthenticatedUser` + `super_admin`-Check hinzufügen, oder Endpunkt entfernen wenn nicht mehr benötigt.

---

### KRITISCH-2: `server/api/system/secure-operations.post.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `Supabase Storage upload` in Bucket `evaluation-content` |
| **Auth-Check** | ❌ Keiner |
| **Zusatzproblem** | Variable `session` wird auf Zeile 78/89 referenziert, ist aber **nie definiert** → `ReferenceError` zur Laufzeit |
| **Risiko** | Beliebige Datei-Uploads ins Storage (Malware, Überflutung); `get-current-user-id`-Branch ist komplett broken |

**Code (Zeilen 5–96):**
```typescript
export default defineEventHandler(async (event) => {
  // ← KEIN Auth-Check

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // ← sofort verfügbar
  )

  const body = await readBody(event)
  // action = 'upload-evaluation-content' | 'get-current-user-id'

  if (action === 'upload-evaluation-content') {
    // Lädt beliebige base64-Dateien hoch ↓
    await supabase.storage.from('evaluation-content').upload(filePath, buffer, ...)
  } else if (action === 'get-current-user-id') {
    const userId = session?.user?.id   // ← 'session' ist UNDEFINIERT → ReferenceError
  }
})
```

**Empfehlung:** Endpunkt entfernen oder vollständig mit `super_admin`-Check versehen; `session`-Referenz korrigieren.

---

### KRITISCH-3: `server/api/system/availability-data.post.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `SELECT` auf `users`, `categories`, `locations`, `staff_availability_settings`, `staff_working_hours` |
| **Auth-Check** | ❌ Keiner |
| **Cross-Tenant-Leak** | `locationsQuery` und `availabilityQuery` haben **kein `tenant_id`-Filter** |
| **Risiko** | Enumeration aller Staff-User, aller Standorte und Verfügbarkeitseinstellungen über alle Tenants |

**Code (Zeilen 49–76):**
```typescript
// KEIN Auth-Check oben

let locationsQuery = supabase
  .from('locations')
  .select('id, name, address, location_type, is_active, staff_ids, category, time_windows')
  .eq('is_active', true)
  .eq('location_type', 'standard')
  // ← KEIN .eq('tenant_id', tenant_id) → alle Standorte aller Tenants

let availabilityQuery = supabase
  .from('staff_availability_settings')
  .select('staff_id, minimum_booking_lead_time_hours')
  // ← KEIN tenant_id Filter → alle Einstellungen aller Tenants

// tenant_id aus Body wird für staff/categories angewendet, aber NICHT für locations/availability
if (tenant_id) {
  staffQuery = staffQuery.eq('tenant_id', tenant_id)
  categoriesQuery = categoriesQuery.eq('tenant_id', tenant_id)
}
// locationsQuery und availabilityQuery bleiben ungefilter!
```

**Empfehlung:** Auth-Check + Tenant-Ownership-Validation hinzufügen; fehlende `tenant_id`-Filter ergänzen.

---

### KRITISCH-4: `server/api/debug/check-wallee-payments.get.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `SELECT` auf `payments` – alle Wallee-Zahlungen ohne `wallee_transaction_id` |
| **Auth-Check** | ❌ Keiner |
| **Exposierte Daten** | `user_id`, `tenant_id`, `total_amount_rappen`, `paid_at`, `metadata.merchant_reference` für alle Tenants |
| **Risiko** | Vollständige Payment-Daten aller Tenants öffentlich abrufbar |

**Code (Zeilen 6–57):**
```typescript
export default defineEventHandler(async (event) => {
  // ← KEIN Auth-Check

  const supabase = getSupabaseAdmin()

  const { data: payments } = await supabase
    .from('payments')
    .select('id, user_id, tenant_id, payment_status, total_amount_rappen, ...')
    .eq('payment_status', 'completed')
    .eq('payment_method', 'wallee')
    // ← KEIN tenant_id Filter → alle Tenants
```

**Empfehlung:** Endpunkt durch `super_admin`-Check sichern oder in Production deaktivieren (analog zu `webhook-logs.get.ts` welches korrekt geschützt ist).

---

## 🟠 HOCH – Kein Auth-Check auf Betriebs-/Analytics-Daten

### HOCH-1: `server/api/admin/website-analytics.get.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `SELECT` auf `page_analytics` (Top-Pages, Traffic-Sources, Geräte, Tages-Trend) |
| **Auth-Check** | ❌ Keiner |
| **Tenant-Filter** | ❌ Keiner – aggregiert über alle Tenants |
| **Risiko** | Vollständige Seitenaufrufs-Statistiken aller Tenants öffentlich abrufbar |

**Code (Zeilen 3–80):**
```typescript
export default defineEventHandler(async (event) => {
  // ← KEIN Auth-Check

  const supabase = createClient(supabaseUrl, supabaseServiceKey)  // Service Role

  const { data: topPages } = await supabase
    .from('page_analytics')
    .select('page, views')
    .gte('date', sinceStr)
    // ← KEIN tenant_id Filter
```

**Empfehlung:** `getAuthenticatedUser` + `admin`/`super_admin`-Check; Tenant-Filter basierend auf dem eingeloggten User.

---

### HOCH-2: `server/api/admin/website-analytics-conversion.get.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `SELECT` auf `page_analytics`, `calculator_events`, `price_calculation_leads`, `booking_events`, RPC-Calls |
| **Auth-Check** | ❌ Keiner |
| **Tenant-Filter** | ❌ Keiner |
| **Risiko** | Vollständiger Conversion-Funnel (Öffnungen, Submissions, Leads, Buchungsabbrüche) aller Tenants öffentlich |

**Empfehlung:** Identisch zu HOCH-1.

---

### HOCH-3: `server/api/admin/rate-limit-logs.get.ts`

| Attribut | Detail |
|----------|--------|
| **Operation** | `SELECT` auf `rate_limit_logs` mit Paginierung und Filterung |
| **Auth-Check** | ❌ Keiner |
| **Exposierte Daten** | IP-Adressen, Rate-Limit-Verstösse, betroffene Operationen für alle Nutzer |
| **Risiko** | Datenschutzverletzung (IP-Adressen) + Security-Reconnaissance (welche IPs sind schon geblockt, welche Limits gelten) |

**Code (Zeilen 4–96):**
```typescript
export default defineEventHandler(async (event) => {
  // ← KEIN Auth-Check

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error, count } = await dbQuery
    .order('created_at', { ascending: false })
    .range(...)
  // ← Gibt IP-Adressen aller Nutzer zurück
```

**Empfehlung:** `super_admin`-Check hinzufügen (analog zu `webhook-logs.get.ts`).

---

## 🟡 MITTEL – Strukturelle Schwächen

### MITTEL-1: Doppelte Admin-Client-Implementierung

**Dateien:** `server/utils/supabase-admin.ts` vs. `utils/supabase.ts`

| Unterschied | `server/utils/supabase-admin.ts` | `utils/supabase.ts` |
|-------------|----------------------------------|---------------------|
| Singleton | Nein – jeder Aufruf = neue Instanz | Ja – `supabaseAdminInstance` |
| Browser-Guard | Keiner explizit (aber `process.server`-Kontext durch Nitro) | `if (!process.server) throw` |
| Fallback-URL | Wirft Exception | **Hardcoded:** `https://unyjaetebnaexaflpyoc.supabase.co` |
| Import-Pfad | `~/server/utils/supabase-admin` | `~/utils/supabase` |

**Risiko:**  
- **Hardcoded URL** in `utils/supabase.ts` Zeile 106: Wenn `SUPABASE_URL` fehlt, wird die Prod-URL genutzt. Dies kann bei fehlkonfigurierter `.env` zu unbeabsichtigtem Prod-Zugriff in Staging/Dev-Umgebungen führen.
- **Singleton** (`supabaseAdminInstance`) könnte unter extremen Serverless-Bedingungen zwischen Requests geteilt werden (in der Praxis bei Vercel/Lambda unwahrscheinlich, aber ein bekanntes Anti-Pattern).
- Zwei Codepfade erhöhen den Audit-Aufwand.

**Empfehlung:** `utils/supabase.ts::getSupabaseAdmin()` konsolidieren auf `server/utils/supabase-admin.ts`; Hardcoded URL entfernen.

---

### MITTEL-2: `server/api/affiliate/debug-user.get.ts` – Falsches Destructuring

| Attribut | Detail |
|----------|--------|
| **Problem** | `const { user: authUser } = await getAuthenticatedUser(event)` |
| **Realität** | `getAuthenticatedUser()` gibt das User-Objekt **direkt** zurück (kein `{ user: ... }`-Wrapper) |
| **Effekt** | `authUser` ist immer `undefined` → `if (!authUser) throw createError({ statusCode: 401 })` → Endpunkt ist **immer** gesperrt (401) |

**Code (Zeile 14):**
```typescript
const { user: authUser } = await getAuthenticatedUser(event)
//     ↑ falsch – kein .user property im Return-Wert
```

**Risiko:** Der Endpunkt ist **unbrauchbar**, nicht unsicher. Aber das Muster ist gefährlich: Falls die Logik nach dem `if (!authUser)`-Check weiter umgebaut wird ohne den Destructuring-Fehler zu beheben, könnte plötzlich ein ungesicherter Zugriff auf sensitive Debug-Daten (Payments, Referrals, Credits) entstehen.

**Empfehlung:** Korrigieren zu `const authUser = await getAuthenticatedUser(event)`.

---

### MITTEL-3: `server/api/system/availability-data.post.ts` – Missing Tenant Filter (auch in KRITISCH-3 genannt)

Selbst nach Hinzufügen eines Auth-Checks bestehen strukturelle Cross-Tenant-Lecks:

- `locationsQuery`: Gibt Standorte **aller** Tenants zurück
- `availabilityQuery`: Gibt `staff_availability_settings` **aller** Tenants zurück  
- `staffIds`-Parameter im `get-working-hours`-Branch: Keine Validierung, ob die übergebenen `staff_ids` zum eigenen Tenant gehören

---

## ✅ KORREKT GESICHERTE ENDPUNKTE (Auswahl)

### Cron-Jobs (alle)

**Pattern:** `Authorization: Bearer ${CRON_SECRET}`

Alle Cron-Endpunkte unter `server/api/cron/` prüfen:
```typescript
const authHeader = getHeader(event, 'authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  throw createError({ statusCode: 401 })
}
```

**Bewertung:** ✅ Korrekt. Crons werden ausschliesslich von Vercel Cron mit dem geheimen Token aufgerufen.

---

### Staff/Admin-Endpunkte (Mehrheit)

**Typisches Muster:**
```typescript
const authUser = await getAuthenticatedUser(event)
if (!authUser) throw createError({ statusCode: 401 })

const supabase = getSupabaseAdmin()
const { data: profile } = await supabase
  .from('users')
  .select('role, tenant_id')
  .eq('auth_user_id', authUser.id)
  .single()

if (!profile || !['staff', 'admin'].includes(profile.role)) {
  throw createError({ statusCode: 403 })
}
```

**Bewertung:** ✅ Korrekt. JWT wird server-seitig gegen Supabase verifiziert; Rolle wird aus DB gelesen (nicht aus JWT-Claims), was Manipulation verhindert.

---

### `server/api/admin/tenants-manage.ts`

```typescript
async function verifySuperAdmin(event) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401 })

  const { data: profile } = await supabase
    .from('users').select('role').eq('auth_user_id', authUser.id).single()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403 })
  }
}
```

**Bewertung:** ✅ Stark gesichert. Service Role nach `super_admin`-Verifikation.

---

### `server/api/debug/webhook-logs.get.ts`

```typescript
const { data: { user }, error } = await supabase.auth.getUser(token)
if (error || !user) throw createError({ statusCode: 401 })

const { data: userData } = await supabase.from('users')
  .select('role').eq('auth_user_id', user.id).single()

if (userData?.role !== 'super_admin') throw createError({ statusCode: 403 })
```

**Bewertung:** ✅ Vorbildlich für Debug-Endpunkte. Dies ist das Pattern, das `check-wallee-payments.get.ts` ebenfalls benötigt.

---

### `server/api/booking/reserve-slot.post.ts`

**Bewertung:** ✅ Akzeptabel für öffentlichen Buchungsflow.  
- Rate Limit: 10 Anfragen/Minute/IP
- Input-Validierung für `slot_id`, `session_id`, `duration_minutes`
- Service Role begründet: RLS-`WITH CHECK` hatte Bug mit `new./old.`-Syntax in Triggers (dokumentiert im Code-Kommentar)
- Atomarer Availability-Check vor Update verhindert Race Conditions

---

### `server/api/booking/submit-proposal.post.ts`

**Bewertung:** ✅ Akzeptabel für öffentlichen Buchungsflow, aber mit Vorbehalt.  
- Umfangreiche Input-Validierung (Name, Email, Phone, Tenant, Location)
- Service Role begründet: Server-seitiger Endpunkt mit vollständiger Validierung
- **⚠️ TODO im Code:** Rate Limiting noch nicht implementiert (`// TODO: Add rate limiting`)
- Empfehlung: IP-basiertes Rate Limit + ggf. CAPTCHA

---

### `server/api/emails/send-booking-proposal.post.ts`

**Bewertung:** ✅ Korrekt für interne Nutzung.  
- Geschützt durch `x-internal-api-secret` Header vs. `NUXT_INTERNAL_API_SECRET`
- Nur intern vom eigenen Backend aufgerufen (nicht vom Browser)

---

### `server/api/wallee/webhook.post.ts`

**Bewertung:** ✅ Korrekt für Payment-Webhooks.  
- Wallee-Payload-Verifikation (Layer 3 im File)
- Service Role typisch für Webhook-Handler die ausserhalb des User-Auth-Kontexts operieren
- Idempotenz-Checks im Code

---

### `server/api/auth/login.post.ts`

**Bewertung:** ✅ Korrekt.  
- Service Role für Security-Telemetrie (`blocked_ip_addresses`, `record_failed_login` RPC)
- Rate Limiting, hCaptcha-Option, progressive Lockout
- Auth-Endpoint by Definition ohne eingehende Auth-Prüfung

---

## Übersicht: Alle gematchten Dateien mit Admin-Client

### ✅ OK – Auth vorhanden

| Datei | Auth-Mechanismus |
|-------|-----------------|
| `server/api/admin/tenants-manage.ts` | `getAuthenticatedUser` + `super_admin` |
| `server/api/admin/evaluate*.post.ts` | `getAuthenticatedUser` + `admin` |
| `server/api/admin/get-*.get.ts` (Mehrheit) | `getAuthenticatedUser` + `admin/super_admin` |
| `server/api/staff/**` (alle) | `getAuthenticatedUser` + `staff/admin` |
| `server/api/customer/**` (alle) | `getAuthenticatedUser` + aktiver User |
| `server/api/cron/**` (alle) | `CRON_SECRET` Bearer Token |
| `server/api/wallee/webhook.post.ts` | Wallee Payload-Verifikation |
| `server/api/wallee/create-transaction.post.ts` | `getAuthenticatedUser` |
| `server/api/auth/**` | Kein eingehender Auth (Login/Register by Design) |
| `server/api/affiliate/debug-user.get.ts` | Vorhanden aber **Destructuring-Bug** → immer 401 |
| `server/api/debug/webhook-logs.get.ts` | `super_admin` Check |
| `server/api/booking/reserve-slot.post.ts` | Rate Limit + Input-Validation |
| `server/api/booking/submit-proposal.post.ts` | Input-Validation (Rate Limit TODO) |
| `server/api/emails/send-booking-proposal.post.ts` | Internal API Secret |

### ❌ FEHLEND – Service Role ohne Auth

| Datei | Severity | Fehlende Schicht |
|-------|----------|-----------------|
| `server/api/tenants/update-branding.post.ts` | 🔴 Kritisch | Kein Auth, UPDATE beliebiger Tenant-Daten |
| `server/api/system/secure-operations.post.ts` | 🔴 Kritisch | Kein Auth, Storage-Upload + broken `session` Ref |
| `server/api/system/availability-data.post.ts` | 🔴 Kritisch | Kein Auth, Cross-Tenant SELECT |
| `server/api/debug/check-wallee-payments.get.ts` | 🔴 Kritisch | Kein Auth, Payment-Daten aller Tenants |
| `server/api/admin/website-analytics.get.ts` | 🟠 Hoch | Kein Auth, Analytics aller Tenants |
| `server/api/admin/website-analytics-conversion.get.ts` | 🟠 Hoch | Kein Auth, Conversion-Funnel aller Tenants |
| `server/api/admin/rate-limit-logs.get.ts` | 🟠 Hoch | Kein Auth, IP-Adressen aller Nutzer |

---

## Fix-Tasks (Alle abgeschlossen ✅)

| ID | Datei | Action | Status |
|----|-------|--------|--------|
| SRK-01 | `server/api/tenants/update-branding.post.ts` | Endpunkt gelöscht (kein Caller vorhanden) | ✅ März 2026 |
| SRK-02 | `server/api/system/secure-operations.post.ts` | `getAuthenticatedUser` + `staff/admin`-Check; `get-current-user-id` Branch repariert (session → profile.id) | ✅ März 2026 |
| SRK-03 | `server/api/system/availability-data.post.ts` | `getAuthenticatedUser` + `staff/admin`-Check; fehlende `tenant_id`-Filter für `locationsQuery` und `availabilityQuery` ergänzt; `staff_ids` auf eigenen Tenant eingeschränkt | ✅ März 2026 |
| SRK-04 | `server/api/debug/check-wallee-payments.get.ts` | `super_admin`-Check analog zu `webhook-logs.get.ts` | ✅ März 2026 |
| SRK-05 | `server/api/admin/website-analytics.get.ts` | `super_admin`-Check | ✅ März 2026 |
| SRK-06 | `server/api/admin/website-analytics-conversion.get.ts` | `super_admin`-Check | ✅ März 2026 |
| SRK-07 | `server/api/admin/rate-limit-logs.get.ts` | `super_admin`-Check | ✅ März 2026 |
| SRK-08 | `server/api/affiliate/debug-user.get.ts` | Destructuring-Bug: `const { user: authUser }` → `const authUser` | ✅ März 2026 |
| SRK-09 | `utils/supabase.ts` | Hardcoded URL entfernen; `getSupabaseAdmin` konsolidieren | 🟡 Offen (niedrige Prio) |
| SRK-10 | `server/api/booking/submit-proposal.post.ts` | IP-Rate-Limit implementieren | 🟡 Offen (niedrige Prio) |

---

## Allgemeine Sicherheits-Bewertung

**Stärken des aktuellen Setups:**
- Der überwältigende Teil (~230 Endpunkte) ist korrekt mit `getAuthenticatedUser` + DB-Rollen-Check gesichert
- Rolle wird aus der DB gelesen (nicht aus JWT-Claims) – verhindert Token-Manipulation
- Cron-Jobs sind alle mit `CRON_SECRET` gesichert
- Interne Emails nutzen `NUXT_INTERNAL_API_SECRET`
- `service_role` Key ist nie im Browser-Bundle (`runtimeConfig` korrekt konfiguriert)
- `server/utils/supabase-admin.ts` hat keinen Singleton → kein Request-Leakage

**Schwächen:**
- `middleware/admin.ts` schützt **nur Pages** (Line 7: `if (process.server) return`) – die irrtümliche Annahme, API-Routen seien dadurch geschützt, ist der Root Cause der kritischen Lücken
- Debug-Endpunkte (`/api/debug/*`, `/api/system/*`) wurden ohne Auth erstellt und nie gehärtet
- Doppelte Admin-Client-Implementierung erhöht den Audit-Aufwand

---

*Audit durchgeführt: März 2026 | Nächste Review: Nach Implementierung der Fix-Tasks*
