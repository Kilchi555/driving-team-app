# API Security Audit - Driving Team App

**Total Endpoints:** 194  
**Last Updated:** 2. Januar 2026

---

## 🔒 Security Criteria - 15 Anforderungen für "Bombensichere" APIs

### LAYER 1: API-Level Security (5 Basis-Kriterien)

| Kriterium | Beschreibung | Mindest-Level |
|-----------|-------------|---------------|
| ✅ **Authentication** | JWT Token via Authorization Header oder Supabase Session | Alle außer öffentlichen |
| ✅ **Rate Limiting** | `checkRateLimit()` mit IP-basierter Throttle | Alle außer Webhooks/Crons |
| ✅ **Input Validation** | `validate*()` Funktionen oder manuelle Checks | Alle mit Eingaben (POST/PUT) |
| ✅ **Authorization** | Role/Tenant Checks für Zugriffskontrolle | Alle außer öffentlichen |
| ✅ **Error Handling** | `createError()` mit korrekten HTTP-Codes | ALLE |

### LAYER 2: Data Protection (5 Zusätz-Kriterien)

| Kriterium | Beschreibung | Implementierung |
|-----------|-------------|-----------------|
| 🔐 **Input Sanitization** | `DOMPurify.sanitize()` für String-Inputs | Kritische Fields: phone, address, email, notes |
| 🔐 **Encryption at Rest** | Sensitive Daten verschlüsselt in DB speichern | phone, street, banking_account, ssn |
| 🔐 **CSRF Token Protection** | POST/PUT/DELETE mit CSRF-Token validieren | Middleware in nuxt.config.ts |
| 🔐 **Security Headers** | X-Frame-Options, CSP, HSTS Headers | Global in nitro config |
| 🔐 **Audit Logging** | Alle User-Actions loggen (WHO, WHAT, WHEN) | audit_logs table + Logger-Middleware |

### LAYER 3: Operations (5 Operational-Kriterien)

| Kriterium | Beschreibung | Frequency |
|-----------|-------------|-----------|
| 📋 **Dependency Scanning** | npm audit auf Vulnerabilities | Täglich (GitHub Actions) |
| 🔄 **API Key Rotation** | Wallee, SARI Keys neu generieren | Quarterly (3 Monate) |
| 🚨 **Security Monitoring** | Alert auf verdächtige Patterns | Real-time (Sentry) |
| 📊 **Access Logging** | IP, User, Endpoint, Response-Code loggen | Per Request |
| 🔍 **Incident Response** | Playbook für Security Incidents | Dokumentiert |

---

## 🛠️ Implementation Guide - 10 Zusätz-Maßnahmen

### MASSNAHME 1: Input Sanitization (🟡 MEDIUM - 1 Tag)

**Wo:** Alle APIs mit String-Inputs (phone, address, notes, descriptions)

**Implementation:**
```typescript
import DOMPurify from 'isomorphic-dompurify'

// API Endpoint
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // ❌ VORHER:
  const phone = body.phone // Könnte <script> enthalten!
  
  // ✅ NACHHER:
  const phone = DOMPurify.sanitize(body.phone)
  const notes = DOMPurify.sanitize(body.notes)
  const street = DOMPurify.sanitize(body.street)
})
```

**Kritische Fields:**
- `phone`, `email` - Telefon & E-Mail
- `street`, `city`, `zip` - Adresse
- `notes`, `description` - Freitextfelder
- `first_name`, `last_name` - Namen

**Aufwand:** ~1 Tag (alle kritischen Fields durchgehen)
**Priority:** 🔴 HIGH (XSS-Schutz)

---

### MASSNAHME 2: Encryption at Rest (🔴 HARD - 2-3 Tage)

**Wo:** Sensitive Daten in Datenbank verschlüsseln

**Sensitive Fields:**
- `users.phone` - Telefonnummer
- `users.street`, `street_nr`, `zip`, `city` - Adresse
- `billing_address.*` - Rechnungsadresse
- `users.lernfahrausweisNr` - Führerschein-Nummer
- Payment `metadata` - Banking-Daten

