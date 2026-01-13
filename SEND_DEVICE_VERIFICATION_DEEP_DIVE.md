# send-device-verification - Deep Dive Analysis

## 🎯 Zweck

```
Device Verification Flow:
User Login → New Device Detected → Send Verification Email 
                                  → User clicks Magic Link 
                                  → Device marked as verified
```

---

## 🔍 Where it's Used

**Location:** `pages/[slug].vue` Line 777

```typescript
const resendVerificationEmail = async () => {
  const response = await $fetch<VerificationResponse>('/api/admin/send-device-verification', {
    method: 'POST',
    body: {
      userId: pendingAuthUserId.value,
      deviceId: pendingDeviceId.value,
      userEmail: pendingVerificationEmail.value,
      deviceName: pendingDeviceName.value || 'Unbekanntes Gerät'
    }
  })
}
```

**Trigger:** User sees "Geräteverifikation erforderlich" message and clicks "E-Mail erneut senden"

---

## 🔐 Security Analysis

### Layer 1: Authentication ✅
```typescript
user = await getAuthenticatedUser(event)
if (!user) throw 401
```
**Status:** Admin user MUST be authenticated

**Problem:** ⚠️ Nur ein Admin kann das API aufrufen!
- Aber der **Endnutzer** braucht auch die Möglichkeit, die Email zu resenden!
- Aktuell: Nur Admins können Verifikations-Emails senden

---

### Layer 2: Authorization ✅
```typescript
if (!['admin', 'super_admin', 'tenant_admin'].includes(user.role))
  throw 403
```
**Status:** Admin-only

**Problem:** 🚨 Das ist falsch! 
- Ein **normaler Benutzer** sollte die Verifikations-Email resenden können!
- Aktuell blockiert durch Admin-Check

---

### Layer 3: Rate Limiting ✅
```typescript
// IP: 20/min
// User: 50/hour
```
**Status:** Dual-limiting implementiert

**Status:** ✅ Gut

---

### Layer 4: Input Validation ✅
```typescript
// userId, deviceId, userEmail validiert als UUID/Email format
```
**Status:** ✅ Komplett

---

### Layer 5: Sanitization ✅
```typescript
const sanitizedDeviceName = deviceName.trim().substring(0, 100)
```
**Status:** ✅ Gut

---

### Layer 6: Ownership Check ✅
```typescript
const device = await supabase
  .from('user_devices')
  .select('id, user_id')
  .eq('id', deviceId)
  .eq('user_id', userId)
  .single()

if (!device) throw 403
```
**Status:** ✅ Verhindert, dass Admin fremde Geräte verifiziert

---

### Layer 7: Audit Logging ✅
```typescript
await logAudit({
  action: 'admin_send_verification_success',
  status: 'success',
  details: { device_name, email, message_id }
})
```
**Status:** ✅ Alles protokolliert

---

## 🚨 KRITISCHE PROBLEME GEFUNDEN!

### Problem 1: Admin-Only Restriction

```
AKTUELL:
- Nur Admin kann API aufrufen
- Normaler User kann Verifikations-Email NICHT resenden

SOLLTE SEIN:
- Jeder User sollte seine eigene Verifikations-Email resenden können
```

**Fix nötig:** Authorization ändern von:
```typescript
if (!['admin', 'super_admin', 'tenant_admin'].includes(user.role))
```

Zu:
```typescript
// 2 Optionen:

// Option A: Jeder authentifizierte User
if (!user) throw 401

// Option B: User ODER Admin (User sendet für sich, Admin für andere)
const isOwnDevice = user.id === userId
const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(user.role)
if (!isOwnDevice && !isAdmin) throw 403
```

---

### Problem 2: Ownership Check nur auf userId

```typescript
// Jetzt: Nur auf deviceId + userId geprüft
.eq('id', deviceId)
.eq('user_id', userId)

// Problem: Ein Admin könnte JEDEN deviceId mit JEDEM userId kombinieren
```

**Aber:** Das ist eigentlich okay weil:
- Admin muss authentifiziert sein
- Ownership wird geprüft
- Audit-logged

---

## 📋 Flow Diagramm

```
Frontend (pages/[slug].vue)
  ↓
  POST /api/admin/send-device-verification {
    userId: "...",
    deviceId: "...",
    userEmail: "...",
    deviceName: "iPhone"
  }
  ↓
API Handler
  ├─ 1. Auth Check (Admin only) ❌ PROBLEM!
  ├─ 2. Rate Limiting ✅
  ├─ 3. Input Validation ✅
  ├─ 4. Ownership Check ✅
  ├─ 5. Generate Token (UUID, 24h expiry) ✅
  ├─ 6. Save Token to DB ✅
  ├─ 7. Send Email via Resend ✅
  └─ 8. Audit Log ✅
  ↓
Response: { success, verificationLink, expiresAt }
  ↓
Email sent to user
  ↓
User clicks link → pages/verify-device/[token].vue
  ↓
Device marked as verified
```

---

## 🔧 Empfehlung

### Kurzfristig (Quick Fix):
Ändere Authorization, damit Nutzer ihre eigene Email resenden können:

```typescript
// OPTION B: User OR Admin
const isOwnDevice = user.id === userId
const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(user.role)
if (!isOwnDevice && !isAdmin) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Can only resend for your own device'
  })
}
```

### Langfristig:
Neues API für Kunden:
- `POST /api/customer/resend-device-verification` (kein Admin-Check!)
- Nur für eigenes Device
- Rate-limited pro User

---

## ✅ Checkliste - Was muss geprüft werden:

- [ ] Kann User seine eigene Verifikations-Email resenden?
- [ ] Kann Admin Email für andere User resenden?
- [ ] Rate Limiting funktioniert?
- [ ] Token expires nach 24h?
- [ ] Email wird korrekt gesendet?
- [ ] Audit Logs aufgezeichnet?
- [ ] Device wird wirklich als verified markiert?
- [ ] Zweite Verifikation blockiert?

---

**Sollen wir das JETZT fixen?** 🤔

