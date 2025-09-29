# Tenant Branding System - Implementation Guide

## Übersicht

Das Tenant-Branding-System ermöglicht es jedem Tenant (Fahrschule), seine eigene Markenidentität zu definieren:
- **Farben**: Primär-, Sekundär- und Akzentfarben
- **Logos**: Verschiedene Logo-Varianten für unterschiedliche Verwendungszwecke
- **Typografie**: Custom Fonts und Schriftgrößen
- **Layout**: Border-Radius und Spacing-Einstellungen
- **Themes**: Light/Dark Mode Kontrolle

## 🚀 Setup Schritte

### 1. Datenbank Migration ausführen

```sql
-- In Supabase SQL Editor ausführen:
-- Datei: extend_tenant_branding_system.sql
```

### 2. Frontend Integration

Die Integration erfolgt automatisch durch:

#### Plugin (automatisch geladen)
- `plugins/tenant-branding.client.ts` - Lädt Branding beim App-Start

#### CSS System
- `assets/css/tenant-branding.css` - CSS Custom Properties System

#### Composables
- `composables/useTenantBranding.ts` - Branding Management
- `stores/ui.ts` - Theme Management (erweitert)

### 3. Verwendung in Komponenten

```vue
<template>
  <div class="bg-primary text-white p-md rounded">
    <h1 class="font-heading text-2xl">{{ brandName }}</h1>
    <p class="text-primary-100">Willkommen bei {{ brandName }}</p>
  </div>
</template>

<script setup>
const { brandName, primaryColor } = useTenantBranding()
</script>
```

## 🎨 Verfügbare CSS-Klassen

### Farben
- `.text-primary`, `.text-secondary`, `.text-accent`
- `.text-success`, `.text-warning`, `.text-error`, `.text-info`
- `.bg-primary`, `.bg-secondary`, `.bg-surface`

### Buttons
- `.btn-primary`, `.btn-secondary`, `.btn-outline-primary`

### Spacing
- `.p-xs`, `.p-sm`, `.p-md`, `.p-lg`, `.p-xl`, `.p-2xl`
- `.m-xs`, `.m-sm`, `.m-md`, `.m-lg`, `.m-xl`, `.m-2xl`
- `.gap-xs`, `.gap-sm`, `.gap-md`, `.gap-lg`, `.gap-xl`, `.gap-2xl`

### Layout
- `.rounded`, `.rounded-sm`, `.rounded-lg`, `.rounded-xl`
- `.card`, `.card-elevated`

## 🔧 API Verwendung

### Tenant Branding laden
```typescript
const { loadTenantBranding, currentTenantBranding } = useTenantBranding()

// Branding für spezifischen Tenant laden
await loadTenantBranding('meine-fahrschule')

// Aktuelles Branding abrufen
const branding = currentTenantBranding.value
```

### Branding aktualisieren
```typescript
const { updateTenantBranding } = useTenantBranding()

await updateTenantBranding('tenant-id', {
  colors: {
    primary: '#FF6B35',
    secondary: '#2E86AB'
  },
  typography: {
    fontFamily: 'Roboto, sans-serif'
  }
})
```

### Templates anwenden
```typescript
const { loadBrandingTemplates, applyTemplate } = useTenantBranding()

// Verfügbare Templates laden
await loadBrandingTemplates()

// Template anwenden
await applyTemplate('template-id', 'tenant-id')
```

## 🎭 Theme Management

### Theme wechseln
```typescript
const { setTheme, toggleTheme, canSwitchTheme } = useUIStore()

// Spezifisches Theme setzen
setTheme('dark')

// Theme umschalten
if (canSwitchTheme.value) {
  toggleTheme()
}
```

### Tenant Theme-Einstellungen
```typescript
const { setTenantThemeSettings } = useUIStore()

setTenantThemeSettings({
  defaultTheme: 'dark',
  allowThemeSwitch: false
})
```

## 📱 Responsive Branding

Das System passt sich automatisch an verschiedene Bildschirmgrößen an:

- **Mobile (< 640px)**: Kleinere Schrift und Spacing
- **Desktop (> 1280px)**: Größere Schrift und Spacing
- **Print**: Optimierte Schwarz-Weiß-Darstellung

## 🔍 Demo Komponente

Teste das Branding-System mit der Demo-Komponente:

```vue
<template>
  <TenantBrandingDemo />
</template>
```

## 🗄️ Datenbank Struktur

### Erweiterte Tenants Tabelle
- **Farben**: `primary_color`, `secondary_color`, `accent_color`, etc.
- **Logos**: `logo_url`, `logo_square_url`, `logo_wide_url`, `logo_dark_url`
- **Typografie**: `font_family`, `heading_font_family`, `font_size_base`
- **Layout**: `border_radius`, `spacing_unit`
- **Custom**: `custom_css`, `custom_js`

### Branding Templates
- Vordefinierte Design-Templates
- Kategorisiert (business, creative, minimal, bold)
- Premium-Templates für bestimmte Pläne

## 🚨 Wichtige Hinweise

1. **Performance**: CSS Custom Properties werden dynamisch gesetzt
2. **Fallbacks**: Immer Standardwerte definiert
3. **Accessibility**: Kontrast und Lesbarkeit beachten
4. **Caching**: Branding wird client-seitig gecacht
5. **SEO**: Meta-Daten werden automatisch gesetzt

## 🛠️ Troubleshooting

### Branding wird nicht angezeigt
1. Prüfe ob Migration erfolgreich war
2. Kontrolliere Browser-Konsole auf Fehler
3. Verifiziere Tenant-Slug in der URL

### Theme wechselt nicht
1. Prüfe `allow_theme_switch` in der Datenbank
2. Kontrolliere localStorage Berechtigung
3. Verifiziere CSS-Klassen im DOM

### Custom CSS funktioniert nicht
1. Prüfe Syntax des Custom CSS
2. Kontrolliere CSP-Richtlinien
3. Verifiziere dass Custom CSS aktiviert ist

## 📚 Weiterführende Dokumentation

- [Tenant Registration Guide](TENANT_REGISTRATION_GUIDE.md)
- [Admin Interface Documentation](components/admin/README.md)
- [CSS Custom Properties Reference](assets/css/tenant-branding.css)

