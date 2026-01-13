# MFA Enforcement System - Quick Reference & Implementation Guide

## TL;DR

Du hast nach einem System gefragt um Login-Versuche zu begrenzen und MFA zu erzwingen. Ich habe implementiert:

- **5 Versuche** → MFA erforderlich (60 min)
- **10 Versuche** → Account gesperrt (30 min)
- **20 Versuche/IP (24h)** → IP blockiert

## Installation (3 Schritte)

### 1️⃣ SQL-Migrationen ausführen

Supabase Dashboard öffnen:
```
https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/sql/new
```

**Query 1:**
```sql
-- Kopiere alles aus:
-- sql_migrations/20250229_add_mfa_enforcement_tracking.sql
```
→ Run

**Query 2:**
```sql
-- Kopiere alles aus:
-- sql_migrations/20250229_create_mfa_login_tables.sql
```
→ Run

### 2️⃣ Sicherheitsregeln konfigurieren

```sql
-- In Supabase SQL Editor
INSERT INTO public.login_security_rules (
  name,
  max_failed_attempts_before_mfa,
  max_failed_attempts_before_lockout,
  lockout_duration_minutes,
  mfa_required_duration_minutes,
  max_failed_attempts_per_ip_24h,
  auto_block_ip_after_attempts,
  is_active
) VALUES (
  'Default Security',
  5,
  10,
  30,
  60,
  20,
  20,
  true
);
```

### 3️⃣ Frontend anpassen

Die Codebasis ist bereit! Du musst nur noch:

1. **Login-Seite (`pages/login.vue`) aktualisieren**
   - MFA-Eingabe-Component hinzufügen
   - `useMFAFlow()` composable nutzen

2. **SMS/Email-Versand implementieren**
   - In `server/api/auth/send-mfa-code.post.ts`
   - Beispiel: Twilio, AWS SNS, SendGrid, etc.

## Dateien die ich erstellt habe

### Backend
```
server/api/auth/
├── get-mfa-methods.post.ts      (NEUE DATEI)
├── send-mfa-code.post.ts        (NEUE DATEI)
├── verify-mfa-login.post.ts     (NEUE DATEI)
└── login.post.ts                (AKTUALISIERT)
```

### Frontend
```
composables/
└── useMFAFlow.ts                (NEUE DATEI)

pages/
└── login.vue                    (ZU AKTUALISIEREN)
```

### SQL
```
sql_migrations/
├── 20250229_add_mfa_enforcement_tracking.sql
└── 20250229_create_mfa_login_tables.sql
```

## Wie es funktioniert

### Login-Versuch 1-4: Normale Fehler
```
❌ Falsche Credentials
└─ Benutzer sieht: "Ungültige Anmeldedaten"
```

### Login-Versuch 5: MFA wird erzwungen
```
❌ 5. Versuch gescheitert
└─ Backend: record_failed_login()
   └─ mfa_required_until = NOW() + 60 min
└─ Frontend zeigt: "MFA erforderlich"
   ├─ [SMS] [Email] [TOTP]
   └─ Code eingeben...
```

### Login-Versuch 10: Account gesperrt
```
❌ 10. Versuch gescheitert
└─ Backend: record_failed_login()
   └─ account_locked_until = NOW() + 30 min
└─ Frontend zeigt: "Account temporär gesperrt"
   └─ "Versuchen Sie es in 30 Minuten erneut"
```

### Nach 20 Versuche pro IP: IP blockiert
```
❌ 20. Versuch von IP 192.168.1.100
└─ Backend: INSERT into blocked_ip_addresses
└─ Alle zukünftigen Login-Versuche von dieser IP
   └─ Fehler: 429 "Zu viele Versuche"
```

## Code-Beispiele

### In `pages/login.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useMFAFlow } from '~/composables/useMFAFlow'

const loginError = ref<string | null>(null)
const mfaFlow = useMFAFlow()

const handleLogin = async () => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginForm.email,
        password: loginForm.password,
        tenantId: currentTenant.id
      })
    })

    const data = await response.json()

    // Check if MFA is required
    if (data.requiresMFA) {
      // Behandle MFA-Flow
      await mfaFlow.handleMFARequired(data.email)
      // Frontend zeigt jetzt MFA-Eingabe
      return
    }

    // Normales Login
    const authStore = useAuthStore()
    authStore.user = data.user
    authStore.session = data.session
    navigateTo('/dashboard')
  } catch (error: any) {
    loginError.value = error.message
  }
}
</script>

