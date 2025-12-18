# SARI Integration - Fehlersuche & Fixes

## Fehler 1: "Authentication required" ✅ FIXED

### Problem
Die API Endpoints `/api/sari/save-settings` und `/api/sari/sync-courses` gaben `401 Unauthorized` zurück.

### Ursache
- Server-seitiger Auth-Check funktionierte nicht richtig
- `getSupabase()` nutzte Client (anon) Key statt User's Session
- Cookies wurden nicht ausgelesen

### Lösung
- [ ] Changed to `requireAuth(event)` auf dem Server
- [ ] Nutze `getSupabaseAdmin()` für Abfragen
- [ ] Liest auth user aus Nuxt Session/Cookies

### Betroffen Endpoints
- ✅ `/api/sari/save-settings.post.ts`
- ✅ `/api/sari/sync-courses.post.ts`
- ✅ `/api/sari/sync-status.get.ts`

---

## Fehler 2: "SARI OAuth failed: Bad Request" 🔍 

### Problem
```
SARI connection test failed: SARI OAuth failed: Bad Request
```

### Wahrscheinliche Ursachen

1. **Falsche Credentials**
   - Client ID nicht korrekt
   - Client Secret nicht korrekt
   - Username nicht korrekt
   - Password nicht korrekt

2. **Ungültiger Format**
   - Credentials enthalten Leerzeichen
   - Credentials nicht URL-encoded
   - Credentials haben Sonderzeichen

3. **Umgebungs-Fehler**
   - Falsche URL (test vs production)
   - SARI API ist down
   - Netzwerk-Fehler

### Debugging

#### Schritt 1: Prüfe die Browser Console
Öffne Browser DevTools (F12) und gehe zum **Console** Tab. Du solltest jetzt detaillierte Error Logs sehen:

```
SARI OAuth Error: {
  status: 400,
  statusText: "Bad Request",
  body: "...",
  url: "https://sari-vku-test.ky2help.com/oauth/v2/token?client_id=***&..."
}
```

#### Schritt 2: Prüfe die Credentials

- Kopiere die Credentials exakt von Kyberna (keine Leerzeichen!)
- Stelle sicher, dass die **Umgebung** korrekt ist:
  - **Test**: `sari-vku-test.ky2help.com`
  - **Production**: `www.vku-pgs.asa.ch`

#### Schritt 3: Teste manuell mit curl

```bash
# Replace mit deinen echten Credentials!
curl -X GET "https://sari-vku-test.ky2help.com/oauth/v2/token?client_id=YOUR_CLIENT_ID&client_secret=YOUR_SECRET&grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD"
```

Wenn das funktioniert, sind die Credentials OK.

#### Schritt 4: Prüfe die Browser Logs

Nach meinem Fix sollten jetzt detaillierte Logs in der Browser Console erscheinen:
- Gehe zu `/admin/profile`
- Öffne Console (F12)
- Klick "Verbindung testen"
- Schau nach "SARI OAuth Error" Logs

---

## Changelogs

### Fixed
✅ Authentication auf Server-Endpoints
✅ Detailliertes Error Logging für SARI OAuth
✅ `requireAuth()` statt `getSupabase().auth.getUser()`
✅ `getSupabaseAdmin()` für alle Supabase Queries

### Files Updated
1. `server/api/sari/save-settings.post.ts`
2. `server/api/sari/sync-courses.post.ts`
3. `server/api/sari/sync-status.get.ts`
4. `server/api/sari/test-connection.post.ts`
5. `utils/sariClient.ts`

---

## Nächste Schritte

### Wenn immer noch "Bad Request":

1. **Kontaktiere Kyberna Support**
   - Frage nach korrekten Test Credentials
   - Prüfe ob Account aktiviert ist
   - Prüfe ob OAuth scopes korrekt sind

2. **Teste mit anderen Tools**
   - Postman: `https://www.postman.com/`
   - Thunder Client (VS Code Extension)
   - curl

3. **Prüfe Kyberna Dokumentation**
   - Schau `SARI_API_DOCUMENTATION.md`
   - Verifiziere OAuth URL Format
   - Prüfe Request Headers

---

## Testing Checklist

- [ ] Page neu laden: `F5` oder `Cmd+Shift+R` (cache clear)
- [ ] Browser Console öffnen: `F12`
- [ ] Neue Credentials eingeben
- [ ] "Verbindung testen" klicken
- [ ] Schau auf Console Logs
- [ ] Wenn Success: "Einstellungen speichern" wird auto-triggered

---

## Häufige Fehler

### "Bad Request" nach korrekten Credentials
→ Wahrscheinlich ein SARI Konto-Problem. Kontaktiere Kyberna.

### "Authentication required" beim Speichern
→ Sollte jetzt fixed sein mit `requireAuth()`. Neu laden und testen.

### "Connection timed out"
→ Netzwerk-Problem oder SARI API ist down. Prüfe nach 5 Minuten.

### "Invalid parameter"
→ Credentials haben wahrscheinlich Sonderzeichen. Prüfe Copy-Paste.

---

## Support

Wenn Fehler immer noch nicht weg:

1. Schreib den kompletten Error Message
2. Schreib die Environment (test/production)
3. Schreib Browser Console Logs
4. Kontaktiere Kyberna mit diesen Infos

---

## Summary

✅ Auth Fehler: FIXED
🔍 SARI Bad Request: Braucht Debugging mit echten Credentials

**Nächster Schritt**: Test mit korrekten Kyberna Credentials! 🚀

