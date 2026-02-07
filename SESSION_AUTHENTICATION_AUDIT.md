# SESSION MANAGEMENT AUDIT - HTTP-Only Cookie Implementation
## Authentifizierungskrise: Fehlgeschlagene Session-Wiederherstellung

**Datum:** 2026-02-06  
**Status:** 🚨 KRITISCH - Viele User können sich nicht anmelden  
**Fehler:** `❌ [current-user] No authenticated user found` / `Unauthorized - No valid session`

---

## 1. PROBLEM-ÜBERSICHT

### Symptome
- **Auftrittsort:** Vercel (production)
- **Häufigkeit:** Sehr häufig in Logs
- **Betroffene User:** Viele
- **Auslöser:** Nach Cookie-Struktur-Änderungen für HTTP-Only Security

### Fehler-Quelle-Trace
```
❌ [current-user] No authenticated user found
❌ [current-user] Error: Unauthorized - No valid session
```

Diese Fehler stammen aus `server/api/auth/current-user.get.ts` (Zeile 22-26):
```typescript
if (!authUser) {
  logger.warn('❌ [current-user] No authenticated user found')
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized - No valid session'
  })
}
```

---

## 2. TECHNISCHE ANALYSE

### 2.1 Login-Prozess (✅ Funktioniert)
**Datei:** `server/api/auth/login.post.ts` (Zeile 365-369)

```typescript
// Set httpOnly cookies for session (secure, XSS-protected)
setAuthCookies(event, data.session.access_token, data.session.refresh_token, {
  rememberMe,
  maxAge: sessionDuration
})
logger.debug('✅ Session cookies set (httpOnly, secure, sameSite)')
```

**Cookie-Struktur:**
- Name: `sb-auth-token` (access token)
- Name: `sb-refresh-token` (refresh token)
- Flags: `httpOnly=true`, `secure=true` (Prod), `sameSite=lax`, `path=/`
- TTL: 1h (normal) / 7d (Remember Me)

**Status:** ✅ Login setzt Cookies korrekt

---

### 2.2 Session-Wiederherstellung (❌ Funktioniert NICHT)
**Datei:** `server/api/auth/current-user.get.ts` (Zeile 16-26)

```typescript
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)  // ← HIER scheitert es
    
    if (!authUser) {
      logger.warn('❌ [current-user] No authenticated user found')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }
```

**Der Aufruf delegiert zu:** `server/utils/auth.ts` (Zeile 9-130)

**Status:** ❌ `getAuthenticatedUser()` gibt `null` zurück

---

### 2.3 Cookie-Parsing in `getAuthenticatedUser()` (Die Wurzel des Fehlers)
**Datei:** `server/utils/auth.ts` (Zeile 19-61)

```typescript
// Attempt 1: Suche nach Authorization header
let token = null
const authHeader = event.node.req.headers.authorization
if (authHeader?.startsWith('Bearer ')) {
  token = authHeader.substring(7)
  logger.debug('🔐 Auth token from Authorization header')
}

// Attempt 2: Suche in Cookies (HTTP-only)
if (!token) {
  const cookies = event.node.req.headers.cookie
  if (cookies) {
    const cookieArray = cookies.split(';').map(c => c.trim())
    
    for (const cookie of cookieArray) {
      if (!cookie.includes('=')) continue
      
      const [name, ...valueParts] = cookie.split('=')
      const cookieName = name.trim()
      const value = valueParts.join('=')
      
      // ⚠️ KRITISCHES PROBLEM: Cookie-Namen-Matching
      if (cookieName === 'sb-session' || cookieName === 'sb-auth-token' || 
          (cookieName.startsWith('sb-') && (cookieName.includes('session') || 
           cookieName.includes('auth') || cookieName.includes('refresh')))) {
        // ... Token-Parsing ...
      }
    }
  }
}
```

**Analyse der Cookie-Matching-Logik:**

1. ✅ **Zielcookie:** `sb-auth-token` (wird in Produktion gesetzt)
2. ✅ **Fallback 1:** `sb-session` (alte Naming-Konvention)
3. ✅ **Fallback 2-4:** `sb-*` mit `session`, `auth`, `refresh`
4. ⚠️ **Problem:** Reihenfolge und Bedingungen

