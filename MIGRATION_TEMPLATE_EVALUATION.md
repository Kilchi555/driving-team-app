# 🔧 MIGRATION TEMPLATE: EvaluationSystemManagerInline

This document shows HOW to migrate the remaining 41 Supabase queries in EvaluationSystemManagerInline.vue

## ✅ ALREADY DONE:
- Import removed
- getSupabase() initialization removed

## 📋 REMAINING: 41 queries to convert

### PATTERN: All queries follow this structure

**OLD (Direct Supabase):**
```typescript
const { data: result, error } = await supabase
  .from('table_name')
  .select('...')
  .eq('field', value)
  // ... more filters ...

if (error) throw error
// use result
```

**NEW (API Call):**
```typescript
const response = await $fetch('/api/admin/evaluation', {
  method: 'POST',
  body: {
    action: 'specific-action-name',
    tenant_id: tenantId,
    category_data: { /* data */ },
    // ... other params ...
  }
}) as any

if (!response?.success) throw new Error(response?.message)
const result = response.data
// use result
```

---

## 🎯 SPECIFIC REPLACEMENTS NEEDED:

### 1. Line ~1200: Load Evaluation Categories
**Current:** `supabase.from('evaluation_categories').select('*').eq('tenant_id', ...)`
**Replace with:** Action `get-evaluation-categories`

### 2. Line ~1250: Create Evaluation Category
**Current:** `supabase.from('evaluation_categories').insert([data])`
**Replace with:** Action `create-evaluation-category`

### 3. Line ~1290: Update Evaluation Category
**Current:** `supabase.from('evaluation_categories').update(data).eq('id', ...)`
**Replace with:** Action `update-evaluation-category`

### 4. Line ~1330: Delete Evaluation Category
**Current:** `supabase.from('evaluation_categories').delete().eq('id', ...)`
**Replace with:** Action `delete-evaluation-category`

### 5. Line ~1350: Get Criteria
**Current:** `supabase.from('evaluation_criteria').select('*').eq('evaluation_category_id', ...)`
**Replace with:** Action `get-evaluation-criteria`

### 6. Line ~1380: Create Criteria
**Current:** `supabase.from('evaluation_criteria').insert([data])`
**Replace with:** Action `create-evaluation-criteria`

### 7. Line ~1420: Update Criteria
**Current:** `supabase.from('evaluation_criteria').update(data).eq('id', ...)`
**Replace with:** Action `update-evaluation-criteria`

### 8. Line ~1460: Delete Criteria
**Current:** `supabase.from('evaluation_criteria').delete().eq('id', ...)`
**Replace with:** Action `delete-evaluation-criteria`

### 9. Line ~1490: Get Evaluation Scales
**Current:** `supabase.from('evaluation_scale').select('*')`
**Replace with:** Action `get-evaluation-scales`

### 10. Line ~1520: Create Scale
**Current:** `supabase.from('evaluation_scale').insert([data])`
**Replace with:** Action `create-evaluation-scale`

### 11. Line ~1550: Update Scale
**Current:** `supabase.from('evaluation_scale').update(data).eq('id', ...)`
**Replace with:** Action `update-evaluation-scale`

### 12. Line ~1580: Delete Scale
**Current:** `supabase.from('evaluation_scale').delete().eq('id', ...)`
**Replace with:** Action `delete-evaluation-scale`

### 13-15. Tenant Info, Categories, User Info
**Current:** Various queries from `tenants`, `categories`, `users`
**Replace with:** Actions `get-tenant-info`, `get-categories`, `get-user-info`

---

## 🤖 AUTOMATED MIGRATION SCRIPT

```bash
#!/bin/bash
# This script could auto-convert the queries using sed/awk

# 1. Find all supabase.from( calls
# 2. Extract the table name and operation
# 3. Map to appropriate API action
# 4. Generate API call code
# 5. Replace in file
```

---

## ✨ RECOMMENDATION

**Option A: Manual Migration (2-3 hours)**
- Go through each function systematically
- Replace one by one
- Test after each replacement
- Most reliable approach

**Option B: Automated Script (1 hour)**
- Create a script to parse and convert
- Use sed/awk or similar
- Faster but needs testing

**Option C: Defer (Now)**
- Keep the skeleton we have (import + init removed)
- Do a batch migration later with the team
- Faster overall progress on other components

---

## 📊 STATUS

**Current:** 0% converted (41 queries remain)
**After Manual:** 100% (41 queries)
**Effort:** 2-3 hours manual OR 1 hour scripted

**Recommendation:** Proceed with Option C (defer) to maximize other component migrations first, then come back with automation.
