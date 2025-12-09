<template>
  <div />
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

/**
 * Redirect /login/[tenant] to /[tenant] (which uses [slug].vue with proper branding)
 * The [slug].vue page handles all the tenant branding loading and login form
 */

const route = useRoute()
const router = useRouter()
const tenant = route.params.tenant as string

logger.debug('🔄 Redirecting /login/' + tenant + ' → /' + tenant)

// Use router.replace() for immediate redirect
if (tenant) {
  router.replace('/' + tenant)
}
</script>
