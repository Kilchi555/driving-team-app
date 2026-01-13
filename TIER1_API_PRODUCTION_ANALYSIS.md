# TIER 1 APIs - Production Usage Analysis

**Frage:** Brauchen wir diese 5 APIs noch?

**Antwort:** Es kommt darauf an...

---

## 📊 Usage Analysis der 5 APIs:

### 1️⃣ `POST /api/admin/check-transaction-token`
**Status:** ❌ **NICHT VERWENDET**
- Aufgerufen: 0x in Production Code
- Nur in Dokumentation (`QUICK_TOKEN_CHECK.md`, `FIX_MISSING_TOKENS.md`)
- **Zweck:** Debug/Manual Tool für Wallee Payment Tokenization
- **Kann gelöscht werden?** Ja, wenn kein mehr Payment-Debugging nötig

---

### 2️⃣ `POST /api/admin/fix-missing-payment-tokens`
**Status:** ❌ **NICHT VERWENDET**
- Aufgerufen: 0x in Production Code
- Nur in Dokumentation (`FIX_MISSING_TOKENS.md`)
- **Zweck:** One-time Fix für fehlende Payment Tokens (Maintenance)
- **Kann gelöscht werden?** Ja, war nur für Migration nötig

---

### 3️⃣ `GET /api/admin/test-email-config`
**Status:** ❌ **NICHT VERWENDET**
- Aufgerufen: 0x in Production Code
- **Zweck:** Debug/Test für Email-Konfiguration
- **Kann gelöscht werden?** Ja, wenn Email-Setup fertig ist

---

### 4️⃣ `GET /api/admin/test-smtp-config`
**Status:** ❌ **NICHT VERWENDET**
- Aufgerufen: 0x in Production Code
- **Zweck:** Debug/Test für SMTP-Konfiguration
- **Kann gelöscht werden?** Ja, wenn Email-Setup fertig ist

---

### 5️⃣ `POST /api/admin/send-device-verification`
**Status:** ✅ **AKTIV VERWENDET!**
- Aufgerufen: 1x in `pages/[slug].vue` (Line 777)
- **Zweck:** Sendet Device Verification Email
- **Kann gelöscht werden?** **NEIN - Das brauchst du!**

```typescript
// pages/[slug].vue:777
const response = await $fetch<VerificationResponse>('/api/admin/send-device-verification', {
  // ... Device Verification Flow
})
```

---

## 🎯 Empfehlung:

### Was weg kann:
- ❌ `check-transaction-token` (Debug only)
- ❌ `fix-missing-payment-tokens` (One-time migration only)
- ❌ `test-email-config` (Debug only)
- ❌ `test-smtp-config` (Debug only)

### Was bleiben muss:
- ✅ `send-device-verification` (Production-kritisch!)

---

## 💡 Strategy:

### Option 1: Alles löschen außer `send-device-verification`
```bash
rm server/api/admin/check-transaction-token.get.ts
rm server/api/admin/fix-missing-payment-tokens.post.ts
rm server/api/admin/test-email-config.get.ts
rm server/api/admin/test-smtp-config.get.ts

# Nur behalten:
# server/api/admin/send-device-verification.post.ts
```

**Vorteil:** Sauberer Code, keine Debug-APIs in Production  
**Nachteil:** Wenn Payment-Debugging nötig → APIs nicht mehr vorhanden

---

### Option 2: Alle behalten aber protected
Alle 4 Debug-APIs mit Extra-Sicherheit:
```typescript
// Super Admin only + Rate Limiting (1 req/hour)
```

**Vorteil:** Falls später debugging nötig, APIs noch da  
**Nachteil:** Mehr Code, mehr Attack Surface

---

### Option 3: Debug-APIs disabled in Production
```typescript
if (process.env.NODE_ENV === 'production') {
  throw createError({ statusCode: 404 })
}
```

**Vorteil:** Saubere Production, Debug-APIs in Dev möglich  
**Nachteil:** Zusätzliche Logik

---

## ❓ Meine Empfehlung:

**→ Option 1: Löschen!**

Grund: Diese sind reine **Development/Debug-Tools**:
- Wallee Token debugging → Sollte nicht in Production nötig sein
- Email config testing → Sollte vor Deployment konfiguriert sein
- Device Verification → Das ist das einzige Production-Feature!

**Wenn später nötig:** Können einfach wieder aus Git wiederhergestellt werden.

---

## Was willst du machen?

1. ✂️ **Alle 4 Debug-APIs löschen?** (empfohlen)
2. 🔐 **Alle behalten aber super protected?**
3. 🎛️ **Nur in Dev aktivieren?**

Schreib mir! 🤔

