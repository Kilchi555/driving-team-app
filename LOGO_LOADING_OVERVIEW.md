# 🎯 Logo Loading - Vollständige Übersicht

## 📍 Alle Orte, wo Logos geladen werden

### 1. **PDF Receipts** (Receipt Generation) ⚠️ FIXED
```
📄 /api/payments/receipt.post.ts (LINE 95-240)
├── Quelle: tenant.logo_square_url || tenant.logo_url || tenant.logo_wide_url
├── Verarbeitung:
│   ├── Erkennt Base64 Data URLs ✅
│   ├── Konvertiert relative /storage/v1/object/public/ Paths ✅
│   ├── Fallback zu Fetch mit verschiedenen Headers ✅
│   └── Liefert als Data URL an HTML/PDF
└── Status: 🔧 FIXED - Sofortlösung für den Error
```

**Ablauf:**
```
loadTenantAssets(tenant) 
  → logoUrl = tenant?.logo_square_url || tenant?.logo_url || tenant?.logo_wide_url
  → if (logoUrl.startsWith('data:')) → Use directly ✅
  → if (logoUrl.startsWith('/storage/v1/object/public/')) → Convert + Fetch ✅
  → return { logoDataUrl } für PDF
```

---

### 2. **Admin Layout / Navigation** 
```
🏠 /layouts/admin.vue (LINE 634-635)
├── Quelle: getTenantLogo(tenantId)
├── Verarbeitung: Preloads tenant logo
└── Verwendung: Header/Navigation

Zukünftig: Nutze useTenantAssets Composable
```

---

### 3. **Tenant Selection Page**
```
🎯 /pages/auswahl.vue (LINE 25-48)
├── Quelle: t.logo_square_url (aus API Response)
├── Display: <img :src="t.logo_square_url" />
└── Verwendung: Tenant Selection UI
```

---

### 4. **Logo Component**
```
🖼️ /components/TenantLogo.vue
├── Quelle: logoUrl prop
├── Verarbeitung:
│   ├── Erkennt SVG Format → Mask styling
│   ├── Erkennt PNG/JPG → Image tag
│   └── Format-spezifische Rendering
└── Verwendung: Wiederverwendbar überall
```

---

### 5. **Register Page**
```
📝 /pages/register/index.vue (LINE 107-167)
├── Quelle: SELECT logo_url, logo_square_url FROM tenants
├── Verarbeitung: Fetch für Tenant Selection während Registration
└── Verwendung: Tenant Preview beim Registrieren
```

---

### 6. **Multi-Logo Upload (Admin)**
```
⬆️ /components/TenantMultiLogoUpload.vue
├── Quelle: currentLogos.wide, currentLogos.square
├── Verarbeitung: Upload via LogoUploadBox
└── Zukünftig: Nutze neue /api/tenant/upload-logo
```

---

### 7. **Logo Upload Box Component**
```
⬆️ /components/LogoUploadBox.vue
├── Verarbeitung: simulateUpload(file)
├── Status: Legacy (mockup)
└── Zukünftig: Nutze POST /api/tenant/upload-logo
```

---

## 🔄 Datenfluss - Wie Logos geladen werden

### Aktueller Datenfluss (JETZT):

```
┌─────────────────────┐
│   Tenant Table      │
│  - logo_url         │
│  - logo_square_url  │
│  - logo_wide_url    │
└──────────┬──────────┘
           │
           ├─→ 📄 PDF Receipt Generation
           │     └─→ receipt.post.ts (BASE64 + PATH HANDLING) ✅
           │
           ├─→ 🏠 Admin Layout Header
           │     └─→ getTenantLogo() → Navigation Logo
           │
           ├─→ 🎯 Tenant Selection Page
           │     └─→ auswahl.vue → Show logos per tenant
           │
           ├─→ 🖼️ TenantLogo Component
           │     └─→ Various display modes (svg mask, image, etc)
           │
           └─→ 📝 Register Page
                 └─→ Show tenant logos during registration
```

---

### Neuer Datenfluss (NACH DEPLOYMENT):

```
┌──────────────────────────┐
│  Tenant Table (Legacy)   │    ┌─────────────────────┐
│  - logo_url              │────│ tenant_assets       │ (NEW)
│  - logo_square_url       │    │ - asset_type        │
│  - logo_wide_url         │    │ - file_path         │
└──────────────────────────┘    │ - url (public)      │
                                └────────┬────────────┘
                                         │
      ┌──────────────────────────────────┼──────────────────────────┐
      │                                  │                          │
      ├─→ 📄 PDF Receipt (receipt.post.ts)                          │
      │    ├─ Falls Base64 → Use directly                           │
      │    ├─ Falls Storage Path → Convert + Load ✅ (FIXED)        │
      │    └─ Falls tenant_assets URL → Use directly               │
      │                                                             │
      ├─→ 🏠 Admin Layout (useTenantAssets)                         │
      │    └─ Composable auto-converts URLs                        │
      │                                                             │
      ├─→ 🎯 Tenant Selection (useTenantAssets)                     │
      │    └─ Auto fetch + URL conversion                          │
      │                                                             │
      ├─→ 🖼️ TenantLogo Component                                   │
      │    └─ Receives public URLs from composable                 │
      │                                                             │
      ├─→ 📝 Register Page (useTenantAssets)                        │
      │    └─ Fetch logos for tenant list                          │
      │                                                             │
      └─→ ⬆️ Upload API (NEW!)                                      │
           └─ POST /api/tenant/upload-logo → tenant_assets table
```

---

## 📊 URL-Formate - Was wo verarbeitet wird

### Format 1: Base64 Data URL (ALTE DATEN)
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...