---

### 2.4 Token-Extraktion aus Cookie
**Datei:** `server/utils/auth.ts` (Zeile 36-54)

```typescript
try {
  const decoded = decodeURIComponent(value)
  
  // Try parsing as JSON (Supabase format)
  try {
    const sessionData = JSON.parse(decoded)
    if (sessionData?.access_token) {
      token = sessionData.access_token  // ← Extract from JSON
      logger.debug('🔐 Auth token from HTTP-only cookie (JSON format)')
      break
    }
  } catch {
    // Fallback: Maybe it's just the token directly
    if (decoded && decoded.length > 20) {
      token = decoded  // ← Use as-is
      logger.debug('🔐 Auth token from HTTP-only cookie (direct format)')
      break
    }
  }
} catch (e) {
  // Failed to parse cookie
}
```

**Problem:** Hier könnte die Cookie-Value-Struktur nicht dem erwarteten Format entsprechen.

---

### 2.5 Token-Verifikation mit Supabase
**Datei:** `server/utils/auth.ts` (Zeile 63-90)

```typescript
if (!token) {
  logger.debug('⚠️ No authentication token found')  // ← HIER LANDEN FEHLGESCHLAGENE SESSIONS
  return null
}

// Verify the token with Supabase
const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseKey
  }
})

if (!response.ok) {
  logger.debug('⚠️ Token verification failed:', response.statusText)  // ← ODER HIER
  return null
}
```

**Kritische Punkte:**
1. Wenn `token` `null` ist → keine Verifikation → `null` zurück ✅ (korrekt)
2. Wenn Token extrahiert aber **ungültig** → Supabase antwortet mit non-200 → `null` zurück ✅ (korrekt)

---

## 3. ROOT-CAUSE ANALYSE

### Hypothese 1: Cookie wird nicht vom Browser gesendet
**Szenario:** Browser setzt Cookie nicht korrekt oder sendet es nicht zurück

**Warum könnte das passieren:**
- `secure: true` in Production → Cookie nur über HTTPS
- `sameSite: lax` → Cookie wird bei Cross-Site-Requests nicht gesendet
- `httpOnly: true` → Browser versteckt es (sollte aber trotzdem senden)
- Domain-Mismatch: Cookie für `simy.ch`, aber Request von `preview.simy.ch`?
- Path-Mismatch: Cookie für `/api`, Request aber zu `/api/auth/...`?

**Symptom im Log:**
```
cookies = undefined  → event.node.req.headers.cookie ist null
token = null         → Kein Cookie gefunden
authUser = null      → Rückgabe null
401 Unauthorized     → Error geworfen
```

---

### Hypothese 2: Cookie wird gesendet, aber nicht richtig geparst
**Szenario:** Browser sendet Cookie, aber `getAuthenticatedUser()` extrahiert den Token nicht

**Mögliche Gründe:**
- Cookie-Name stimmt nicht überein (z.B. mit Query-Parametern verschmutzt)
- Cookie-Wert wurde bei der URL-Kodierung beschädigt
- Cookie-Struktur hat sich geändert (JSON vs. direkter Token)
- Spaces/Trimming-Problem beim Parsing

**Symptom im Log:**
```
cookies = "sb-auth-token=..."  → existiert
Token-Matching-Logik schlägt fehl
token = null
```

---

### Hypothese 3: Token wird extrahiert, aber ist abgelaufen
**Szenario:** Cookie wird korrekt geparst, aber Token ist inzwischen abgelaufen

**Mögliche Gründe:**
- `maxAge` falscher Wert
- Systemzeit-Drift zwischen Client und Server
- Token-TTL in Supabase kürzer als Cookie-TTL

**Symptom im Log:**
```
token = "eyJ..."  → extrahiert
Supabase antwortet: 401 Unauthorized
logger.debug('⚠️ Token verification failed')
```

---

### Hypothese 4: Cross-Origin/CORS-Problem
**Szenario:** Cookies werden bei API-Calls nicht mit gesendet

**Mögliche Gründe:**
- Frontend macht `fetch()` ohne `credentials: 'include'`
- CORS-Headers nicht korrekt konfiguriert
- Subdomain unterscheidet sich (z.B. `www.simy.ch` vs `simy.ch`)

