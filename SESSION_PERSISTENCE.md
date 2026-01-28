# Session Persistierung - Dokumentation

## Problem
Vor dieser Lösung: HTTP-Only Cookies und Auth-State gingen nach HMR-Updates (Hot Module Replacement) oder Page-Reloads verloren, obwohl die Cookies noch auf dem Server vorhanden waren.

## Lösung
Wir speichern die User-Session in `localStorage` für schnelle HMR-Wiederherstellung und synchronisieren mit HTTP-Only Cookies für Long-Term-Persistierung.

## Architektur

### 1. **Session Persist Plugin** (`plugins/00-session-persist.client.ts`)
Der erste Plugin, der bei App-Start lädt:

#### Startup-Flow:
1. Versucht Session aus `localStorage` zu laden (HMR Recovery)
   - Falls Session vorhanden und nicht abgelaufen (24h TTL): ✅ Sofort restauriert
   - Falls abgelaufen oder nicht vorhanden: Weiter zum nächsten Schritt

2. Falls nicht in localStorage: Fragt `/api/auth/current-user` API
   - API liest HTTP-Only Cookies vom Server
   - Gibt User + Profile zurück
   - Speichert in localStorage für nächste HMR-Recovery

3. Setzt `authStore.isInitialized = true`

#### Automatic Persistence:
- Überwacht `authStore.user` per Vue Watcher
- Bei Login: Speichert Session automatisch in localStorage
- Bei Logout: Löscht localStorage Session
- Expiration: 24 Stunden TTL

### 2. **Auth Store Updates** (`stores/auth.ts`)
- `logout()` Funktion: Löscht auch `localStorage.removeItem('app-session-cache')`
- Alle anderen Auth-Funktionen unverändert

### 3. **Auth Restore Plugin** (`plugins/auth-restore.client.ts`)
- Bleibt bestehen für zusätzliche Sicherheit
- Runs nach session-persist Plugin
- Stellt sicher, dass Supabase Client auch initialisiert ist

## localStorage Structure

```json
{
  "app-session-cache": {
    "user": {
      "id": "supabase-user-id",
      "email": "user@example.com",
      "user_metadata": {}
    },
    "profile": {
      "id": "profile-id",
      "tenant_id": "tenant-id",
      "role": "admin",
      "email": "user@example.com",
      "first_name": "Max",
      "last_name": "Mustermann",
      "auth_user_id": "supabase-user-id"
    },
    "timestamp": 1704067200000,
    "expiresIn": 86400000
  }
}
```

## Security Considerations

✅ **HTTP-Only Cookies**: Tokens bleiben sicher in HTTP-Only Cookies (Server-side)
✅ **Nicht-sensible Daten in localStorage**: Nur User Info + Profile (keine Auth-Tokens!)
✅ **24h TTL**: Alte Sessions werden automatisch gelöscht
✅ **Auto-cleanup**: Bei Logout wird localStorage geleert
✅ **Server-side Validation**: API validiert Session bei jedem Request

## Testing

### Test 1: Normale Session
1. Login als User
2. Öffne DevTools → Application → localStorage
3. Sehe `app-session-cache` mit User-Daten
4. Refresh Page → Session bleibt erhalten

### Test 2: HMR Recovery
1. Login als User
2. Ändere einen Component/Plugin File (z.B. Button Text)
3. HMR triggered, App aktualisiert sich
4. Session bleibt erhalten ✅

### Test 3: Logout
1. Login
2. Logout
3. Überprüfe DevTools → localStorage ist leer
4. Refresh Page → Login-Page wird angezeigt

### Test 4: Expired Session
1. Login
2. Öffne DevTools → Console
3. Kopiere SessionString aus localStorage
4. Ändere `"timestamp"` auf einen Tag in der Vergangenheit
5. Speichern
6. Refresh Page
7. App macht API-Call zu `/api/auth/current-user` (weil Cache abgelaufen) ✅

## Logs

Schaue in DevTools Console für Debug-Logs:
- `🔐 Session persist plugin starting...` - Plugin startet
- `📦 No cached session in localStorage` - Kein Cache vorhanden
- `✅ Restoring session from localStorage (HMR recovery):` - HMR Recovery erfolgreich
- `💾 Session saved to localStorage for HMR recovery` - Session gespeichert
- `⏰ Cached session expired` - Cache wurde gelöscht (abgelaufen)
- `🗑️ Session cleared from localStorage (logout)` - Logout erfolgreich
