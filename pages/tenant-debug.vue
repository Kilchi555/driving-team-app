<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md mx-auto">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          Tenant Registration Debug
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Teste die Tenant-Registrierung mit detailliertem Debugging
        </p>
      </div>

      <form @submit.prevent="registerTenant" class="mt-8 space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">
            Fahrschulname
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="z.B. Muster Fahrschule"
          />
        </div>

        <div>
          <label for="slug" class="block text-sm font-medium text-gray-700">
            URL-Slug
          </label>
          <input
            id="slug"
            v-model="form.slug"
            type="text"
            required
            pattern="[a-z0-9\-]+"
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="z.B. muster-fahrschule"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            E-Mail-Adresse
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="admin@muster-fahrschule.ch"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Passwort
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Mindestens 8 Zeichen"
          />
        </div>

        <div>
          <label for="plan" class="block text-sm font-medium text-gray-700">
            Abonnement-Plan
          </label>
          <select
            id="plan"
            v-model="form.subscription_plan"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span v-if="loading">Registriere...</span>
            <span v-else>Fahrschule registrieren</span>
          </button>
        </div>
      </form>

      <!-- Debug Output -->
      <div v-if="debugOutput" class="mt-8">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Debug Output:</h3>
        <pre class="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-96">{{ debugOutput }}</pre>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="success" class="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
        {{ success }}
      </div>

      <div v-if="error" class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { logger } from '~/utils/logger'

definePageMeta({
  layout: 'minimal'
})

const form = ref({
  name: 'Test Fahrschule',
  slug: 'test-fahrschule-' + Date.now(),
  email: 'test' + Date.now() + '@example.com',
  password: 'testpassword123',
  subscription_plan: 'basic'
})

const loading = ref(false)
const success = ref('')
const error = ref('')
const debugOutput = ref('')

const registerTenant = async () => {
  loading.value = true
  success.value = ''
  error.value = ''
  debugOutput.value = ''

  try {
    logger.debug('🚀 Starting tenant registration...')
    debugOutput.value += '🚀 Starting tenant registration...\n'
    debugOutput.value += `📝 Form data: ${JSON.stringify(form.value, null, 2)}\n\n`

    const response = await $fetch('/api/tenants/register', {
      method: 'POST',
      body: form.value
    })

    logger.debug('✅ Registration response:', response)
    debugOutput.value += `✅ Registration response: ${JSON.stringify(response, null, 2)}\n`

    if (response.success) {
      success.value = `Fahrschule "${form.value.name}" wurde erfolgreich registriert!`
      debugOutput.value += `\n🎉 SUCCESS: ${success.value}\n`
    } else {
      error.value = response.error || 'Unbekannter Fehler'
      debugOutput.value += `\n❌ ERROR: ${error.value}\n`
    }
  } catch (err) {
    console.error('❌ Registration error:', err)
    error.value = err.data?.message || err.message || 'Unbekannter Fehler'
    debugOutput.value += `\n❌ CATCH ERROR: ${error.value}\n`
    debugOutput.value += `Full error: ${JSON.stringify(err, null, 2)}\n`
  } finally {
    loading.value = false
  }
}
</script>
