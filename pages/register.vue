<script setup lang="ts">
import { ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSupabaseClient } from '#imports'


const supabase = useSupabaseClient()

const fetchUserRole = async (supabaseClient: SupabaseClient, userId: string) => {
  // statt useSupabaseClient() direkt hier aufzurufen
  const { data, error } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  // ...
}

// Form-Felder
const firstName = ref('')
const lastName = ref('')
const street = ref('')
const streetNr = ref('')
const zip = ref('')
const city = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')

// Statusanzeigen
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Datei (Lernfahrausweis)
const lernfahrausweis = ref<File | null>(null)

const handleRegister = async () => {
  errorMsg.value = null
  successMsg.value = null

  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: {
        first_name: firstName.value,
        last_name: lastName.value,
        street: street.value,
        street_nr: streetNr.value,
        zip: zip.value,
        city: city.value,
        phone: phone.value,
      }
    }
  })

  if (error) {
    errorMsg.value = error.message
  } else {
    successMsg.value = 'Registrierung erfolgreich! Bitte E-Mail bestätigen.'
    // 📌 Upload des Lernfahrausweises folgt separat
  }
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target?.files?.[0]) {
    lernfahrausweis.value = target.files[0]
  } else {
    lernfahrausweis.value = null
  }
}

</script>

<template>
  <div class="max-w-lg mx-auto p-6 bg-white shadow-md rounded space-y-4 mt-10">
    <h1 class="text-2xl font-bold text-center text-primary">Registrieren</h1>

    <div class="grid grid-cols-2 gap-4">
      <input v-model="firstName" placeholder="Vorname" class="border px-3 py-2 rounded" />
      <input v-model="lastName" placeholder="Nachname" class="border px-3 py-2 rounded" />
      <input v-model="street" placeholder="Strasse" class="border px-3 py-2 rounded" />
      <input v-model="streetNr" placeholder="Nr." class="border px-3 py-2 rounded" />
      <input v-model="zip" placeholder="PLZ" class="border px-3 py-2 rounded" />
      <input v-model="city" placeholder="Ort" class="border px-3 py-2 rounded" />
      <input v-model="phone" placeholder="Telefon" class="border px-3 py-2 rounded col-span-2" />
      <input v-model="email" type="email" placeholder="E-Mail" class="border px-3 py-2 rounded col-span-2" />
      <input v-model="password" type="password" placeholder="Passwort" class="border px-3 py-2 rounded col-span-2" />
      <input
        type="file"
        accept="image/*,.pdf"
        @change="handleFileChange"
        class="col-span-2 border rounded px-3 py-2"
      />
      <p v-if="lernfahrausweis?.name" class="col-span-2 text-sm text-gray-500">
        Ausgewählte Datei: {{ lernfahrausweis.name }}
      </p>
    </div>

    <div v-if="errorMsg" class="text-red-600 text-sm font-medium">{{ errorMsg }}</div>
    <div v-if="successMsg" class="text-green-600 text-sm font-medium">{{ successMsg }}</div>

    <button
      @click="handleRegister"
      class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
    >
      Registrieren
    </button>
  </div>
</template>
