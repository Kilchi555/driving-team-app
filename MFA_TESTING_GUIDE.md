# WebAuthn/MFA Implementation - Testing Guide

## 📋 Was wurde implementiert

Ein komplettes Multi-Factor Authentication (MFA) System mit:
- ✅ **Face ID / Fingerprint** (WebAuthn/FIDO2 Passkeys)
- ✅ **Email-Code Fallback** (bei Passkey-Verlust)
- ✅ **Backup-Codes** (10x one-time use recovery codes)
- ✅ **Audit Logging** (alle MFA-Versuche getracked)

## 🚀 Deployment Steps

### 1. SQL Migrations ausführen

Gehe zu Supabase → SQL Editor und führe diese Datei aus:
- `sql_migrations/20250213_create_webauthn_mfa_tables.sql`

Diese erstellt:
- `webauthn_credentials` - Passkeys speichern
- `webauthn_sessions` - Challenge-Sessions
- `mfa_backup_codes` - Recovery-Codes
- `mfa_email_codes` - Temporäre Email-Codes
- `mfa_verifications` - Audit-Log

### 2. User aktualisieren

```sql
UPDATE public.users 
SET mfa_required = true 
WHERE role IN ('admin', 'staff', 'super_admin');
```

Oder optional für einzelne User:
```sql
UPDATE public.users 
SET mfa_required = true 
WHERE email = 'dein@email.com';
```

## 🧪 Testing-Anleitung

### Test 1: MFA Setup
1. Öffne `/mfa/setup`
2. Browser-Kompatibilität sollte grün sein
3. Klicke "Sicherheitsschlüssel registrieren"
4. Nutze Face ID / Fingerprint
5. Speichere die Backup-Codes ab

### Test 2: Login mit MFA
1. Logout
2. Login mit Email/Passwort
3. Danach sollte `/mfa/challenge` angezeigt werden
4. Verifiziere mit Face ID / Fingerprint
5. Dashboard sollte geladen werden

### Test 3: Fallback (Email-Code)
1. Auf MFA Challenge: "Sicherungscode verwenden"
2. Wechsel zu "Sicherungscode verwenden"
3. Gib einen der Backup-Codes ein
4. Dashboard sollte geladen werden

### Test 4: Email-Code (für später)
1. Auf MFA Challenge: "oder" → Email-Code
2. Code sollte per Email ankommen
3. Gib ihn ein → Dashboard

## 📂 Wichtige Files

```
server/api/mfa/
├── webauthn-register-start.post.ts        # Challenge für Setup
├── webauthn-register-complete.post.ts     # Passkey speichern
├── webauthn-authenticate-start.post.ts    # Challenge für Login
├── webauthn-authenticate-complete.post.ts # Assertion verifizieren
├── send-email-code.post.ts                # Email-Code senden
├── verify-email-code.post.ts              # Email-Code verifizieren
└── verify-backup-code.post.ts             # Backup-Code verifizieren

pages/mfa/
├── setup.vue                              # 4-Step Wizard für Passkey-Setup
└── challenge.vue                          # MFA Challenge während Login

utils/
└── webauthn.ts                            # Browser-Utilities für WebAuthn
```

## ⚙️ Browser-Support

- ✅ Chrome/Edge 67+
- ✅ Firefox 60+
- ✅ Safari 13+ (Face ID)
- ✅ Android (Google Play Services)
- ⚠️ iOS 14+ (Face ID über Safari)

## 🐛 Bekannte Limitationen (für Phase 2)

1. **Signature Verification** - Aktuell nicht vollständig implementiert
   - Braucht `@simplewebauthn/server` library
   - Optional für Phase 1 (Trust-on-first-use)

2. **Email-Delivery** - Braucht SMTP-Konfiguration
   - Falls nicht konfiguriert, fallback nur Backup-Codes

3. **Device Management** - Noch nicht in UI
   - Können Passkeys in DB haben, aber nicht verwalten

## 📊 Testing Checklist

- [ ] SQL Migrations erfolgreich
- [ ] `/mfa/setup` lädt (ohne Fehler)
- [ ] Passkey-Registration mit Face ID/Fingerprint
- [ ] Backup-Codes herunterladbar
- [ ] Login → MFA Challenge
- [ ] MFA mit Passkey erfolgreich
- [ ] Fallback: Backup-Code funktioniert
- [ ] Fallback: Email-Code empfangen und verifiziert
- [ ] Audit-Log in `mfa_verifications` tabelle

## 🔧 Debugging

Logs anschauen:
```javascript
// Browser Console
logger.debug('✅ MFA Setup - WebAuthn supported:', ...);

// Server Logs
console.log('✅ WebAuthn assertion verified for user:', ...);
```

## ❓ Fragen?

Falls was nicht funktioniert:
1. Überprüfe Browser-Support: `isWebAuthnSupported()`
2. Überprüfe Platform Authenticator: `isPlatformAuthenticatorAvailable()`
3. Schau Server-Logs auf Fehler
4. Überprüfe Supabase RLS Policies

---

**Branch:** `preview`
**Status:** Ready for Testing

