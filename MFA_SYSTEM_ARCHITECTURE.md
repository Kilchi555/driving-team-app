# MFA Enforcement System - Architektur-Übersicht

## Login-Fluss mit progressiver MFA-Erzwingung

```
┌─────────────────────────────────────────────────────────────────┐
│                    NORMALER LOGIN-FLUSS                         │
└─────────────────────────────────────────────────────────────────┘

    BENUTZER GIBT EMAIL + PASSWORT
            │
            ▼
    [Sicherheitsstatus prüfen]
            │
     ┌──────┴──────┐
     │             │
  ERLAUBT      BLOCKIERT
     │             │
     ▼             ▼
  LOGIN      (429/403 Error)
     │
 ┌───┴───┐
 │       │
ERFOLG  FEHLER
 │       │
 ▼       ▼
[Reset] [record_failed_login()]
       │
  ┌────┴────┐
  │          │
 <5        ≥5
  │         │
  ▼         ▼
FEHLER     MFA
         ERFORDERLICH

┌─────────────────────────────────────────────────────────────────┐
│              MFA-VERIFIKATIONS-FLUSS (nach 5 Versuchen)         │
└─────────────────────────────────────────────────────────────────┘

    MFA ERFORDERLICH
           │
    ┌──────▼──────┐
    │ MFA-Methode │
    │  auswählen  │
    └──────┬──────┘
           │
      [wähle: SMS/Email/TOTP]
           │
           ▼
    [Code versenden]
           │
    Code eingeben
           │
           ▼
    [Code verifizieren]
           │
      ┌────┴────┐
      │          │
     OK        FEHLER
     │          │
     ▼          ▼
   LOGIN     [3 Versuche]
   ✓          │
          ┌────▴────┐
          │          │
        <3         ≥3
        │          │
        ▼          ▼
      FEHLER    BLOCKIERT
            (423 Error)

┌─────────────────────────────────────────────────────────────────┐
│           PROGRESSIVE LOCKOUT-ESKALATION (10+ Versuche)         │
└─────────────────────────────────────────────────────────────────┘

    failed_login_attempts
           │
    ┌──────┼──────┬──────────┐
    │      │      │          │
   1-4    5     10          20
    │      │      │          │
    ▼      ▼      ▼          ▼
   OK    MFA   LOCK      BLOCK IP
   ✓     REQ   ACCOUNT   (24h)
        (60min) (30min)

┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                              │
└─────────────────────────────────────────────────────────────────┘

USERS (erweitert)
├── id
├── email
├── role
├── ...
├── failed_login_attempts [0]
├── last_failed_login_at [NULL]
├── mfa_required_until [NULL]
├── account_locked_until [NULL]
└── account_locked_reason [NULL]
     │
     ├─ MFA_METHODS
     │  ├── id
     │  ├── user_id (FK)
     │  ├── type (sms|email|totp)
     │  ├── destination
     │  ├── verified
     │  └── last_used_at
     │
     └─ MFA_LOGIN_CODES
        ├── id
        ├── user_id (FK)
        ├── method_id (FK)
        ├── code_hash
        ├── expires_at
        └── used_at

LOGIN_SECURITY_RULES
├── id
├── tenant_id (FK)
├── max_failed_attempts_before_mfa [5]
├── max_failed_attempts_before_lockout [10]
├── lockout_duration_minutes [30]
├── mfa_required_duration_minutes [60]
├── max_failed_attempts_per_ip_24h [20]
└── auto_block_ip_after_attempts [20]

LOGIN_ATTEMPTS
├── id
├── email
├── user_id (FK)
├── ip_address
├── success (true|false)
├── error_message
└── attempted_at

BLOCKED_IP_ADDRESSES
├── id
├── ip_address
├── blocked_at
├── reason
├── unblocked_at
└── ...

┌─────────────────────────────────────────────────────────────────┐
│                   API-FLUSS (Backend → DB)                      │
└─────────────────────────────────────────────────────────────────┘

[1] POST /api/auth/login
    │
    ├─→ check_login_security_status()
    │   └─→ prüft: mfa_required_until, account_locked_until
    │
    ├─→ supabase.auth.signInWithPassword()
    │   │
    │   ├─ FEHLER:
    │   │   │
    │   │   └─→ record_failed_login()
    │   │       ├─ INCREMENT failed_login_attempts
    │   │       ├─ SET mfa_required_until (wenn ≥5)
    │   │       ├─ SET account_locked_until (wenn ≥10)
    │   │       └─ INSERT into blocked_ip_addresses (wenn ≥20)
    │   │
    │   └─ ERFOLG:
    │       │
    │       └─→ reset_failed_login_attempts()
    │           └─ SET failed_login_attempts = 0
    │
    └─→ Antwort
        ├─ {success: true, session...} ✓
        ├─ {success: false, requiresMFA: true} (MFA erforderlich)
        └─ Fehler (429/423/403)

[2] GET /api/auth/get-mfa-methods
    │
    └─→ SELECT * FROM mfa_methods WHERE verified=true

[3] POST /api/auth/send-mfa-code
    │
    ├─→ generateSecureCode() → "123456"
    ├─→ hashCode() → "hash..."
    ├─→ INSERT into mfa_login_codes
    ├─→ sendSMS() oder sendEmail()
    └─→ Antwort: {success: true}

[4] POST /api/auth/verify-mfa-login
    │
    ├─→ SELECT * FROM mfa_login_codes (recent)
    ├─→ verifyCodeHash(code, hash)
    ├─→ supabase.auth.signInWithPassword() (nochmal)
    ├─→ DELETE FROM mfa_login_codes (cleanup)
    ├─→ reset_failed_login_attempts()
    └─→ Antwort: {success: true, session...} oder Fehler

┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND - COMPOSABLE USAGE                    │
└─────────────────────────────────────────────────────────────────┘

const mfaFlow = useMFAFlow()

// Nach Login-Fehler mit requiresMFA=true:
await mfaFlow.handleMFARequired(email)
// → state.availableOptions = [{type:'sms', ...}, {type:'email', ...}]

// Benutzer wählt Methode:
mfaFlow.selectMFAMethod('method-id')

// Code versenden:
await mfaFlow.sendMFACode()
// → SMS/Email mit Code wird versendet

// Benutzer gibt Code ein:
mfaFlow.updateCode('123456')

// Code verifizieren:
const result = await mfaFlow.verifyMFACode(password)
if (result.success) {
  // Login erfolgreich!
  navigateTo('/dashboard')
} else {
  // Fehler - Versuche noch vorhanden
}

┌─────────────────────────────────────────────────────────────────┐
│              SECURITY FUNCTIONS (PostgreSQL)                   │
└─────────────────────────────────────────────────────────────────┘

check_login_security_status(email, ip, tenant_id)
  ├─ INPUT: Email, IP-Adresse, Tenant
  └─ OUTPUT: {allowed, reason, mfa_required, account_locked, remaining_attempts}
      └─ Prüft: mfa_required_until, account_locked_until, IP-Blockierung

record_failed_login(email, ip, tenant_id)
  ├─ INPUT: Email, IP-Adresse, Tenant
  ├─ PROCESS:
  │  ├─ INCREMENT failed_login_attempts
  │  ├─ SET mfa_required_until (wenn ≥5)
  │  ├─ SET account_locked_until (wenn ≥10)
  │  └─ Prüfe IP-Blocking (wenn ≥20)
  └─ OUTPUT: {require_mfa, lock_account, should_block_ip}

reset_failed_login_attempts(user_id)
  ├─ INPUT: User ID
  ├─ ACTION: SET failed_login_attempts = 0
  └─ USE: Nach erfolgreichem Login

unlock_account(user_id)
  ├─ INPUT: User ID
  ├─ ACTION: SET account_locked_until = NULL
  └─ USE: Admin-Aktion oder automatisch nach Timeout

┌─────────────────────────────────────────────────────────────────┐
│                    KONFIGURATION (Settings)                     │
└─────────────────────────────────────────────────────────────────┘

Per Tenant in login_security_rules:
├─ max_failed_attempts_before_mfa [5]
│  └─ Nach wie vielen Versuchen MFA erforderlich
│
├─ max_failed_attempts_before_lockout [10]
│  └─ Nach wie vielen Versuchen Account gesperrt
│
├─ lockout_duration_minutes [30]
│  └─ Wie lange Account gesperrt bleibt
│
├─ mfa_required_duration_minutes [60]
│  └─ Wie lange MFA-Anforderung gültig
│
├─ max_failed_attempts_per_ip_24h [20]
│  └─ Nach wie vielen Versuche pro IP (24h) IP blockiert
│
└─ auto_block_ip_after_attempts [20]
   └─ Bei welchem Versuch IP automatisch blockiert wird



