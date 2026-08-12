/**
 * Node 20 has no native WebSocket. Supabase Realtime requires one during SSR.
 * Provide the `ws` package as a global so createClient() does not crash on /s/**.
 */
import WebSocket from 'ws'

export default defineNuxtPlugin(() => {
  const g = globalThis as typeof globalThis & { WebSocket?: typeof WebSocket }
  if (!g.WebSocket) {
    g.WebSocket = WebSocket as unknown as typeof g.WebSocket
  }
})
