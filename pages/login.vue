<script setup lang="ts">
import { ref } from 'vue'
import { useSupabaseUser, useSupabaseClient } from '#imports'
import { navigateTo } from 'nuxt/app'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const fetchUserRole = async (supabaseClient: SupabaseClient, userId: string) => {
  // statt useSupabaseClient() direkt hier aufzurufen
  const { data, error } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  // ...
}
const user = useSupabaseUser() // user ist ein Ref, das automatisch aktualisiert wird
const errorMsg = ref('')

import { onMounted } from 'vue'

onMounted(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})

const handleLogin = async () => {
  errorMsg.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    errorMsg.value = error.message
    return
  }

  // 🔁 Warte max. 1 Sekunde auf den aktualisierten user.value
  for (let i = 0; i < 10; i++) {
    if (user.value) {
      await navigateTo('/dashboard')
      return
    }
    await new Promise(r => setTimeout(r, 100))
  }

  // ⚠️ Fallback falls SupabaseUser nicht aktualisiert wird
  console.warn('Login erfolgreich, aber user.value nicht gesetzt – erzwinge Weiterleitung')
  await navigateTo('/dashboard')
}

</script>

<template>
  <div class="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded space-y-4">
    <h1 class="text-2xl font-bold text-center text-primary">Login</h1>

    <input v-model="email" type="email" placeholder="E-Mail"
           class="w-full border rounded px-3 py-2" />
    <input v-model="password" type="password" placeholder="Passwort"
           class="w-full border rounded px-3 py-2" />

    <div v-if="errorMsg" class="text-red-600 text-sm font-medium">{{ errorMsg }}</div>

    <button @click="handleLogin"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
      Einloggen
    </button>
  </div>
</template>