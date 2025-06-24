// plugins/auth-initializer.client.ts (oder 01.auth-initializer.client.ts)
import { defineNuxtPlugin, useSupabaseClient, useSupabaseUser } from '#imports';
import { useAuthStore } from '~/stores/authV2';

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore();

  // Rufe useSupabaseClient und useSupabaseUser HIER auf (im Plugin-Kontext).
  // Dies ist der korrekte Ort dafür.
  const supabaseClient = useSupabaseClient();
  const supabaseUser = useSupabaseUser(); // Dies ist ein Ref<User | null>

  console.log('✅ Auth-Initialisierungs-Plugin gestartet...');

  // Rufe die initializeAuthStore-Funktion des Stores auf und übergib die Clients
  await authStore.initializeAuthStore(supabaseClient, supabaseUser);

  console.log('✅ Auth-Initialisierungs-Plugin geladen, User:', authStore.user?.email || 'kein User');
});