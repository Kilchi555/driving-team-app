<template>
  <a
    :href="bookingUrl"
    :class="buttonClass"
    target="_blank"
    rel="noopener noreferrer"
    @click="trackBookingClick"
  >
    <slot>📅 Jetzt anmelden</slot>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBookingUrl } from '#app/composables/useBookingUrl'

interface Props {
  location?: string
  instructor?: string
  category?: string
  service?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  class: 'btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg',
})

const { generateBookingUrl } = useBookingUrl()

const bookingUrl = computed(() => {
  // Get session ID from window if available
  const sessionId = typeof window !== 'undefined' ? (window as any).__analyticsSessionId : undefined
  
  return generateBookingUrl({
    location: props.location,
    instructor: props.instructor,
    category: props.category,
    service: props.service,
    sessionId,
  })
})

const buttonClass = computed(() => {
  return props.class
})

const trackBookingClick = () => {
  // Optional: Log click for debugging
  console.log('[Booking] Clicked link to:', bookingUrl.value)
}
</script>
