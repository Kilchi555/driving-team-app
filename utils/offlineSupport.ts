// utils/offlineSupport.ts
import { getSupabase } from './supabase'

/**
 * Zentrale Offline-Support Funktion
 * Versucht Online-Speicherung, falls fehlgeschlagen → Offline-Queue
 */
export const saveWithOfflineSupport = async (
  table: string, 
  data: any, 
  action: string = 'insert', 
  where: any = null, 
  operationName: string
) => {
  try {
    const supabase = getSupabase()
    
    let result
    switch (action) {
      case 'insert':
        result = await supabase.from(table).insert(data).select().single()
        break
      case 'update':
        result = await supabase.from(table).update(data).eq('id', where.id).select().single()
        break
      case 'delete':
        result = await supabase.from(table).delete().eq('id', where.id)
        break
      case 'upsert':
        result = await supabase.from(table).upsert(data).select().single()
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    if (result.error) throw result.error
    console.log(`✅ Online save successful: ${operationName}`)
    return result
    
  } catch (error: any) {
    console.log(`📦 Network error, saving offline: ${operationName}`)
    
    // In Offline-Queue speichern
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
    queue.push({ 
      table, 
      action, 
      data, 
      where, 
      operationName, 
      timestamp: Date.now(),
      retryCount: 0
    })
    localStorage.setItem('offline_queue', JSON.stringify(queue))
    
    // Fake Success für UI (Optimistic Update)
    const fakeResult = { 
      data: action === 'delete' ? null : { ...data, id: `temp_${Date.now()}` },
      error: null 
    }
    
    console.log(`📦 Saved to offline queue: ${operationName}`)
    
    // Bei Netzwerk-Fehlern: Optimistic Update
    if (error.message?.includes('fetch') || 
        error.message?.includes('network') || 
        error.message?.includes('Failed to fetch') ||
        error.code === 'NETWORK_ERROR') {
      return fakeResult
    }
    
    // Bei echten DB-Fehlern: Fehler weiterwerfen
    throw error
  }
}

/**
 * Verarbeitet die Offline-Queue beim Reconnect
 */
export const processOfflineQueue = async () => {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
  
  if (queue.length === 0) {
    console.log('✅ Offline queue is empty')
    return { processed: 0, failed: 0, errors: [] }
  }
  
  console.log(`🔄 Processing ${queue.length} items from offline queue`)
  
  let processed = 0
  let failed = 0
  const errors: string[] = []
  
  for (const item of queue) {
    try {
      console.log(`📤 Syncing: ${item.operationName}`)
      
      // Verwende die gleiche Logik wie saveWithOfflineSupport, aber ohne Queue
      const supabase = getSupabase()
      let result
      
      switch (item.action) {
        case 'insert':
          result = await supabase.from(item.table).insert(item.data)
          break
        case 'update':
          result = await supabase.from(item.table).update(item.data).eq('id', item.where.id)
          break
        case 'delete':
          result = await supabase.from(item.table).delete().eq('id', item.where.id)
          break
        default:
          throw new Error(`Unknown action: ${item.action}`)
      }
      
      if (result && result.error) throw result.error
      
      // Erfolgreich - aus Queue entfernen
      const updatedQueue = queue.filter((q: any) => q.timestamp !== item.timestamp)
      localStorage.setItem('offline_queue', JSON.stringify(updatedQueue))
      
      processed++
      console.log(`✅ Synced: ${item.operationName}`)
      
    } catch (error: any) {
      console.error(`❌ Failed to sync: ${item.operationName}`, error)
      
      // Retry-Counter erhöhen
      item.retryCount = (item.retryCount || 0) + 1
      
      // Nach 3 Versuchen aus Queue entfernen
      if (item.retryCount >= 3) {
        console.warn(`⚠️ Removing after 3 failed attempts: ${item.operationName}`)
        const updatedQueue = queue.filter((q: any) => q.timestamp !== item.timestamp)
        localStorage.setItem('offline_queue', JSON.stringify(updatedQueue))
        errors.push(`${item.operationName}: ${error.message}`)
      } else {
        localStorage.setItem('offline_queue', JSON.stringify(queue))
      }
      
      failed++
    }
    
    // Kurze Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`✅ Queue processing complete: ${processed} processed, ${failed} failed`)
  return { processed, failed, errors }
}

/**
 * Initialisiert Offline-Support mit Auto-Sync beim Reconnect
 */
export const initializeOfflineSupport = () => {
  // Online-Event listener
  window.addEventListener('online', async () => {
    console.log('🌐 Browser is back online, processing queue...')
    
    try {
      const result = await processOfflineQueue()
      
      if (result.processed > 0) {
        console.log(`✅ Synced ${result.processed} offline items`)
        // Optional: Notification anzeigen
      }
      
    } catch (error) {
      console.error('❌ Error processing offline queue:', error)
    }
  })
  
  // Offline-Event listener  
  window.addEventListener('offline', () => {
    console.log('📡 Browser is offline, enabling offline mode')
  })
  
  // Beim App-Start Queue verarbeiten falls online
  if (navigator.onLine) {
    setTimeout(() => {
      processOfflineQueue().catch(console.error)
    }, 2000) // 2s Delay für App-Initialization
  }
  
  console.log('🔧 Offline support initialized')
}

/**
 * Hilfsfunktionen für UI
 */
export const getQueueStatus = () => {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
  return {
    size: queue.length,
    items: queue,
    isOnline: navigator.onLine
  }
}

export const clearOfflineQueue = () => {
  localStorage.removeItem('offline_queue')
  console.log('🗑️ Offline queue cleared')
}