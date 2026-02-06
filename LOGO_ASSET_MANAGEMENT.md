## 📋 Logo/Asset Management System - Implementation Summary

### 🎯 Was wurde gelöst

**Problem:** Storage API Error beim Zugriff auf Logos wegen fehlendem Bucket-Name in URL
**Ursache:** Base64 Data URLs und relative Storage Paths wurden nicht korrekt behandelt
**Lösung:** Umfassende Best-Practice Architektur für Multi-Format Asset Management

---

## 📁 Neue Dateien/Änderungen

### 1. **SQL Migrations**

#### `20260205_add_tenant_assets_table.sql`
- ✅ Neue `tenant_assets` Tabelle für zentrale Asset-Verwaltung
- ✅ Unterstützt: logo, logo_square, logo_wide, favicon, icon, banner
- ✅ Formate: PNG, JPG, SVG, WebP, GIF
- ✅ RLS Policies für Sicherheit
- ✅ Automatische Timestamp-Verwaltung

#### `20260205_migrate_logos_to_assets_table.sql` (Optional)
- Backfill von bestehenden Logo-URLs
- Erstellt View `vw_tenant_logos` für einfachen Zugriff
- Für später: Migration von Base64 zu Storage

### 2. **Server-API Routes**

#### `server/api/payments/receipt.post.ts` ✏️ (Behoben)
- ✅ Base64 Data URLs werden sofort erkannt
- ✅ Relative Storage Paths werden zu vollständigen URLs konvertiert
- ✅ Fallback zu Fetch mit verschiedenen Headers
- ✅ Bessere Error Handling und Logging

#### `server/api/tenant/assets.get.ts` (NEU)
- GET-Endpoint zum Abrufen von Tenant Assets
- Nutzt `vw_tenant_logos` View für Performance
- Fallback auf `tenants` Tabelle für Compatibility
- Öffentlich zugänglich (für Receipts, etc.)

#### `server/api/tenant/upload-logo.post.ts` (NEU)
- POST-Endpoint für Logo-Upload
- Validierung: Dateigröße (5MB), Format, Admin-Berechtigung
- Upload zu Supabase Storage (`tenant-assets` Bucket)
- Erstellt Einträge in `tenant_assets` Tabelle
- Response mit public URL

### 3. **Frontend Composable**

#### `composables/useTenantAssets.ts` (NEU)
```typescript
// Verwendung:
const { assets, getPrimaryLogo, toPublicUrl } = useTenantAssets(tenantId)

// In Templates:
<img :src="assets.value?.logoSquare || assets.value?.logo" />
```

**Features:**
- ✅ Automatische URL-Konvertierung
- ✅ Base64 + Relative URLs Support
- ✅ MIME-Type Erkennung
- ✅ Async Data Loading mit Watch
- ✅ Error Handling

### 4. **Frontend Component**

#### `components/TenantLogoUpload.vue` (NEU)
- Upload UI für Admin Panel
- Drag-and-Drop Support
- Multiple Asset Types
- Vorschau vor Upload
- Delete Funktionalität

---

## 🚀 Verwendung

### Im Admin Panel (Logo hochladen)
```vue
<TenantLogoUpload 
  :tenantId="tenantId" 
  @uploadComplete="onUploadComplete"
/>
```

### Im Frontend (Logo anzeigen)
```vue
<script setup>
const { assets, getLogo } = useTenantAssets(tenantId)
</script>

<template>
  <img :src="getLogo(assets, 'square')" alt="Logo" />
</template>
```

### In PDF/Receipt Generation
```typescript
// Bereits behoben in receipt.post.ts
const { logoDataUrl } = await loadTenantAssets(tenant, supabase)
// Base64 oder URL wird automatisch verarbeitet
```

---

## 📊 Datenbankschema

```sql
-- Neue Tabelle
tenant_assets
├── id (UUID PK)
├── tenant_id (FK)
├── asset_type (logo | logo_square | logo_wide | favicon | icon | banner)
├── file_path (relative path in storage)
├── format (png | jpg | svg | webp | gif)
├── mime_type
├── file_size_bytes
├── url (public URL)
├── created_at / updated_at

-- View (Comfort)
vw_tenant_logos
├── tenant_id
├── logo_url
├── logo_square_url
├── logo_wide_url
├── favicon_url
├── last_updated
```

---

## ✅ Checklist für nächste Schritte

- [ ] SQL Migrations in Supabase ausführen
- [ ] `receipt.post.ts` testen (PDF generation mit Base64 Logos)
- [ ] API Routes testen (`/api/tenant/assets`, `/api/tenant/upload-logo`)
- [ ] Composable in Components testen
- [ ] Admin-UI für Logo Upload implementieren
- [ ] Optional: Migration-Script für alte Base64 Logos schreiben
- [ ] Optional: Storage Security Policies überprüfen

---

## 🔒 Security Features

✅ RLS Policies auf `tenant_assets` Tabelle
✅ Admin-only Upload/Delete
✅ File Size Limits
✅ Format Validation
✅ MIME Type Checking
✅ Unique Constraint pro Tenant/Asset-Type

---

## 📝 Wichtige Hinweise

1. **Storage Bucket**: `tenant-assets` (muss in Supabase erstellt sein)
2. **Project Ref**: `unyjaetebnaexaflpyoc` (hardcoded in receipt.post.ts - optional als Config)
3. **Backward Compatible**: Alt-Logos in `tenants` Tabelle funktionieren noch via Fallback
4. **Keine Breaking Changes**: Bestehende Logo-URLs in `tenants.logo_url` weiterhin unterstützt

---

## 🎓 Best Practices für die Zukunft

✨ **Neue Tenants:**
- Logo über Upload-API hochladen
- Assets landen automatisch in `tenant_assets` Tabelle
- Nutze `useTenantAssets` Composable im Frontend

✨ **Alte Tenants (Base64):**
- Funktionieren weiterhin via Fallback
- Optional später zu Storage migrieren
- Migration-Script bereitstellen

✨ **Weitere Asset-Typen:**
- Icons, Banner, Branding Assets
- Einfach `asset_type` in der Tabelle anpassen
- Komponentenlogik ist schon generisch