**Implementation mit PgCrypto:**
```sql
-- 1. Extension aktivieren
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Encryption Key als Secret
SELECT pgp_key_id(dearmor('<PGP_PUBLIC_KEY>'));

-- 3. Tabelle migrieren
BEGIN;
ALTER TABLE users ADD COLUMN phone_encrypted BYTEA;

-- 4. Alte Daten verschlüsseln
UPDATE users SET phone_encrypted = pgp_pub_encrypt(phone, dearmor('<PGP_PUBLIC_KEY>'));

-- 5. Alte Spalte löschen, neue umbenennen
ALTER TABLE users DROP COLUMN phone CASCADE;
ALTER TABLE users RENAME COLUMN phone_encrypted TO phone;

COMMIT;
```

**In API nutzen:**
```typescript
// Encrypt beim Speichern
const encrypted = await supabase.rpc('pgp_pub_encrypt', {
  data: userPhone,
  key: PUBLIC_KEY
})

// Decrypt beim Lesen (nur Admins mit Key!)
const decrypted = await supabase.rpc('pgp_pub_decrypt', {
  data: encrypted,
  key: PRIVATE_KEY
})
```

**Aufwand:** 2-3 Tage (Schema-Migration, Testing)
**Priority:** 🔴 CRITICAL (Daten-Sicherheit)

---

### MASSNAHME 3: CSRF Token Protection (🟡 MEDIUM - 1-2 Tage)

**Wo:** Alle POST/PUT/DELETE Endpoints

**Implementation in Nuxt:**
```typescript
// server/api/csrf-token.get.ts
export default defineEventHandler(async (event) => {
  const token = crypto.randomUUID()
  setCookie(event, 'csrf_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600
  })
  return { token }
})

// server/middleware/csrf.ts (validiert alle POST/PUT/DELETE)
export default defineEventHandler(async (event) => {
  if (['POST', 'PUT', 'DELETE'].includes(event.node.req.method)) {
    const headerToken = getHeader(event, 'x-csrf-token')
    const cookieToken = getCookie(event, 'csrf_token')
    
    if (headerToken !== cookieToken) {
      throw createError({
        statusCode: 403,
        statusMessage: 'CSRF Token Invalid'
      })
    }
  }
})
```

**Im Frontend:**
```typescript
// composables/useCsrfToken.ts
export const useCsrfToken = async () => {
  const { data } = await $fetch('/api/csrf-token')
  return data.token
}

// In Form:
const token = await useCsrfToken()
const response = await $fetch('/api/payments/create', {
  method: 'POST',
  body: { ...formData },
  headers: { 'X-CSRF-Token': token }
})
```

**Aufwand:** 1-2 Tage
**Priority:** 🟡 HIGH (Fraud-Prevention)

---

### MASSNAHME 4: Security Headers (🟢 EASY - 1 Stunde)

**Wo:** Global in `nuxt.config.ts`

