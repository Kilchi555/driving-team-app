# 🔐 ENCRYPTION_KEY Setup für Tenant Secrets

## 📋 Übersicht

Für die sichere Verschlüsselung von Tenant Secrets (SARI, Wallee Credentials) brauchst du einen **ENCRYPTION_KEY**.

Dieser Key muss in Vercel als Environment Variable gespeichert werden und wird verwendet, um:
- ✅ Credentials in der `tenant_secrets` DB zu verschlüsseln
- ✅ Credentials vor dem Speichern zu verschlüsseln
- ✅ Credentials beim Laden zu entschlüsseln

## 🔑 ENCRYPTION_KEY generieren

### Option 1: Mit OpenSSL (macOS/Linux)

```bash
openssl rand -hex 32
```

**Ausgabe z.B.:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1
```

### Option 2: Mit Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 3: Mit Node.js (im Projekt)

```bash
npm run generate-encryption-key
```

## 📌 ENCRYPTION_KEY in Vercel setzen

1. Gehe zu deinem Vercel Project: https://vercel.com/dashboard/pascal-xxx/driving-team-app
2. Gehe zu **Settings** → **Environment Variables**
3. Neue Variable hinzufügen:
   - **Name**: `ENCRYPTION_KEY`
   - **Value**: Der Key von oben
   - **Select environments**: Production, Preview, Development

4. Klick **Save**

5. **Redeploy** dein Projekt damit die neue Env-Variable aktiv wird

## ✅ Verify dass ENCRYPTION_KEY gesetzt ist

```bash
# Local development - check .env.local
grep ENCRYPTION_KEY .env.local

# Production - auf Vercel überprüfen
# Settings → Environment Variables
```

## 🧪 Test des ENCRYPTION_KEY

```typescript
// In der Browser Console oder einem Test:
const response = await fetch('/api/admin/save-tenant-secrets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: 'test-tenant-id',
    secrets: {
      SARI_CLIENT_ID: 'test_client_id',
      SARI_CLIENT_SECRET: 'test_secret'
    }
  })
})

console.log(await response.json())
```

## ⚠️ WICHTIG

- **NIEMALS** committen oder im Code hardcoden
- **NUR** in Vercel Environment Variables speichern
- **32 bytes (64 hex characters)** - nicht länger oder kürzer!
- **Generiere einen neuen Key** vor Production Deploy
- **Backup deinen Key** - ohne Key kannst du Secrets nicht entschlüsseln

## 🛠️ Troubleshooting

### Fehler: "ENCRYPTION_KEY is not set"
→ Env Variable nicht in Vercel gesetzt
→ Lösung: Setze die Variable in Vercel und redeploy

### Fehler: "ENCRYPTION_KEY must be 32 bytes"
→ Der Key hat falsche Länge
→ Lösung: Generiere einen neuen mit `openssl rand -hex 32`

### Fehler: "Failed to decrypt secret"
→ Der gespeicherte Secret wurde mit anderem Key verschlüsselt
→ Lösung: Speichere den Secret neu (mit neuem Key)

## 📚 Weitere Infos

- Encryption Utility: `/server/utils/encryption.ts`
- Secret Loader: `/server/utils/get-tenant-secrets-secure.ts`
- Admin API: `/server/api/admin/save-tenant-secrets.post.ts`