<template>
  <!-- Normales Login -->
  <form v-if="!mfaFlow.state.value.requiresMFA" @submit.prevent="handleLogin">
    <!-- Email & Passwort Inputs -->
  </form>

  <!-- MFA-Verifizierung -->
  <div v-else class="space-y-4">
    <h2>Multi-Faktor-Authentifizierung erforderlich</h2>
    
    <!-- MFA-Methoden Auswahl -->
    <div v-if="mfaFlow.state.value.availableOptions.length > 0" class="space-y-2">
      <button
        v-for="method in mfaFlow.state.value.availableOptions"
        :key="method.id"
        @click="mfaFlow.selectMFAMethod(method.id)"
        :class="{ 'bg-blue-600': mfaFlow.state.value.selectedOption?.id === method.id }"
      >
        {{ method.name }}
      </button>
    </div>

    <!-- Code-Eingabe -->
    <div>
      <input
        v-model="mfaFlow.state.value.code"
        type="text"
        placeholder="Geben Sie den Code ein"
        maxlength="6"
      >
    </div>

    <!-- Error Message -->
    <div v-if="mfaFlow.state.value.error" class="text-red-600">
      {{ mfaFlow.state.value.error }}
    </div>

    <!-- Buttons -->
    <button @click="mfaFlow.sendMFACode" :disabled="mfaFlow.state.value.isVerifying">
      Code versenden
    </button>
    
    <button @click="mfaFlow.verifyMFACode(loginForm.password)" :disabled="!mfaFlow.canSubmitCode.value">
      Verifizieren
    </button>
  </div>
</template>
```

### SMS-Integration (Beispiel mit Twilio)

In `server/api/auth/send-mfa-code.post.ts`:

```typescript
async function sendSMSCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const twilio = require('twilio')
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    
    await client.messages.create({
      body: `Ihr Simy MFA-Code: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })

    logger.debug('✅ SMS versendet an:', phoneNumber.slice(-4))
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

Umgebungsvariablen setzen:
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing-Checklist

- [ ] SQL-Migrationen erfolgreich ausgeführt
- [ ] `login_security_rules` konfiguriert
- [ ] Normales Login funktioniert
- [ ] 5 falsche Versuche → MFA erforderlich
- [ ] MFA-Code korrekt → Login erfolgreich
- [ ] MFA-Code falsch → Fehler
- [ ] 10 falsche Versuche → Account gesperrt
- [ ] Nach 30 Min → Account entsperrt
- [ ] 20 Versuche/IP → IP blockiert
- [ ] Admin kann IP manuell entsperren

## Monitoring Queries

```sql
-- Aktuelle fehlgeschlagene Versuche (letzte Stunde)
SELECT email, failed_login_attempts, last_failed_login_at, mfa_required_until, account_locked_until
FROM public.users
WHERE failed_login_attempts > 0
  AND last_failed_login_at > NOW() - INTERVAL '1 hour'
ORDER BY failed_login_attempts DESC;

-- Gesperrte Accounts
SELECT email, account_locked_until, account_locked_reason
FROM public.users
WHERE account_locked_until > NOW();

-- Blockierte IPs
SELECT ip_address, reason, blocked_at
FROM public.blocked_ip_addresses
WHERE unblocked_at IS NULL;

-- MFA-Aktivität (24h)
SELECT COUNT(*) as total_attempts, 
       SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_attempts
FROM public.login_attempts
WHERE attempted_at > NOW() - INTERVAL '24 hours';
```

## Fehlerbehebung

### Problem: "check_login_security_status is not a function"
**Lösung**: SQL-Migration 1 nicht vollständig ausgeführt. Prüfe Supabase SQL Editor auf Fehler.

### Problem: MFA-Code wird nicht versendet
**Lösung**: SMS/Email-Versand nicht implementiert. Implementiere `sendSMSCode()` oder `sendEmailCode()`.

### Problem: Account bleibt gesperrt
**Lösung**: Manuell entsperren mit:
```sql
UPDATE public.users
SET account_locked_until = NULL
WHERE email = 'user@example.com';
```

### Problem: failed_login_attempts wird nicht zurückgesetzt
**Lösung**: Stelle sicher, dass nach erfolgreichem Login `reset_failed_login_attempts()` aufgerufen wird.

## Sicherheits-Best-Practices

1. **Code-Hashing**: Speichere MFA-Codes gehashed (✅ implementiert)
2. **Code-Ablauf**: 10-Minuten Gültigkeitsdauer (✅ implementiert)
3. **Rate-Limiting**: IP-basiertes Blocking (✅ implementiert)
4. **Audit-Logging**: Alle Login-Versuche protokolliert (✅ implementiert)
5. **HTTPS**: Immer verwenden in Production
6. **Secrets**: Verwende Environment-Variablen für API-Keys

## Support & Fragen

Bei technischen Fragen:
1. Prüfe die Logs in `server/api/auth/login.post.ts`
2. Schau in die Supabase SQL Editor auf Errors
3. Nutze die Monitoring-Queries zum Debuggen



