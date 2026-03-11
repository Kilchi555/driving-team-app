/**
 * Public API: Get categories with pricing for registration page
 *
 * Logic:
 * - Load ALL active categories for a tenant
 * - If a main category has subcategories → exclude the main, show only subs
 * - If a main category has NO subcategories → show the main
 * - Enrich each category with its pricing (price_per_minute_rappen + admin_fee_rappen)
 *
 * SECURITY: Public endpoint – tenant isolation via tenant_id query param
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { tenant_id } = getQuery(event)

  if (!tenant_id || typeof tenant_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing tenant_id' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // 1. Load all active categories for the tenant
    const { data: allCategories, error: catError } = await supabase
      .from('categories')
      .select('id, code, name, lesson_duration_minutes, parent_category_id')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('parent_category_id', { ascending: true })

    if (catError) throw catError

    const mainCategories = (allCategories || []).filter((c: any) => !c.parent_category_id)
    const subCategories  = (allCategories || []).filter((c: any) => !!c.parent_category_id)

    // Collect IDs of main categories that have at least one sub
    const mainIdsWithSubs = new Set(subCategories.map((s: any) => s.parent_category_id))

    // Result: subs for mains-with-subs, mains for mains-without-subs
    const visibleCategories: any[] = [
      ...mainCategories.filter((m: any) => !mainIdsWithSubs.has(m.id)),
      ...subCategories
    ]

    if (visibleCategories.length === 0) {
      return { success: true, categories: [] }
    }

    // 2. Load pricing rules for all visible category codes
    // Also include parent category codes as fallback for subcategories
    const codes = [...new Set(visibleCategories.map((c: any) => c.code))]

    // Build a map of sub → parent code for fallback pricing
    const allCatMap: Record<number, any> = {}
    for (const cat of (allCategories || [])) allCatMap[cat.id] = cat

    const parentCodeMap: Record<string, string> = {}
    for (const cat of visibleCategories) {
      if (cat.parent_category_id && allCatMap[cat.parent_category_id]) {
        parentCodeMap[cat.code] = allCatMap[cat.parent_category_id].code
      }
    }

    // Include parent codes in the query so fallback pricing works
    const parentCodes = Object.values(parentCodeMap)
    const allCodesToFetch = [...new Set([...codes, ...parentCodes])]

    const { data: pricingRules, error: priceError } = await supabase
      .from('pricing_rules')
      .select('category_code, rule_type, price_per_minute_rappen, base_duration_minutes, admin_fee_rappen, admin_fee_applies_from')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .in('category_code', allCodesToFetch)
      .in('rule_type', ['base_price', 'base', 'pricing', 'admin_fee'])

    if (priceError) throw priceError

    // Build a pricing map: code → { pricePerMinute, adminFee, adminFeeAppliesFrom, baseDuration }
    const pricingMap: Record<string, { pricePerMinute: number; adminFee: number; adminFeeAppliesFrom: number; baseDuration: number }> = {}

    for (const rule of (pricingRules || [])) {
      if (!pricingMap[rule.category_code]) {
        pricingMap[rule.category_code] = { pricePerMinute: 0, adminFee: 0, adminFeeAppliesFrom: 2, baseDuration: 45 }
      }
      const entry = pricingMap[rule.category_code]

      if (['base_price', 'base', 'pricing'].includes(rule.rule_type)) {
        if (rule.price_per_minute_rappen) entry.pricePerMinute = rule.price_per_minute_rappen
        if (rule.base_duration_minutes)   entry.baseDuration   = rule.base_duration_minutes
      }
      if (rule.rule_type === 'admin_fee') {
        if (rule.admin_fee_rappen !== undefined)        entry.adminFee             = rule.admin_fee_rappen
        if (rule.admin_fee_applies_from !== undefined)  entry.adminFeeAppliesFrom  = rule.admin_fee_applies_from
      }
    }

    // 3. Combine categories with pricing
    const result = visibleCategories.map((cat: any) => {
      // Try exact code first, then fall back to parent code
      const pricing = pricingMap[cat.code] || (parentCodeMap[cat.code] ? pricingMap[parentCodeMap[cat.code]] : undefined)

      // lesson_duration_minutes can be an array (e.g. [45, 60, 90]) or a single number
      const durationRaw = cat.lesson_duration_minutes
      const durationArray: number[] = Array.isArray(durationRaw)
        ? durationRaw
        : (typeof durationRaw === 'number' ? [durationRaw] : [])

      // Always display price per 45 minutes (1 standard lesson unit)
      const DISPLAY_DURATION = 45
      const priceRappen = pricing ? pricing.pricePerMinute * DISPLAY_DURATION : 0

      // Swiss rounding to nearest 50 Rappen
      const rounded = (() => {
        const rem = priceRappen % 100
        if (rem === 0) return priceRappen
        return rem < 50 ? priceRappen - rem : priceRappen + (100 - rem)
      })()

      return {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        parent_category_id: cat.parent_category_id || null,
        lesson_duration_minutes: 45,
        price_chf: pricing ? (rounded / 100).toFixed(2) : null,
        admin_fee_chf: pricing ? (pricing.adminFee / 100).toFixed(2) : null,
        admin_fee_applies_from: pricing?.adminFeeAppliesFrom ?? null,
      }
    })

    // Sort alphabetically by name
    result.sort((a: any, b: any) => a.name.localeCompare(b.name, 'de'))

    return { success: true, categories: result }

  } catch (err: any) {
    console.error('❌ get-categories-with-pricing error:', err)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch categories' })
  }
})
