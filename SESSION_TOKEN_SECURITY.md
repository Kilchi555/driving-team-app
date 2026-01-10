# Session Token Security - Best Practices & Implementation Plan

**Datum:** January 10, 2026  
**Status:** Planning Phase  
**Priority:** Medium (Nice-to-have security improvement)

---

## Executive Summary

Sichere Session-Token-Speicherung ist kritisch für die Sicherheit der Fahrrschul-App. Aktuell werden Tokens in `localStorage` gespeichert (XSS-anfällig). Professionelle Best Practice ist `httpOnly` Cookies mit Dual-Token System (Access + Refresh).

**Zwei Implementierungs-Optionen:**
1. **Kurz-Fristig (einfach):** 7-Tage Session-Dauer wenn "Angemeldet bleiben" - weiterhin `localStorage`
2. **Professionell (empfohlen):** `httpOnly` Cookies + Dual-Token System + Token Rotation

---

## Teil 1: Aktuelle Situation

### Wo werden Tokens aktuell gespeichert?

**Datei:** `pages/login.vue` (Line 500-517)  
**Speicherort:** `localStorage`

```javascript
// Aktuell: Tokens in localStorage gespeichert
localStorage.setItem(key, JSON.stringify(sessionData))
```

**Konfiguration in `utils/supabase.ts`:**
- `persistSession: true` - Session bleibt über Browser-Reloads erhalten
- `autoRefreshToken: true` - Tokens werden automatisch erneuert
- `storage: localStorage` - Custom Storage Adapter für localStorage

### Problem: XSS-Anfälligkeit

```
localStorage:
❌ Für JavaScript zugänglich → window.localStorage.getItem()
❌ Vulnerable gegen XSS-Attacken
❌ Token im Klartext im localStorage
```

### Aktuelle "Angemeldet bleiben" Implementierung

**Status:** NICHT IMPLEMENTIERT

- Checkbox existiert (Line 88 in login.vue)
- `rememberMe` wird nicht verwendet
- `rememberMe` wird nicht an API gesendet
- Session-Dauer ist statisch (nicht abhängig von "Angemeldet bleiben")

---

## Teil 2: Professional Best Practices 2026

### 1. Token Storage: httpOnly Cookies (SICHER)

**httpOnly Cookies (EMPFOHLEN):**
```
✅ Nur Server kann lesen/schreiben
✅ JavaScript hat keinen Zugriff
✅ Vor XSS geschützt
✅ Automatisch mit jedem Request gesendet
✅ Browser-native Verwaltung
```

**Cookie Attribute (MUST-HAVE):**
```
Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800
```

| Attribut | Wert | Grund |
|----------|------|-------|
| `HttpOnly` | true | JavaScript kann nicht zugreifen |
| `Secure` | true | Nur über HTTPS übertragen |
| `SameSite` | Strict | CSRF-Schutz (nur Same-Site Requests) |
| `Path` | / | Verfügbar für gesamte App |
| `Max-Age` | Variabel | Lebensdauer des Tokens |

---

### 2. Dual-Token System (EMPFOHLEN)

**Problem mit Single Token:**
- ❌ Wenn Access Token gestohlen: Full Access für lange Zeit
- ❌ Kann nicht rotiert werden ohne Logout

**Lösung: Zwei Tokens mit verschiedenen Rollen**

#### Access Token (Kurzlebig)
```
Lebensdauer: 15-30 Minuten
Speicherort: httpOnly Cookie (automatisch gesendet)
Verwendung: Alle API-Requests
Sicherheit: Kurz genug, um Schaden zu begrenzen
```

#### Refresh Token (Langlebig)
```
Lebensdauer: 7-30 Tage (abhängig von "Angemeldet bleiben")
Speicherort: httpOnly Cookie (getrennt oder gleich)
Verwendung: Nur zum Ausstellen neuer Access Tokens
Sicherheit: Rotiert bei jeder Verwendung (neuer Token zurück)
```

**Flow:**
```
1. User loggt sich an
   → Server stellt Access Token (30 Min) + Refresh Token (7 Tage) aus
   → Beides in httpOnly Cookies

2. User macht API-Request
   → Browser sendet Access Token automatisch
   → API validiert und antwortet

3. Nach 30 Min: Access Token läuft ab
   → Frontend sendet Refresh Token → /api/auth/refresh
   → Backend validiert Refresh Token
   → Backend stellt neuen Access Token + neuen Refresh Token aus
   → Browser speichert neue Tokens in Cookies

4. User logout
   → Refresh Token wird auf Backend invalidiert (Blacklist)
   → Cookies werden gelöscht
```