**Symptom im Log:**
```
Authorization header missing
Cookie header missing
token = null
```

---

## 4. KRITISCHE CODE-PUNKTE

### Kritischer Punkt 1: Cookie-Matching-Logik
**Datei:** `server/utils/auth.ts:34-35`

```typescript
// ⚠️ PROBLEM: Diese Bedingung ist zu komplex und könnte nicht richtig treffen
if (cookieName === 'sb-session' || cookieName === 'sb-auth-token' || 
    (cookieName.startsWith('sb-') && (cookieName.includes('session') || 
     cookieName.includes('auth') || cookieName.includes('refresh')))) {
```

**Risiken:**
- `sb-auth-token` trifft die 2. Bedingung ✅
- Aber: Was wenn Cookie-Wert leer ist?
- Was wenn der dritte `||` zu breit ist und andere Cookies matched?

---

### Kritischer Punkt 2: Token-Verifikation
**Datei:** `server/utils/auth.ts:63-88`

```typescript
if (!token) {
  logger.debug('⚠️ No authentication token found')
  return null
}
```

**Problem:** Hier wird nicht geloggt, **warum** kein Token gefunden wurde:
- Wurde Cookie nicht gesendet?
- War Cookie leer?
- War Cookie ungültig formatiert?

---

### Kritischer Punkt 3: Error-Logging
**Datei:** `server/utils/auth.ts:126-129`

```typescript
} catch (error: any) {
  console.error('❌ Error getting authenticated user:', error)
  return null
}
```

**Problem:** Fehler werden schlecht geloggt → Debugging ist schwierig

---

## 5. DOMAIN/PATH-ANALYSE

### Cookies.ts Cookie-Konfiguration
```typescript
setCookie(event, COOKIE_NAME, accessToken, {
  httpOnly: true,
  secure: isProduction,     // ← Nur true in Production!
  sameSite: 'lax',
  maxAge: cookieMaxAge,
  path: '/'                 // ← Sollte funktionieren
})
```

**Fragen:**
- Ist `path: '/'` wirklich korrekt? (Ja, sollte alle Routen abdecken)
- Fehlt `domain` Attribute? (Sollte nicht nötig sein für gleiche Domain)
- Sollte `sameSite: 'lax'` sein oder `'strict'`? (lax ist richtig für OAuth-Flows)

---

## 6. BROWSER-SICHT: Hypothetischer Flow

### Was der Browser SOLLTE tun:
```
1. User klickt "Login"
2. Browser sendet POST /api/auth/login (mit Email/Pass)
3. Server antwortet mit Set-Cookie Headers:
   Set-Cookie: sb-auth-token=eyJ...; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Path=/
   Set-Cookie: sb-refresh-token=abc...; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
4. Browser speichert Cookies lokal
5. User macht next request
6. Browser sendet AUTOMATISCH:
   Cookie: sb-auth-token=eyJ...; sb-refresh-token=abc...
7. Server liest Cookies aus event.node.req.headers.cookie
8. Server extrahiert Token und verifiziert mit Supabase
```

### Was TATSÄCHLICH passiert (bei Fehler):
```
1-3: ✅ Funktioniert - Login-Response hat Set-Cookie
4-5: ❌ Vermutlich HIER geht was schief - Browser speichert nicht oder sendet nicht
6: ❌ Cookie fehlt im nächsten Request
7-8: ❌ event.node.req.headers.cookie ist undefined/leer
```

---

## 7. VERGLEICH: Alte vs. Neue Implementierung

### Was sich geändert hat:
| Aspekt | Alt | Neu | Problem? |
|--------|-----|-----|----------|
| Cookie-Name | Vermutlich `sb-session` oder custom | `sb-auth-token` | ⚠️ Client erkennt neuen Namen nicht |
| httpOnly | Unsicher? | ✅ true | ✅ Sicherheit OK |
| secure | Mixed? | Production: true | ⚠️ Localhost/Dev broken? |
| sameSite | ? | `lax` | ⚠️ Könnte zu restriktiv sein |
| Token-Format | JSON im Cookie? | Direkter Token? | ⚠️ Parsing erwartet JSON? |

---

## 8. DEBUGGING-STRATEGIE

### Was wir überprüfen müssen:

