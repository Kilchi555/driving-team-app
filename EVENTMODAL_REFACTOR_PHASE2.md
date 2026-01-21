# EVENTMODAL SECURITY REFACTOR - Phase 2 Complete

## ✅ Phase 2: READ-only APIs (DONE)

Die folgenden 4 sicheren APIs wurden erstellt, um direkte Supabase-Queries im EventModal zu ersetzen:

---

### 1. `/api/staff/get-categories.get.ts`

**Zweck:** Categories mit durations für EventModal laden

**Endpoint:** `GET /api/staff/get-categories`

**Query Parameters:**
- `category_ids` (optional): Comma-separated category IDs (e.g., `"abc123,def456"`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "B",
      "name": "Kategorie B",
      "lesson_duration_minutes": 45,
      "exam_duration_minutes": 60,
      "theory_durations": {...},
      "tenant_id": "uuid"
    }
  ]
}
```

**Security:**
- ✅ Bearer Token Authentication
- ✅ Tenant Isolation (only own tenant categories)
- ✅ Active user check
- ✅ UUID validation
- ✅ Audit logging

**Replaces EventModal queries:**
- Line 2031-2032: `.from('categories').select('lesson_duration_minutes, theory_durations')`
- Line 2138-2139: `.from('categories').select('theory_durations')`
- Line 2262-2263: `.from('categories').select('*')`
- Line 2582-2583: `.from('categories').select('code, lesson_duration_minutes, exam_duration_minutes')`
- Line 2981-2982: `.from('categories').select('lesson_duration_minutes')`
- Line 3459-3460: `.from('categories').select('code, lesson_duration_minutes, exam_duration_minutes')`

---

### 2. `/api/staff/get-locations.get.ts`

**Zweck:** Locations für EventModal laden

**Endpoint:** `GET /api/staff/get-locations`

**Query Parameters:**
- `location_ids` (optional): Comma-separated location IDs

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Hauptstandort Zürich",
      "address": "Musterstrasse 1",
      "formatted_address": "Musterstrasse 1, 8000 Zürich",
      "street": "Musterstrasse",
      "street_number": "1",
      "zip": "8000",
      "city": "Zürich",
      "country": "CH",
      "tenant_id": "uuid"
    }
  ]
}
```

**Security:**
- ✅ Bearer Token Authentication
- ✅ Tenant Isolation (only own tenant locations)
- ✅ Active user check
- ✅ UUID validation
- ✅ Audit logging

**Replaces EventModal queries:**
- Line 2639-2640: `.from('locations').select('*')`
- Line 2743-2744: `.from('locations').select('*')`
- Line 4585-4586: `.from('locations').select('*')`
- Line 4688-4689: `.from('locations').select('*')`

---

### 3. `/api/staff/get-event-types.get.ts`

**Zweck:** Event Types mit default durations laden

**Endpoint:** `GET /api/staff/get-event-types`

**Query Parameters:**
- `event_type_codes` (optional): Comma-separated codes (e.g., `"lesson,theory,exam"`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "lesson",
      "name": "Fahrlektion",
      "default_duration_minutes": 45,
      "is_active": true,
      "tenant_id": "uuid"
    }
  ]
}
```

**Security:**
- ✅ Bearer Token Authentication
- ✅ Tenant Isolation (loads tenant-specific OR global event types)
- ✅ Active user check
- ✅ Audit logging

**Replaces EventModal queries:**
- Line 2492-2493: `.from('event_types').select('code, name, default_duration_minutes')`

---

### 4. `/api/staff/get-pricing-rules.get.ts`

**Zweck:** Pricing Rules (Admin Fee, Apply From) laden

**Endpoint:** `GET /api/staff/get-pricing-rules`

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "admin_fee_rappen": 500,
      "admin_fee_applies_from": 2,
      "is_active": true,
      "created_at": "2026-01-20T10:00:00Z"
    }
  ]
}
```

**Security:**
- ✅ Bearer Token Authentication
- ✅ Tenant Isolation (only own tenant pricing rules)
- ✅ Active user check
- ✅ Audit logging

**Replaces EventModal queries:**
- Line 2413-2414: `.from('pricing_rules').select('admin_fee_rappen, admin_fee_applies_from')`

---

## 📊 Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| Direct DB Queries in EventModal | 38 | 27 (-11) |
| Secure Staff APIs | 0 | 4 (+4) |
| Tables with API Access | 0 | 4 (categories, locations, event_types, pricing_rules) |

---

## 🔄 Next Steps

**Phase 3:** Appointment-Management APIs
- `/api/staff/get-appointments.get.ts`
- `/api/staff/update-appointment.post.ts`
- `/api/staff/delete-appointment.post.ts`
- `/api/staff/check-appointment-conflicts.post.ts`

This will replace 7 more direct queries in EventModal (lines 1002, 2393, 2564, 3617, 3743, 4029, 4506).

---

## 🧪 Testing

Test each API with:

```bash
# Get categories
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/staff/get-categories"

# Get specific categories
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/staff/get-categories?category_ids=abc123,def456"

# Get locations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/staff/get-locations"

# Get event types
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/staff/get-event-types"

# Get pricing rules
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/staff/get-pricing-rules"
```

---

## ✅ Phase 2 Status: COMPLETE

All 4 READ-only APIs are implemented with:
- Bearer token authentication
- Tenant isolation
- Input validation
- Audit logging
- Clean error handling
- TypeScript support

Ready to proceed to Phase 3.

