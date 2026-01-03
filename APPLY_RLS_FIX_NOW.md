# QUICK FIX - Apply RLS Migration NOW

## ⚡ IMMEDIATE ACTION NEEDED

Copy this SQL and paste into **Supabase SQL Editor** NOW:

**File:** `migrations/fix_users_rls_ultra_safe.sql`

This will:
- ✅ Fix all 406 errors on `users` table
- ✅ Allow authenticated users to read their own profile
- ✅ Allow backend APIs to read all users
- ❌ Will NOT fix `discount_sales` 406 errors (separate migration needed)

---

## Step-by-Step

### 1. Go to Supabase Dashboard
- https://app.supabase.com
- Select project: driving-team-app
- Click: SQL Editor

### 2. Create New Query
- Click "+ New Query"

### 3. Copy-Paste Full Migration
From this file:
```
/Users/pascalkilchenmann/driving-team-app/migrations/fix_users_rls_ultra_safe.sql
```

### 4. Execute
- Click "Run" button
- Wait for success message

### 5. Test
Run this in Supabase to verify:
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename='users' ORDER BY policyname;
```

Should show 6 policies with safe names.

---

## Expected Result After Migration

✅ 406 errors on `/rest/v1/users` → GONE
⏳ Other 406 errors (discount_sales, etc) → Still there (need separate fix)
✅ `/api/admin/get-user-for-edit` → Should work now with token

---

## Next Steps After Migration Applied

1. Reload browser (Ctrl+R or Cmd+R)
2. Try editing an appointment
3. Student should load correctly
4. If still 401 → Token issue remains
5. If 406 on discount_sales → Need discount_sales RLS fix

---

**APPLY THIS NOW! Don't wait!**

