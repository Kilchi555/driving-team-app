/**
 * POST /api/booking/preview-price
 * Returns the calculated lesson price for a given slot/category combination,
 * including admin fee (when applicable for the user's category history).
 * Used by the booking confirmation step to display the price before confirming.
 *
 * Base offer price comes from resolveOfferPrice. Missing paid rules fail closed
 * (503) — never success + price_rappen: 0. Explicit require_payment=false may
 * return kind=free and price_rappen: 0.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { calculateAdminFee } from '~/server/utils/admin-fee'
import { resolveVehicleSettings, calculateVehicleCost } from '~/server/utils/vehicle-availability'
import {
  previewPayloadFromOfferPrice,
  resolveOfferPrice,
  throwIfUnpriced,
} from '~/server/utils/resolve-offer-price'
import { bindPublicSlotOfferIdentity } from '~/server/utils/resolve-booking-offer-identity'
import { bookingIdentityCode } from '~/utils/booking-offer-identity'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      slot_id,
      category_code,
      event_type_code,
      appointment_type,
      tenant_id,
      user_id,
      vehicle_mode,
      location_id,
    } = body

    if (!slot_id || !tenant_id || (!category_code && !event_type_code)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slot_id, tenant_id and category_code or event_type_code are required',
      })
    }

    const supabase = getSupabaseAdmin()

    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('duration_minutes, start_time, location_id, category_code, tenant_id')
      .eq('id', slot_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (slotError || !slot) {
      throw createError({ statusCode: 404, statusMessage: 'Slot not found' })
    }

    const identity = await bindPublicSlotOfferIdentity(supabase, {
      tenantId: tenant_id,
      slotCategoryCode: slot.category_code,
      clientEventTypeCode: event_type_code,
      clientCategoryCode: category_code,
      clientAppointmentType: appointment_type,
      slotId: slot_id,
    })
    const offerCode = bookingIdentityCode(identity)

    const offer = await resolveOfferPrice(supabase, {
      tenantId: tenant_id,
      eventTypeCode: identity.eventTypeCode || '',
      categoryCode: identity.categoryCode,
      durationMinutes: slot.duration_minutes,
      startTime: slot.start_time,
      ruleTypeHint: 'base_price',
    })
    throwIfUnpriced(offer)

    const usingBasePrice = offer.kind === 'paid' && offer.rule.rule_type === 'base_price'
    const categoryForAddOns = identity.categoryCode || offerCode || category_code
    const effectiveLocationId = location_id || slot.location_id

    const [adminFeeRuleRes, locationRes, categoryRes] = await Promise.all([
      usingBasePrice && categoryForAddOns
        ? supabase
            .from('pricing_rules')
            .select('admin_fee_rappen, admin_fee_applies_from')
            .eq('category_code', categoryForAddOns)
            .eq('tenant_id', tenant_id)
            .eq('rule_type', 'admin_fee')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      effectiveLocationId
        ? supabase
            .from('locations')
            .select('category_vehicle_settings')
            .eq('id', effectiveLocationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      categoryForAddOns
        ? supabase
            .from('categories')
            .select('vehicle_settings')
            .eq('code', categoryForAddOns)
            .eq('tenant_id', tenant_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const adminFeeRule = usingBasePrice ? adminFeeRuleRes.data : null
    const vehicleSettings = resolveVehicleSettings(
      locationRes.data?.category_vehicle_settings,
      categoryRes.data?.vehicle_settings,
      categoryForAddOns
    )

    const lessonPrice = offer.priceRappen
    const rawVehicleCost = vehicle_mode
      ? calculateVehicleCost(vehicleSettings, vehicle_mode, slot.duration_minutes)
      : 0
    const vehicleCostRappen = Math.abs(rawVehicleCost)
    const vehicleCostType: 'surcharge' | 'discount' | null =
      rawVehicleCost > 0 ? 'surcharge' : rawVehicleCost < 0 ? 'discount' : null

    const adminFeeResult = usingBasePrice
      ? await calculateAdminFee({
          supabase,
          userId: user_id || null,
          tenantId: tenant_id,
          categoryCode: categoryForAddOns,
          adminFeeRappenFromRule: adminFeeRule?.admin_fee_rappen,
          adminFeeAppliesFromRule: adminFeeRule?.admin_fee_applies_from,
        })
      : {
          adminFeeRappen: 0,
          applies: false,
          reason: 'no_rule' as const,
          appointmentNumber: 0,
        }

    const lessonPlusVehicle = Math.max(0, lessonPrice + rawVehicleCost)
    const totalRappen = lessonPlusVehicle + adminFeeResult.adminFeeRappen

    logger.debug('💰 Preview price calculated:', {
      slot_id,
      event_type_code: identity.eventTypeCode,
      category_code: identity.categoryCode,
      lessonPrice,
      vehicle_mode,
      rawVehicleCost,
      adminFee: adminFeeResult.adminFeeRappen,
      total: totalRappen,
      offerKind: offer.kind,
    })

    return {
      ...previewPayloadFromOfferPrice(offer),
      vehicle_cost_rappen: vehicleCostRappen,
      vehicle_cost_type: vehicleCostType,
      vehicle_settings: vehicleSettings,
      admin_fee_rappen: adminFeeResult.adminFeeRappen,
      total_rappen: totalRappen,
      admin_fee_applies: adminFeeResult.applies,
      admin_fee_reason: adminFeeResult.reason,
      appointment_number: adminFeeResult.appointmentNumber,
      event_type_code: identity.eventTypeCode,
      category_code: identity.categoryCode,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Failed to calculate price' })
  }
})
