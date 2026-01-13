# Wo ist der CRON_SECRET Token gespeichert?

## 🗺️ **Token Journey**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DU generierst lokal                                       │
│    $ openssl rand -base64 32                                 │
│    Output: aBcD1234efGH5678ijKL9012mnOP3456qrST7890uvWX==   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. DU gibst es in Vercel Dashboard ein                       │
│    Settings → Environment Variables                          │
│    CRON_SECRET = aBcD1234efGH5678ijKL9012mnOP3456qrST7890   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Vercel speichert es ENCRYPTED                             │
│    Location: Vercel Secure Environment Storage               │
│    - Encryption at Rest: ✅ AES-256                          │
│    - Access Control: ✅ Only your project                    │
│    - Audit Log: ✅ Who accessed it when                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Beim Deploy wird es zu Production hinzugefügt            │
│    Vercel → Build Server                                     │
│    Token wird in Environment injiziert                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Deine App hat es zur Laufzeit                             │
│    process.env.CRON_SECRET = "aBcD1234ef..."                │
│    (Nur im Running Process - nicht im Source Code!)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Vercel Cron Service ruft API auf                          │
│    POST /api/cron/cleanup-booking-reservations              │
│    Header: Authorization: Bearer aBcD1234ef...              │
│    Vercel sendet den Token in der Request                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Deine API prüft das Token                                 │
│    server/utils/cron.ts: verifyCronToken()                   │
│    Vergleicht: env.CRON_SECRET === header.Authorization     │
│    ✅ Match → Cron läuft                                     │
│    ❌ No match → 401 Unauthorized                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 **Detaillierte Speicherorte**

### **1. NIEMALS im Git Repository** ❌
```bash
# DON'T DO THIS:
git add .env
git commit -m "add secrets"
git push
# → Token ist jetzt ÖFFENTLICH für alle!
```

### **2. Vercel Secure Storage** ✅ (HIER ist es!)
```
🔒 Vercel Dashboard
   └─ Project: driving-team-app
      └─ Settings
         └─ Environment Variables
            └─ CRON_SECRET = "aBcD1234ef..." [ENCRYPTED]
```

**Was Vercel macht:**
- Speichert mit AES-256 Encryption
- Nicht in Source Code
- Nicht in Build Logs
- Nur für diese Project zugänglich
- Audit Log wer Zugriff hat

### **3. Process Environment (zur Laufzeit)** ✅
```typescript
// In deiner API zur Laufzeit:
console.log(process.env.CRON_SECRET)  // "aBcD1234ef..."

// ABER: Nicht in Logs schreiben!
logger.debug('Token:', process.env.CRON_SECRET)  // ❌ DON'T!
```

### **4. Deine lokale .env.local** ⚠️ (Optional, für local dev)
```bash
# .env.local (NEVER commit this!)
CRON_SECRET=aBcD1234efGH5678ijKL9012mnOP3456qrST7890uvWX==

# Ensure in .gitignore:
.env.local
.env*.local
```

---

## 🔐 **Sicherheitsmodell**

```
┌──────────────────────────────────────────┐
│ CRON_SECRET Storage Security             │
└──────────────────────────────────────────┘

Source Code Repository (GitHub)
└─ ❌ Token NOT here
   └─ .gitignore blocks .env.local

Local Development (.env.local)
└─ ⚠️ Token here (encrypted file system)
   └─ .gitignore blocks upload

Vercel Secure Vault
└─ ✅ Token encrypted at rest
   └─ ✅ AES-256 encryption
   └─ ✅ Access controlled
   └─ ✅ Audit logged

Production Runtime
└─ ✅ Available as process.env.CRON_SECRET
   └─ ✅ Only in memory (during execution)
   └─ ✅ Not persisted

Network (Vercel → API)
└─ ✅ Sent over HTTPS
   └─ ✅ Only in Authorization header
```

---

## 🔄 **Wie der Token verwendet wird**

### **Step 1: Vercel Cron Scheduler (Vercel Infrastructure)**
```
Vercel's internal system:
- Reads CRON_SECRET from Secure Storage
- Creates Authorization header
- Calls your API endpoint
```

### **Step 2: HTTP Request** 
```http
POST /api/cron/cleanup-booking-reservations HTTP/1.1
Host: driving-team-app.vercel.app
Authorization: Bearer aBcD1234efGH5678ijKL9012mnOP3456qrST7890uvWX==
Content-Type: application/json
```

