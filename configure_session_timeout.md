# Session Timeout Konfiguration

## Aktuelle Einstellungen:
- **Access Token**: 1 Stunde (automatisch erneuert)
- **Refresh Token**: 30 Tage
- **Auto-Refresh**: Aktiviert

## Optionen für kürzere Sessions:

### Option 1: Supabase Dashboard Einstellungen
1. Supabase Dashboard → Authentication → Settings
2. "JWT expiry limit" ändern (von 3600s = 1h)
3. "Refresh token rotation" aktivieren

### Option 2: Client-seitige Timeout-Überwachung
```typescript
// In utils/supabase.ts hinzufügen:
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 Minuten

let inactivityTimer: NodeJS.Timeout | null = null

const resetInactivityTimer = () => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  
  inactivityTimer = setTimeout(async () => {
    logger.debug('⏰ Session timeout due to inactivity')
    await supabase.auth.signOut()
  }, INACTIVITY_TIMEOUT)
}

// Event Listeners für Aktivität
if (process.client) {
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true)
  })
}
```

### Option 3: Täglicher Logout
```typescript
// Session nur 1 Tag gültig
const checkDailyLogout = () => {
  const lastLogin = localStorage.getItem('lastLoginDate')
  const today = new Date().toDateString()
  
  if (lastLogin && lastLogin !== today) {
    supabase.auth.signOut()
  }
  
  localStorage.setItem('lastLoginDate', today)
}
```

## Empfehlung:
Für eine Fahrschul-App sind **30 Tage** angemessen, da:
- Benutzer nicht täglich einloggen müssen
- Sicherheit durch Tenant-Isolation gewährleistet
- Benutzerfreundlichkeit hoch bleibt
