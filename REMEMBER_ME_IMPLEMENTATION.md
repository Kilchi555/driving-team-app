## "Angemeldet bleiben" (Remember Me) - Funktionsweise

### Problem
Tokens von Supabase laufen nach **1 Stunde** ab. Ohne Token Refresh führt das dazu, dass Nutzer automatisch ausgeloggt werden, selbst wenn sie "Angemeldet bleiben" angecheckt haben.

### Lösung
Ein **automatisches Token Refresh System**, das die Tokens erneuert, *bevor* sie ablaufen.

---

## Architektur

### 1. Login Flow mit "Angemeldet bleiben"

```
User clickt "Angemeldet bleiben" ✅
        ↓
Login-Form sendet: { email, password, rememberMe: true }
        ↓
Backend (POST /api/auth/login) setzt:
  - Access Token Cookie: maxAge = 7 days (604800 seconds)
  - Refresh Token Cookie: maxAge = 7 days
  - HTTP-Only, Secure, SameSite=lax
        ↓
Frontend erhält Session mit Tokens
        ↓
Client initialisiert Token Refresh Interceptor ✅
```

### 2. Session Persistence während HMR/Reload

- **localStorage** speichert User Metadata (NICHT die echten Tokens!)
- **HTTP-Only Cookies** speichern die echten Tokens (nicht JS-zugänglich)
- Bei jedem Reload/HMR: Plugin prüft Cookies → Session restored
- Siehe: `/plugins/00-session-persist.client.ts`

### 3. Token Refresh Mechanism (NEW)

**Plugin:** `/plugins/02-supabase-auth-interceptor.client.ts`

```typescript
// Alle 30 Sekunden Check:
1. Hole aktuelle Session von Supabase
2. Prüfe: "Verbleibende Zeit bis Expiry < 5 Minuten?"
3. JA → Rufe POST /api/auth/refresh auf
4. Backend dekryptiert Refresh Token aus Cookie → Supabase erneuert Tokens
5. Neue Tokens in HTTP-Only Cookies gespeichert
6. Client: setSession() mit neuen Tokens
```

**Ablauf bei Expiry:**
```
Token läuft ab (expires_in = 3600 seconds)
        ↓
Interceptor erklärt nach ~55 Minuten (5 Min vor Expiry)
        ↓
POST /api/auth/refresh aufgerufen
        ↓
Refresh Token aus Cookie gelesen
        ↓
Supabase.auth.refreshSession() erzeugt neue Tokens
        ↓
Neue HTTP-Only Cookies gesetzt
        ↓
Client: Supabase Session mit neuen Tokens aktualisiert
        ↓
User bleibt angemeldet! ✅ (Transparent, kein Interrupt)
```

---

## Implementation Details

### Frontend-Komponenten

| File | Zweck |
|------|-------|
| `/plugins/02-supabase-auth-interceptor.client.ts` | Token Refresh alle 30s |
| `/pages/login.vue` | "Angemeldet bleiben" Checkbox |
| `/stores/auth.ts` | Auth State Management |

### Backend-Komponenten

| File | Zweck |
|------|-------|
| `/server/api/auth/login.post.ts` | Setzt Cookies mit `rememberMe` Duration |
| `/server/api/auth/refresh.post.ts` | Token Refresh Endpoint |
| `/server/utils/cookies.ts` | Cookie-Management |

### Cookie Konfiguration

**Ohne "Angemeldet bleiben":**
```javascript
maxAge: 3600 // 1 Stunde
HTTP-Only: true
Secure: true (production)
SameSite: lax
```

**Mit "Angemeldet bleiben":**
```javascript
maxAge: 604800 // 7 Tage
HTTP-Only: true
Secure: true (production)
SameSite: lax
```

---

## Sicherheitsmerkmale

✅ **HTTP-Only Cookies**
- Tokens sind nicht zugänglich für JavaScript
- Schutz vor XSS Attacken
- Automatisch in alle Requests mitgesendet

✅ **Secure Flag** 
- Cookies nur über HTTPS (Production)
- Schutz vor MITM Attacken

✅ **SameSite=lax**
- CSRF Protection
- Cookies in Top-Level Navigation gesendet
- Bei Cross-Site Requests nicht gesendet

✅ **Token Refresh**
- Tokens werden erneuert *bevor* sie ablaufen
- Refresh Token ist in HTTP-Only Cookie (sicher gespeichert)
- User Session bleibt kontinuierlich aktiv

✅ **Session Cleanup**
- Logout löscht HTTP-Only Cookies
- localStorage wird geleert
- Supabase Session wird signOut()

---

## Fehlerbehandlung

**Fall 1: Refresh Token abgelaufen**
```
Refresh Attempt fehlgeschlagen (401)
        ↓
Token Interceptor erkennt Fehler
        ↓
Tenant Slug geladen (aus userProfile oder localStorage)
        ↓
User weitergeleitet zu /:slug (Tenant Login Page)
        ↓
Auth State geleert
        ↓
User sieht Login Form (nicht /login sondern /:slug) ✅
```