---

### 3. "Angemeldet bleiben" Implementierung

**Checkbox:** Bereits im HTML vorhanden (login.vue Line 88)

**Was sich ändern muss:**

```javascript
// FRONTEND (login.vue)
const loginForm = {
  email: '',
  password: '',
  rememberMe: false  // ← Aktuell vorhanden, nicht verwendet
}

// Beim Submit:
await $fetch('/api/auth/login', {
  body: {
    email: loginForm.email,
    password: loginForm.password,
    rememberMe: loginForm.rememberMe  // ← SEND THIS!
  }
})
```

```typescript
// BACKEND (server/api/auth/login.post.ts)
export default defineEventHandler(async (event) => {
  const { email, password, rememberMe } = await readBody(event)
  
  // ...authentication...
  
  // Bestimme Session-Dauer basierend auf rememberMe
  const accessTokenExpiry = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60  // 7 Tage oder 24h
  const refreshTokenExpiry = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60  // 30 oder 7 Tage
  
  // Setze Cookies mit entsprechender Lebensdauer
  setCookie(event, 'access_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: accessTokenExpiry
  })
})
```

---

## Teil 3: Token Rotation (Zusätzliche Sicherheit)

**Problem:** Wenn Refresh Token gestohlen wird, hat Attacker 7 Tage Zugriff

**Lösung: Token Rotation**

```
1. User nutzt Refresh Token
   ↓
2. Backend invalidiert alten Refresh Token
   ↓
3. Backend stellt neuen Refresh Token aus
   ↓
4. Browser speichert neuen Token in Cookie
   ↓
5. Alter Token kann nicht mehr verwendet werden
```

**Implementierung:**
```typescript
// In /api/auth/refresh
const refreshTokenHashInDb = await db.select('token_hash').where(userId, rememberMe)

// Validiere aktuellen Refresh Token
if (!isValidRefreshToken(currentToken, refreshTokenHashInDb)) {
  return error(401, 'Invalid refresh token')
}

// WICHTIG: Lösche alten Token
await db.delete('refresh_tokens').where(id, oldTokenId)

// Erstelle neuen Token
const newRefreshToken = generateSecureRandomToken()
const newRefreshTokenHash = hashToken(newRefreshToken)

// Speichere Hash (nicht den Token selbst!)
await db.insert('refresh_tokens').values({
  user_id: userId,
  token_hash: newRefreshTokenHash,
  expires_at: now + (rememberMe ? 30 : 7) days
})

// Gebe neuen Token zurück
setCookie(event, 'refresh_token', newRefreshToken, { httpOnly: true, ... })
```

---

## Teil 4: Logout & Token Invalidierung

**Beim Logout müssen alle Tokens invalidiert werden:**

```typescript
// POST /api/auth/logout
export default defineEventHandler(async (event) => {
  const { sub: userId } = await verifyToken(event)  // sub = user_id in JWT
  
  // 1. Lösche alle Refresh Tokens für diesen User
  await supabaseAdmin
    .from('refresh_tokens')
    .delete()
    .eq('user_id', userId)
  
  // 2. Lösche Cookies
  setCookie(event, 'access_token', '', { maxAge: 0 })
  setCookie(event, 'refresh_token', '', { maxAge: 0 })
  
  // 3. Optional: Audit Logging
  await logAudit({
    user_id: userId,
    action: 'LOGOUT',
    severity: 'info'
  })
  
  return { success: true }
})
```

---

## Teil 5: CSRF-Schutz (Zusätzliche Sicherheit)

**Mit httpOnly Cookies:** `SameSite=Strict` reicht meist aus

**Zusätzlich: CSRF Token für POST/PUT/DELETE**

```html
<!-- Frontend sendet CSRF Token im Header -->
<form @submit="handleSubmit">
  <!-- CSRF Token wird vom Server mit `Set-Cookie` gesetzt -->
</form>
```

