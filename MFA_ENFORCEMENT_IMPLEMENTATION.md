# MFA Enforcement System - Implementierungs-Übersicht

## Was wurde implementiert?

Ein umfassendes Sicherheitssystem, das fehlgeschlagene Login-Versuche verfolgt und progressiv MFA erzwingt.

## Sicherheitsmerkmale

### 1. Progressive MFA-Erzwingung
- **Nach 5 fehlgeschlagenen Versuchen**: MFA wird erforderlich (60 Minuten)
- **Nach 10 fehlgeschlagenen Versuchen**: Account wird gesperrt (30 Minuten)
- **Nach 20 Versuche pro IP (24h)**: IP wird blockiert

### 2. Account Protection
- Automatische Entsperrung nach Lockout-Duration
- IP-Blocking für verdächtige Aktivitäten
- Detaillierte Audit-Logs aller Login-Versuche

### 3. Flexible Konfiguration
Alle Schwellwerte sind pro Tenant konfigurierbar über `login_security_rules` Tabelle:

```sql
-- Beispiel: Standard-Konfiguration setzen
INSERT INTO public.login_security_rules (
  tenant_id,
  name,
  max_failed_attempts_before_mfa,
  max_failed_attempts_before_lockout,
  lockout_duration_minutes,
  mfa_required_duration_minutes,
  max_failed_attempts_per_ip_24h,
  auto_block_ip_after_attempts,
  is_active
) VALUES (
  'your-tenant-id',
  'Standard Security Policy',
  5,
  10,
  30,
  60,
  20,
  20,
  true
);
```

## Datenbankstruktur

### Neue Spalten in `users` Tabelle
```sql
failed_login_attempts INT DEFAULT 0
last_failed_login_at TIMESTAMPTZ
mfa_required_until TIMESTAMPTZ
account_locked_until TIMESTAMPTZ
account_locked_reason TEXT
```

### Neue Tabellen
1. **login_security_rules**: Konfiguration pro Tenant
2. **mfa_methods**: Speichert MFA-Methoden der Benutzer
3. **mfa_login_codes**: Temporäre Codes während Login
4. **mfa_failed_attempts**: Verfolgung fehlgeschlagener MFA-Versuche

### Neue Functions
1. `check_login_security_status()`: Prüft ob Login erlaubt ist
2. `record_failed_login()`: Registriert fehlgeschlagenen Versuch
3. `reset_failed_login_attempts()`: Setzt Zähler zurück
4. `unlock_account()`: Entsperrt Account

## Backend-Änderungen

### Login-Endpoint (`/api/auth/login.post.ts`)

**Vor dem Login:**
```typescript
// 1. IP-Blockierung prüfen
// 2. Rate-Limit prüfen
// 3. Sicherheitsstatus prüfen
const { data: securityStatus } = await adminSupabase
  .rpc('check_login_security_status', {
    p_email: email,
    p_ip_address: ipAddress,
    p_tenant_id: tenantId
  })

if (!status.allowed) {
  // Blockiert - 403 Fehler
  throw createError({ statusCode: 403, statusMessage: status.reason })
}

if (status.mfa_required) {
  // MFA erforderlich - spezielle Antwort
  return { success: false, requiresMFA: true, email }
}
```

**Nach fehlgeschlagenem Login:**
```typescript
// Fehlgeschlagenen Versuch registrieren
const { data: updateResult } = await adminSupabase
  .rpc('record_failed_login', {
    p_email: email,
    p_ip_address: ipAddress,
    p_tenant_id: tenantId
  })

// Wenn MFA erforderlich wird
if (updateResult[0].require_mfa) {
  return { requiresMFA: true }
}

// Wenn Account gesperrt wird
if (updateResult[0].lock_account) {
  throw createError({ statusCode: 423, statusMessage: 'Account gesperrt' })
}
```

**Nach erfolgreichem Login:**
```typescript
// Zähler zurücksetzen
await adminSupabase
  .rpc('reset_failed_login_attempts', { p_user_id: authData.user.id })
```

### Neue API-Endpoints

1. **GET /api/auth/get-mfa-methods.post.ts**
   - Ruft verfügbare MFA-Methoden des Benutzers ab
   - Nur verifizierte Methoden

2. **POST /api/auth/send-mfa-code.post.ts**
   - Versendet MFA-Code via SMS/Email/TOTP
   - Speichert Code-Hash in Datenbank
   - 10 Minuten Gültigkeit

3. **POST /api/auth/verify-mfa-login.post.ts**
   - Verifiziert MFA-Code
   - Komplettiert Login wenn Code gültig
   - Löscht verwendeten Code

## Frontend-Änderungen

### Neue Composable (`composables/useMFAFlow.ts`)

