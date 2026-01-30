export interface MerchantReferenceDetails {
  paymentId?: string | null       // ✅ NEW: Payment ID for webhook fallback
  appointmentId?: string | null
  eventTypeCode?: string | null
  categoryCode?: string | null
  categoryName?: string | null
  staffName?: string | null
  customerName?: string | null    // Alias for staffName (backwards compat)
  startTime?: string | Date | null
  durationMinutes?: number | null
  fallback?: string | null
  // Legacy fields for backwards compatibility
  orderId?: string | null
  type?: string | null
  category?: string | null
  date?: string | null
  timeSlot?: string | null
  duration?: string | null
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
  // ✅ NEW FORMAT: payment-{id}|CUSTOMERNAME|DATE-TIME|DURATION
  // Example: payment-2431e95c-4fee-407b-a604-f2c55b08bc7e|MAX-MUSTERMANN|20260104-0522|45MIN
  // The payment ID at the start allows the webhook to find the payment even if wallee_transaction_id is not set
  
  const segments: string[] = []

  // 1. ✅ Payment ID (CRITICAL for webhook fallback!)
  if (details.paymentId) {
    segments.push(`payment-${details.paymentId}`)
  }

  // 2. Customer Name (staffName, customerName, or fallback to appointment ID)
  const customerName = details.staffName || details.customerName
  const nameSegment = customerName ? sanitize(customerName) : shortenId(details.appointmentId)
  if (nameSegment) {
    segments.push(nameSegment)
  }

  // 3. Date and Time (e.g., 20260104-0522)
  // Support both startTime and legacy date/timeSlot
  let dateTimeSegment: string | undefined
  if (details.startTime) {
    dateTimeSegment = formatStartTime(details.startTime)
  } else if (details.date) {
    dateTimeSegment = details.timeSlot ? `${details.date}-${details.timeSlot.replace(':', '')}` : details.date
  }
  if (dateTimeSegment) {
    segments.push(dateTimeSegment)
  }

  // 4. Duration in minutes (e.g., 45MIN)
  // Support both durationMinutes and legacy duration string
  if (details.durationMinutes && details.durationMinutes > 0) {
    segments.push(`${Math.round(details.durationMinutes)}MIN`)
  } else if (details.duration) {
    segments.push(details.duration)
  }

  // 5. Fallback: Add unique timestamp if no segments yet
  if (segments.length === 0) {
    const timestamp = Date.now().toString(36).toUpperCase()
    segments.push(`REF-${timestamp}`)
  }

  // Return standardized format
  const joined = segments.join('|')
  return joined.length <= MAX_LENGTH ? joined : joined.substring(0, MAX_LENGTH)
}