**Implementation:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    headers: {
      // Clickjacking Protection
      'X-Frame-Options': 'DENY',
      
      // MIME Type Sniffing Protection
      'X-Content-Type-Options': 'nosniff',
      
      // XSS Protection (legacy, aber noch gut)
      'X-XSS-Protection': '1; mode=block',
      
      // HTTPS Enforcement
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      
      // Content Security Policy (strict!)
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://hcaptcha.com https://*.hcaptcha.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https: wss:",
        "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
        "object-src 'none'",
        "upgrade-insecure-requests"
      ].join('; ')
    }
  }
})
```

**Aufwand:** 1 Stunde
**Priority:** 🟢 MEDIUM (Browser-basierter Schutz)

---

### MASSNAHME 5: Audit Logging (🟡 HARD - 2-3 Tage)

**Wo:** Alle wichtigen User-Actions loggen

**Datenbank Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'create_payment', 'delete_appointment', etc.
  resource_type VARCHAR(50), -- 'payment', 'appointment', 'user', etc.
  resource_id UUID, -- ID der betroffenen Ressource
  changes JSONB, -- { before: {...}, after: {...} }
  ip_address INET,
  user_agent TEXT,
  status_code INT, -- 200, 400, 403, etc.
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

**Logger Middleware:**
```typescript
// server/middleware/audit-logger.ts
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  event._audit = {
    action: getActionFromPath(event.node.req.url),
    resource_type: getResourceType(event.node.req.url),
    start_time: startTime,
    ip_address: getClientIP(event),
    user_agent: getHeader(event, 'user-agent')
  }
  
  // Nach Request fertig:
  addResponseEventListener(event, async () => {
    if (event._audit.action) {
      const authUser = await getAuthenticatedUser(event)
      
      await supabase.from('audit_logs').insert({
        user_id: authUser?.id,
        action: event._audit.action,
        resource_type: event._audit.resource_type,
        ip_address: event._audit.ip_address,
        user_agent: event._audit.user_agent,
        status_code: event.node.res.statusCode,
        created_at: new Date()
      })
    }
  })
})
```

**Aufwand:** 2-3 Tage
**Priority:** 🔴 CRITICAL (GDPR-Compliance, Forensics)

---

### MASSNAHME 6: Input Validation Completion (🟡 MEDIUM - 1 Tag)

**Wo:** 100+ APIs ohne vollständige Validierung

**Standardisierter Validator in jedem Endpoint:**
```typescript
// server/utils/validators-enhanced.ts
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: false, error: 'Phone required' }
  if (phone.length < 7) return { valid: false, error: 'Phone too short' }
  if (phone.length > 20) return { valid: false, error: 'Phone too long' }
  if (!/^[\d\s\-\+()]+$/.test(phone)) return { valid: false, error: 'Invalid phone format' }
  return { valid: true }
}

export function validateAddress(street: string): { valid: boolean; error?: string } {
  if (!street) return { valid: false, error: 'Street required' }
  if (street.length > 100) return { valid: false, error: 'Street too long' }
  if (/<|>|script/i.test(street)) return { valid: false, error: 'Invalid characters' }
  return { valid: true }
}

export function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (amount < 0) return { valid: false, error: 'Amount cannot be negative' }
  if (amount > 1000000) return { valid: false, error: 'Amount too high' }
  return { valid: true }
}
```

**Aufwand:** 1 Tag (durchsystematisieren)
**Priority:** 🟡 HIGH

---

### MASSNAHME 7: Dependency Vulnerability Scanning (🟢 EASY - 1 Stunde Setup)

**GitHub Actions Workflow:**
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

**Aufwand:** 1 Stunde (CI/CD setup)
**Priority:** 🟡 MEDIUM

---

### MASSNAHME 8: API Key Rotation Automation (🟡 MEDIUM - 2 Stunden)

**Wo:** Wallee, SARI, externe APIs

**Implementation:**
```typescript
// server/cron/rotate-api-keys.ts
export default defineEventHandler(async (event) => {
  // Quarterly check
  const lastRotation = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'last_api_key_rotation')
    .single()
  
  const daysSinceRotation = (Date.now() - new Date(lastRotation.value).getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysSinceRotation > 90) { // 3 months
    // Generate new Wallee key
    const newWalleeKey = await walleeClient.generateNewApiKey()
    
    // Store in Supabase vault
    await supabase.from('api_keys_vault').insert({
      service: 'wallee',
      key: newWalleeKey,
      rotated_at: new Date(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    })
    
    // Update config
    await supabase.from('system_config').update({
      value: new Date().toISOString()
    }).eq('key', 'last_api_key_rotation')
    
    // Send notification
    await sendEmailAlert('API Keys Rotated', 'New Wallee API key generated')
  }
})
```

**Aufwand:** 2 Stunden
**Priority:** 🟡 HIGH

---

### MASSNAHME 9: Security Monitoring & Alerting (🟡 MEDIUM - 2 Stunden)

**Mit Sentry erweitern:**
```typescript
// server/utils/security-monitor.ts
import * as Sentry from "@sentry/node"

