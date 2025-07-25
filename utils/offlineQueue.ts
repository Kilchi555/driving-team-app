// utils/offlineQueue.js
import { getSupabase } from './supabase'

const QUEUE_KEY = 'drivingteam_offline_queue'
const MAX_QUEUE_SIZE = 100 // Maximale Anzahl Items in Queue

// Queue Item Interface
interface QueueItem {
  id: string
  timestamp: number
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  where?: any // Für update/delete operations
  retryCount: number
  originalOperation: string // Für User-Feedback
}

/**
 * Fügt Item zur Offline-Queue hinzu
 */
export const addToOfflineQueue = async (item: {
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  where?: any
  originalOperation?: string
}): Promise<void> => {
  try {
    const queue = getOfflineQueue()
    
    // Queue-Size begrenzen
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn('⚠️ Offline queue is full, removing oldest item')
      queue.shift()
    }
    
    const queueItem: QueueItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      table: item.table,
      action: item.action,
      data: item.data,
      where: item.where,
      retryCount: 0,
      originalOperation: item.originalOperation || `${item.action} ${item.table}`
    }
    
    queue.push(queueItem)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    
    console.log('📦 Added to offline queue:', queueItem.originalOperation)
    
    // Event für UI-Updates
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { 
      detail: { 
        queueSize: queue.length,
        latestItem: queueItem
      }
    }))
    
  } catch (error) {
    console.error('❌ Error adding to offline queue:', error)
  }
}

/**
 * Holt die aktuelle Offline-Queue
 */
export const getOfflineQueue = (): QueueItem[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Error reading offline queue:', error)
    return []
  }
}

/**
 * Entfernt Item aus der Queue
 */
export const removeFromQueue = (itemId: string): void => {
  try {
    const queue = getOfflineQueue()
    const filteredQueue = queue.filter(item => item.id !== itemId)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filteredQueue))
    
    // Event für UI-Updates
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { 
      detail: { 
        queueSize: filteredQueue.length
      }
    }))
    
  } catch (error) {
    console.error('❌ Error removing from queue:', error)
  }
}

/**
 * Verarbeitet die komplette Offline-Queue
 */
export const processOfflineQueue = async (): Promise<{
  processed: number
  failed: number
  errors: string[]
}> => {
  const queue = getOfflineQueue()
  let processed = 0
  let failed = 0
  const errors: string[] = []
  
  if (queue.length === 0) {
    console.log('✅ Offline queue is empty')
    return { processed: 0, failed: 0, errors: [] }
  }
  
  console.log(`🔄 Processing ${queue.length} items from offline queue`)
  
  const supabase = getSupabase()
  
  for (const item of queue) {
    try {
      console.log(`📤 Syncing: ${item.originalOperation}`)
      
      let result
      
      switch (item.action) {
        case 'insert':
          result = await supabase
            .from(item.table)
            .insert(item.data)
          break
            
        case 'update':
          if (!item.where) throw new Error('Update requires where clause')
          result = await supabase
            .from(item.table)
            .update(item.data)
            .match(item.where)
          break
            
        case 'delete':
          if (!item.where) throw new Error('Delete requires where clause')
          result = await supabase
            .from(item.table)
            .delete()
            .match(item.where)
          break
            
        default:
          throw new Error(`Unknown action: ${item.action}`)
      }
      
      if (result.error) {
        throw result.error
      }
      
      // Erfolgreich - aus Queue entfernen
      removeFromQueue(item.id)
      processed++
      
      console.log(`✅ Synced: ${item.originalOperation}`)
      
    } catch (error: any) {
      console.error(`❌ Failed to sync: ${item.originalOperation}`, error)
      
      // Retry-Counter erhöhen
      const queue = getOfflineQueue()
      const queueItem = queue.find(q => q.id === item.id)
      if (queueItem) {
        queueItem.retryCount++
        
        // Nach 3 Versuchen aus Queue entfernen
        if (queueItem.retryCount >= 3) {
          console.warn(`⚠️ Removing after 3 failed attempts: ${item.originalOperation}`)
          removeFromQueue(item.id)
          errors.push(`${item.originalOperation}: ${error.message}`)
        } else {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
        }
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
 * Wrapper für Supabase-Operationen mit Offline-Support
 */
export const saveWithOfflineSupport = async (
  table: string, 
  data: any, 
  action: 'insert' | 'update' | 'delete' = 'insert',
  where?: any,
  operationName?: string
) => {
  try {
    const supabase = getSupabase()
    
    let result
    switch (action) {
      case 'insert':
        result = await supabase.from(table).insert(data).select()
        break
      case 'update':
        if (!where) throw new Error('Update requires where clause')
        result = await supabase.from(table).update(data).match(where).select()
        break
      case 'delete':
        if (!where) throw new Error('Delete requires where clause')
        result = await supabase.from(table).delete().match(where)
        break
    }
    
    if (result.error) throw result.error
    
    console.log(`✅ Online save successful: ${operationName || action}`)
    return result
    
  } catch (error: any) {
    console.log(`📦 Network error, saving offline: ${operationName || action}`)
    
    // In Offline-Queue speichern
    await addToOfflineQueue({
      table,
      action,
      data,
      where,
      originalOperation: operationName || `${action} ${table}`
    })
    
    // Benutzerfreundlichen Fehler werfen
    throw new Error(`${operationName || 'Operation'} wird synchronisiert sobald Internet verfügbar ist`)
  }
}

/**
 * Prüft ob Browser online ist und startet Queue-Processing
 */
export const initializeOfflineSupport = (): void => {
  // Online-Event listener
  window.addEventListener('online', async () => {
    console.log('🌐 Browser is back online, processing queue...')
    
    // UI-Feedback
    window.dispatchEvent(new CustomEvent('connection-restored'))
    
    try {
      const result = await processOfflineQueue()
      
      if (result.processed > 0) {
        window.dispatchEvent(new CustomEvent('offline-sync-complete', { 
          detail: result
        }))
      }
      
    } catch (error) {
      console.error('❌ Error processing offline queue:', error)
    }
  })
  
  // Offline-Event listener  
  window.addEventListener('offline', () => {
    console.log('📡 Browser is offline, enabling offline mode')
    window.dispatchEvent(new CustomEvent('connection-lost'))
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
  const queue = getOfflineQueue()
  return {
    size: queue.length,
    oldestItem: queue.length > 0 ? queue[0] : null,
    isOnline: navigator.onLine
  }
}

export const clearOfflineQueue = (): void => {
  localStorage.removeItem(QUEUE_KEY)
  window.dispatchEvent(new CustomEvent('offline-queue-updated', { 
    detail: { queueSize: 0 }
  }))
  console.log('🗑️ Offline queue cleared')
}