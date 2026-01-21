# Secure API Migration Plan
## Customer-Bereich: Direct DB → Secure APIs

**Erstellt:** 21. Januar 2026
**Status:** In Progress
**Ziel:** Alle direkten Supabase-Queries durch sichere Server-APIs ersetzen

---

## 🎯 Sicherheitsziele

Diese Migration schützt gegen:
1. **SQL Injection** - Server-side Prepared Statements
2. **Broken Access Control** - Tenant-Isolation in jeder API
3. **Data Exposure** - Nur benötigte Felder zurückgeben
4. **Rate Limiting Bypass** - Server-enforced Limits
5. **IDOR (Insecure Direct Object Reference)** - User-ID aus Token, nicht Request
6. **Mass Assignment** - Whitelist erlaubter Felder
7. **Enumeration Attacks** - Keine direkten DB-Fehler an Client

---

## 📊 Übersicht

| Kategorie | Anzahl Queries | HIGH Risk | MEDIUM Risk | LOW Risk |
|-----------|---------------|-----------|-------------|----------|
| Pages | 7 | 3 | 3 | 1 |
| Components | 7 | 4 | 1 | 2 |
| **Total** | **14** | **7** | **4** | **3** |

---

## 🔴 HIGH PRIORITY (7 APIs) - Woche 1

### 1. ✅ `/api/customer/get-user-profile` (BEREITS ERSTELLT)
- **Ersetzt:** `users` SELECT in `CustomerDashboard.vue`, `payments.vue`
- **Schutz:** Auth required, Tenant-Isolation, Rate-Limit

### 2. ✅ `/api/customer/get-locations` (BEREITS ERSTELLT)  
- **Ersetzt:** `locations` SELECT in `CustomerDashboard.vue`
- **Schutz:** Auth required, Tenant-Filter

### 3. ✅ `/api/customer/get-evaluation-criteria` (BEREITS ERSTELLT)
- **Ersetzt:** `evaluation_criteria` SELECT in `CustomerDashboard.vue`
- **Schutz:** Auth required, Tenant-Filter

### 4. 🔲 `/api/customer/enroll-course`
- **Ersetzt:** `course_enrollments` INSERT in `courses/index.vue`
- **Schutz:** 
  - Auth required
  - Validate course exists & has capacity
  - Validate user not already enrolled
  - Tenant-Isolation
  - Rate-Limit (5/min)

### 5. 🔲 `/api/customer/upload-document`
- **Ersetzt:** `user-documents` UPLOAD in `ProfileModal.vue`, `CustomerMedicalCertificateModal.vue`
- **Schutz:**
  - Auth required
  - File type validation (PDF, JPG, PNG only)
  - File size limit (5MB)
  - Virus scan (optional)
  - Secure filename generation
  - Tenant-isolated storage path

### 6. 🔲 `/api/customer/update-medical-certificate`
- **Ersetzt:** `appointments` UPDATE in `CustomerMedicalCertificateModal.vue`
- **Schutz:**
  - Auth required
  - Verify appointment belongs to user
  - Whitelist allowed fields
  - Audit log

### 7. 🔲 `/api/customer/update-course-participants`
- **Ersetzt:** `courses` UPDATE in `courses/index.vue`
- **Schutz:**
  - Should NOT be callable by customer!
  - Move to admin-only or remove

---

## 🟡 MEDIUM PRIORITY (4 APIs) - Woche 2

### 8. 🔲 `/api/customer/get-tenant-branding`
- **Ersetzt:** `tenants` SELECT in `courses/[slug].vue`
- **Schutz:** Public (no auth), but rate-limited
- **Note:** Möglicherweise bereits vorhanden als `/api/tenants/branding`

### 9. 🔲 `/api/customer/get-courses`
- **Ersetzt:** `courses` SELECT in `courses/index.vue`, `courses/[slug].vue`
- **Schutz:**
  - Public (for course listing)
  - Tenant-Filter via slug
  - Only return public courses
  - Hide sensitive fields (internal IDs, etc.)

