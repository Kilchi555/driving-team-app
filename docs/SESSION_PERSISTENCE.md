# Session Persistierung - Dokumentation

## Überblick

Die App speichert Benutzersessionen jetzt automatisch in `localStorage`, so dass Benutzer während der Entwicklung (HMR) und nach einem Browser-Neustart angemeldet bleiben.

## Wie es funktioniert

### 1. **Plugin-Reihenfolge** (Geladen in dieser Reihenfolge)

```
00-session-persist.client.ts      → Stellt Session wieder her
01-session-auto-save.client.ts    → Speichert Session automatisch
auth-restore.client.ts             → Setup Supabase-Session
```

### 2. **Beim App-Start**

```
App startet
    ↓
00-session-persist lädt
    ↓
Prüft localStorage auf cached session
    ├─ JA: Lädt sofort (< 100ms) ✅ SCHNELL
    └─ NEIN: Fetcht von API (mit HTTP-Only Cookies)
    ↓
Speichert in localStorage für nächstes HMR
    ↓
01-session-auto-save lädt
    ↓
Setzt Watcher auf authStore.user auf
    ↓
Jede Änderung → Auto-save zu localStorage
```

### 3. **Session-Daten in localStorage**

Unter dem Schlüssel `app-session-cache`:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {}
  },
  "profile": {
    "id": "uuid",
    "tenant_id": "uuid",
    "role": "admin|staff|client",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "auth_user_id": "uuid"
  },
  "timestamp": 1769609600000,
  "expiresIn": 86400000
}
```

## Sicherheit

✅ **Echte Auth-Tokens** bleiben in HTTP-Only Cookies (nicht accessible via JavaScript)  
✅ **localStorage** enthält nur Benutzerdaten (kein Sicherheitsrisiko)  
✅ **Sessions** verfallen automatisch nach 24 Stunden  
✅ **Beim Logout** wird localStorage geleert  

## Features

| Feature | Verhalten |
|---------|-----------|
| HMR-Recovery | Session bleibt nach Code-Update erhalten |
| Schneller Start | Erste Seite lädt aus Cache (keine API-Anfrage) |
| Auto-Sync | Änderungen an Auth speichern automatisch |
| Expiry | Sessions älter als 24h werden gelöscht |
| Logout | localStorage wird geleert |

## Testing

### HMR-Recovery testen:
1. App öffnen und anmelden
2. Eine TypeScript-Datei ändern (z.B. ein Comment hinzufügen)
3. App HMR-updated → **Benutzer bleibt angemeldet** ✅

### Session-Ablauf testen:
1. Browser-Konsole öffnen
2. `localStorage.getItem('app-session-cache')` eingeben
3. Session-Daten sollten sichtbar sein mit `timestamp` und `expiresIn`

### Logout testen:
1. App öffnen, anmelden
2. Logout-Button klicken
3. `localStorage.getItem('app-session-cache')` sollte `null` sein

## Dateien

- `plugins/00-session-persist.client.ts` - Session-Wiederherstellung
- `plugins/01-session-auto-save.client.ts` - Auto-Save beim Anmelden/Logout
- `utils/session-persistence.ts` - Typen und Dokumentation
