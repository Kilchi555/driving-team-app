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
 *
 * SSR 302 only when the inbound /buchen URL already carries click IDs or a
 * session blob. Otherwise wait for the client so enrichSimyUrl can attach
 * first-party stored fbclid/gclid (landing page → /buchen without query).
 */
import { enrichSimyUrl } from '~/utils/enrich-simy-url'
import {
  BOOKING_APP_BASE_URL,
  buchenQueryHasAttribution,
  buildBuchenRedirectUrl,
} from '~/utils/booking-attribution-hop'

definePageMeta({ layout: 'default' })

const route = useRoute()
const queryRecord = computed(() => route.query as Record<string, unknown>)

const dest = computed(() => {
  const fromQuery = buildBuchenRedirectUrl(queryRecord.value, BOOKING_APP_BASE_URL)
  if (import.meta.client) return enrichSimyUrl(fromQuery)
  return fromQuery
})

if (import.meta.server) {
  if (buchenQueryHasAttribution(queryRecord.value)) {
    await navigateTo(dest.value, { external: true, redirectCode: 302 })
  }
} else {
  await navigateTo(dest.value, { external: true, redirectCode: 302 })
}
</script>
