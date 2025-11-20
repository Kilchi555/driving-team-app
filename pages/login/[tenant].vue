<template>
  <div />
</template>

<script setup lang="ts">
/**
 * Redirect /login/[tenant] to /[tenant] (which uses [slug].vue with proper branding)
 * The [slug].vue page handles all the tenant branding loading and login form
 */

const route = useRoute()
const tenant = route.params.tenant as string

console.log('🔄 Redirecting /login/' + tenant + ' → /' + tenant)

// Redirect to the tenant page which will handle branding and login
await navigateTo('/' + tenant, { replace: true })
</script>
