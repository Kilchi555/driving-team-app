<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
    <UCard class="w-full max-w-2xl p-6 shadow-xl rounded-lg bg-white">
      <template #header>
        <h2 class="text-3xl font-extrabold text-center text-gray-900">Fahrschüler Registrierung</h2>
        <p class="text-center text-gray-500 mt-2">Erstelle dein Profil, um deine Fahrausbildung zu starten.</p>
      </template>

      <form @submit.prevent="handleRegister" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <UFormGroup label="E-Mail" name="email" class="col-span-full">
          <UInput
            v-model="email"
            type="email"
            placeholder="Deine E-Mail Adresse"
            required
            size="lg"
            icon="i-heroicons-envelope"
          />
        </UFormGroup>

        <UFormGroup label="Passwort" name="password" class="col-span-full">
          <UInput
            v-model="password"
            type="password"
            placeholder="Wähle ein sicheres Passwort"
            required
            size="lg"
            icon="i-heroicons-lock-closed"
          />
        </UFormGroup>

        <UFormGroup label="Vorname" name="firstName">
          <UInput
            v-model="firstName"
            placeholder="Dein Vorname"
            required
            size="lg"
            icon="i-heroicons-user"
          />
        </UFormGroup>

        <UFormGroup label="Nachname" name="lastName">
          <UInput
            v-model="lastName"
            placeholder="Dein Nachname"
            required
            size="lg"
            icon="i-heroicons-user"
          />
        </UFormGroup>

        <UFormGroup label="Geburtsdatum" name="birthdate">
          <UInput
            v-model="birthdate"
            type="date"
            required
            size="lg"
            icon="i-heroicons-calendar"
          />
        </UFormGroup>

        <UFormGroup label="Telefonnummer" name="phone">
          <UInput
            v-model="phone"
            type="tel"
            placeholder="+41 79 123 45 67"
            size="lg"
            icon="i-heroicons-phone"
          />
        </UFormGroup>

        <UFormGroup label="Strasse" name="street">
          <UInput
            v-model="street"
            placeholder="Beispielstrasse"
            size="lg"
            icon="i-heroicons-map-pin"
          />
        </UFormGroup>

        <UFormGroup label="Hausnummer" name="streetNr">
          <UInput
            v-model="streetNr"
            placeholder="123"
            size="lg"
          />
        </UFormGroup>

        <UFormGroup label="PLZ" name="zip">
          <UInput
            v-model="zip"
            placeholder="8610"
            size="lg"
            icon="i-heroicons-hashtag"
          />
        </UFormGroup>

        <UFormGroup label="Ort" name="city">
          <UInput
            v-model="city"
            placeholder="Uster"
            size="lg"
            icon="i-heroicons-building-office"
          />
        </UFormGroup>

        <UFormGroup label="Gewünschte Fahrausweis-Kategorie" name="category" class="col-span-full">
          <USelect
            v-model="category"
            :options="drivingCategories"
            option-attribute="name"
            value-attribute="value"
            placeholder="Wähle deine Kategorie"
            required
            size="lg"
          />
        </UFormGroup>

        <UFormGroup label="Lernfahrausweis-Nummer" name="lernfahrausweis_url" class="col-span-full">
          <UInput
            v-model="lernfahrausweis_url"
            placeholder="Deine Lernfahrausweis-Nummer (optional)"
            size="lg"
            icon="i-heroicons-document"
          />
          <p class="text-xs text-gray-500 mt-1">Hinweis: Eine Upload-Funktion für das Dokument folgt später.</p>
        </UFormGroup>

        <UButton
          type="submit"
          block
          size="lg"
          :loading="loading"
          color="primary"
          variant="solid"
          class="mt-6 col-span-full"
        >
          Jetzt registrieren
        </UButton>
      </form>

      <UDivider label="Bereits registriert?" class="my-6" />

      <div class="text-center text-sm">
        <NuxtLink to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
          Hier anmelden
        </NuxtLink>
      </div>

      <template #footer>
        <div class="text-center text-xs text-gray-500">
          Durch die Registrierung stimmst du unseren <NuxtLink to="/terms" class="underline text-primary-600 hover:text-primary-700">Nutzungsbedingungen</Nuxtlink> und der <NuxtLink to="/privacy" class="underline text-primary-600 hover:text-primary-700">Datenschutzerklärung</Nuxtlink> zu.
        </div>
      </template>
    </UCard>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSupabaseClient } from '#imports';
import { useRouter } from 'vue-router';
import type { Database } from '~/types/supabase'; // Importiere den Database-Typ
import { useToast } from '#imports'; // Expliziter Import für useToast

// Supabase Client und Router
const supabase = useSupabaseClient<Database>();
const router = useRouter();
const toast = useToast();

