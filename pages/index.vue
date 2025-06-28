<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="max-w-md w-full p-8 bg-white rounded-lg shadow">
      <div class="text-center mb-8">
        <h2 class="mt-4 text-2xl font-bold text-gray-900">Anmelden</h2>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div v-if="errorMsg" class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-600">{{ errorMsg }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
        >
          {{ loading ? 'Wird angemeldet...' : 'Anmelden' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo } from 'nuxt/app'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Direkte Supabase-Verbindung
const supabase: SupabaseClient = createClient(
  'https://unyjaetebnaexaflpyoc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
)

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

onMounted(async () => {
  console.log('Supabase loaded:', supabase)
  console.log('Auth available:', supabase.auth)
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user)
    
    if (user) {
      navigateTo('/dashboard')
    }
  } catch (error) {
    console.error('Error checking user:', error)
  }
})

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) {
      errorMsg.value = error.message
      return
    }

    navigateTo('/dashboard')
    
  } catch (error) {
    console.error('Login error:', error)
    errorMsg.value = 'Login fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>