### **Step 3: Your API Handler**
```typescript
// server/api/cron/cleanup-booking-reservations.post.ts

export default defineEventHandler(async (event) => {
  // Step 1: Get the token from request header
  const authHeader = getHeader(event, 'authorization')
  
  // Step 2: Get your stored token from environment
  const expectedToken = process.env.CRON_SECRET
  
  // Step 3: Compare them
  if (authHeader !== `Bearer ${expectedToken}`) {
    // ❌ Token doesn't match
    throw createError({ statusCode: 401 })
  }
  
  // ✅ Token is valid, proceed with cron job
  // ... cleanup code here ...
})
```

---

## 📊 **Token Lifecycle**

| Phase | Location | Security | Status |
|-------|----------|----------|--------|
| **Generated** | Your local terminal | Safe (you control) | ✅ Secure |
| **Copied** | Your clipboard | Temporary | ✅ Your device only |
| **Entered** | Vercel Dashboard | HTTPS encrypted | ✅ Secure |
| **Stored** | Vercel Vault | AES-256 encrypted | ✅ Secure |
| **Deployed** | Build Environment | Injected into env | ✅ Secure |
| **Runtime** | Process memory | In RAM during execution | ✅ Secure |
| **Transmitted** | HTTPS to API | Encrypted TLS | ✅ Secure |
| **Verified** | Your API code | Compared in memory | ✅ Secure |

---

## ⚠️ **NIEMALS tun:**

```bash
# ❌ Don't commit to Git
git add .env
git push origin main

# ❌ Don't share in chat/email
"Hey, use this token: aBcD1234ef..."

# ❌ Don't log it
console.log('Token:', process.env.CRON_SECRET)

# ❌ Don't hardcode it
const CRON_SECRET = 'aBcD1234ef...'  // In source code!

# ❌ Don't put it in public URLs
GET /api/cron/cleanup?token=aBcD1234ef...

# ❌ Don't expose in error messages
throw new Error(`Invalid token: ${receivedToken}`)
```

---

## ✅ **IMMER tun:**

```bash
# ✅ Generate fresh
openssl rand -base64 32

# ✅ Store in Vercel Environment Variables
# Dashboard → Settings → Environment Variables

# ✅ Keep local copy in .env.local (gitignored)
echo "CRON_SECRET=..." >> .env.local

# ✅ Use from process.env
const token = process.env.CRON_SECRET

# ✅ Verify it matches in API
if (headerToken !== `Bearer ${process.env.CRON_SECRET}`) {
  throw 401
}

# ✅ Rotate periodically (every 6-12 months)
# Generate new, update Vercel, old one becomes invalid
```

---

## 🎯 **Für DEIN Setup:**

**Der Token ist sicher, wenn:**

1. ✅ Du ihn in Vercel Dashboard eingibst (HTTPS)
2. ✅ Vercel speichert ihn encrypted
3. ✅ Du ihn NICHT in Git committst
4. ✅ Du ihn NICHT in Logs/Chats teilst
5. ✅ Deine API prüft ihn in jedem Request

**Speicherorte zusammengefasst:**

```
Aktiv verwendet:
- Vercel Secure Vault (encrypted) ← HIER ist es hauptsächlich
- Dein lokales .env.local (when developing)
- Runtime process.env (im RAM während Ausführung)

NICHT hier:
- GitHub Repository
- Slack/Discord/Email
- Source Code
- Build Logs
```

---

## 💡 **Analogy:**

```
Token = Haustürschlüssel

Generieren:    Du machst einen Schlüssel (openssl rand)
Speichern:     Du legst ihn ins verschlossene Schloss-Depot (Vercel Vault)
Verwenden:     Vercel nimmt ihn raus und öffnet deine Tür (API Call)
Prüfung:       Deine API checkt ob der richtige Schlüssel verwendet wurde
```

---

## 🔐 **Fazit:**

Der CRON_SECRET Token ist **hauptsächlich in Vercel Secure Storage gespeichert** (AES-256 encrypted). Es verlässt diesen nur während:
1. Deployment (als Environment Variable injiziert)
2. Runtime (im RAM des Processes)
3. HTTPS Requests (verschlüsselt)

Solange du ihn NICHT in Git/Chat/Logs teilst, ist dein Setup sicher! ✅

