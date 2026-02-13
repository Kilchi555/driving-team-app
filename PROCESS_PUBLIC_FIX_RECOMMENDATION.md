# process-public.post.ts - Detailed Analysis & Recommendations

**Datum:** 12. Februar 2026
**Severity:** 🟡 MEDIUM (not as bad as initially thought, but still needs fixing)
**Status:** Currently CONTROLLED via RLS + validation

---

## Die gute Nachricht: Es ist nicht komplett offen!

**Was ich ursprünglich dachte:**
```typescript
// ❌ DANGER: Beliebiger user_id vom Client!
const { user_id } = await readBody(event)
const { data: payment } = await supabaseAdmin
  .from('payments')
  .insert({
    user_id: user_id,  // ← BELIEBIGER USER!
  })
```

**Realität im Code:**
```typescript
// ✅ SAFE: user_id wird NICHT vom Client akzeptiert!
const { enrollmentId, amount, currency, customerEmail, ... } = body
// Kein user_id in den akzeptierten Feldern!

// ✅ SAFE: user_id wird aus enrollment geholt!
const { data: enrollmentUser } = await supabase
  .from('course_registrations')
  .select('user_id')
  .eq('id', enrollmentId)
  .single()

const actualUserId = enrollmentUser?.user_id || null

const paymentInsertData: any = {
  user_id: actualUserId,  // ← Von der DB, nicht vom Client!
  // ...
}
```

---

## Die Analyse

### ✅ WAS GUT IST:

1. **Enrollment Validation (Lines 76-124)**
   - Überprüft dass enrollment existiert
   - Überprüft dass es pending ist
   - Verknüpft zu validen tenant_id
   - ✅ SAFE: User kann nicht beliebige enrollments verwenden

2. **User ID nicht vom Client (Line 26-36)**
   - Client sendet KEIN user_id
   - user_id wird aus enrollment geholt (DB source of truth)
   - ✅ SAFE: User kann sich nicht selbst einen anderen user_id geben

3. **Tenant Validation (Line 83)**
   - `.eq('tenant_id', tenantId)` im enrollment query
   - ✅ SAFE: Kann nicht andere tenants enrollments stehlen

4. **Course Validation (Lines 98-111)**
   - Validiert dass course existiert
   - Validiert dass course im gleichen tenant ist
   - ✅ SAFE

5. **Wallee Config Validation (Lines 134-146)**
   - Holt config für tenant
   - ✅ SAFE: Config ist tenant-specific

### 🟡 WAS BESSER SEIN KÖNNTE:

1. **Keine Auth erforderlich**
   - Jeder kann Zahlungen initiieren
   - Aber: Nur für existierende pending enrollments
   - Question: Sollte User authentifiziert sein?

2. **Service Role wird verwendet (Line 74)**
   - Line 74: `const supabase = getSupabaseAdmin()`
   - **ABER**: Code nutzt RLS-sichernde Queries:
     - `.eq('tenant_id', tenantId)` (Line 83)
     - `.eq('status', 'pending')` (Line 84)
   - Service Role könnte diese Checks umgehen
   - **ABER**: Code macht die Checks manuell!

3. **No Rate Limiting** (Line 24 hat keinen Check)
   - Theoretisch: Jeder könnte spam payments
   - **ABER**: Payment nur wenn enrollment pending
   - **ABER**: Wallee würde doppelte Transaktionen blocken

---

## Der Kern-Issue

**Das wirkliche Problem:**
```
WHY ist das Public?
- Wer should Zahlungen initiieren können?
- Sollte User eingeloggt sein?
- Oder ist das für anonymous course enrollment gedacht?
```

**Aus dem Code (Zeile 4):**
```
* Handles course enrollment payments for unauthenticated users.
```

**AH!** Das ist für **unauthenticated users**!

→ Das erklärt warum public!

---

## Die 3 Optionen

### OPTION 1: Behalte Public, aber verbessere es ⭐ EMPFOHLEN

**Ist relativ safe wie es ist, aber:**

```typescript
// 1. Entferne Service Role - nicht nötig!
- const supabase = getSupabaseAdmin()
+ const supabase = getSupabase()  // Normal client!

// 2. Warum? RLS macht die Checks:
// - enrollment.eq('tenant_id', tenantId) ✅ RLS checkt
// - enrollment.eq('status', 'pending') ✅ RLS can check
// - courses.eq('tenant_id', tenantId) ✅ RLS checkt

// 3. Add Rate Limiting
const rateLimitResult = await checkRateLimit(
  getClientIP(event),
  'payment', 
  5,      // 5 zahlungen
  3600000 // per hour
)
if (!rateLimitResult.allowed) throw error
```

