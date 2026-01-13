# MFA Enforcement und Failed Login Attempt Tracking - Implementierungsplan

## Überblick
Implementierung eines umfassenden Sicherheitssystems zur Begrenzung fehlgeschlagener Login-Versuche mit progressiver MFA-Erzwingung.

## Komponenten

### 1. Datenbankänderungen
- `20250229_add_mfa_enforcement_tracking.sql`: Hauptmigration
  - Neue Spalten in `users`: `failed_login_attempts`, `last_failed_login_at`, `mfa_required_until`, `account_locked_until`
  - `login_security_rules` Tabelle: Konfigurierbare Sicherheitsrichtlinien pro Tenant
  - Funktionen: `check_login_security_status()`, `record_failed_login()`, `reset_failed_login_attempts()`, `unlock_account()`
  - Views: `failed_login_activity`

- `20250229_create_mfa_login_tables.sql`: MFA-Tabellen
  - `mfa_methods`: Speichert user MFA-Methoden (SMS, Email, TOTP, WebAuthn)
  - `mfa_login_codes`: Temporäre Codes während Login
  - `mfa_failed_attempts`: Verfolgung fehlgeschlagener MFA-Versuche
  - Views: `mfa_setup_status`

### 2. Backend-Änderungen

#### Login-Endpoint (`server/api/auth/login.post.ts`)
- Vor dem Login-Versuch: Sicherheitsstatus prüfen
- Nach fehlgeschlagenem Login: `record_failed_login()` aufrufen
  - Wenn MFA erforderlich: `{ requiresMFA: true }` zurückgeben
  - Wenn Account gesperrt: 423 Fehler
  - Wenn IP blockiert: 429 Fehler
- Nach erfolgreichem Login: `reset_failed_login_attempts()` aufrufen

#### Neue API-Endpoints
1. `GET /api/auth/get-mfa-methods.post.ts`: Ruft verfügbare MFA-Methoden ab
2. `POST /api/auth/send-mfa-code.post.ts`: Versendet MFA-Code (SMS/Email)
3. `POST /api/auth/verify-mfa-login.post.ts`: Verifiziert MFA-Code und komplettiert Login

### 3. Frontend-Änderungen

#### Composable (`composables/useMFAFlow.ts`)
- State für MFA-Fluss
- Funktionen:
  - `handleMFARequired()`: Initialisiert MFA
  - `sendMFACode()`: Versendet Code
  - `verifyMFACode()`: Verifiziert Code und schließt Login ab

#### Login-Seite (`pages/login.vue`)
- Zwei Zustände: Normal Login + MFA-Verifikation
- Im MFA-Modus:
  - Zeige verfügbare MFA-Methoden
  - Input für Code
  - Button zum Neuversand des Codes

## Sicherheitsregeln (konfigurierbar pro Tenant)

Standard-Konfiguration:
- **5 fehlgeschlagene Versuche**: MFA erforderlich (60 Minuten)
- **10 fehlgeschlagene Versuche**: Account gesperrt (30 Minuten)
- **20 Versuche pro IP (24h)**: IP blockiert
- **Versuch für Wallee WebAuthn**: Noch zu implementieren

## Flow

### Normaler Login (wenig Versuche)
```
1. Benutzer gibt Email + Passwort
2. Server prüft Sicherheitsstatus
3. Normaler Login
4. reset_failed_login_attempts()
5. Erfolgreich angemeldet
```

### Nach 5 fehlgeschlagenen Versuchen
```
1. Benutzer gibt falsche Anmeldedaten
2. record_failed_login() -> mfa_required_until = NOW() + 60min
3. Backend gibt { requiresMFA: true } zurück
4. Frontend zeigt MFA-Eingabe
5. Benutzer bestätigt mit MFA-Code
6. verify-mfa-login() verifiziert Code
7. Erfolgreich angemeldet, failed_login_attempts = 0
```

### Nach 10 fehlgeschlagenen Versuchen
```
1. record_failed_login() -> account_locked_until = NOW() + 30min
2. Backend gibt 423 error zurück
3. Frontend zeigt Sperrmeldung
4. Nach 30 Minuten: Account automatisch entsperrt (wenn keine Sperre > 10x)
```

### Nach 20 Versuche pro IP
```
1. System blockiert IP in blocked_ip_addresses
2. Neue Login-Versuche von dieser IP -> 429 error
3. Admin kann IP manuell entsperren
```

## Zu implementieren

1. **SQL-Migrations ausführen**:
   ```bash
   # In Supabase SQL Editor ausführen:
   - 20250229_add_mfa_enforcement_tracking.sql
   - 20250229_create_mfa_login_tables.sql
   ```

2. **Login-Seite erweitern**: MFA-UI-Komponente hinzufügen

3. **SMS/Email-Versand implementieren**: 
   - Integration mit SMS-Provider (Twilio, etc.)
   - Email-Template für MFA-Codes

4. **Admin-Panel für Sicherheitsregeln**:
   - Auflistung von `login_security_rules`
   - Gesperrte IPs verwalten
   - Manuelle Account-Entsperrung

5. **Monitoring**:
   - Dashboard für fehlgeschlagene Versuche
   - Alerts bei verdächtiger Aktivität

## Testing

1. **Normale Anmeldung**: Sollte funktionieren wie bisher
2. **5 Versuche**: MFA sollte erforderlich sein
3. **10 Versuche**: Account sollte gesperrt sein
4. **MFA-Verifikation**: Mit verschiedenen Codes (gültig/ungültig)
5. **IP-Blocking**: Mehrere Accounts versuchen



