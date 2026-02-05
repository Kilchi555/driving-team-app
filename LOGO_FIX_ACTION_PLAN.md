# Action Plan: Fix Supabase Logo URL Storage Errors

## Summary
The application was experiencing `400 Bad Request` errors when Supabase Storage tried to serve logo files. The root cause was **incomplete file paths** in the stored URLs.

## What Was Fixed ✅

### 1. **Logo URL Path Format**
- **Before:** `https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/Driving_Team_Logo.png`
- **After:** `https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/public/tenant-logos/Driving_Team_Logo.png`

### 2. **Code Changes**
| File | Change |
|------|--------|
| `server/api/tenants/register.post.ts` | Fixed `deleteTenantLogo()` path extraction logic |
| `composables/useLogoUpload.ts` | Fixed `deleteLogo()` path extraction logic |
| `sql_migrations/20260205_fix_logo_storage_urls_complete.sql` | **NEW:** Fixes all existing logo URLs |

### 3. **Documentation**
- Added `SUPABASE_LOGO_URL_FIX.md` with detailed explanation and testing guide

## Next Steps

### Step 1: Apply the Database Migration
```bash
# This migration will automatically fix all logo URLs in the database
npx supabase migration up
```

**What it does:**
- Identifies all logo URLs with incomplete paths
- Adds the missing `/public/tenant-logos/` segment
- Removes any incorrectly stored base64 data URIs
- Safely handles various URL format patterns

### Step 2: Test the Fix

#### Test Upload
```bash
# 1. Go to tenant settings page
# 2. Upload a new logo
# 3. Verify it displays correctly
# 4. Check the database: SELECT logo_url FROM tenants WHERE slug = 'your-slug'
# 5. Verify URL contains /public/tenant-logos/
```

#### Test API Response
```bash
# Test the branding API
curl "http://localhost:3000/api/tenants/branding?slug=driving-team"

# Verify response includes correct logo URLs:
# {
#   "success": true,
#   "data": {
#     "logo_url": "https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/public/tenant-logos/...",
#     "logo_square_url": "https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/public/tenant-logos/...",
#     ...
#   }
# }
```

#### Test Logo Display
```bash
# 1. Open a tenant page
# 2. Verify logo displays (not a 400 error)
# 3. Open browser console - check for errors
# 4. Check network tab - logo image requests should return 200 OK
```

### Step 3: Verify No Errors
```bash
# 1. Check application logs for any storage errors
# 2. Monitor for "400 Bad Request" errors
# 3. Verify all tenant logos load correctly
```

## Rollback Plan (if needed)

If issues occur, you can rollback by:

1. **Revert the code changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Rollback the migration:**
   ```bash
   npx supabase migration down
   ```

3. **Clear browser cache:**
   - Old logo URLs might be cached
   - Hard refresh or clear localStorage

## Technical Details

### Supabase Storage Structure
```
Bucket Name: public
├── tenant-logos/
│   ├── driving-team-logo-1707124800000.png
│   ├── other-tenant-logo-1707124801000.png
│   └── ...
```

### Full URL Format
```
https://[PROJECT-ID].supabase.co/storage/v1/object/public/public/tenant-logos/[FILENAME]
                                                        ↑      ↑
                                              Bucket name   Path
```

### Database Fields Updated
- `tenants.logo_url`
- `tenants.logo_square_url`
- `tenants.logo_wide_url`
- `tenants.logo_dark_url`
- `tenants.favicon_url`

## Expected Behavior After Fix

✅ **Upload New Logo**
- Logo file uploaded to Supabase Storage
- URL stored with correct path format
- Logo displays immediately

✅ **Update Logo**
- Old logo automatically deleted from storage
- New logo uploaded with correct path
- URL updated in database

✅ **Access Logo from Branding API**
- API returns URLs with complete paths
- Browser can load images without 400 errors

✅ **Display Logo in UI**
- Tenant logo displays correctly on all pages
- No Storage API errors in console

## Monitoring

After applying the fix, monitor these metrics:

1. **Storage API Errors:** Should drop to 0
2. **Logo Load Times:** Should be normal (<500ms)
3. **Tenant Branding API Response:** Should include valid URLs
4. **Failed Image Requests:** Should be 0

## Questions?

Refer to `SUPABASE_LOGO_URL_FIX.md` for:
- Detailed problem explanation
- Root cause analysis
- URL format reference
- Testing checklist
