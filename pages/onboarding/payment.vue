<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSupabaseUser } from '#imports';
import { useRouter } from 'vue-router';

const user = useSupabaseUser(); // Holt den aktuell eingeloggten Supabase User
const router = useRouter();

const loading = ref(true);
const message = ref('Lade Zahlungs-Setup...');

onMounted(async () => {
  if (!user.value) {
    // Wenn der Benutzer nicht eingeloggt ist, leite ihn zur Login-Seite um
    await router.push('/login');
    return;
  }

  // Hier würden später die Checks und die Integration für Wallee/Stripe etc. erfolgen.
  // Zum Beispiel:
  // 1. Prüfen, ob der payment_provider_customer_id bereits existiert. Falls nicht, eine Server Route aufrufen, die ihn erstellt.
  // 2. Die UI für die Eingabe der Zahlungsmethode anzeigen (z.B. Wallee JS SDK Komponenten).
  // 3. Nach erfolgreicher Hinterlegung der Zahlungsmethode, die has_payment_method in Supabase auf TRUE setzen.
  // 4. Und dann zu '/dashboard' oder einer anderen Startseite weiterleiten.

  // Vorerst nur ein Platzhalter, der simuliert, dass etwas passiert
  message.value = 'Bereite die Hinterlegung Ihrer Zahlungsmethode vor...';
  loading.value = false;

  // Dummy-Umleitung nach kurzer Zeit
  setTimeout(() => {
    // Dies würde später nach erfolgreicher Zahlungsmethoden-Hinterlegung passieren
    // Stelle sicher, dass `onboarding_completed` und `has_payment_method` in Supabase auf TRUE gesetzt werden
    // await router.push('/dashboard'); // Oder zu einer Seite, wo Termine erstellt werden können
  }, 2000);
});

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <UCard class="w-full max-w-md p-6">
      <div v-if="loading" class="text-center">
        <USkeleton class="h-8 w-64 mx-auto mb-4" />
        <USkeleton class="h-4 w-full mb-2" />
        <USkeleton class="h-4 w-full" />
        <p>{{ message }}</p>
      </div>
      <div v-else>
        <h2 class="text-2xl font-bold mb-4 text-center">Zahlungsmethode hinterlegen</h2>
        <p class="mb-4 text-center">
          Um fortzufahren und Termine buchen zu können, müssen Sie eine Zahlungsmethode hinterlegen.
        </p>
        <div class="border p-4 rounded-md bg-gray-50 text-center">
          <p>Platzhalter für Wallee/Zahlungs-Integration hier.</p>
          <p class="mt-2 text-sm text-gray-500">Dieser Bereich wird bald Ihre sichere Zahlungsdateneingabe enthalten.</p>
        </div>
        <UButton class="mt-6 w-full" @click="router.push('/dashboard')">
            Weiter zum Dashboard (Nur Test)
        </UButton>
      </div>
    </UCard>
  </div>
</template>