Geladen in:
  ✅ receipt.post.ts - Erkannt auf LINE 111-120
  ⚠️  Andere Components - Funktionieren noch (Direct <img src>)
  
Nach Fix:
  ✅ Weiterhin überall unterstützt (Backward Compatible)
```

### Format 2: Relative Storage Path (ALT)
```
/storage/v1/object/public/logos/filename.png

Geladen in:
  ⚠️  receipt.post.ts - War Problem (jetzt FIXED!)
  ✅ Andere Components - Funktionieren (Direct URL)
  
Nach Fix:
  ✅ receipt.post.ts - Konvertiert zu vollständige URL
```

### Format 3: Full Storage URL (NEU)
```
https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/tenant-assets/{tenant-id}/logo.png

Geladen in:
  ✅ Alle Components - Funktionieren direkt
  ✅ receipt.post.ts - Fetch + Use
  ✅ useTenantAssets Composable - Auto-recognition
```

---

## 🎯 Was wird wo angepasst / Wie wird es geladen

### 1️⃣ PDF Receipt Generation (JETZT FIXED)
```typescript
// VORHER (FEHLERHAFT):
const logoUrl = tenant.logo_square_url  // z.B. "Driving_Team_Logo.png"
// Storage API versuchte zu laden → 400 Bad Request ❌

// NACHHER (FIXED):
const logoUrl = tenant.logo_square_url || tenant.logo_url || tenant.logo_wide_url

if (logoUrl.startsWith('data:')) {
  // Base64 → Use directly ✅
  return { logoDataUrl: logoUrl }
}

if (logoUrl.startsWith('/storage/v1/object/public/')) {
  // Relative Path → Convert + Fetch ✅
  const fullUrl = `https://unyjaetebnaexaflpyoc.supabase.co${logoUrl}`
  const response = await fetch(fullUrl)
  return { logoDataUrl: `data:image/...;base64,...` }
}

// Fallback: Fetch vollständige URL
const response = await fetch(logoUrl)
return { logoDataUrl: ... }
```

### 2️⃣ Components/Pages (OPTIONAL - Mit Composable)
```vue
<!-- VORHER -->
<img :src="tenant.logo_square_url" />

<!-- NACHHER (Empfohlen) -->
<script setup>
const { assets } = useTenantAssets(tenantId)
</script>

<template>
  <img :src="getLogo(assets, 'square')" />
  <!-- Automatische URL-Konvertierung ✅ -->
</template>
```

### 3️⃣ Admin Upload Feature (NEU)
```
VORHER: Legacy LogoUploadBox (mock)
NACHHER: New TenantLogoUpload Component
  → POST /api/tenant/upload-logo
  → File uploaded to Storage
  → URL saved in tenant_assets table
  → Auto-fetched by useTenantAssets
```

---

## 🔍 Wo die Logos derzeit kommen

### Datenquelle: `tenants` Tabelle
```sql
SELECT 
  logo_url,           -- Generic logo
  logo_square_url,    -- 1:1 ratio (favicons, profiles)
  logo_wide_url,      -- 3:1 or 4:1 (header, banner)
  logo_dark_url       -- Dark theme variant
FROM tenants;
```

### Werte können sein:
- ✅ Base64 Data URL: `data:image/png;base64,...`
- ✅ Relative Path: `/storage/v1/object/public/logos/file.png`
- ✅ Full URL: `https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/...`
- ❌ NULL/Empty

---

## 📋 Komponenten-Matrix - Wo welche Verarbeitung stattfindet

| Komponente/Seite | URL Format | Verarbeitung | Status |
|---|---|---|---|
| receipt.post.ts | Base64 ✓ | Direct use | ✅ FIXED |
| receipt.post.ts | Relative Path ✓ | Convert + Fetch | ✅ FIXED |
| receipt.post.ts | Full URL ✓ | Fetch | ✅ Works |
| TenantLogo.vue | Any | Format detection | ✅ Works |
| auswahl.vue | Any | Direct <img src> | ✅ Works |
| admin.vue | Any | getTenantLogo() | ⚠️ Legacy |
| useTenantAssets | Any | Auto-convert | ✅ NEW |
| TenantMultiLogoUpload | Any | Display + Upload | ⚠️ Legacy |

---

## 🚀 Migrationsplan - Was wird wann angepasst

### Phase 1: Immediate (Jetzt)
- ✅ receipt.post.ts - FIXED (Base64 + Path Handling)
- ⚠️ Alle anderen - Funktionieren noch wie vorher

### Phase 2: Nachdem Datenbank aktualisiert ist
- ✅ Optional: Nutze useTenantAssets Composable in Components
- ✅ Optional: Nutze TenantLogoUpload für Admin Panel
- ✅ Alte URLs funktionieren weiterhin (Backward compatible)

### Phase 3: Zukünftig
- Optional: Migriere alte Base64 Logos zu Storage (Script)
- Optional: Vereinheitliche alle Components auf useTenantAssets
- Optional: Nutze tenant_assets View überall

---

## 💡 Zusammenfassung

**Der Fix betrifft hauptsächlich:**
1. **PDF Receipt Generation** (receipt.post.ts) - ✅ JETZT FIXED
2. **Alle anderen** - Funktionieren bereits mit bestehenden URLs

**Zukünftige Verbesserungen:**
- Neue Logos via Upload-API speichern
- Composable nutzen für automatische URL-Konvertierung
- Zentrale Verwaltung in tenant_assets Tabelle

**Keine Breaking Changes:**
- Alte Base64 Logos funktionieren weiterhin
- Alte Relative Paths funktionieren weiterhin
- Nur PDF-Generierung wird behoben
