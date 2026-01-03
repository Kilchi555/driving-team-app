# Users Table RLS - Final Safe Implementation

**Problem:** RLS policies with subqueries caused infinite recursion → 406 Not Acceptable

**Solution:** Use ONLY `auth.uid()` - NO table reads

---

## ✅ Final Safe Policies

### Policy 1: User Self-Read
```sql
CREATE POLICY "User self read" ON users
  FOR SELECT
  USING (auth_user_id = auth.uid());
```
- Users can read their own profile
- No recursion risk (only uses auth.uid())

### Policy 2: Service Role Read (Backend APIs)
```sql
CREATE POLICY "Service role read" ON users
  FOR SELECT
  USING (auth.role() = 'service_role');
```
- Backend APIs can read all users (using service role key)
- Used by: `/api/admin/get-user-for-edit`, `/api/admin/get-tenant-users`, etc.
- No client access (only server-side)

### Policy 3-6: Update/Delete/Insert
- Service role can do anything
- Users can only update their own profile
- Insert is service role only

---

## 🎯 Architecture

```
Frontend (Authenticated Client)
  ├─ Can read: Own profile only
  └─ Can update: Own profile only

Backend (Service Role)
  ├─ Can read: All users
  ├─ Can create: New users
  ├─ Can update: Any user
  └─ Can delete: Any user
```

---

## ⚠️ Key Learnings

### ❌ DON'T: Use subqueries in RLS
```sql
-- BAD - causes recursion!
CREATE POLICY "Bad policy" ON users
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE auth_user_id = auth.uid()) = 'staff'
  );
```

### ✅ DO: Use auth.uid() and service role
```sql
-- GOOD - zero recursion
CREATE POLICY "Good policy" ON users
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR auth.role() = 'service_role'
  );
```

---

## 🔧 Implementation

Migration file: `migrations/fix_users_rls_ultra_safe.sql`

Run in Supabase SQL Editor:
1. Copy migration SQL
2. Execute
3. Verify with: `SELECT * FROM pg_policies WHERE tablename='users';`

---

## ✅ Testing

### Test 1: User reads own profile (should work)
```sql
SELECT id, email FROM users WHERE auth_user_id = auth.uid();
```
Result: ✅ Returns own user record

### Test 2: User reads other profile (should fail)
```sql
SELECT id, email FROM users WHERE auth_user_id != auth.uid();
```
Result: ❌ Returns empty (RLS blocks)

### Test 3: Backend API (service role) reads all users
- Uses `/api/admin/get-user-for-edit`
- Backend uses service_role_key
Result: ✅ Returns user data

---

## 📊 Security Matrix

| Operation | Self | Other Users | Service Role |
|-----------|------|-------------|--------------|
| READ | ✅ | ❌ | ✅ |
| UPDATE | ✅ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |
| INSERT | ❌ | ❌ | ✅ |

---

## 🚀 Result

- ✅ No recursion
- ✅ No 406 errors
- ✅ Clean permission model
- ✅ Secure by default
- ✅ All data access via backend APIs (when needed for staff/admin operations)

