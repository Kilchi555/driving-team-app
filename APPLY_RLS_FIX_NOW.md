# QUICK FIX - Apply RLS Migrations NOW

## ⚡ IMMEDIATE ACTION NEEDED - 3 MIGRATIONS

Copy each SQL and paste into **Supabase SQL Editor** in this ORDER:

**File 1:** `migrations/fix_users_rls_ultra_safe.sql`
**File 2:** `migrations/cleanup_discount_sales_rls.sql` ← DO THIS FIRST for discount_sales!
**File 3:** `migrations/fix_discount_sales_rls.sql` ← Then this

This will:
- ✅ Fix all 406 errors on `users` table
- ✅ Clean up conflicting policies on `discount_sales`
- ✅ Apply new safe policies on `discount_sales`
- ✅ Allow authenticated users to read their own profile
- ✅ Allow backend APIs to read/write all data

---

## Step-by-Step (DO IN THIS ORDER)

### Step 1: Apply fix_users_rls_ultra_safe.sql

1. Go to Supabase → SQL Editor → + New Query
2. Copy from: `/Users/pascalkilchenmann/driving-team-app/migrations/fix_users_rls_ultra_safe.sql`
3. Paste and click **Run**
4. Wait for success

### Step 2: Apply cleanup_discount_sales_rls.sql

1. + New Query
2. Copy from: `/Users/pascalkilchenmann/driving-team-app/migrations/cleanup_discount_sales_rls.sql`
3. Paste and click **Run**
4. Wait for success

### Step 3: Apply fix_discount_sales_rls.sql

1. + New Query
2. Copy from: `/Users/pascalkilchenmann/driving-team-app/migrations/fix_discount_sales_rls.sql`
3. Paste and click **Run**
4. Wait for success

### Step 4: Test in Browser

1. Reload browser (Ctrl+R or Cmd+R)
2. Try editing an appointment
3. Check browser console - should see NO 406 or 401 errors

---

## Expected Result

✅ 406 errors on users → GONE
✅ 406 errors on discount_sales → GONE
✅ 401 on /api/admin/get-user-for-edit → GONE
✅ Student data loads
✅ Payment method loads

---

**APPLY ALL 3 IN ORDER NOW!**