```javascript
// Frontend liest CSRF Token und sendet im Header
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

fetch('/api/appointments/save', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

---

## Teil 6: Implementierungs-Optionen

### Option 1: KURZ-FRISTIG (1-2 Stunden)
**Einfache 7-Tage Session bei "Angemeldet bleiben"**

**Anforderungen:**
- ✅ Sessions in `localStorage` bleiben (OK mit guter XSS-Protection)
- ✅ `rememberMe` an Login-API senden
- ✅ Backend stellt Session-Dauer ein (7 vs 24h)
- ✅ Supabase Refresh Token nutzt neue Dauer

**Vorteile:**
- Schnell implementierbar
- Minimal invasiv
- Kein Code-Breaking

**Nachteile:**
- Tokens in `localStorage` (XSS-anfällig)
- Keine Token Rotation
- Nicht professionelle Security

**Impact:** Medium (Better Security, Minimal Risk)

---

### Option 2: PROFESSIONELL (4-6 Stunden)
**httpOnly Cookies + Dual-Token System + Token Rotation**

**Anforderungen:**
- ✅ Access Token in `httpOnly` Cookie (30 Min)
- ✅ Refresh Token in `httpOnly` Cookie (7 Tage)
- ✅ Backend `/api/auth/refresh` Endpoint
- ✅ Token Rotation bei jedem Refresh
- ✅ Token Blacklist auf Logout
- ✅ CSRF-Schutz

**Vorteile:**
- ✅ Professionelle Security
- ✅ XSS-sicher
- ✅ Token Rotation begrenzt Schaden
- ✅ Scalable für wachsende App

**Nachteile:**
- ❌ Mehr Code (Backend + Frontend)
- ❌ Potreben DB Table für Refresh Tokens
- ⚠️ Könnte Bugs in Session-Handling verursachen

**Impact:** High (Best Security, Medium Risk)

---

## Teil 7: Empfehlungen

### Für deine Fahrrschul-App:

**JETZT (morgen früh):**
1. **Option 1 implementieren** (einfach, schnell)
   - `rememberMe` an API senden
   - Backend: Session-Dauer abhängig von `rememberMe`
   - 2-3 Stunden Arbeit
   - Keine Breaking Changes

**SPÄTER (in 2-3 Wochen):**
2. **Option 2 migrieren** wenn Zeit
   - Nach Session 1 stabilisieren
   - Mit Testing
   - Kann graduell gemacht werden

### Risk Assessment:

```
Option 1:
- Security Risk: MEDIUM (tokens in localStorage)
- Implementation Risk: LOW
- Time: ~2h
- Recommendation: ✅ START HERE

Option 2:
- Security Risk: LOW (httpOnly + rotation)
- Implementation Risk: MEDIUM (mehr Code, DB changes)
- Time: ~4-6h
- Recommendation: ⏰ LATER IF TIME
```

---

## Teil 8: Implementierungs-Checklist für Morgen

### [ ] Option 1: Quick Win (7-Tage Session)

**Frontend (login.vue):**
- [ ] `rememberMe` wird bereits vom Checkbox gelesen ✅
- [ ] `rememberMe` wird an `/api/auth/login` gesendet (ADD)
- [ ] Kein weiterer Frontend-Code nötig

**Backend (server/api/auth/login.post.ts):**
- [ ] `rememberMe` aus Request lesen (ADD)
- [ ] Session-Dauer berechnen: `rememberMe ? 7d : 1d` (ADD)
- [ ] Refresh Token mit neuer Expiry erstellen (MODIFY)
- [ ] In localStorage speichern mit neuer Expiry (MODIFY)

**Testing:**
- [ ] Login mit `rememberMe: false` → nach 24h logout?
- [ ] Login mit `rememberMe: true` → nach 7 Tagen logout?
- [ ] Browser neuladen → Session noch da?

---

### [ ] Optional Later: Option 2: Professional (httpOnly Cookies)

**Backend (Datenbank):**
- [ ] Tabelle `refresh_tokens` erstellen (if not exists)
  ```sql
  CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    remember_me BOOLEAN DEFAULT false
  )
  ```

**Backend (APIs):**
- [ ] `/api/auth/login` → stellt Access + Refresh Token aus
- [ ] `/api/auth/refresh` → new endpoint zum Token erneuern
- [ ] `/api/auth/logout` → invalidiert alle Refresh Tokens

**Frontend:**
- [ ] Axios/Fetch Interceptor für Token Refresh
- [ ] Automatischer Refresh vor Token-Expiry

---

## Ressourcen & Referenzen

- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Best Practices](https://appsecmaster.net/blog/securing-jwt-best-practices-for-developers/)
- [MDN: httpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [RFC 6265: HTTP State Management Mechanism](https://tools.ietf.org/html/rfc6265)

---

## Nächste Schritte

**MORGEN FRÜH:**
1. Diesen Plan durchlesen
2. Option 1 implementieren (2-3h)
3. Testing durchführen
4. Commit & Push
5. In Produktion deployen

**SPÄTER (nach Stabilisierung):**
6. Option 2 planen & implementieren
7. Migrations-Strategie für bestehende Sessions
8. Monitoring für Token Refresh Fehler

---

**Created:** 2026-01-10  
**Last Updated:** 2026-01-10  
**Status:** Ready for Implementation

