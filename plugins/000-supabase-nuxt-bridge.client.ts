/**
 * Wires getSupabase() to the same client as @nuxtjs/supabase.
 * Must run in the default plugin phase (after module's enforce: 'pre' supabase plugin).
 * Filename sorts before 00-session-persist so getSupabase() sees one GoTrue from the first call.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useNuxtApp } from '#app'
import { registerNuxtModuleSupabaseClient } from '~/utils/supabase'

export default defineNuxtPlugin(() => {
  const mod = useNuxtApp().$supabase as { client?: SupabaseClient } | undefined
  if (mod?.client) {
    registerNuxtModuleSupabaseClient(mod.client)
  }
})
