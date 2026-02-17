# Security Issues - Service Role Key in Public Endpoints

## 🔴 CRITICAL ISSUE

The following public booking endpoints are currently using `SUPABASE_SERVICE_ROLE_KEY`, which is a major security vulnerability:

1. **`server/api/booking/get-locations-and-staff.post.ts`**
   - Used by: Public booking page (unauthenticated)
   - Issue: Bypasses all RLS policies
   - Risk: High - Could expose data across all tenants if not properly validated

2. **`server/api/booking/get-availability.post.ts`**
   - Used by: Public booking page (unauthenticated)
   - Issue: Bypasses all RLS policies
   - Risk: High - Loads appointment and availability data

3. **`server/api/booking/get-tenant-by-slug.post.ts`**
   - Used by: Public booking page (unauthenticated)
   - Issue: Bypasses all RLS policies
   - Risk: Medium - Only reads tenant metadata, but still unnecessary

4. **`server/api/booking/get-availability-data.post.ts`**
   - Used by: Public booking page (unauthenticated)
   - Issue: Bypasses all RLS policies
   - Risk: High - Loads availability data, working hours, appointments

## ✅ SOLUTION

For each endpoint, we need to:

1. Switch from `SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_ANON_KEY`
2. Create appropriate RLS policies that:
   - Allow public read access to the specific data needed
   - Enforce tenant isolation via parameters in the query
   - Validate that the user is only accessing data they should

## 📋 RULE FOR FUTURE DEVELOPMENT

**NEVER use `SUPABASE_SERVICE_ROLE_KEY` in public endpoints!**

- Service Role Key = Full admin access, bypasses all RLS
- Anon Key + RLS Policies = Secure public access
- If you need to bypass RLS, the endpoint should be protected (not public)

Only use Service Role Key in:
- Internal backend-to-backend calls (with internal auth via headers)
- Admin-only endpoints (protected by authentication)
- Migration/setup scripts (never in production code)
