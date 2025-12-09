# Logger System Implementation Checklist

## ✅ COMPLETED

1. ✅ Created `utils/logger.ts` - Main logger utility with environment-aware logs
2. ✅ Created `plugins/logger.ts` - Makes logger available as $logger in Nuxt
3. ✅ Created `server/api/logs/save.post.ts` - API endpoint to save error logs
4. ✅ Created `migrations/create_error_logs_table.sql` - Database schema for error logs
5. ✅ Created `composables/useErrorLogs.ts` - Composable for fetching/analyzing error logs
6. ✅ Created `server/api/admin/error-logs.get.ts` - Admin API to fetch error logs
7. ✅ Created `components/admin/ErrorLogsViewer.vue` - Admin dashboard component
8. ✅ Updated `CashPaymentConfirmation.vue` - Example of logger integration
9. ✅ Created `LOGGER_SYSTEM.md` - Full documentation
10. ✅ Created `scripts/replace-console-logs.sh` - Automated migration script

## 🚀 NEXT STEPS - DO THESE IN ORDER

### Step 1: Create the error_logs Table (Right Now!)

Run this SQL in Supabase SQL Editor:

```sql
-- Copy contents from:
-- migrations/create_error_logs_table.sql
-- and paste it in Supabase SQL Editor
```

Or if you have Supabase CLI:
```bash
supabase db push
```

### Step 2: Run the Automated Migration (5 minutes)

```bash
# Make script executable
chmod +x scripts/replace-console-logs.sh

# Run migration
bash scripts/replace-console-logs.sh
```

This will:
- Replace all `console.log(` with `logger.debug(`
- Keep `console.error` and `console.warn` (those are important!)
- Show you what was changed

### Step 3: Add Missing Imports (30 minutes)

After the script runs, many files need the import:

```typescript
import { logger } from '~/utils/logger'
```

Quick way to find files needing imports:
```bash
grep -r "logger\." \
  --include="*.vue" \
  --include="*.ts" \
  --include="*.js" \
  --exclude-dir=node_modules \
  | grep -v "import.*logger" \
  | cut -d: -f1 | sort | uniq
```

Then manually add the import to each file, or use Find+Replace in your editor.

### Step 4: Fix Linter Errors (15 minutes)

```bash
npm run lint
```

Fix any issues (mostly will be import-related).

### Step 5: Test in Development (5 minutes)

```bash
npm run dev
```

Open browser DevTools and check:
- Debug logs visible (with 🔍 prefix)
- No console errors about undefined logger
- Check Application > Storage > IndexedDB > error_logs to see if errors are being saved

### Step 6: Optional - Add to Admin Dashboard

Add this to an admin page:

```vue
<template>
  <div>
    <h1>Error Monitoring</h1>
    <ErrorLogsViewer />
  </div>
</template>

<script setup>
import ErrorLogsViewer from '~/components/admin/ErrorLogsViewer.vue'
</script>
```

## 📋 Files to Update - Priority Order

### HIGH PRIORITY (Critical paths)
These have security/payment implications:

- [ ] `components/EnhancedStudentModal.vue` - Document upload, payments
- [ ] `components/EventModal.vue` - Appointment management
- [ ] `components/CalendarComponent.vue` - Calendar operations
- [ ] `components/PriceDisplay.vue` - Price calculations
- [ ] `server/api/wallee/*.post.ts` - Payment processing
- [ ] `server/api/payments/*.post.ts` - Payment APIs

### MEDIUM PRIORITY (Core features)

- [ ] `pages/login.vue` - Authentication
- [ ] `pages/dashboard.vue` - Dashboard
- [ ] `components/PendenzenModal.vue` - Pending tasks
- [ ] `composables/useEventModalForm.ts` - Event form logic

### LOW PRIORITY (UI/helper components)

- [ ] `components/LocationSelector.vue`
- [ ] `components/StaffSelector.vue`
- [ ] `pages/admin/*.vue` - Admin pages
- [ ] Other utility components

## 💡 Quick Tips

### Use Find+Replace in VSCode

Find: `console\.log\(`  
Replace: `logger.debug(`

**But be careful:** This will also replace in strings! Review changes carefully.

### To keep console.error/warn

Find: `console\.(error|warn)\(`  
Replace: (leave empty - don't replace!)

### Check git diff before committing

```bash
git diff components/CashPaymentConfirmation.vue
```

Look for:
- ✅ `logger.debug` replaced `console.log`
- ✅ `logger.error` kept `console.error`
- ✅ Import added at top
- ❌ No accidental changes in strings

## 🔍 How to Test

### Test in Browser Console

```typescript
// This should work
this.$logger.error('Test', 'This is a test error', { data: 123 })

// Check if error appears in error_logs table
// Go to Supabase Dashboard > SQL Editor
// Run: SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10
```

### Test Admin Dashboard

1. Go to `/admin/error-logs` (if you added it)
2. Should see recent errors
3. Try filtering by component, time range
4. Click to expand error details

## ❌ What NOT to Log

```typescript
// DON'T log:
logger.debug('Auth', 'User credentials', { password: user.password })
logger.error('Payment', 'Card failed', { cardNumber: '4111111111111111' })
logger.info('API', 'Request', entireUserObject)

// DO log:
logger.debug('Auth', 'User login attempt', { email: user.email })
logger.error('Payment', 'Card declined', { cardLast4: '1111', code: error.code })
logger.info('API', 'Request received', { userId: user.id, path })
```

## 📊 Expected Results After Migration

- ✅ ~3000+ `console.log` statements → `logger.debug`
- ✅ ~200+ `console.error` statements → KEPT (no change)
- ✅ ~100+ `console.warn` statements → KEPT (no change)
- ✅ All debug logs hidden in production
- ✅ All errors captured in database
- ✅ Zero performance impact

## ⏱️ Estimated Timeline

| Step | Time | Who |
|------|------|-----|
| 1. Create table | 5 min | You (run SQL) |
| 2. Run migration script | 5 min | You (bash script) |
| 3. Add imports | 30 min | You (Find+Replace) |
| 4. Fix linter | 15 min | You (npm lint) |
| 5. Test | 10 min | You (manual test) |
| **TOTAL** | **1 hour** | |

## 🆘 If Something Goes Wrong

### "logger is not defined"
- Missing import: Add `import { logger } from '~/utils/logger'`

### "Cannot find module ~/utils/logger"
- Check file path is correct
- Clear `.nuxt` cache: `rm -rf .nuxt`
- Restart dev server

### "Error logs not saving"
- Check `error_logs` table exists in Supabase
- Check RLS policies are not blocking inserts
- Check browser console for errors

### Too many logs?
```typescript
// Temporarily disable error log saving in logger.ts:
// Comment out sendErrorToServer() call
```

## 🎉 You're Done When

1. ✅ No more `console.log` statements (except in strings)
2. ✅ All `console.error` and `console.warn` still there
3. ✅ Error logs appear in database
4. ✅ Admin can view errors in dashboard
5. ✅ App works normally in development
6. ✅ Git ready to commit

Then you can safely go to production with proper error tracking!

