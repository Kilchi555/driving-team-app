import { isWithinPerUserLimit, perUserLimitHint } from '~/utils/discount-code-match'
import { matchesDiscountCategoryFilter, parseDiscountCategoryFilter } from '~/server/utils/discount-category-filter'

export type DiscountChannel = 'appointment' | 'course' | 'shop' | 'product'

export type CatalogDiscountLike = {
  is_active?: boolean | null
  valid_from?: string | null
  valid_until?: string | null
  min_amount_rappen?: number | null
  max_discount_rappen?: number | null
  usage_limit?: number | null
  usage_count?: number | null
  max_per_user?: number | null
  first_lesson_only?: boolean | null
  applies_to?: string | null
  category_filter?: string | null
  auto_apply?: boolean | null
}

export function catalogDiscountAppliesToChannel(
  appliesTo: string | null | undefined,
  channel: DiscountChannel
): boolean {
  const scope = appliesTo || 'appointments'
  if (scope === 'all') return true
  if (scope === 'products') return channel === 'shop' || channel === 'product'
  return channel === 'appointment' || channel === 'course'
}

export function appliesToHint(appliesTo: string | null | undefined): string {
  const scope = appliesTo || 'appointments'
  if (scope === 'all') return 'Gilt für Termine, Kurse und Produkte'
  if (scope === 'products') return 'Gilt nur für Produkte'
  return 'Gilt für Termine und Kurse'
}

export function appliesToError(appliesTo: string | null | undefined): string {
  const scope = appliesTo || 'appointments'
  if (scope === 'products') return 'Dieser Code gilt nur für Produktkäufe'
  return 'Dieser Code gilt nur für Termine und Kurse'
}

export function formatDiscountDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function effectiveUsageCount(
  storedCount: number | null | undefined,
  redeemedCount: number | null | undefined
): number {
  return Math.max(Number(storedCount || 0), Number(redeemedCount || 0))
}

export function buildCatalogDiscountHints(
  discount: CatalogDiscountLike,
  redeemedCount?: number | null
): string[] {
  const hints: string[] = []
  const perUser = perUserLimitHint(discount.max_per_user)
  if (perUser) hints.push(perUser)
  if (discount.first_lesson_only) hints.push('Nur für die erste Lektion')
  if (discount.auto_apply) hints.push('Dauerrabatt: gilt nach Registrierung automatisch')
  hints.push(appliesToHint(discount.applies_to))
  const categories = parseDiscountCategoryFilter(discount.category_filter)
  if (categories?.length) {
    hints.push(categories.length === 1
      ? `Nur Kategorie ${categories[0]}`
      : `Nur Kategorien ${categories.join(', ')}`)
  }
  if ((discount.min_amount_rappen || 0) > 0) {
    hints.push(`Ab CHF ${(Number(discount.min_amount_rappen) / 100).toFixed(2)}`)
  }
  if ((discount.max_discount_rappen || 0) > 0) {
    hints.push(`Max. Rabatt CHF ${(Number(discount.max_discount_rappen) / 100).toFixed(2)}`)
  }
  const until = formatDiscountDate(discount.valid_until)
  if (until) hints.push(`Gültig bis ${until}`)
  if (discount.usage_limit && Number(discount.usage_limit) > 0) {
    const used = effectiveUsageCount(discount.usage_count, redeemedCount)
    const remaining = Math.max(0, Number(discount.usage_limit) - used)
    if (remaining <= 0) {
      hints.push('Kontingent aufgebraucht')
    } else {
      hints.push(remaining === 1
        ? 'Noch 1 Einlösung insgesamt'
        : `Noch ${remaining} Einlösungen insgesamt`)
    }
  }
  return hints
}

export function evaluateCatalogDiscount(opts: {
  discount: CatalogDiscountLike
  amountRappen: number
  channel: DiscountChannel
  categoryCode?: string | null
  confirmedAppointmentCount?: number | null
  userRedemptions?: number | null
  redeemedCount?: number | null
  now?: Date
  skipFirstLessonIfUnknown?: boolean
}): { allowed: boolean; error?: string; hints: string[] } {
  const discount = opts.discount
  const now = opts.now || new Date()
  const hints = buildCatalogDiscountHints(discount, opts.redeemedCount)

  if (discount.is_active === false) {
    return { allowed: false, error: 'Dieser Code ist nicht mehr aktiv', hints }
  }

  const validFrom = discount.valid_from ? new Date(discount.valid_from) : null
  const validUntil = discount.valid_until ? new Date(discount.valid_until) : null
  if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
    return { allowed: false, error: 'Dieser Code ist aktuell nicht gültig', hints }
  }

  if (!catalogDiscountAppliesToChannel(discount.applies_to, opts.channel)) {
    return { allowed: false, error: appliesToError(discount.applies_to), hints }
  }

  if ((discount.min_amount_rappen || 0) > 0 && opts.amountRappen < Number(discount.min_amount_rappen)) {
    return {
      allowed: false,
      error: `Mindestbetrag von CHF ${(Number(discount.min_amount_rappen) / 100).toFixed(2)} nicht erreicht`,
      hints,
    }
  }

  if (discount.usage_limit && effectiveUsageCount(discount.usage_count, opts.redeemedCount) >= Number(discount.usage_limit)) {
    return { allowed: false, error: 'Dieser Code wurde bereits maximal genutzt', hints }
  }

  if (!isWithinPerUserLimit(opts.userRedemptions ?? 0, discount.max_per_user)) {
    const max = Number(discount.max_per_user)
    return {
      allowed: false,
      error: max <= 1
        ? 'Dieser Code kann nur einmal pro Kunde eingelöst werden'
        : `Dieser Code kann nur ${max}× pro Kunde eingelöst werden`,
      hints,
    }
  }

  if (parseDiscountCategoryFilter(discount.category_filter) && !matchesDiscountCategoryFilter(discount.category_filter, opts.categoryCode)) {
    return { allowed: false, error: 'Dieser Code gilt nicht für diese Kategorie', hints }
  }

  if (discount.first_lesson_only) {
    if (opts.confirmedAppointmentCount == null && opts.skipFirstLessonIfUnknown) {
      return { allowed: true, hints }
    }
    if ((opts.confirmedAppointmentCount ?? 0) > 0) {
      return { allowed: false, error: 'Dieser Code gilt nur für die erste Lektion', hints }
    }
  }

  return { allowed: true, hints }
}
