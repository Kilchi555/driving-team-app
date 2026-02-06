## 🚀 Deployment Checklist - Logo/Asset Management System

**Status:** Ready for Deployment  
**Date:** 2026-02-05  
**Version:** 1.0  

---

## ✅ Pre-Deployment Checks

### 1. Database Setup
- [ ] Run SQL Migration: `20260205_add_tenant_assets_table.sql`
  ```sql
  -- Execute in Supabase SQL Editor
  -- Creates: tenant_assets table, RLS policies, triggers
  ```
- [ ] Run SQL Migration: `20260205_migrate_logos_to_assets_table.sql` (Optional)
  ```sql
  -- For backfilling existing logos to tenant_assets table
  ```
- [ ] Verify `tenant_assets` table created
  ```sql
  SELECT * FROM information_schema.tables WHERE table_name = 'tenant_assets';
  ```
- [ ] Verify `vw_tenant_logos` view created
  ```sql
  SELECT * FROM vw_tenant_logos LIMIT 1;
  ```

### 2. Supabase Storage Setup
- [ ] Create Storage Bucket: `tenant-assets`
  - Go to Supabase Dashboard → Storage → Create new bucket
  - Name: `tenant-assets`
  - Make it public (allow access via URL)
- [ ] Set up CORS policies (if needed)
- [ ] Configure bucket policies for authenticated uploads

### 3. Code Review & Testing
- [ ] Review `server/api/payments/receipt.post.ts` changes
  - [ ] Base64 URL handling works
  - [ ] Relative storage paths converted to full URLs
  - [ ] Error handling for missing files
- [ ] Review `server/api/tenant/assets.get.ts`
  - [ ] Returns correct logo URLs
  - [ ] Fallback to tenants table works
- [ ] Review `server/api/tenant/upload-logo.post.ts`
  - [ ] File validation works (size, format)
  - [ ] Admin permission checks work
  - [ ] Files upload to storage correctly
- [ ] Review `composables/useTenantAssets.ts`
  - [ ] URL conversion works
  - [ ] MIME type detection works
- [ ] Review `components/TenantLogoUpload.vue`
  - [ ] UI renders correctly
  - [ ] Upload progress shows
  - [ ] Error messages display

### 4. Local Testing
- [ ] Run test script: `bash scripts/test-logo-system.sh`
- [ ] Test PDF receipt generation with Base64 logo
  - [ ] Old logos (Base64) still work
  - [ ] New logos (storage URLs) work
- [ ] Test API routes locally
  ```bash
  # Test assets.get
  curl http://localhost:3000/api/tenant/assets?tenantId=<UUID>
  
  # Test upload (with auth)
  curl -X POST http://localhost:3000/api/tenant/upload-logo \
    -F "file=@logo.png" \
    -F "assetType=logo_square" \
    -F "tenantId=<UUID>" \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

## 📦 Deployment Steps

### Step 1: Database Migrations
```bash
# In Supabase Dashboard
1. Go to SQL Editor
2. Copy content of: sql_migrations/20260205_add_tenant_assets_table.sql
3. Run the migration
4. Verify: SELECT COUNT(*) FROM tenant_assets; -- Should return 0
```

### Step 2: Storage Setup
```bash
# In Supabase Dashboard
1. Go to Storage
2. Create new bucket named "tenant-assets"
3. Make it public
4. Set retention policy (optional)
```

### Step 3: Deploy Code
```bash
# Pull latest changes
git pull origin main

# Install dependencies (if any new ones)
npm install

# Run linter
npm run lint

# Build project
npm run build

# Deploy to production
# (Your deployment process here)
```

### Step 4: Verify Deployment
```bash
# Test in production environment
curl https://your-domain.com/api/tenant/assets?tenantId=<test-tenant-id>

# Check for errors in logs
# Monitor error tracking (Sentry, etc.)
```

---

## 🧪 Post-Deployment Testing

### Manual Testing Checklist
- [ ] Admin can upload logo in admin panel
- [ ] Logo appears in admin preview
- [ ] Logo appears in PDF receipts
- [ ] Delete logo functionality works
- [ ] Old Base64 logos still render in receipts (backward compatibility)
- [ ] Newly uploaded logos work correctly
- [ ] Error messages show for invalid files
- [ ] File size limit enforced

### Automated Testing
```bash
# Run existing test suite
npm run test

# If you have E2E tests
npm run test:e2e
```

---

## 📊 Rollback Plan

If issues occur after deployment:

### Option 1: Revert Code Changes
```bash
git revert <commit-hash>
git push origin main
```

### Option 2: Keep Database, Disable Feature
- [ ] Keep `tenant_assets` table (harmless if empty)
- [ ] Receipt generation falls back to old method automatically
- [ ] Admin upload feature hidden/disabled in UI

### Option 3: Full Rollback
```bash
# Restore previous database snapshot
# (if you have backups)
```

---

## 📝 Monitoring & Maintenance

### What to Monitor
- [ ] Storage API error rates (should be low after fix)
- [ ] PDF generation success rate (should be >99%)
- [ ] Upload completion rates (admin feature)
- [ ] Storage usage (`tenant-assets` bucket)

### Regular Maintenance
- [ ] Clean up old/unused assets (optional)
- [ ] Monitor storage costs
- [ ] Review RLS policies quarterly
- [ ] Update MIME type support if needed

### Known Limitations
- Max file size: 5MB per logo
- Supported formats: PNG, JPG, SVG, WebP, GIF
- Storage bucket must exist in Supabase
- RLS policies depend on `users.role = 'admin'`

---

## 🆘 Troubleshooting

### Issue: "relation tenant_assets does not exist"
**Solution:** Run the migration SQL in Supabase

### Issue: Upload fails with 403 Forbidden
**Solution:** 
- Check user has `role = 'admin'`
- Check RLS policies on `tenant_assets` table
- Check auth user is linked to correct tenant

### Issue: Images not loading in PDF receipts
**Solution:**
- Check storage bucket is public
- Check file path in `tenant_assets` table
- Check CORS headers if fetching from browser

### Issue: "File format not allowed"
**Solution:**
- Supported formats: png, jpg, jpeg, svg, webp, gif
- Ensure file has correct extension

---

## 📚 Documentation

- **Main Guide:** See `LOGO_ASSET_MANAGEMENT.md`
- **API Routes:** See `server/api/tenant/*.ts` files
- **Frontend Usage:** See `composables/useTenantAssets.ts`
- **Component:** See `components/TenantLogoUpload.vue`

---

## ✨ Future Enhancements

- [ ] Image resizing/cropping before upload
- [ ] Batch logo upload
- [ ] Logo optimization (WebP conversion)
- [ ] CDN integration for faster delivery
- [ ] Asset versioning/history
- [ ] Dynamic logo generation from tenant colors
- [ ] Support for additional asset types (banners, icons)

---

## 🎯 Success Criteria

✅ PDF receipts generate without Storage API errors  
✅ Old Base64 logos still display correctly  
✅ New logo upload feature works in admin panel  
✅ Asset URLs are stored in `tenant_assets` table  
✅ No downtime during deployment  
✅ Error rates remain within acceptable limits  

---

**Deployed by:** [Your Name]  
**Deployment Date:** ___________  
**Status:** [ ] Success [ ] Rollback [ ] Partial
