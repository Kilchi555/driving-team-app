// stores/auth.ts
/// <reference types="nuxt" />

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { User, SupabaseClient, AuthResponse } from '@supabase/supabase-js' // <<< AuthResponse hier hinzufügen!
import type { Ref } from 'vue' 

export const useAuthStore = defineStore('authV2', () => {

  // State
  const user = ref<User | null>(null)
  const userRole = ref<string>('')
  const errorMessage = ref<string | null>(null)
  const loading = ref<boolean>(false)

  // Computed Properties
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => userRole.value === 'admin')
  const isStaff = computed(() => userRole.value === 'staff')
  const isClient = computed(() => userRole.value === 'client')

  /**
   * Initialisiert den Auth-Store. Diese Funktion wird vom Nuxt-Plugin aufgerufen.
   * Sie empfängt den SupabaseClient und den SupabaseUserRef als Argumente,
   * um Composables innerhalb des Stores zu vermeiden.
   */
  const initializeAuthStore = (
    supabaseClient: SupabaseClient,
    supabaseUserRef: Ref<User | null> // Der Ref vom Composable useSupabaseUser
  ) => {
    // Setze den initialen Benutzerwert im Store
    user.value = supabaseUserRef.value;

    // Registriere den onAuthStateChange Listener von Supabase Auth.
    // Dieser wird bei jeder Authentifizierungsänderung (Login, Logout, Session-Refresh) ausgelöst.
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        user.value = session.user as User; // Supabase gibt ein User-Objekt zurück
        // Rufe fetchUserRole auf und übergebe den erhaltenen supabaseClient
        await fetchUserRole(supabaseClient, session.user.id);
      } else {
        // Bei Abmeldung oder fehlender Session den Benutzerstatus zurücksetzen
        user.value = null;
        userRole.value = '';
      }
    });

    // Watcher für den useSupabaseUser Ref von Nuxt.
    // Dies synchronisiert den Benutzerstatus, wenn useSupabaseUser sich ändert.
    // Nur clientseitig ausführen, um SSR-Probleme zu vermeiden.
    if (process.client) {
      watch(supabaseUserRef, async (newUser) => {
        user.value = newUser;
        if (newUser) {
          // Wenn ein neuer Benutzer vorhanden ist, lade seine Rolle
          await fetchUserRole(supabaseClient, newUser.id); // Übergebe den Client
        } else {
          // Benutzer abgemeldet, Rolle zurücksetzen
          userRole.value = '';
        }
      }, { immediate: true }); // Sofort beim Start des Watchers ausführen
    }
  };


  /**
   * Führt den Login-Prozess durch.
   * @param email_val - Die E-Mail-Adresse des Benutzers.
   * @param password_val - Das Passwort des Benutzers.
   * @param supabaseClient - Der Supabase-Client, der für die Authentifizierung verwendet wird.
   */
  const login = async (email_val: string, password_val: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email_val,
        password: password_val,
      })
      if (error) throw error
            // NEU: Wenn Login erfolgreich ist, aktualisiere den User im Store
      if (data.user) {
        user.value = data.user;
        await fetchUserRole(supabaseClient, data.user.id); // NEU: Rolle direkt nach Login laden
      }
      return true
    } catch (err: any) {
      errorMessage.value = err.message || 'Login fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Führt den Registrierungsprozess durch.
   * @param email_val - Die E-Mail-Adresse des neuen Benutzers.
   * @param password_val - Das Passwort des neuen Benutzers.
   * @param supabaseClient - Der Supabase-Client, der für die Registrierung verwendet wird.
   */
  const register = async (email_val: string, password_val: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      const { error } = await supabaseClient.auth.signUp({
        email: email_val,
        password: password_val,
      })
      if (error) throw error
      return true
    } catch (err: any) {
      errorMessage.value = err.message || 'Registrierung fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Meldet den Benutzer ab.
   * @param supabaseClient - Der Supabase-Client, der für die Abmeldung verwendet wird.
   */
  const logout = async (supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      user.value = null
      userRole.value = ''
    } catch (err: any) {
      errorMessage.value = err.message || 'Abmeldung fehlgeschlagen.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Lädt die Rolle des Benutzers aus der 'users'-Tabelle.
   * @param supabaseClient - Der Supabase-Client, der für die Datenbankabfrage verwendet wird.
   * @param userId - Die ID des Benutzers, dessen Rolle geladen werden soll.
   */
  const fetchUserRole = async (supabaseClient: SupabaseClient, userId: string) => {
    // HIER WIRD KEIN useSupabaseClient() MEHR AUFGERUFEN!
    // Stattdessen wird der übergebene 'supabaseClient' verwendet.
    try {
      console.log('DEBUG_FETCH_USER_ROLE: Using passed supabaseClient for role fetch.'); 
      const { data, error } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single<{ role: string }>()

      if (error && error.code !== 'PGRST116') { // PGRST116 = keine Zeile gefunden
        console.error('Fehler beim Laden der Benutzerrolle:', error.message)
        errorMessage.value = 'Konnte Benutzerrolle nicht laden.'
        userRole.value = ''
      } else {
        userRole.value = data?.role || '' // Wenn keine Rolle gefunden, Standard auf leeren String
      }
    } catch (err: any) {
      console.error('Unerwarteter Fehler beim Rollen-Fetch:', err.message)
      errorMessage.value = 'Unbekannter Fehler beim Laden der Rolle.'
      userRole.value = ''
    }
  }

  return {
    user,
    userRole,
    errorMessage,
    loading,
    isLoggedIn,
    isAdmin,
    isStaff,
    isClient,
    login,
    register,
    logout,
    fetchUserRole,
    initializeAuthStore, // Diese Funktion wird vom Nuxt-Plugin aufgerufen
  }
})