// Formularvariablen (ref für reaktive Datenbindung)
const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const phone = ref('');
const birthdate = ref(''); // Formatweiler-MM-DD
const street = ref('');
const streetNr = ref('');
const zip = ref('');
const city = ref('');
const category = ref(''); // Ausgewählte Fahrausweis-Kategorie
const lernfahrausweis_url = ref(''); // Lernfahrausweis-Nummer
const loading = ref(false); // Ladezustand für den Button

// Optionen für die Fahrausweis-Kategorie (basierend auf deinen Vorgaben)
const drivingCategories = [
  { name: 'Kategorie A (Motorrad)', value: 'A' },
  { name: 'Kategorie B (Auto)', value: 'B' },
  { name: 'Kategorie BE (Auto mit Anhänger)', value: 'BE' },
  { name: 'Kategorie C1 | D1 (Lieferwagen/Wohnmobil)', value: 'C1/D1' },
  { name: 'Kategorie C (Lastwagen)', value: 'C' },
  { name: 'Kategorie CE (Lastwagen mit Anhänger)', value: 'CE' },
  { name: 'Kategorie D (Bus)', value: 'D' },
  { name: 'Kategorie BPT (Personentransport)', value: 'BPT' },
  { name: 'Motorboot', value: 'Motorboot' },
];

const handleRegister = async () => {
  loading.value = true;
  try {
    // 1. Benutzer in Supabase Auth registrieren (email, password)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      // optional: wenn du initial metadata übergeben willst, z.B. einen default role
      // options: {
      //   data: {
      //     role: 'client',
      //   },
      // },
    });

    if (authError) {
      throw new Error(authError.message); // Wirf den Fehler, um ihn im catch-Block zu fangen
    }

    // Stellen Sie sicher, dass ein Benutzerobjekt vorhanden ist
    if (!authData.user) {
      throw new Error("Benutzer konnte nicht registriert werden. Keine Benutzer-ID erhalten.");
    }

    // 2. Zusätzliche Profildaten in der 'users'-Tabelle speichern
    // Nutze authData.user.id als Verknüpfung zur auth.users Tabelle
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id, // Verknüpfung mit der auth.users ID
      email: email.value,
      first_name: firstName.value,
      last_name: lastName.value,
      phone: phone.value || null, // Speichere null, wenn leer
      birthdate: birthdate.value || null,
      street: street.value || null,
      street_nr: streetNr.value || null,
      zip: zip.value || null,
      city: city.value || null,
      category: category.value,
      lernfahrausweis_url: lernfahrausweis_url.value || null,
      role: 'client', // Standardrolle für neue Fahrschüler
      is_active: true, // Neue Benutzer sind standardmäßig aktiv
      // assigned_staff und payment_prov bleiben initial null oder werden später gesetzt
      assigned_staff: null,
      payment_prov: null,
    });

    if (profileError) {
      // Wenn die Profilspeicherung fehlschlägt, solltest du den Auth-Benutzer eventuell löschen
      // Das ist komplexer und sollte im Backend via Supabase Functions/Webhooks behandelt werden
      // oder eine Retry-Logik implementiert werden. Für den Frontend-Fehler hier:
      throw new Error(`Fehler beim Speichern der Profildaten: ${profileError.message}`);
    }

    // Erfolgsmeldung basierend auf Supabase Auth Konfiguration (E-Mail Bestätigung)
    if (authData.user && !authData.session) {
      // Benutzer wurde erstellt, aber Session existiert nicht -> E-Mail Bestätigung erforderlich
      toast.add({
        title: 'Registrierung erfolgreich!',
        description: 'Bitte überprüfe deine E-Mails, um deine Registrierung zu bestätigen. Du wirst dann automatisch weitergeleitet.',
        icon: 'i-heroicons-check-circle',
        color: 'success'
      });
      // Nach Bestätigung wird der Nutzer durch Supabase weitergeleitet.
      // Für jetzt leiten wir zur Login-Seite, wo sie auf die E-Mail warten können.
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } else if (authData.session) {
      // Benutzer wurde erstellt und direkt eingeloggt (z.B. E-Mail Bestätigung deaktiviert)
      toast.add({
        title: 'Registrierung erfolgreich!',
        description: 'Du wurdest erfolgreich registriert und eingeloggt.',
        icon: 'i-heroicons-check-circle',
        color: 'success'
      });
      router.push('/'); // Weiterleitung zum Dashboard/Startseite
    }

  } catch (err: any) {
    console.error('Registrierungsfehler:', err);
    toast.add({
      title: 'Registrierungsfehler',
      description: err.message || 'Ein unerwarteter Fehler ist aufgetreten.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
};
</script>