### 10. 🔲 `/api/customer/get-course-categories`
- **Ersetzt:** `course_categories` SELECT in `courses/index.vue`
- **Schutz:** Public, cached, rate-limited

### 11. 🔲 `/api/customer/get-cancellation-reasons`
- **Ersetzt:** `cancellation_reasons` SELECT in `CustomerCancellationModal.vue`
- **Schutz:** Auth required, Tenant-Filter

---

## 🟢 LOW PRIORITY (APIs bereits vorhanden oder minimal risk)

- `evaluation_criteria` - ✅ Already covered
- `course_categories` - Low risk, public data

---

## 📁 Dateien die geändert werden müssen

### Nach API-Erstellung:

```
components/customer/
├── CustomerDashboard.vue      → get-user-profile, get-locations, get-evaluation-criteria
├── ProfileModal.vue           → upload-document
├── CustomerMedicalCertificateModal.vue → upload-document, update-medical-certificate
└── CustomerCancellationModal.vue → get-cancellation-reasons

pages/customer/
├── payments.vue               → get-user-profile
├── courses/index.vue          → get-courses, get-course-categories, enroll-course
└── courses/[slug].vue         → get-tenant-branding, get-courses
```

---

## 🛡️ API Template (für jede neue API)

```typescript
// server/api/customer/[api-name].get.ts oder .post.ts

export default defineEventHandler(async (event) => {
  // 1. Rate Limiting
  const clientIP = getHeader(event, 'x-forwarded-for') || 'unknown'
  const rateLimitKey = `customer_api_${clientIP}`
  // ... rate limit check

  // 2. Authentication
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  // 3. Get User from Token
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  // 4. Get User Profile with Tenant
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', user.id)
    .single()

  // 5. Tenant Isolation - CRITICAL!
  // All queries MUST include .eq('tenant_id', userProfile.tenant_id)

  // 6. Input Validation
  // Validate and sanitize all inputs

  // 7. Business Logic
  // ... actual query with tenant filter

  // 8. Response - only return needed fields
  return { success: true, data: sanitizedData }
})
```

---

## 🔒 Security Checklist für jede API

- [ ] Rate Limiting implementiert
- [ ] Auth Token validiert
- [ ] User aus Token extrahiert (nicht aus Request!)
- [ ] Tenant-ID aus DB geholt (nicht aus Request!)
- [ ] Alle Queries haben tenant_id Filter
- [ ] Input Validation (Zod/Yup)
- [ ] Output nur erlaubte Felder
- [ ] Error Messages generisch (kein DB-Leak)
- [ ] Audit Logging für sensitive Operationen
- [ ] CORS korrekt konfiguriert

---

## 📅 Zeitplan

| Phase | Tasks | Dauer |
|-------|-------|-------|
| **Phase 1** | HIGH Priority APIs (4 neue) | 2-3 Tage |
| **Phase 2** | Integration in Components | 1-2 Tage |
| **Phase 3** | MEDIUM Priority APIs (4 neue) | 2 Tage |
| **Phase 4** | Testing & Security Review | 1 Tag |
| **Total** | | ~1 Woche |

---

## ⚠️ Wichtige Hinweise

1. **NIE `git checkout --` auf Komponenten ausführen** ohne vorher Backup zu machen
2. **Immer einzeln testen** nach jeder API-Integration
3. **CustomerDashboard.vue ist fragil** - minimale Änderungen machen
4. **Optional chaining (`?.`)** in Vue Templates kann Probleme machen - Helper-Funktionen verwenden

---

## 🚀 Nächste Schritte

1. [ ] APIs erstellen die noch fehlen (4 HIGH priority)
2. [ ] CustomerDashboard.vue vorsichtig migrieren
3. [ ] Andere Komponenten migrieren
4. [ ] E2E Tests
5. [ ] Security Audit

---

*Dieses Dokument wird laufend aktualisiert.*

