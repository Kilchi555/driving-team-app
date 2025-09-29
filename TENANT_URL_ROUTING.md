# Tenant URL-Routing System

## Übersicht
Das System erkennt automatisch Tenants (Fahrschulen) basierend auf der URL und zeigt entsprechendes Branding an.

## Implementierung

### 1. Tenant-Erkennung Methoden

#### URL Parameter (Empfohlen für Tests)
```
http://localhost:3000/auswahl?tenant=alpenblick
http://localhost:3000/auswahl?tenant=stadtfahrschule
http://localhost:3000/auswahl?tenant=modern
```

#### Subdomain (Production)
```
https://alpenblick.yourapp.com/auswahl
https://stadtfahrschule.yourapp.com/auswahl
```

#### Custom Domain (Production)
```
https://modern-fahrschule.ch/auswahl
```

### 2. Fallback-Verhalten
- Wenn kein Tenant erkannt wird → Default Tenant ("driving-team")
- Wenn Tenant nicht existiert → Default Tenant mit Fehlermeldung
- Wenn Tenant inaktiv → Default Tenant

### 3. Branding-Features
- **Tenant-spezifische Farben**: Primary & Secondary Colors
- **Logo**: Custom Logo oder Default Logo
- **Firmenname**: Dynamischer Titel
- **Kontaktdaten**: Adresse, Telefon, E-Mail

## Dateien

### Neue Dateien
- `composables/useTenant.ts` - Tenant Management Composable
- `create_test_tenants.sql` - Test-Tenants für Entwicklung

### Modifizierte Dateien
- `pages/auswahl.vue` - Erweitert um Tenant-Erkennung und Branding

## Test-Tenants

Nach Ausführung von `create_test_tenants.sql` stehen folgende Test-Tenants zur Verfügung:

| Tenant | Slug | URL | Farben |
|--------|------|-----|---------|
| Driving Team | `driving-team` | `/auswahl` | Blau/Grün |
| Fahrschule Alpenblick | `alpenblick` | `/auswahl?tenant=alpenblick` | Dunkelblau/Grün |
| Stadtfahrschule Zürich | `stadtfahrschule` | `/auswahl?tenant=stadtfahrschule` | Rot/Orange |
| Fahrschule Modern | `modern` | `/auswahl?tenant=modern` | Lila/Smaragd |

## Verwendung

### 1. Tenant laden
```typescript
const { loadTenant, currentTenant, tenantName } = useTenant()

// Automatische Erkennung
await loadTenant()

// Spezifischen Tenant laden
await loadTenant('alpenblick')
```

### 2. Tenant-URLs generieren
```typescript
const { getTenantUrl } = useTenant()

// Mit aktuellem Tenant
const url = getTenantUrl('/register')
// → /register?tenant=alpenblick

// Mit spezifischem Tenant
const url = getTenantUrl('/shop', specificTenant)
```

### 3. Branding verwenden
```vue
<template>
  <div :style="{ backgroundColor: tenantPrimaryColor }">
    <h1>{{ tenantName }}</h1>
    <img v-if="tenantLogo" :src="tenantLogo" :alt="tenantName">
  </div>
</template>

<script setup>
const { tenantName, tenantPrimaryColor, tenantLogo } = useTenant()
</script>
```

## Deployment-Schritte

### 1. Datenbank Setup
```sql
-- Test-Tenants erstellen
\i create_test_tenants.sql
```

### 2. DNS/Subdomain Setup (Production)
- Wildcard DNS: `*.yourapp.com → Server IP`
- Oder spezifische Subdomains konfigurieren

### 3. Custom Domain Setup (Optional)
- DNS von Custom Domain auf Server IP zeigen
- SSL-Zertifikat für Custom Domain einrichten

## Debugging

### Development Mode
In Development wird Debug-Information am Ende der `/auswahl` Seite angezeigt:
- Aktueller Tenant
- Tenant ID
- Aktuelle URL

### Console Logs
```javascript
// Tenant-Erkennung
console.log('🏢 Tenant detected from URL parameter:', tenantParam)

// Tenant laden
console.log('🏢 Loaded tenant:', data.name, `(${data.slug})`)
```

## Erweiterte Features (Future)

### 1. Tenant-spezifische Konfiguration
- Sprache pro Tenant
- Währung pro Tenant
- Zeitzone pro Tenant

### 2. Multi-Language Support
- Tenant-spezifische Übersetzungen
- URL-basierte Spracherkennung

### 3. Advanced Routing
- Path-basiertes Routing: `/tenant-slug/page`
- Tenant-spezifische Routen

## Sicherheit

### RLS Policies
Alle Tenant-Daten sind durch Row Level Security geschützt:
- Users sehen nur ihre eigenen Tenant-Daten
- Tenant-Isolation auf Datenbankebene

### Validierung
- Tenant-Slugs werden validiert
- Inaktive Tenants werden automatisch auf Default umgeleitet
- SQL-Injection-Schutz durch Parameterisierung