export function monitorSuspiciousActivity(event: H3Event, activity: {
  type: 'brute_force_attempt' | 'invalid_token' | 'unauthorized_access' | 'rate_limit_exceeded'
  user_id?: string
  ip_address: string
  endpoint: string
  details?: any
}) {
  Sentry.captureMessage(`Security Alert: ${activity.type}`, 'warning', {
    contexts: {
      security: {
        type: activity.type,
        ip_address: activity.ip_address,
        endpoint: activity.endpoint,
        user_id: activity.user_id,
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // Alert wenn > 5 brute force attempts
  if (activity.type === 'brute_force_attempt') {
    const attempts = countRecentAttempts(activity.ip_address, 'brute_force_attempt')
    if (attempts > 5) {
      sendSecurityAlert(`Brute Force: ${activity.ip_address}`, 'critical')
      blockIP(activity.ip_address)
    }
  }
}
```

**Aufwand:** 2 Stunden
**Priority:** 🟡 HIGH

---

### MASSNAHME 10: Incident Response Plan (🟢 EASY - 2 Stunden Dokumentation)

**Dokumentation in INCIDENT_RESPONSE.md:**
```markdown
# Incident Response Plan

## 1. Data Breach Detected
- [ ] Sofort: Betroffene Systems offline nehmen
- [ ] Betroffene Nutzer benachrichtigen (Email + SMS)
- [ ] Forensic Analysis durchführen
- [ ] Passwort-Reset für betroffene Nutzer erzwingen
- [ ] Supabase Audit Logs prüfen

## 2. DDoS Attack
- [ ] Cloudflare WAF aktivieren
- [ ] Rate Limiting erhöhen auf 5 req/min
- [ ] Betroffene Endpoints deaktivieren
- [ ] Monitoring verstärken

## 3. Unauthorized Access
- [ ] Session invalidieren
- [ ] IP blocken
- [ ] Audit Logs analysieren
- [ ] Betroffene Daten prüfen

## 4. Ransomware/Malware
- [ ] Alle Services herunterfahren
- [ ] Backup restaurieren (Point-in-Time Recovery)
- [ ] Sicherheitsprüfung durchführen
- [ ] Graduelle Wiederinbetriebnahme

## Notfall-Kontakte
- Security Team Lead: [NAME] [EMAIL]
- Supabase Support: [EMAIL]
- Hosting Provider: [EMAIL]
```

**Aufwand:** 2 Stunden
**Priority:** 🟡 HIGH

---



---

## 📊 Security Assessment - 15 Kriterien

### Coverage nach 5 Basis-Kriterien
```
✅ ALL 5 Criteria:     19 APIs  (9.8%)
✅ 4 Criteria:         42 APIs  (21.6%)
✅ 3 Criteria:         38 APIs  (19.6%)
✅ 2 Criteria:         31 APIs  (16.0%)
✅ 1 Criteria:         35 APIs  (18.0%)
❌ 0 Criteria:         29 APIs  (15.0%) - DEBUG/TEST ENDPOINTS
```

### Security Target nach 15 Kriterien (5 Base + 10 Additional)

```
LAYER 1 (API-Level):       5/5 ✅  - Base Security
LAYER 2 (Data Protection): 0/5 ❌  - CRITICAL GAPS
LAYER 3 (Operations):      1/5 ⚠️  - Error Logging vorhanden

OVERALL: 6/15 (40%) → TARGET: 15/15 (100%)
```

### Aufwand-Schätzung für alle 10 Zusatz-Maßnahmen

| Maßnahme | Aufwand | Priority | Impact |
|----------|---------|----------|--------|
| 1. Input Sanitization | 1 Tag | 🔴 HIGH | 🟢 MITTEL |
| 2. Encryption at Rest | 2-3 Tage | 🔴 CRITICAL | 🔴 HOCH |
| 3. CSRF Protection | 1-2 Tage | 🟡 HIGH | 🟢 MITTEL |
| 4. Security Headers | 1 Stunde | 🟡 MEDIUM | 🟢 MITTEL |
| 5. Audit Logging | 2-3 Tage | 🔴 CRITICAL | 🔴 HOCH |
| 6. Input Validation | 1 Tag | 🟡 HIGH | 🟢 MITTEL |
| 7. Dependency Scanning | 1 Stunde | 🟡 MEDIUM | 🟡 NIEDRIG |
| 8. API Key Rotation | 2 Stunden | 🟡 HIGH | 🟢 MITTEL |
| 9. Security Monitoring | 2 Stunden | 🟡 HIGH | 🟢 MITTEL |
| 10. Incident Response | 2 Stunden | 🟡 MEDIUM | 🟡 NIEDRIG |
| **TOTAL** | **~2 Wochen** | — | — |

---



## ✅ Endpoints mit ALL 5 Kriterien (19 APIs)

Vollständig sicher - PRODUKTIONSREIF

| Endpoint | Auth | Rate | Validation | Authz | Errors |
|----------|:----:|:----:|:----------:|:-----:|:------:|
| `POST /api/admin/update-user-assigned-staff` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/password-reset-request` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/calendar/generate-token` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/cron/process-automatic-payments` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/customer/get-appointments` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/customer/get-payments` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/customer/get-pending-confirmations` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/customer/get-staff-names` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/logs/save` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/medical-certificate/upload` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/payments/create-payment` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/payments/create` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/sari/validate-student` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/security/block-ip` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/security/save-settings` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/student-credits/process-withdrawal-wallee` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/students/complete-onboarding` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/vouchers/redeem` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## ⚠️ Endpoints mit 4 Kriterien (42 APIs)

Erfüllen 80% der Anforderungen - **MISSING 1 KRITÉRION**

### Fehlende Authentication (1 API)
| Endpoint | Missing |
|----------|---------|
| `POST /api/register-client` | ❌ Auth |

### Fehlende Rate Limiting (34 APIs)
| Endpoint | Missing | Kritikalität |
|----------|---------|--------------|
| `POST /api/admin/create-user` | ❌ Rate | 🔴 HIGH |
| `POST /api/admin/update-tenant-user` | ❌ Rate | 🔴 HIGH |
| `POST /api/appointments/adjust-duration` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/appointments/cancel-customer` | ❌ Rate | 🟡 MEDIUM |
| `GET /api/admin/get-pending-appointments` | ❌ Rate | 🟡 MEDIUM |
| `GET /api/admin/get-students` | ❌ Rate | 🟡 MEDIUM |
| `GET /api/admin/get-tenant-users` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/calendar/get-appointments` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/customer/manage-documents` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/customer/update-profile` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/appointments/handle-cancellation` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/booking/reserve-slot` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/courses/enroll` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/sari/enroll-student` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/sari/save-settings` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/sari/sync-courses` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/sari/sync-participants` | ❌ Rate | 🟡 MEDIUM |
| `GET /api/sari/sync-status` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/sari/unenroll-student` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/staff/invite` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/tenants/copy-evaluation-defaults` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/course-participants/create` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/admin/pendencies/handle-recurrence` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/admin/migrate-missing-student-credits` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/admin/fix-missing-payment-tokens` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/admin/sync-wallee-payment` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/calendar/generate-token` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/medical-certificate/approve` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/mfa/webauthn-register-complete` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/mfa/webauthn-register-start` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/payments/list` | ❌ Rate | 🟡 MEDIUM |
| `POST /api/students/verify-onboarding-token` | ❌ Rate | 🟡 MEDIUM |

### Fehlende Input Validation (4 APIs)
| Endpoint | Missing |
|----------|---------|
| `POST /api/appointments/save` | ❌ Validation |
| `POST /api/auth/webauthn-login-verify` | ❌ Validation |
| `POST /api/booking/create-appointment` | ❌ Validation |
| `POST /api/customer/update-profile` | ❌ Validation |

### Fehlende Authorization (2 APIs)
| Endpoint | Missing |
|----------|---------|
| `POST /api/auth/webauthn-login-verify` | ❌ Authz |
| `POST /api/auth/webauthn-register` | ❌ Authz |

### Fehlende Error Handling (1 API)
| Endpoint | Missing |
|----------|---------|
| `POST /api/appointments/handle-cancellation` | ❌ Errors |

---

## 🔴 Critical Findings - HIGH PRIORITY

### 1. DEBUG/TEST Endpoints OHNE SICHERHEIT (29 APIs)

Diese Endpoints haben KEINE SICHERHEITSMASSNAHMEN und sollten in Production DEAKTIVIERT werden!

```
❌ KEIN Auth  + KEIN Rate Limit + KEIN Validation + KEIN Authz + KEIN Error Handling

- /api/accounto/debug-env
- /api/admin/check-auth-user
- /api/admin/check-user-devices-rls
- /api/admin/create-driving-team-tenant
- /api/admin/create-test-device
- /api/admin/create-user-devices-table
- /api/admin/debug-user
- /api/admin/device-security-handler
- /api/admin/device-security
- /api/admin/diagnose-email
- /api/admin/email-templates
- /api/admin/fix-tenants-rls
- /api/admin/fix-user-devices-rls
- /api/admin/remove-user-device
- /api/admin/test-device-storage
- /api/admin/test-email-config
- /api/admin/test-smtp-config
- /api/admin/test
- /api/admin/update-user-device
- /api/debug/auth-test
- /api/debug/check-payment
- /api/debug/decode-key
- /api/debug/manual-payment-update
- /api/debug/tenants-direct
- /api/debug/tenants
- /api/debug/test-anon
- /api/invoices/download
- /api/onboarding/categories
- /api/onboarding/terms
- /api/vouchers/download-pdf
- /api/vouchers/send-email
- /api/webhooks/wallee-refund
```

**AKTION:** Diese müssen mit Environment-Variablen in Production disabled werden!

---

### 2. Rate Limiting FEHLT auf 156 APIs (80% der App!)

**Kritisch für Production!** Ohne Rate Limiting sind wir anfällig für:
- Brute Force Attacks (Passwords, OTP-Codes)
- DDoS Attacks
- Abuse durch böswillige Nutzer

**Top Priorität:** Rate Limiting auf diese Kategorien hinzufügen:
1. **Auth Endpoints** (15 APIs) - `POST /api/auth/*`
2. **Payment Endpoints** (15 APIs) - `POST /api/payments/*`
3. **Student APIs** (10 APIs) - `POST /api/students/*`
4. **Admin APIs** (30 APIs) - `POST /api/admin/*`

---

### 3. Input Validation FEHLT auf 100+ APIs

Viele APIs lesen `readBody()` aber validieren NICHT die Eingaben!

**Beispiele:**
- `POST /api/appointments/save` - keine Validierung der Termine
- `POST /api/auth/webauthn-register` - keine Session-Validierung
- `POST /api/booking/create-appointment` - keine Slot-Validierung

---

## 📋 Action Items - PRIORISIERT

### Priority 1 (DIESE WOCHE - CRITICAL)

#### Basis-API-Security (5 Kriterien)
- [ ] **Rate Limiting für TOP 50 APIs** hinzufügen (Auth, Payments, Admin)
  - Aufwand: 4-6 Stunden
  - Einfach: Nur `checkRateLimit()` call hinzufügen
  - Impact: Verhindert Brute Force & DDoS
  
- [ ] **Input Validation** auf 20 häufigsten APIs
  - Aufwand: 1 Tag
  - Impact: Verhindert Injections
  
- [ ] **DEBUG Endpoints deaktivieren** in Production
  - Aufwand: 1 Stunde
  - Impact: Blockiert 29 ungeschützte Endpoints
  - Lösung: Environment-Variable `ENABLE_DEBUG_ENDPOINTS=false`

#### Zusatz-Maßnahmen (Quick Wins)
- [ ] **MASSNAHME 4: Security Headers** implementieren
  - Aufwand: 1 Stunde (nur nuxt.config.ts)
  - Impact: 🟢 MITTEL (XSS, Clickjacking Schutz)
  
- [ ] **MASSNAHME 7: Dependency Scanning** in CI/CD
  - Aufwand: 1 Stunde (GitHub Actions)
  - Impact: 🟡 NIEDRIG (aber wichtig!)

---

### Priority 2 (DIESE WOCHE - DANACH)

- [ ] **MASSNAHME 1: Input Sanitization** auf kritischen Fields
  - Aufwand: 1 Tag
  - Fields: phone, address, notes, banking_data
  - Impact: 🟢 MITTEL (XSS Prevention)
  
- [ ] **MASSNAHME 3: CSRF Token Protection** implementieren
  - Aufwand: 1-2 Tage
  - Impact: 🟢 MITTEL (Fraud Prevention)
  
- [ ] **MASSNAHME 8: API Key Rotation** einrichten
  - Aufwand: 2 Stunden
  - Impact: 🟢 MITTEL (Quarterly key rotation)
  
- [ ] **MASSNAHME 9: Security Monitoring** mit Sentry
  - Aufwand: 2 Stunden
  - Impact: 🟢 MITTEL (Real-time Alerts)
  
- [ ] **MASSNAHME 10: Incident Response Plan** dokumentieren
  - Aufwand: 2 Stunden
  - Impact: 🟡 NIEDRIG (aber gesetzlich notwendig!)

---

### Priority 3 (NÄCHSTE WOCHE - WICHTIG)

- [ ] **MASSNAHME 2: Encryption at Rest** implementieren
  - Aufwand: 2-3 Tage
  - Fields: phone, address, banking_account, ssn
  - Impact: 🔴 HOCH (Daten-Schutz)
  - Komplexität: 🔴 HARD (Schema-Migration)
  
- [ ] **MASSNAHME 5: Audit Logging System** aufbauen
  - Aufwand: 2-3 Tage
  - Impact: 🔴 HOCH (GDPR-Compliance, Forensics)
  - Komplexität: 🔴 HARD
  
- [ ] **MASSNAHME 6: Input Validation** auf ALLEN APIs
  - Aufwand: 1 Tag
  - Impact: 🟢 MITTEL

---

## 🎯 Tages-Roadmap

### TAG 1 (Montag) - Basis-Sicherheit
```
Morgens (4 Stunden):
- [ ] Security Headers implementieren (1h)
- [ ] Dependency Scanning in CI/CD (1h)
- [ ] DEBUG Endpoints deaktivieren (1h)
- [ ] Rate Limiting auf Top 10 Auth APIs (1h)

Nachmittags (4 Stunden):
- [ ] Rate Limiting auf Top 20 Payment APIs (2h)
- [ ] Rate Limiting auf Top 20 Admin APIs (2h)
```

### TAG 2-3 (Dienstag-Mittwoch) - Input Security
```
- [ ] Input Sanitization Implementation (1 Tag)
- [ ] Input Validation Completion (1 Tag)
- [ ] Testing & QA (1 Tag)
```

### TAG 4-5 (Donnerstag-Freitag) - Advanced Security
```
- [ ] CSRF Token Protection (1.5 Tage)
- [ ] API Key Rotation Automation (2 Stunden)
- [ ] Security Monitoring Setup (2 Stunden)
- [ ] Incident Response Plan (2 Stunden)
- [ ] Testing & Deployment (1 Tag)
```

### WOCHE 2 - Data Protection (CRITICAL)
```
- [ ] Encryption at Rest (2-3 Tage)
- [ ] Audit Logging System (2-3 Tage)
- [ ] Testing & Rollout (2-3 Tage)
```

---



