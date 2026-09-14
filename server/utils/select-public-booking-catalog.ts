/**
 * Public booking catalog selection.
 *
 * Independent of business_type:
 *   usable categories exist → catalog = categories
 *   else public_bookable event types → catalog = those event types
 *   else empty / not bookable
 *
 * Event types may be rendered in the same picker, but their identity stays
 * event_type_code — they are not fake category database rows.
 */

export type BookingCatalogCategoryRow = {
  id: string
  code: string
  name: string
  description?: string | null
  lesson_duration_minutes?: number[] | number | null
  tenant_id?: string | null
  parent_category_id?: string | null
  color?: string | null
  icon_svg?: string | null
  vehicle_settings?: unknown
  room_settings?: unknown
  [key: string]: unknown
}

export type BookingCatalogEventTypeRow = {
  id: string
  code: string
  name: string
  description?: string | null
  default_duration_minutes?: number | null
  default_color?: string | null
  emoji?: string | null
  public_bookable?: boolean | null
  require_payment?: boolean | null
  display_order?: number | null
}

export type PublicCatalogPickerItem = {
  id: string
  code: string
  name: string
  description: string
  lesson_duration_minutes: number[]
  tenant_id: string
  parent_category_id: string | null
  color: string | null
  icon_svg: string | null
  children: PublicCatalogPickerItem[]
  _source: 'category' | 'event_type'
  category_code: string | null
  event_type_code: string | null
  require_payment?: boolean
  emoji?: string | null
  vehicle_settings?: unknown
  room_settings?: unknown
}

export type SelectPublicBookingCatalogInput = {
  tenantId: string
  primaryColor?: string | null
  categories: BookingCatalogCategoryRow[]
  publicEventTypes: BookingCatalogEventTypeRow[]
}

export type SelectPublicBookingCatalogResult = {
  source: 'categories' | 'event_types' | 'empty'
  categories: PublicCatalogPickerItem[]
}

export function hasUsableBookingCategories(
  categories: Array<{ code?: string | null } | null | undefined>
): boolean {
  return categories.some((c) => !!String(c?.code || '').trim())
}

export function groupCategoriesForBookingPicker(
  allCategories: BookingCatalogCategoryRow[],
  tenantId: string
): PublicCatalogPickerItem[] {
  const annotate = (c: BookingCatalogCategoryRow, children: PublicCatalogPickerItem[] = []): PublicCatalogPickerItem => ({
    ...c,
    id: String(c.id),
    code: c.code,
    name: c.name,
    description: String(c.description || ''),
    lesson_duration_minutes: Array.isArray(c.lesson_duration_minutes)
      ? c.lesson_duration_minutes
      : c.lesson_duration_minutes
        ? [Number(c.lesson_duration_minutes)]
        : [],
    tenant_id: String(c.tenant_id || tenantId),
    parent_category_id: c.parent_category_id ?? null,
    color: (c.color as string | null) ?? null,
    icon_svg: (c.icon_svg as string | null) ?? null,
    children,
    _source: 'category',
    category_code: c.code,
    event_type_code: null,
    vehicle_settings: c.vehicle_settings,
    room_settings: c.room_settings,
  })

  const mainCategories = allCategories.filter((c) => !c.parent_category_id)
  const subCategories = allCategories.filter((c) => !!c.parent_category_id)

  return mainCategories.map((main) =>
    annotate(
      main,
      subCategories
        .filter((sub) => sub.parent_category_id === main.id)
        .map((sub) => annotate(sub))
    )
  )
}

export function mapPublicEventTypesToCatalogPicker(
  eventTypes: BookingCatalogEventTypeRow[],
  tenantId: string,
  primaryColor?: string | null
): PublicCatalogPickerItem[] {
  return eventTypes.map((et) => ({
    id: et.id,
    code: et.code,
    name: et.name,
    description: et.description || '',
    lesson_duration_minutes: [Number(et.default_duration_minutes || 0)].filter((n) => Number.isFinite(n) && n > 0),
    tenant_id: tenantId,
    parent_category_id: null,
    color: primaryColor || et.default_color || null,
    icon_svg: null,
    emoji: et.emoji || null,
    children: [],
    _source: 'event_type',
    category_code: null,
    event_type_code: et.code,
    require_payment: et.require_payment !== false,
  }))
}

/**
 * Characterization of origin/main (6aaed632): driving_school always returned
 * the category tree (empty if none). Non-driving tenants returned event types.
 * That is accidental business_type coupling — do not use for new behavior.
 */
export function selectPublicBookingCatalogLegacyByBusinessType(input: {
  businessType: string | null | undefined
  tenantId: string
  primaryColor?: string | null
  categories: BookingCatalogCategoryRow[]
  publicEventTypes: BookingCatalogEventTypeRow[]
}): SelectPublicBookingCatalogResult {
  if (input.businessType === 'driving_school') {
    const items = groupCategoriesForBookingPicker(input.categories, input.tenantId)
    return {
      source: items.length > 0 ? 'categories' : 'empty',
      categories: items,
    }
  }
  const items = mapPublicEventTypesToCatalogPicker(
    input.publicEventTypes,
    input.tenantId,
    input.primaryColor
  )
  return {
    source: items.length > 0 ? 'event_types' : 'empty',
    categories: items,
  }
}

export function selectPublicBookingCatalog(
  input: SelectPublicBookingCatalogInput
): SelectPublicBookingCatalogResult {
  if (hasUsableBookingCategories(input.categories)) {
    return {
      source: 'categories',
      categories: groupCategoriesForBookingPicker(input.categories, input.tenantId),
    }
  }

  const eventItems = mapPublicEventTypesToCatalogPicker(
    input.publicEventTypes,
    input.tenantId,
    input.primaryColor
  )
  if (eventItems.length > 0) {
    return { source: 'event_types', categories: eventItems }
  }

  return { source: 'empty', categories: [] }
}
