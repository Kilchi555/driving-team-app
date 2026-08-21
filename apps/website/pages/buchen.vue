<template>
  <div class="section-container py-16 text-center">
    <Head>
      <Title>Termin buchen | Driving Team</Title>
      <Meta name="robots" content="noindex, follow" />
    </Head>
    <p class="text-gray-700 mb-4">Weiterleitung zur Buchung…</p>
    <a :href="dest" class="text-primary-600 font-semibold underline">Falls nichts passiert: Buchung öffnen</a>
  </div>
</template>

<script setup lang="ts">
/**
 * Same-domain booking URL for ads/CTAs. Simy currently sends X-Frame-Options:
 * SAMEORIGIN, so an iframe on drivingteam.ch is refused. We 302 to the booking
 * app instead — one click, no extra step, booking actually loads.
 */
import { enrichSimyUrl } from '~/utils/enrich-simy-url'

definePageMeta({ layout: 'default' })

const BOOKING = 'https://app.simy.ch/booking/availability/driving-team'
const route = useRoute()

const dest = computed(() => {
  const url = new URL(BOOKING)
  for (const [key, value] of Object.entries(route.query)) {
    const raw = Array.isArray(value) ? value[0] : value
    if (raw) url.searchParams.set(key, String(raw))
  }
  url.searchParams.delete('embed')
  if (import.meta.client) return enrichSimyUrl(url.toString())
  return url.toString()
})

await navigateTo(dest.value, { external: true, redirectCode: 302 })
</script>
