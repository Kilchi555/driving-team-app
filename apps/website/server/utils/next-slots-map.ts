/**
 * Page key → bookable meeting-point UUIDs (locations.location_type = standard)
 * Tenant: Driving Team (64259d68-195a-4c68-8875-f1b44d962830)
 *
 * Categories must match availability_slots.category_code (e.g. "B Automatik", not "B").
 * fallbackLocationIds: used when primary locations have no free slots in the window.
 */
export type NextSlotsPageFilter = {
  locationIds: string[]
  categories: string[]
  /** Used only if primary locations return zero slots */
  fallbackLocationIds?: string[]
  /** Shown when fallback is used */
  fallbackHint?: string
}

const ALTSTETTEN = '55dac47d-2cf6-45af-8f3c-10f1a213bad0'
const LACHEN = '413f2ea0-24c2-4b79-8e54-086f15b1d258'
const PFAEFFIKON_SZ = '9bc52212-ccd9-4aee-b79e-979527d15b7b'
const SIEBNEN = '7ffb989d-77d0-4064-866c-a70a48921a9a'
const UZNACH = '755b7675-c59d-486c-8eff-2721224afa18'
const TUGGEN_LKW = 'bb6fcbab-d77a-49f9-a20c-d297b8831a0c'
const MOTO_ALTSTETTEN = '67b7b020-5ba5-4267-a769-b592c6936c35'
const ALBISGUETLI = 'a05c5baa-c0c6-42f6-9354-ac1909199ead'
const SPREITENBACH = 'b929c72d-91d0-4daf-8c83-21a92864ae67'
const GLANZENBERG = '7165a259-b69e-455e-a0a3-4f380736eab5'
const DIETIKON_BHF = '21060cca-179b-4f3b-8cca-8a5f65fcac89'
const BIRMENSDORF = '8148608f-6397-4293-b57d-9026b6ead3ae'
const UITIKON = '264a25c7-33ee-4bd9-9081-b0c3c6767b2b'
const URDORF = 'db7ac666-f504-4306-9286-a59c063ad5c8'
const WETTSWIL = '05e47fe9-098f-47b3-992b-156b2e2a8b66'
const SCHLIEREN = '1bc15a68-cce2-40d5-b86e-4ff502cb1126'
const TRIEMLI = '4dc5fcfd-0be0-4910-aec3-3fa3be8c1d5f'
const ENGE = '9629ef87-1f77-494b-8b11-2d8a0a6ba139'

const ZH_AUTO_FALLBACK: Pick<NextSlotsPageFilter, 'fallbackLocationIds' | 'fallbackHint'> = {
  fallbackLocationIds: [ALTSTETTEN, TRIEMLI, ENGE],
  fallbackHint: 'Nächste freie Termine in der Region Zürich (Treffpunkt Altstetten u. a.)',
}

export const NEXT_SLOTS_PAGE_FILTERS: Record<string, NextSlotsPageFilter> = {
  'fahrschule-lachen': {
    locationIds: [LACHEN],
    categories: ['B Automatik', 'B Schaltung'],
    fallbackLocationIds: [SIEBNEN, UZNACH],
    fallbackHint: 'Aktuell freie Termine in der Region (Siebnen / Uznach)',
  },
  'fahrschule-pfaeffikon-sz': {
    locationIds: [PFAEFFIKON_SZ],
    categories: ['B Automatik'],
    fallbackLocationIds: [LACHEN],
    fallbackHint: 'Aktuell freie Termine in der Region (inkl. Lachen)',
  },
  'fahrschule-pfaeffikon': {
    locationIds: [PFAEFFIKON_SZ],
    categories: ['B Automatik'],
    fallbackLocationIds: [LACHEN],
  },
  'auto-fahrschule-zuerich': {
    locationIds: [ALTSTETTEN, TRIEMLI, ENGE],
    categories: ['B Automatik', 'B Schaltung'],
  },
  'auto-fahrschule-zuerich-preis': {
    locationIds: [ALTSTETTEN],
    categories: ['B Automatik', 'B Schaltung'],
    ...ZH_AUTO_FALLBACK,
  },
  'auto-fahrschule-zuerich-probe': {
    locationIds: [ALTSTETTEN],
    categories: ['B Automatik', 'B Schaltung'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-altstetten': {
    locationIds: [ALTSTETTEN],
    categories: ['B Automatik', 'B Schaltung'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-dietikon': {
    locationIds: [DIETIKON_BHF, GLANZENBERG],
    categories: ['B Automatik', 'BE'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-spreitenbach': {
    locationIds: [SPREITENBACH],
    categories: ['B Automatik', 'BE'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-aargau': {
    locationIds: [SPREITENBACH, GLANZENBERG, DIETIKON_BHF],
    categories: ['B Automatik', 'BE'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-schlieren': {
    locationIds: [SCHLIEREN, GLANZENBERG],
    categories: ['B Automatik'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-birmensdorf': {
    locationIds: [BIRMENSDORF],
    categories: ['B Automatik'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-uitikon': {
    locationIds: [UITIKON],
    categories: ['B Automatik'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-urdorf': {
    locationIds: [URDORF],
    categories: ['B Automatik'],
    ...ZH_AUTO_FALLBACK,
  },
  'fahrschule-wettswil': {
    locationIds: [WETTSWIL],
    categories: ['B Automatik'],
    ...ZH_AUTO_FALLBACK,
  },
  'motorrad-fahrschule-zuerich': {
    locationIds: [MOTO_ALTSTETTEN, ALBISGUETLI],
    categories: ['A', 'A1', 'A35kW'],
  },
  'lastwagen-fahrschule': {
    locationIds: [TUGGEN_LKW],
    categories: ['C', 'CE', 'C1'],
  },
  'lastwagen-fahrschule-lachen': {
    locationIds: [TUGGEN_LKW],
    categories: ['C', 'CE', 'C1'],
  },
  'lastwagen-fahrschule-zuerich': {
    locationIds: [TUGGEN_LKW],
    categories: ['C', 'CE', 'C1'],
  },
  'lastwagen-fahrschule-ce': {
    locationIds: [TUGGEN_LKW],
    categories: ['CE'],
  },
  'lastwagen-fahrschule-rapperswil': {
    locationIds: [TUGGEN_LKW],
    categories: ['C', 'CE'],
  },
}

export function resolveNextSlotsFilter(page: string): NextSlotsPageFilter | null {
  const key = String(page || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
  return NEXT_SLOTS_PAGE_FILTERS[key] || null
}