```typescript
const mfaFlow = useMFAFlow()

// 1. Nach 5 Versuchen
await mfaFlow.handleMFARequired(email)
// -> Zeigt verfügbare MFA-Methoden

// 2. Code versenden
await mfaFlow.sendMFACode()
// -> Code wird per SMS/Email versendet

// 3. Code eingeben und verifizieren
const result = await mfaFlow.verifyMFACode(password)
// -> Login abgeschlossen oder Fehler
```

### Login-Seite Update (`pages/login.vue`)

1. **Normaler Login-Zustand**: Email + Passwort
2. **MFA-Zustand**: 
   - MFA-Methoden-Auswahl
   - Code-Eingabe
   - Button zum Neuversand

## Aktivierung

### Schritt 1: SQL-Migrationen ausführen

Öffne Supabase Dashboard SQL-Editor:
1. https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/sql
2. Neue Query
3. Kopiere Inhalt von `sql_migrations/20250229_add_mfa_enforcement_tracking.sql`
4. Run
5. Wiederhole für `sql_migrations/20250229_create_mfa_login_tables.sql`

### Schritt 2: Sicherheitsregeln konfigurieren

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
  'Default Security Policy',
  5,
  10,
  30,
  60,
  20,
  20,
  true
);
```

### Schritt 3: SMS/Email-Integration

Implementiere SMS/Email-Versand in:
- `server/api/auth/send-mfa-code.post.ts`
  - `sendSMSCode()` - SMS-Provider Integration
  - `sendEmailCode()` - Email-Versand

Beispiel mit Twilio:
```typescript
async function sendSMSCode(phoneNumber: string, code: string) {
  const twilio = require('twilio')
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  
  await client.messages.create({
    body: `Ihr MFA-Code: ${code}`,
    from: process.env.TWILIO_PHONE,
    to: phoneNumber
  })
}
```

## Testing

### Test 1: Normaler Login
```
1. Korrekte Credentials eingeben
2. Should login successfully
3. failed_login_attempts should be 0
```

### Test 2: 5 Fehlgeschlagene Versuche
```
1. Falsche Credentials 5x eingeben
2. Nach dem 5. Versuch: MFA-Aufforderung
3. Verfügbare MFA-Methoden sollten angezeigt werden
```

### Test 3: 10 Fehlgeschlagene Versuche
```
1. Falsche Credentials 10x eingeben
2. 423 Fehler: Account gesperrt
3. account_locked_until sollte 30 Minuten in der Zukunft sein
```

### Test 4: MFA-Verifikation
```
1. Code korrekt eingeben -> Login erfolgreich
2. Code falsch eingeben -> Fehler, remaining_attempts sinkt
3. Nach 3 Versuchen: "Zu viele Versuche"
```

### Test 5: IP-Blocking
```
1. Mehrere Accounts von gleicher IP versuchen
2. Nach 20 Versuchen: 429 Fehler
3. IP sollte in blocked_ip_addresses sein
```

## Monitoring und Admin

### Views für Admin-Dashboard

```sql
-- Fehlgeschlagene Versuche der letzten Stunde
SELECT * FROM failed_login_activity 
WHERE last_failed_login_at > NOW() - INTERVAL '1 hour'
AND failed_login_attempts > 0;

-- Gesperrte IPs
SELECT * FROM blocked_ip_addresses 
WHERE unblocked_at IS NULL;

-- Gesperrte Accounts
SELECT * FROM users 
WHERE account_locked_until > NOW();

-- MFA-Status
SELECT * FROM mfa_setup_status 
WHERE verified_methods > 0;
```

## Zukünftige Erweiterungen

1. **WebAuthn Support**: Hardware-Schlüssel als MFA-Methode
2. **Recovery Codes**: Backup-Codes für Account-Recovery
3. **Adaptive MFA**: MFA nur bei verdächtigen Aktivitäten
4. **Device Fingerprinting**: Vertrauenswürdige Geräte
5. **Geolocation Checking**: Anomalieerkennung basierend auf Standort

## Fehlerbehebung

### Issue: MFA Codes werden nicht versendet
- Prüfe: SMS/Email-Provider-Konfiguration
- Logs: `server/api/auth/send-mfa-code.post.ts`

### Issue: Account bleibt dauerhaft gesperrt
- Prüfe: `account_locked_until` ist > NOW()?
- Manuell entsperren: `UPDATE users SET account_locked_until = NULL WHERE id = '...'`

### Issue: MFA wird nicht erzwungen nach 5 Versuchen
- Prüfe: `login_security_rules` ist konfiguriert?
- Prüfe: `max_failed_attempts_before_mfa = 5`?

## Support

Bei Fragen oder Problemen kontaktieren Sie den Development Team.



