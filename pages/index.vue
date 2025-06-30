<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Driving Team Login</h2>
      </div>
      
      <!-- Test-Login Buttons -->
      <div class="space-y-3">
        <h3 class="text-lg font-medium text-gray-700">Schnell-Login:</h3>
        
        <button
          @click="createAndLogin('marc@drivingteam.ch', 'Marc Hermann')"
          class="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Als Marc Hermann einloggen
        </button>
        
        <button
          @click="createAndLogin('samir@drivingteam.ch', 'Samir Khedhri')"
          class="w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Als Samir Khedhri einloggen
        </button>
        
        <button
          @click="createAndLogin('peter@drivingteam.ch', 'Peter Thoma')"
          class="w-full py-3 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Als Peter Thoma einloggen
        </button>

        <button
          @click="createAndLogin('kilchi@drivingteam.ch', 'Pascal Kilchenmann')"
          class="w-full py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Als Pascal Kilchenmann einloggen
        </button>
      </div>

      <div v-if="isLoading" class="text-center text-gray-600">
        {{ loadingMessage }}
      </div>

      <div v-if="error" class="text-red-600 text-center">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

const isLoading = ref(false)
const error = ref('')
const loadingMessage = ref('')

const createAndLogin = async (email: string, name: string) => {
  isLoading.value = true
  error.value = ''
  loadingMessage.value = `Erstelle Auth-User für ${name}...`

  try {
    const supabase = getSupabase()
    
    // 1. Versuche Login (falls Auth-User bereits existiert)
    loadingMessage.value = `Versuche Login für ${name}...`
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'temp123456' // Standard-Passwort
    })

    if (!loginError) {
      console.log('Login erfolgreich:', email)
      await navigateTo('/dashboard')
      return
    }

    // 2. Auth-User existiert nicht, erstelle ihn
    loadingMessage.value = `Erstelle Auth-User für ${name}...`
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: 'temp123456'
    })

    if (signUpError) throw signUpError

    console.log('Auth-User erstellt für:', email)
    loadingMessage.value = 'Leite weiter...'
    
    // 3. Direkt zum Dashboard (useCurrentUser findet den Business-User per E-Mail)
    await navigateTo('/dashboard')

  } catch (err: any) {
    console.error('Fehler:', err)
    error.value = err.message || 'Fehler beim Login'
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}
</script>