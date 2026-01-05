export interface MerchantReferenceDetails {
  appointmentId?: string | null
  eventTypeCode?: string | null
  categoryCode?: string | null
  categoryName?: string | null
  staffName?: string | null
  startTime?: string | Date | null
  durationMinutes?: number | null
  fallback?: string | null
}

const MAX_LENGTH = 190
const FALLBACK_PREFIX = 'REF'

const sanitize = (value?: string | null): string | undefined => {
  if (!value) return undefined
  return value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
}

const shortenId = (value?: string | null, length = 8): string | undefined => {
  if (!value) return undefined
  return value.replace(/[^a-f0-9]/gi, '').substring(0, length).toUpperCase()
}

const formatStartTime = (value?: string | Date | null): string | undefined => {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const formatter = new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {})

  const { year, month, day, hour, minute } = parts
  if (!year || !month || !day || !hour || !minute) return undefined

  return `${year}${month}${day}-${hour}${minute}`
}

export const buildMerchantReference = (details: MerchantReferenceDetails = {}): string => {
  // Standardized format: CUSTOMERNAME|DATE-TIME|DURATION|REF-TIMESTAMP
  // Example: MAX-MUSTERMANN|20260104-0522|45MIN|REF-1767500558637
  
  const segments: string[] = []

  // 1. Customer Name (or fallback to appointment ID)
  const customerName = details.staffName ? sanitize(details.staffName) : shortenId(details.appointmentId)
  if (customerName) {
    segments.push(customerName)
  }

  // 2. Date and Time (e.g., 20260104-0522)
  const startLabel = formatStartTime(details.startTime)
  if (startLabel) {
    segments.push(startLabel)
  }

  // 3. Duration in minutes (e.g., 45MIN)
  if (details.durationMinutes && details.durationMinutes > 0) {
    segments.push(`${Math.round(details.durationMinutes)}MIN`)
  }

  // 4. Unique reference (timestamp-based for uniqueness)
  const timestamp = Date.now().toString(36).toUpperCase()
  segments.push(`REF-${timestamp}`)

  // Return standardized format
  const joined = segments.join('|')
  return joined.length <= MAX_LENGTH ? joined : joined.substring(0, MAX_LENGTH)
}


