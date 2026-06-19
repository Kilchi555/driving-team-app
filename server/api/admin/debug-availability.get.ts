/**
 * TEMPORARY DEBUG: Check why availability calculator generates 0 slots
 * DELETE AFTER USE
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { availabilityCalculator } from '~/server/services/availability-calculator'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'
  const RAHEL_ID = 'cfd3ce3c-b172-44e2-86c8-820714218db4'
  
  const startDate = new Date()
  const endDate = new Date(); endDate.setDate(endDate.getDate() + 7)
  
  const result: any = {
    timestamp: new Date().toISOString(),
    minBookableTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString()
  }
  
  // 1. Staff
  const { data: staff } = await supabase.from('users')
    .select('id, first_name, category').eq('id', RAHEL_ID).single()
  result.staff = { id: staff?.id, name: staff?.first_name, category: staff?.category, isArray: Array.isArray(staff?.category) }
  
  // 2. Staff locations
  const { data: sl, error: slErr } = await supabase.from('staff_locations')
    .select('location_id, is_online_bookable, is_active, tenant_id')
    .eq('staff_id', RAHEL_ID).eq('is_active', true).eq('is_online_bookable', true).eq('tenant_id', TENANT_ID)
  result.staff_locations = { count: sl?.length || 0, error: slErr?.message, data: sl }
  
  // 3. Locations
  const locationIds = (sl || []).map((l: any) => l.location_id)
  const { data: locs, error: locErr } = await supabase.from('locations')
    .select('id, name, location_type, is_active, staff_ids, available_categories')
    .in('id', locationIds).eq('is_active', true).eq('location_type', 'standard')
  result.locations = { count: locs?.length || 0, error: locErr?.message }
  
  // 4. Categories
  const { data: cats, error: catErr } = await supabase.from('categories')
    .select('id, code, lesson_duration_minutes').eq('is_active', true)
    .eq('tenant_id', TENANT_ID).not('parent_category_id', 'is', null)
  result.categories = { count: cats?.length || 0, error: catErr?.message, codes: cats?.map((c: any) => c.code) }
  
  // 5. Rahel matching categories
  const rahelCats = Array.isArray(staff?.category) ? staff.category : []
  const matchingCats = (cats || []).filter((c: any) => rahelCats.includes(c.code))
  result.matching_categories = matchingCats.map((c: any) => c.code)
  
  // 6. Working hours
  const { data: wh } = await supabase.from('staff_working_hours')
    .select('day_of_week, start_time, end_time, is_active').eq('staff_id', RAHEL_ID)
  result.working_hours = (wh || []).filter((h: any) => h.is_active).map((h: any) => ({ day: h.day_of_week, from: h.start_time, to: h.end_time }))
  
  // 7. Appointments in next 7 days
  const { data: apts } = await supabase.from('appointments')
    .select('id, start_time, end_time, status')
    .eq('staff_id', RAHEL_ID).gte('start_time', startDate.toISOString()).lte('start_time', endDate.toISOString())
    .not('status', 'eq', 'deleted')
  result.appointments_next7days = (apts || []).length
  
  // 8. Actually run the calculator for Rahel (next 7 days, dry-run by checking count)
  try {
    const endDate7 = new Date(); endDate7.setDate(endDate7.getDate() + 7)
    const slotsWritten = await availabilityCalculator.recalculateForStaff(TENANT_ID, RAHEL_ID, 7)
    result.calculator_result = { slots_written: slotsWritten, error: null }
  } catch (e: any) {
    result.calculator_result = { slots_written: null, error: e.message }
  }
  
  return result
})
