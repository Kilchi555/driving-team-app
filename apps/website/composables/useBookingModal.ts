const BOOKING_HOSTS = new Set(['app.simy.ch', 'www.app.simy.ch', 'simy.ch'])

export function isBookingHref(href: string | null | undefined): boolean {
  if (!href) return false
  try {
    const url = new URL(href, 'https://drivingteam.ch')
    if (url.pathname.startsWith('/buchen')) return true
    if (BOOKING_HOSTS.has(url.hostname) && url.pathname.includes('/booking/')) return true
    return false
  } catch {
    return false
  }
}

export function toSimyBookingUrl(href: string, origin = 'https://drivingteam.ch'): string {
  const url = new URL(href, origin)
  if (url.pathname.replace(/\/$/, '') === '/buchen') {
    const simy = new URL('https://app.simy.ch/booking/availability/driving-team')
    url.searchParams.forEach((value, key) => simy.searchParams.set(key, value))
    return simy.toString()
  }
  return url.toString()
}

export function toEmbedBookingUrl(href: string): string {
  const url = new URL(toSimyBookingUrl(href), 'https://app.simy.ch')
  if (!url.pathname.includes('/booking/')) {
    url.pathname = '/booking/availability/driving-team'
  }
  url.searchParams.set('embed', '1')
  return url.toString()
}

export function useBookingModal() {
  const iframeSrc = useState<string>('booking-modal-src', () => '')
  const openHref = useState<string>('booking-modal-open-href', () => '')

  const isOpen = computed(() => Boolean(iframeSrc.value))

  function open(href: string) {
    const enriched = href
    openHref.value = enriched
    iframeSrc.value = toEmbedBookingUrl(enriched)
  }

  function close() {
    iframeSrc.value = ''
    openHref.value = ''
  }

  return { iframeSrc, openHref, isOpen, open, close }
}
