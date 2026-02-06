## "Angemeldet bleiben" Quick Start

### ✅ Bereits Implementiert

1. **Token Refresh Interceptor Plugin**
   - Datei: `/plugins/02-supabase-auth-interceptor.client.ts`
   - Funktion: Prüft alle 30 Sekunden ob Tokens erneuert werden müssen
   - **NEU:** Bei Fehler (401) → Leitet zu `/:slug` (Tenant Login) um
   - Automatisch aktiviert beim App Start

2. **Refresh Token Endpoint**
   - Datei: `/server/api/auth/refresh.post.ts`
   - Funktion: Erneuert abgelaufene Tokens via Supabase
   - Setzt neue HTTP-Only Cookies
   - **NEU:** Bessere Error Handling

3. **Login mit "Angemeldet bleiben"**
   - Checkbox bereits in `/pages/login.vue` (Zeile 94)
   - Backend respektiert Setting (604800s = 7 Tage)
   - HTTP-Only Cookies mit korrekten Flags

4. **Fehlerbehandlung & Redirect (NEU)**
   - **Weiterleitung zu `/:slug`** statt `/login` bei Token Expiry
   - Tenant Slug wird automatisch geladen
   - User sieht Tenant-spezifische Login Page

---

## 🧪 Testen (Quick Test)

### Test 1: "Angemeldet bleiben" Checkbox funktioniert

```
1. Go to /login
2. Sehe "Angemeldet bleiben" Checkbox ✅
3. Checke sie und melde dich an
4. DevTools → Application → Cookies
5. Sehe: sb-auth-token (7 Tage Expiry)
6. Sehe: sb-refresh-token (7 Tage Expiry)
```

### Test 2: Token Refresh wird aufgerufen

```
1. Anmelden mit "Angemeldet bleiben" ✅
2. DevTools → Console
3. Sehe Logs wie:
   🔄 Starting Supabase token refresh interceptor
   ✅ Token refreshed successfully
```

### Test 3: Session bleibt nach Browser Restart aktiv

```
1. Anmelden mit "Angemeldet bleiben"
2. Browser schließen (Cmd+Q auf Mac)
3. Browser wieder öffnen
4. Gehe zu einem Protected Page
5. User ist noch angemeldet ✅
6. Keine Session Errors
```

---

## 🚀 Deployment (Steps to Deploy)

1. **Code Review:**
   ```bash
   git diff
   # Überprüfe: 
   # - plugins/02-supabase-auth-interceptor.client.ts (NEW)
   # - server/api/auth/refresh.post.ts (NEW)
   # - All other files unchanged
   ```

2. **Commit & Push:**
   ```bash
   git add plugins/02-supabase-auth-interceptor.client.ts
   git add server/api/auth/refresh.post.ts
   git add REMEMBER_ME_IMPLEMENTATION.md
   git commit -m "feat: implement automatic token refresh for 'Remember Me' sessions"
   git push origin main
   ```

3. **Vercel Deployment:**
   - Push sollte automatisch deployen
   - Prüfe: /api/auth/refresh ist deployiert
   - Prüfe: Token Interceptor wird geladen

4. **Verify in Production:**
   ```
   1. Login auf production
   2. Wähle "Angemeldet bleiben"
   3. DevTools → Console
   4. Nach ~5-10 Minuten: POST /api/auth/refresh aufgerufen
   5. Status 200 ✅
   ```

---

## ⚙️ Konfiguration

### Token Refresh Intervall (Anpassbar)

Datei: `/plugins/02-supabase-auth-interceptor.client.ts`

```typescript
const REFRESH_INTERVAL = 30 * 1000 // Check alle 30 Sekunden
const REFRESH_THRESHOLD = 5 * 60 * 1000 // Refresh wenn < 5 Min bis Expiry
```

Anpassen falls nötig:
- Mehr Checks = Mehr CPU/Battery aber schneller Refresh
- Weniger Checks = Weniger Overhead aber später Refresh

### Session Dauer (Anpassbar)

Datei: `/server/api/auth/login.post.ts`

```typescript
// Zeile 134:
const sessionDuration = rememberMe ? 604800 : 3600
                                     // 7 Tage    // 1 Stunde
```

Falls ändern:
```typescript
const sessionDuration = rememberMe ? 1209600 : 3600 // 14 Tage statt 7
```

---

## 🔐 Sicherheit

### Was ist geschützt?

✅ **Tokens sind in HTTP-Only Cookies**
- Nicht zugänglich für JavaScript
- Nicht anfällig für XSS Attacken
- Automatisch in Requests mitgesendet

✅ **Tokens werden erneuert BEVOR sie ablaufen**
- Keine ungültigen Token in Clients
- Seamless User Experience
- Sessions können max. 7 Tage laufen

✅ **Refresh Token ist auch sicher**
- In HTTP-Only Cookie gespeichert
- Nur vom Server gelesen
- Nur von /api/auth/refresh verwendet

---

## 📊 Monitoring (Optional)

### Logs prüfen

```bash
# Vercel Production Logs
# Suche nach: "Token refresh" oder "Token expiring"

# Local Development
# Console zeigt: 🔄 Token expiring soon, attempting refresh...
```

### Metrics (Future)

Falls Monitoring konfigurieren:
- Anzahl Token Refreshes pro Tag
- Refresh Fehlerrate
- Durchschnittliche Refresh Latenz

---

## ❓ FAQs

**Q: User wird nach 1 Stunde ausgeloggt - warum?**
A: "Angemeldet bleiben" Checkbox nicht gecheckt. Ohne die Option = 1 Stunde Session.

**Q: Token Refresh passiert zu oft/selten?**
A: REFRESH_INTERVAL und REFRESH_THRESHOLD in Plugin anpassen.

**Q: Was passiert wenn Internet weg ist?**
A: Refresh fehlgeschlagen, Plugin versucht es in 30 Sekunden erneut.

**Q: Browser Close = Session weg?**
A: Mit "Angemeldet bleiben": Cookies bleiben (7 Tage), Session restored.
   Ohne: Cookies gelöscht nach Browser Close, neu Anmelden erforderlich.

**Q: Multiple Tabs offen - sind sie synchron?**
A: Ja! Token Refresh passiert für alle Tabs. Ein Refresh = Alle Tabs aktiv.

---

## 🔧 Troubleshooting

**Problem: Token Refresh Logs nicht sichtbar**
- [ ] Browser Console offen?
- [ ] Logger Level ist `debug`?
- [ ] Supabase Session vorhanden?

**Problem: POST /api/auth/refresh gibt 401**
- [ ] Refresh Token Cookie vorhanden? (DevTools → Cookies)
- [ ] SUPABASE_SERVICE_ROLE_KEY in Env vars?
- [ ] Refresh Token nicht abgelaufen?

**Problem: Session wird nicht wiederhergestellt nach Reload**
- [ ] HTTP-Only Cookies noch gültig?
- [ ] localStorage nicht gelöscht?
- [ ] Plugin lädt vor Auth Store?

---

## 📝 Nächste Schritte (Optional Future)

- [ ] Refresh Token Rotation (bei jedem Refresh neue Tokens)
- [ ] Device Fingerprinting für verdächtige Logins
- [ ] Session Sharing Across Devices (andere Geräte abmelden)
- [ ] "Angemeldet bleiben" Duration Settings (Admin)
- [ ] Mobile App Support (Token Refresh)
