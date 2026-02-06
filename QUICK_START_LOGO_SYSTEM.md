## 🚀 Quick Start Guide - Logo Asset Management

### For Developers

#### 1. Im Admin Panel: Logo hochladen
```vue
<template>
  <TenantLogoUpload 
    :tenantId="currentTenantId" 
    @uploadComplete="handleUploadComplete"
  />
</template>
```

#### 2. Im Frontend: Logo anzeigen
```vue
<script setup>
const { assets, getLogo } = useTenantAssets(tenantId)
</script>

<template>
  <!-- Primary logo (auto-select best format) -->
  <img :src="getLogo(assets)?.value?.primary" alt="Logo" />
  
  <!-- Specific format -->
  <img :src="getLogo(assets, 'square')?.value" alt="Square Logo" />
  <img :src="getLogo(assets, 'wide')?.value" alt="Wide Logo" />
</template>
```

#### 3. Server-Side: API verwenden
```typescript
// Get logos for a tenant
const response = await $fetch('/api/tenant/assets', {
  query: { tenantId }
})

// Upload logo (as FormData)
const formData = new FormData()
formData.append('file', file)
formData.append('assetType', 'logo_square')
formData.append('tenantId', tenantId)

await $fetch('/api/tenant/upload-logo', {
  method: 'POST',
  body: formData
})

// Delete logo
await $fetch('/api/tenant/delete-asset', {
  method: 'DELETE',
  body: { tenantId, assetType: 'logo_square' }
})
```

---

### For Database Administration

#### Check if migrations were applied
```sql
-- Check tenant_assets table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'tenant_assets';

-- Check data
SELECT tenant_id, asset_type, url, created_at 
FROM tenant_assets 
ORDER BY created_at DESC 
LIMIT 10;

-- View compiled logos
SELECT * FROM vw_tenant_logos LIMIT 5;
```

#### Manual Logo Entry (If needed)
```sql
INSERT INTO tenant_assets 
  (tenant_id, asset_type, file_path, format, mime_type, url)
VALUES (
  'tenant-uuid',
  'logo_square',
  'tenant-assets/tenant-uuid/logo.png',
  'png',
  'image/png',
  'https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/tenant-assets/tenant-uuid/logo.png'
);
```

---

### Troubleshooting

#### Problem: Logo shows as broken image

**Check 1: Storage URL is correct**
```bash
# Test URL in browser
https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/tenant-assets/{tenant-id}/logo.png

# Should return image file, not JSON error
```

**Check 2: File exists in storage**
```bash
# In Supabase Dashboard
Storage → tenant-assets → {tenant-id}/logo.png
# Should be visible there
```

**Check 3: Bucket is public**
```
Storage → tenant-assets → Policies
# Must allow public SELECT access
```

#### Problem: Upload fails with 403

**Solution:** User must be admin
```sql
SELECT role FROM users 
WHERE auth_user_id = 'user-uuid' 
AND tenant_id = 'tenant-uuid';

-- Should return 'admin'
```

#### Problem: File too large error

**Solution:** Max 5MB per file
```
Allowed: 1-5 MB
Formats: PNG, JPG, SVG, WebP, GIF
```

---

### Common Commands

```bash
# Run tests
bash scripts/test-logo-system.sh

# View migration files
ls -la sql_migrations/20260205_*

# Check server routes
grep -r "upload-logo\|assets.get" server/api/tenant/

# Check i18n strings
grep -A5 '"branding"' locales/de.json
```

---

### File Locations

**Documentation**
- Overview: `LOGO_ASSET_MANAGEMENT.md`
- Deployment: `DEPLOYMENT_CHECKLIST_LOGO_SYSTEM.md`
- Summary: `IMPLEMENTATION_COMPLETE.md`

**Database**
- Migrations: `sql_migrations/20260205_*.sql`

**Backend**
- PDF Fix: `server/api/payments/receipt.post.ts`
- APIs: `server/api/tenant/*.ts` (3 files)

**Frontend**
- Composable: `composables/useTenantAssets.ts`
- Component: `components/TenantLogoUpload.vue`
- i18n: `locales/{de,en}.json`

**Testing**
- Script: `scripts/test-logo-system.sh`

---

### Environment Variables (If needed)

In your `.env`:
```
# Supabase
SUPABASE_PROJECT_REF=unyjaetebnaexaflpyoc
SUPABASE_STORAGE_BUCKET=tenant-assets
MAX_LOGO_SIZE=5242880  # 5MB in bytes
ALLOWED_FORMATS=png,jpg,jpeg,svg,webp,gif
```

---

### API Reference

#### GET /api/tenant/assets
```typescript
// Query
{ tenantId: string }

// Response
{
  logo_url: string | null,
  logo_square_url: string | null,
  logo_wide_url: string | null,
  favicon_url: string | null
}
```

#### POST /api/tenant/upload-logo
```typescript
// Form Data
{
  file: File,
  assetType: 'logo' | 'logo_square' | 'logo_wide' | 'favicon',
  tenantId: string
}

// Response
{
  success: boolean,
  asset: {
    id: string,
    tenant_id: string,
    asset_type: string,
    url: string,
    format: string,
    file_size_bytes: number
  }
}
```

#### DELETE /api/tenant/delete-asset
```typescript
// Body
{
  tenantId: string,
  assetType: string
}

// Response
{
  success: boolean,
  message: string
}
```

---

### Performance Tips

1. **Use asset URLs directly** (not Base64)
   - ✅ Efficient
   - ❌ Don't store large Base64 in database

2. **Lazy load logos**
   ```vue
   <img :src="logo" loading="lazy" />
   ```

3. **Cache logo URLs**
   ```typescript
   const { assets, refresh } = useTenantAssets(tenantId)
   // Already cached by useAsyncData
   ```

4. **CDN optimization**
   - Supabase automatically serves through Cloudflare CDN
   - No additional config needed

---

**For more details, see the full documentation files mentioned above!**