1. **Browser Dev Tools:**
   - Werden Cookies überhaupt gesetzt? (`Application → Cookies`)
   - Haben sie `HttpOnly` Flag? (Sollte ja sein)
   - Haben sie korrekte Domain/Path?
   - Sind sie **abgelaufen**?

2. **Network Tab:**
   - POST /api/auth/login Response-Header: `Set-Cookie` vorhanden?
   - Nachfolgende GET /api/auth/current-user Request: `Cookie` Header vorhanden?

3. **Server Logs:**
   ```
   Suche nach:
   - "Auth token from HTTP-only cookie"? (Ja → Token wird geparst)
   - "No authentication token found"? (Ja → Cookie wird nicht gesendet)
   - "Token verification failed"? (Ja → Token ungültig/abgelaufen)
   ```

4. **Spezifische Fehler:**
   - Unterschiedliches Verhalten auf `simy.ch` vs `preview.simy.ch` vs Localhost?
   - Unterschiedlich für verschiedene User?
   - Unterschiedlich nach Browser-Neustart?

---

## 9. WAHRSCHEINLICHE URSACHEN (Ranking)

1. **🔴 SEHR WAHRSCHEINLICH:** Cookies werden bei Requests nicht gesendet
   - Grund: `sameSite: lax` oder Domain-Mismatch
   - Fix: Browser-Settings überprüfen, CORS anpassen

2. **🔴 WAHRSCHEINLICH:** Cookie-Wert-Format unterscheidet sich von Parsing-Erwartung
   - Grund: Supabase gibt möglicherweise JSON zurück, nicht nur Token
   - Fix: Token-Parsing-Logik überprüfen

3. **🟡 MÖGLICH:** Token ist abgelaufen
   - Grund: `maxAge`-Berechnung falsch
   - Fix: Timing überprüfen

4. **🟡 MÖGLICH:** Fehler beim Token-Verifizierung mit Supabase
   - Grund: API-Key, URL, oder Netzwerk-Fehler
   - Fix: Supabase API überprüfen

---

## 10. EMPFOHLENE SOFORTMASSNAHMEN (Ohne Code-Änderung)

1. **Diagnostik-Logging hinzufügen** (minimal):
   - Log: Was sind die **exakten** Cookie-Namen/Werte?
   - Log: Welche Token-Parsing-Route wurde genommen?
   - Log: Was hat Supabase antwortet?

2. **Frontend-Debugging**:
   - Benutzer sollen Browser Dev Tools öffnen
   - Screenshots von Cookies machen
   - Network Requests überprüfen

3. **Manuelles Testen**:
   - Frischen Browser (keine Caches)
   - Verschiedene Devices/Browser testen
   - Login-/Logout-Zyklus mehrmals

---

## 11. CODE-ÄNDERUNGEN (Wenn nötig)

### Dringend zu überprüfen:
- [ ] Cookie wird vom Browser gesendet? (Network Tab)
- [ ] Cookie-Wert ist nicht leer?
- [ ] Token-Format stimmt überein?
- [ ] Supabase Token-Verifikation antwortet positiv?

### Wenn oben OK, dann Code-Probleme:
- [ ] Cookie-Parsing Logik überprüfen
- [ ] Token-Extraktion aus JSON prüfen
- [ ] Error-Handling erweitern
- [ ] Logging überprüfen

---

## 12. ZUSAMMENFASSUNG

**Das Problem:** Nach HTTP-Only Cookie-Implementierung können viele User sich nicht anmelden.

**Ursache:** Vermutlich werden Cookies vom Browser nicht gesendet oder nicht korrekt geparst.

**Nächster Schritt:** Detailliertes Debugging mit Fokus auf:
1. Werden Cookies überhaupt gesendet? (Network Tab)
2. Falls ja: Werden sie korrekt geparst? (Server Logs)
3. Falls ja: Akzeptiert Supabase den Token? (API-Response)

**Keine sofortigen Code-Änderungen empfohlen** - erst müssen wir wissen, wo genau es scheitert!

---

## Kontakt für Debuggen:
- Logs überprüfen: `/api/auth/current-user`
- Browser Console: User-Agent, Cookies sichtbar?
- Supabase Dashboard: Token-Validität überprüfen?
