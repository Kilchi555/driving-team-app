import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  classifyAppointmentType,
  expectedNewCustomerDbChf,
  hasCostRates,
  parseUnitEconomicsSettings,
} from '~/utils/unit-economics'
import { buildUnitEconomicsReport } from '~/server/utils/unit-economics-report'
import { readFallbackBookingValueChf } from '~/server/utils/google-ads-conversion'

export type ConversionValueSource = 'expected_db' | 'lesson' | 'floor'

export type ResolvedConversionValue = {
  value_chf: number
  source: ConversionValueSource
  category: string | null
}

const reportCache = new Map<string, { at: number; report: Awaited<ReturnType<typeof buildUnitEconomicsReport>> }>()
const CACHE_MS = 10 * 60 * 1000

async function loadReport(tenantId: string, supabase: SupabaseClient) {
  const cached = reportCache.get(tenantId)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.report
  const { data } = await supabase
    .from('tenants')
    .select('unit_economics')
    .eq('id', tenantId)
    .maybeSingle()
  const settings = parseUnitEconomicsSettings(data?.unit_economics)
  if (!hasCostRates(settings)) return null
  const report = await buildUnitEconomicsReport({ supabase, tenantId, settings })
  reportCache.set(tenantId, { at: Date.now(), report })
  return report
}

export async function resolveBookingConversionValue(params: {
  tenantId?: string | null
  categoryCode?: string | null
  eventTypeCode?: string | null
  isNewCustomer?: boolean
  lessonPriceChf?: number | null
  supabase?: SupabaseClient
}): Promise<ResolvedConversionValue> {
  const lesson = Number(params.lessonPriceChf)
  const lessonValue = Number.isFinite(lesson) && lesson > 0 ? Number(lesson.toFixed(2)) : null
  const floor = readFallbackBookingValueChf()

  if (!params.tenantId || !params.isNewCustomer) {
    return {
      value_chf: lessonValue ?? floor,
      source: lessonValue ? 'lesson' : 'floor',
      category: null,
    }
  }

  try {
    const supabase = params.supabase ?? getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('unit_economics')
      .eq('id', params.tenantId)
      .maybeSingle()
    const settings = parseUnitEconomicsSettings(data?.unit_economics)
    if (!hasCostRates(settings)) {
      return {
        value_chf: lessonValue ?? floor,
        source: lessonValue ? 'lesson' : 'floor',
        category: null,
      }
    }
    const report = await loadReport(params.tenantId, supabase)
    if (!report) {
      return {
        value_chf: lessonValue ?? floor,
        source: lessonValue ? 'lesson' : 'floor',
        category: null,
      }
    }
    const category = classifyAppointmentType(
      params.categoryCode,
      settings.lines,
      params.eventTypeCode,
    )
    const derived = report.derived_max_cac[category]
    const line = settings.lines.find(row => row.code === category)
    const expected = derived && line
      ? expectedNewCustomerDbChf({
          incremental_db_per_hour_chf: derived.incremental_db_per_hour_chf,
          db_per_hour_chf: derived.db_per_hour_chf,
          expected_hours: line.expected_hours,
        })
      : null
    if (expected && expected > 0) {
      return { value_chf: expected, source: 'expected_db', category }
    }
    return {
      value_chf: lessonValue ?? floor,
      source: lessonValue ? 'lesson' : 'floor',
      category,
    }
  } catch {
    return {
      value_chf: lessonValue ?? floor,
      source: lessonValue ? 'lesson' : 'floor',
      category: null,
    }
  }
}
