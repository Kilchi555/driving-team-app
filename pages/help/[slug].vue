<script setup lang="ts">
/**
 * Full-page help routes redirect into the in-app Help modal
 * so users stay on their dashboard context.
 */
definePageMeta({
  middleware: 'auth',
  ssr: false
})

const route = useRoute()
const { openHelp } = useHelpModal()
const authStore = useAuthStore()

onMounted(async () => {
  const slug = route.params.slug ? String(route.params.slug) : null
  openHelp(slug)

  // Leave /help so closing the modal lands on the previous screen
  const role = authStore.userRole
  if (role === 'client') await navigateTo('/customer-dashboard', { replace: true })
  else if (role === 'staff') await navigateTo('/dashboard', { replace: true })
  else if (role === 'admin' || role === 'super_admin' || role === 'tenant_admin' || role === 'sub_admin') {
    await navigateTo('/admin', { replace: true })
  } else {
    await navigateTo('/', { replace: true })
  }
})
</script>

<template>
  <div class="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
    Hilfe wird geöffnet…
  </div>
</template>
