<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Mandant auswählen</h1>
      <p class="mt-2 text-gray-600">Wähle deinen Mandanten aus, um dich anzumelden.</p>
    </div>

    <div class="mb-6 flex items-center gap-3">
      <input
        v-model="query"
        type="text"
        placeholder="Suchen nach Name oder Domain…"
        class="w-full sm:w-80 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <NuxtLink to="/tenant-register" class="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Neuen Mandanten erstellen</NuxtLink>
    </div>

    <div class="bg-white rounded-xl border border-gray-200">
      <div v-if="filteredTenants.length === 0" class="p-8 text-center text-gray-600">
        Keine Mandanten gefunden.
      </div>
      <ul v-else class="divide-y">
        <li v-for="t in filteredTenants" :key="t.id" class="p-4 flex items-center justify-between">
          <div class="flex items-center gap-4 min-w-0">
            <img v-if="t.logo_square_url" :src="t.logo_square_url" alt="Logo" class="w-10 h-10 rounded object-cover border" />
            <div class="min-w-0">
              <p class="font-medium text-gray-900 truncate">{{ t.name }}</p>
              <p class="text-sm text-gray-500 truncate">{{ t.slug ? `www.simy.ch/` + t.slug : '' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <NuxtLink :to="`/${t.slug}`" class="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-black">Anmelden</NuxtLink>
            <NuxtLink :to="`/services/${t.slug}`" class="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Registrieren</NuxtLink>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead } from '#imports'
interface TenantItem {
  id: string
  name: string
  slug: string
  logo_square_url?: string | null
}

const query = ref('')
const tenants = ref<TenantItem[]>([])

const loadTenants = async () => {
  try {
    const res = await $fetch('/api/tenants/public')
    tenants.value = (res as any)?.data || []
  } catch (e) {
    console.error('Failed to load tenants', e)
    tenants.value = []
  }
}

const filteredTenants = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return tenants.value
  return tenants.value.filter(t =>
    (t.name || '').toLowerCase().includes(q) ||
    (t.slug || '').toLowerCase().includes(q)
  )
})

onMounted(loadTenants)

useHead({ title: 'Mandant auswählen - Simy' })
</script>

<style scoped>
</style>