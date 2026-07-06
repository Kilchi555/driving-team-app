/**
 * POST /api/booking/preview-price
 * Returns the calculated lesson price for a given slot/category combination,
 * including admin fee (when applicable for the user's category history).
 * Used by the booking confirmation step to display the price before confirming.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { roundToNearest5Rappen } from '~/utils/rounding'
import { calculateAdminFee } from '~/server/utils/admin-fee'
import { resolveVehicleSettings, calculateVehicleCost } from '~/server/utils/vehicle-availability'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { slot_id, category_code, tenant_id, user_id, vehicle_mode, location_id } = body

    if (!slot_id || !category_code || !tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'slot_id, category_code and tenant_id are required' })
    }

    const supabase = getSupabaseAdmin()

    // Fetch the slot to get duration and start_time
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('duration_minutes, start_time, location_id')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot) {
      throw createError({ statusCode: 404, statusMessage: 'Slot not found' })
    }

    // Fetch base_price + admin_fee rules + vehicle settings in parallel
    const effectiveLocationId = location_id || slot.location_id
    const [basePriceRuleRes, adminFeeRuleRes, locationRes, categoryRes] = await Promise.all([
      supabase
        .from('pricing_rules')
        .select('price_per_minute_rappen, base_duration_minutes, duration_multiplier, weekend_multiplier, evening_multiplier')
        .eq('category_code', category_code)
        .eq('tenant_id', tenant_id)
        .eq('rule_type', 'base_price')
        .lte('valid_from', new Date().toISOString())
        .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString())
        .maybeSingle(),
      supabase
        .from('pricing_rules')
        .select('admin_fee_rappen')
        .eq('category_code', category_code)
        .eq('tenant_id', tenant_id)
        .eq('rule_type', 'admin_fee')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      effectiveLocationId ? supabase
        .from('locations')
        .select('category_vehicle_settings')
        .eq('id', effectiveLocationId)
        .maybeSingle() : Promise.resolve({ data: null }),
      supabase
        .from('categories')
        .select('vehicle_settings')
        .eq('code', category_code)
        .eq('tenant_id', tenant_id)
        .maybeSingle(),
    ])

    const pricingRule = basePriceRuleRes.data
    const adminFeeRule = adminFeeRuleRes.data
    const vehicleSettings = resolveVehicleSettings(
      locationRes.data?.category_vehicle_settings,
      categoryRes.data?.vehicle_settings,
      category_code
    )

    if (!pricingRule) {
      return {
        success: true,
        price_rappen: 0,
        admin_fee_rappen: 0,
        total_rappen: 0,
        admin_fee_applies: false,
      }
    }

    // ── Lesson price ────────────────────────────────────────────────────────
    let lessonPrice = Number(pricingRule.price_per_minute_rappen) * slot.duration_minutes

    if (pricingRule.duration_multiplier && pricingRule.duration_multiplier !== '1.00') {
      lessonPrice = Math.round(lessonPrice * parseFloat(pricingRule.duration_multiplier))
    }

    const startDate = new Date(slot.start_time)
    const dayOfWeek = startDate.getDay()
    if ((dayOfWeek === 0 || dayOfWeek === 6) && pricingRule.weekend_multiplier && pricingRule.weekend_multiplier !== '1.00') {
      lessonPrice = Math.round(lessonPrice * parseFloat(pricingRule.weekend_multiplier))
    }

    const hour = startDate.getHours()
    if (hour >= 18 && pricingRule.evening_multiplier && pricingRule.evening_multiplier !== '1.00') {
      lessonPrice = Math.round(lessonPrice * parseFloat(pricingRule.evening_multiplier))
    }

    lessonPrice = roundToNearest5Rappen(lessonPrice)

    // ── Vehicle surcharge / discount ───────────────────────────────────────
    // vehicle_mode is now the option key (e.g. 'school_all', 'own_trailer', …)
    // calculateVehicleCost returns a signed integer: positive = surcharge, negative = discount
    const rawVehicleCost = vehicle_mode
      ? calculateVehicleCost(vehicleSettings, vehicle_mode, slot.duration_minutes)
      : 0
    const vehicleCostRappen = Math.abs(rawVehicleCost)
    const vehicleCostType: 'surcharge' | 'discount' | null = rawVehicleCost > 0
      ? 'surcharge'
      : rawVehicleCost < 0
        ? 'discount'
        : null

    // ── Admin fee (only when user_id known and rule exists) ────────────────
    const adminFeeResult = await calculateAdminFee({
      supabase,
      userId: user_id || null,
      tenantId: tenant_id,
      categoryCode: category_code,
      adminFeeRappenFromRule: adminFeeRule?.admin_fee_rappen,
    })

    const lessonPlusVehicle = Math.max(0, lessonPrice + rawVehicleCost)
    const totalRappen = lessonPlusVehicle + adminFeeResult.adminFeeRappen

    logger.debug('💰 Preview price calculated:', {
      slot_id,
      category_code,
      lessonPrice,
      vehicle_mode,
      rawVehicleCost,
      adminFee: adminFeeResult.adminFeeRappen,
      total: totalRappen,
    })

    return {
      success: true,
      price_rappen: lessonPrice,
      vehicle_cost_rappen: vehicleCostRappen,
      vehicle_cost_type: vehicleCostType,
      vehicle_settings: vehicleSettings,
      admin_fee_rappen: adminFeeResult.adminFeeRappen,
      total_rappen: totalRappen,
      admin_fee_applies: adminFeeResult.applies,
      admin_fee_reason: adminFeeResult.reason,
      appointment_number: adminFeeResult.appointmentNumber,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Failed to calculate price' })
  }
})
