<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Weiterleitung...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from '#app'

const route = useRoute()
const router = useRouter()

// Redirect to /register/staff with query params preserved
onMounted(() => {
  const token = route.query.token
  if (token) {
    router.replace(`/register/staff?token=${token}`)
  } else {
    router.replace('/register/staff')
  }
})
</script>