**Fall 2: Cookies gelöscht (z.B. Browser Cache Clear)**
```
Token Refresh kann nicht gestartet werden (kein Cookie)
        ↓
Client versucht API Calls ohne Cookies
        ↓
Backend antwortet mit 401
        ↓
Fetch Interceptor leitet zu /:slug um
        ↓
Tenant Login Page wird angezeigt ✅
```

**Fall 3: Session Refresh fehlgeschlagen (Netzwerk)**
```
Refresh Endpoint zeitlimit überschritten
        ↓
Client wartet 30 Sekunden
        ↓
Nächster Refresh Versuch gestartet
        ↓
Wenn wieder fehlgeschlagen: Wird wie "Fall 1" behandelt
```

---

## Testen

### Lokale Tests

```bash
# Test 1: Token Refresh in Action
1. Anmelden mit "Angemeldet bleiben" ✅
2. DevTools → Network Tab
3. Nach ~5 Minuten prüfen: POST /api/auth/refresh wird aufgerufen
4. Response: status 200 mit neuem Access Token

# Test 2: Session After 1 Hour
1. Anmelden mit "Angemeldet bleiben"
2. Warte 55-60 Minuten
3. Prüfe: Refresh erfolgte automatisch
4. API Calls funktionieren noch

# Test 3: Browser Close & Reopen (7 Tage)
1. Anmelden mit "Angemeldet bleiben"
2. Browser schließen
3. Nach 5 Minuten wieder öffnen
4. Prüfe: User ist noch angemeldet ✅
```

### Browser Devtools Checks

```javascript
// Console: Tokens prüfen
document.cookie // HTTP-Only Cookies sind hier NICHT sichtbar (✅ Sicherheit!)

// Aber Sie können die Token Refresh Logs sehen:
// 🔄 Starting Supabase token refresh interceptor
// 🔄 Token expiring soon, attempting refresh...
// ✅ Token refreshed successfully
// ✅ Supabase session updated with new tokens
```

---

## Szenarios

### Szenario 1: Normal anmelden (ohne "Angemeldet bleiben")
- ✅ Session 1 Stunde gültig
- ❌ Nach 1 Stunde wird User automatisch ausgeloggt
- ❌ Browser Restart = Login erforderlich

### Szenario 2: Mit "Angemeldet bleiben"
- ✅ Session 7 Tage gültig
- ✅ Tokens werden automatisch erneuert (transparent)
- ✅ Nach Browser Restart = noch angemeldet (7 Tage)
- ✅ Wechsel zwischen Tabs = Session bleibt aktiv

### Szenario 3: Suspicious Activity
- Token Refresh funktioniert wie normal
- Zusätzliche Sicherheitschecks beim Login
- IP-Blocking falls verdächtige Aktivität

---

## Deployment Checklist

- [ ] `ENCRYPTION_KEY` in Vercel Env Vars gesetzt
- [ ] `/server/api/auth/refresh.post.ts` deployiert
- [ ] `/plugins/02-supabase-auth-interceptor.client.ts` im Bundle
- [ ] `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` konfiguriert
- [ ] HTTPOnly Cookies in Production-Cookies korrekt gesetzt
- [ ] Token Refresh Logs in Production beobachtet

---

## Troubleshooting

**Problem: User wird nach 1 Stunde ausgeloggt trotz "Angemeldet bleiben"**

Check:
1. Ist `/plugins/02-supabase-auth-interceptor.client.ts` im Build?
2. Browser Console: Sehe ich "Token expiring soon" Logs?
3. Network Tab: Wird POST /api/auth/refresh aufgerufen?
4. Cookies: Sind `sb-auth-token` und `sb-refresh-token` gesetzt?

**Problem: Token Refresh gibt 401 Unauthorized**

Check:
1. Ist `SUPABASE_SERVICE_ROLE_KEY` in ENV vars konfiguriert?
2. Sind Refresh Token Cookies intakt?
3. Hat der Refresh Token abgelaufen (> 7 Tage)? → Neu Anmelden erforderlich

**Problem: Browser Cache Clear → Session weg**

Das ist erwartetes Verhalten:
- localStorage mit Session Cache wird gelöscht
- HTTP-Only Cookies werden gelöscht
- User muss sich neu anmelden
- (Das ist sicher und gewünscht!)

---

## Zusammenfassung

| Feature | Ohne "Angemeldet bleiben" | Mit "Angemeldet bleiben" |
|---------|---------------------------|------------------------|
| Session Dauer | 1 Stunde | 7 Tage |
| Token Auto-Refresh | ❌ Nein | ✅ Ja (alle 30s Check) |
| Persistenz bei Restart | ❌ Nein | ✅ Ja |
| Transparenter Logout | ❌ Nach 1h | ✅ Nach 7 Tagen |
| Security Level | ✅ Hoch | ✅ Hoch + Auto-Refresh |
