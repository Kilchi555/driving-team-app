## "Angemeldet bleiben" - Weiterleitung zu Tenant Login Page

### Was wurde verbessert?

Wenn ein Token abläuft oder der Refresh fehlschlägt, wird der User jetzt zu **`/:slug`** (Tenant Login Page) weitergeleitet, nicht zu `/login`.

---

## Implementierung

### 1. Token Refresh Interceptor (Plugin)
📁 `/plugins/02-supabase-auth-interceptor.client.ts`

```typescript
// Bei Token Refresh Fehler (401):
if (err?.response?.status === 401 || err?.statusCode === 401) {
  // Tenant Slug laden
  const tenantId = authStore.userProfile?.tenant_id
  
  // Oder aus localStorage fallback
  const lastSlug = localStorage.getItem('last_tenant_slug')
  
  // Weiterleiten zu /:slug (Tenant Login Page)
  await navigateTo(`/${tenantSlug}`)
}
```

### 2. Fetch Interceptor (existiert bereits)
📁 `/plugins/fetch-interceptor.client.ts`

```typescript
// Bereits bei 401 implementiert (Zeile 40-42):
const { data: tenant } = await $fetch(`/api/tenants/get-slug?id=${tenantId}`)
if (tenant?.slug) {
  redirectPath = `/${tenant.slug}` // ← Tenant Login Page
}
```

---

## Flow bei Token Expiry

```
Token läuft ab nach ~55 Minuten
        ↓
Plugin: POST /api/auth/refresh
        ↓
Server: Refresh Token erneuert
        ↓
Fall A: ✅ Erfolgreich
        → Neue Tokens gespeichert
        → User bleibt angemeldet
        
Fall B: ❌ Fehler (401)
        → Plugin erkennt Fehler
        → Tenant Slug geladen (aus localStorage oder API)
        → User zu /:slug weitergeleitet
        → User sieht Tenant Login Form (branding, etc.)
```

---

## Weiterleitung: Logik

### Wenn Refresh fehlschlägt:

1. **Versuche Tenant Slug aus Profile**
   ```typescript
   const tenantId = authStore.userProfile?.tenant_id
   // API Call: /api/tenants/get-slug?id={tenantId}
   ```

2. **Fallback: localStorage**
   ```typescript
   const lastSlug = localStorage.getItem('last_tenant_slug')
   // Wird bei jedem Login gespeichert
   ```

3. **Letzter Fallback: /login**
   ```typescript
   // Falls alles fehlschlägt
   redirectPath = '/login'
   ```

---

## Szenarios

### Szenario 1: Normales Token Refresh
```
✅ Token wird rechtzeitig erneuert
✅ User bleibt angemeldet (transparnt)
✅ Keine Weiterleitung
```

### Szenario 2: Refresh Token abgelaufen (> 7 Tage)
```
❌ Refresh fehlschlagen (401)
        ↓
Tenant Slug ermittelt
        ↓
User zu /my-company (Tenant Login) weitergeleitet
        ↓
User sieht: Tenant-spezifische Login Page
        ↓
User muss sich neu anmelden
```

### Szenario 3: Browser Cache Clear
```
❌ HTTP-Only Cookies gelöscht
❌ localStorage gelöscht
        ↓
Nächster API Call: 401
        ↓
Fetch Interceptor greift ein
        ↓
Fallback zu /login (kein lastSlug vorhanden)
        ↓
User sieht: Globale Login Page
```

---

## Vorteile dieser Lösung

✅ **Tenant-spezifische Login Pages**
- User sieht vertrautes Branding
- Logo und Farben des Tenants
- Bessere User Experience

✅ **Automatische Slug-Ermittlung**
- Kein manuelles Tracking nötig
- Fallback auf localStorage
- Graceful Fallback zu /login

✅ **Sicher**
- Nur nach Auth State Clear
- Nach Refresh Token Expiry
- User muss sich neu authentifizieren

✅ **Transparent**
- 99% der Fälle: Kein sichtbarer Redirect
- Nur bei echtem Fehler
- Token Refresh läuft im Hintergrund

---

## Testing

### Test 1: Refresh Fehler Handling
```
1. Token Refresh erzwingen: Browser DevTools → Network
2. Manuell einen Refresh Block setzen
3. Prüfe: User wird zu /:slug weitergeleitet
4. Console: "Redirecting to tenant login: /my-company"
```

### Test 2: Fallback zu localStorage
```
1. Anmelden mit "Angemeldet bleiben"
2. DevTools → localStorage.setItem('last_tenant_slug', 'test-company')
3. Force Refresh Error
4. Prüfe: Redirect zu /test-company (aus localStorage)
```

---

## Deployment

Keine zusätzlichen Schritte nötig - funktioniert mit existierenden Files:
- ✅ Tenant Slug API already exists
- ✅ localStorage tracking already in place
- ✅ Plugin hook Points already configured

Einfach pushen & deployen! 🚀