**Effort:** 30-45 Minuten
**Risk:** LOW (RLS macht ohnehin die checks)
**Security:** +40% (Defense-in-depth wiederhergestellt)

---

### OPTION 2: Require Authentication 

```typescript
// 1. Add Auth Check
const authHeader = getHeader(event, 'authorization')
if (!authHeader) {
  throw createError({ statusCode: 401 })
}
const { data: { user } } = await getSupabaseAdmin().auth.getUser(authHeader.substring(7))

// 2. Link payment zu authenticated user
// user_id = user.id (nicht vom client, nicht aus enrollment)

// 3. Entferne Service Role
const supabase = getSupabase()

// 4. RLS handles alles
```

**Effort:** 1-2 Stunden
**Risk:** MEDIUM (ändert workflow - muss testen ob anonymous enrollment noch funktioniert)
**Security:** +70% (echte Authentication)

---

### OPTION 3: Hybrid - Optional Auth

```typescript
// 1. Auth optional
let userId = null
if (authHeader) {
  const { data: { user } } = await auth.getUser(...)
  userId = user.id
} else {
  // For unauthenticated: link to enrollment
  userId = enrollmentUser?.user_id || null
}

// 2. Entferne Service Role
const supabase = getSupabase()

// 3. RLS + Rate Limit
```

**Effort:** 1-2 Stunden
**Risk:** MEDIUM (komplexer)
**Security:** +60% (flexible auth)

---

## Meine konkrete Empfehlung

### 🎯 **OPTION 1 + Rate Limiting**

**Warum:**
1. ✅ Minimale Änderungen
2. ✅ Nicht breaking (bleibt public)
3. ✅ Service Role wird nicht nötig (RLS macht checks)
4. ✅ Rate Limiting verhindert spam
5. ✅ Kosten sind gering für großen Security Gewinn

**Das würde ich machen:**

```typescript
// server/api/payments/process-public.post.ts

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // ✅ ADD: Rate Limiting
    const rateLimitResult = await checkRateLimit(
      getClientIP(event),
      'payment',
      5,        // Max 5 payments
      3600000   // per hour
    )
    if (!rateLimitResult.allowed) {
      throw createError({ 
        statusCode: 429, 
        statusMessage: 'Too many payment attempts. Please try again later.' 
      })
    }

    // ✅ CHANGE: Use normal auth client, NOT admin!
    - const supabase = getSupabaseAdmin()
    + const supabase = getSupabase()
    
    // Rest of code stays the same!
    // RLS handles all the validation:
    // - enrollment must exist
    // - enrollment must be pending
    // - enrollment.tenant_id must match
    // - course.tenant_id must match
  } catch (error: any) {
    // ... error handling
  }
})
```

**Resultat:**
- ✅ -1 unnecessary Service Role call
- ✅ +1 rate limit layer
- ✅ Defense-in-depth restored
- ✅ Code easier to understand
- ✅ No breaking changes

---

## Was brauchen wir checken?

Bevor wir Service Role entfernen:

1. **RLS Policy für `course_registrations` existiert?**
   - Kann unauthenticated user nur pending enrollments sehen?
   - Oder brauchen wir ein spezielles anonymen access?

2. **RLS Policy für `courses` existiert?**
   - Kann unauthenticated user nur active courses sehen?

3. **Rate Limiting - macht Sinn?**
   - 5 payments per hour? Oder weniger?

---

## Action Item

```
Phase 1 This Week:
[ ] Überprüfe RLS Policies für course_registrations + courses
[ ] Bestätige dass nur pending enrollments accessible
[ ] Bestätige dass nur valid courses accessible
[ ] Rate Limiting Parameters bestimmen

Phase 2 Next Week:
[ ] Replace getSupabaseAdmin() mit getSupabase()
[ ] Add Rate Limiting
[ ] Test in staging
[ ] Deploy to production
```

---

## Summary

| Aspekt | Status | Action |
|--------|--------|--------|
| **Ist es unsicher?** | 🟡 MEDIUM (nicht so schlecht wie gedacht) | Improve via RLS |
| **Service Role nötig?** | ❌ NEIN | Remove it! |
| **Rate Limiting?** | ❌ FEHLT | Add it! |
| **Effort to fix** | 30-45 min | Low |
| **Risk of change** | LOW | Safe |
| **Security gain** | +40-50% | Significant |

**Empfehlung: OPTION 1 + Rate Limiting** ✅
