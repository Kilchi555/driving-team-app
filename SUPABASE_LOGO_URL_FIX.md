# Supabase Storage Logo URL Fix

## Problem
The application was experiencing a `400 Bad Request` error when trying to access logo files from Supabase Storage:

```
StorageUnknownError: Response {
  status: 400,
  statusText: 'Bad Request',
  url: 'https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/Driving_Team_Logo.png'
}
```

## Root Cause
The logo URLs were being stored in the database with incomplete paths. The correct format for Supabase Storage public URLs should include the full bucket path:

❌ **Incorrect:** 
```
https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/Driving_Team_Logo.png
```

✅ **Correct:**
```
https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/public/tenant-logos/Driving_Team_Logo.png
```

## Issues Fixed

### 1. **SQL Migration** (`20260205_fix_logo_storage_urls_complete.sql`)
- Identifies all logo URLs missing the `/public/tenant-logos/` path segment
- Handles multiple URL format patterns:
  - Relative paths with single `public`
  - Relative paths with double `public`
  - Full URLs from Supabase
- Removes base64 data URIs that were incorrectly stored as logo URLs
- Safely updates `logo_url`, `logo_square_url`, and `logo_wide_url` fields

### 2. **Server Upload Function** (`server/api/tenants/register.post.ts`)
- Fixed the `deleteTenantLogo()` function to handle multiple URL path patterns
- Now correctly identifies the file path from various URL formats
- Includes error handling and logging for failed extractions

### 3. **Frontend Upload Composable** (`composables/useLogoUpload.ts`)
- Updated `deleteLogo()` function with same path extraction logic
- Added robust error handling for invalid URLs
- Better logging for debugging path extraction issues

## Implementation Steps

1. **Run the migration:**
   ```bash
   # The migration will automatically fix all existing logo URLs
   supabase migration up
   ```

2. **Verify the fix:**
   - Query the database to confirm URLs now include `/public/tenant-logos/`
   - Test logo uploads and downloads
   - Check storage access logs for 400 errors

3. **Test functionality:**
   - Upload a new logo through the UI
   - Verify it's stored with correct path
   - Delete a logo and confirm it's removed from storage
   - Check tenant branding API returns correct logo URLs

## URL Path Format Reference

### Upload Path (in Supabase Storage):
```
Bucket: public
Path: tenant-logos/driving-team-logo-1707124800000.png
```

### Public URL Generated:
```
https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/public/tenant-logos/driving-team-logo-1707124800000.png
```

### Stored in Database:
```
logo_url: "https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/public/tenant-logos/driving-team-logo-1707124800000.png"
```

## Testing

After applying the fix, test these scenarios:

1. **New Tenant Registration:**
   - Create new tenant with logo upload
   - Verify logo displays correctly
   - Check URL in database has correct format

2. **Logo Update:**
   - Update existing tenant logo
   - Verify old logo is deleted
   - Verify new logo URL is correct

3. **Tenant Branding API:**
   - Call `/api/tenants/branding?slug=driving-team`
   - Verify logo URLs in response are valid
   - Test that logos actually load in browser

4. **Error Scenarios:**
   - Upload oversized logo (>2MB)
   - Upload wrong file type
   - Delete logo and verify it's removed from storage

## Notes

- The migration is idempotent - it can be run multiple times safely
- Base64 data URIs are removed (they shouldn't be stored as URLs)
- All existing tenant logos are automatically updated
- New uploads use the correct path format automatically
