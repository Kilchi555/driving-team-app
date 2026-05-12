/**
 * POST /api/booking/preview-price
 * Returns the calculated lesson price for a given slot/category combination.
 * Used by the booking confirmation step to display the price before confirming.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { roundToNearest5Rappen } from '~/utils/rounding'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { slot_id, category_code, tenant_id } = body

    if (!slot_id || !category_code || !tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'slot_id, category_code and tenant_id are required' })
    }

    const supabase = getSupabaseAdmin()

    // Fetch the slot to get duration and start_time
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('duration_minutes, start_time')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot) {
      throw createError({ statusCode: 404, statusMessage: 'Slot not found' })
    }

    // Fetch pricing rule
    const { data: pricingRule } = await supabase
      .from('pricing_rules')
      .select('price_per_minute_rappen, base_duration_minutes, duration_multiplier, weekend_multiplier, evening_multiplier')
      .eq('category_code', category_code)
      .eq('tenant_id', tenant_id)
      .eq('rule_type', 'base_price')
      .lte('valid_from', new Date().toISOString())
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString())
      .single()

    if (!pricingRule) {
      return { success: true, price_rappen: 0 }
    }

    let price = Number(pricingRule.price_per_minute_rappen) * slot.duration_minutes

    if (pricingRule.duration_multiplier && pricingRule.duration_multiplier !== '1.00') {
      price = Math.round(price * parseFloat(pricingRule.duration_multiplier))
    }

    const startDate = new Date(slot.start_time)
    const dayOfWeek = startDate.getDay()
    if ((dayOfWeek === 0 || dayOfWeek === 6) && pricingRule.weekend_multiplier && pricingRule.weekend_multiplier !== '1.00') {
      price = Math.round(price * parseFloat(pricingRule.weekend_multiplier))
    }

    const hour = startDate.getHours()
    if (hour >= 18 && pricingRule.evening_multiplier && pricingRule.evening_multiplier !== '1.00') {
      price = Math.round(price * parseFloat(pricingRule.evening_multiplier))
    }

    price = roundToNearest5Rappen(price)

    logger.debug('💰 Preview price calculated:', { price, slot_id, category_code })
    return { success: true, price_rappen: price }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Failed to calculate price' })
  }
})
