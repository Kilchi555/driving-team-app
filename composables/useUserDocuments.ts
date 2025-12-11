// composables/useUserDocuments.ts
// Verwaltet Benutzerdokumente über die user_documents Tabelle

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface UserDocument {
  id: string
  user_id: string
  tenant_id: string
  document_type: string
  category_code?: string
  side: 'front' | 'back'
  file_name: string
  file_size?: number
  file_type: string
  storage_path: string
  title?: string
  description?: string
  is_verified: boolean
  verification_date?: string
  verified_by?: string
  created_at: string
  updated_at: string
  created_by?: string
  deleted_at?: string
}

export const useUserDocuments = () => {
  const supabase = getSupabase()
  const documents = ref<UserDocument[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Lädt alle Dokumente für einen Benutzer
   */
  const loadDocuments = async (userId: string): Promise<UserDocument[]> => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      documents.value = data || []
      return documents.value
    } catch (err: any) {
      console.error('Error loading documents:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Lädt Dokumente für einen spezifischen Typ und Kategorie
   */
  const getDocumentsByType = (
    userId: string, 
    documentType: string, 
    categoryCode?: string
  ): Promise<UserDocument[]> => {
    return loadDocuments(userId).then(() => {
      return documents.value.filter(doc => 
        doc.document_type === documentType &&
        (categoryCode ? doc.category_code === categoryCode : true)
      )
    })
  }

  /**
   * Prüft ob ein Dokument existiert
   */
  const hasDocument = (
    documentType: string, 
    categoryCode?: string, 
    side: 'front' | 'back' = 'front'
  ): boolean => {
    return documents.value.some(doc => 
      doc.document_type === documentType &&
      doc.side === side &&
      (categoryCode ? doc.category_code === categoryCode : !doc.category_code)
    )
  }

  /**
   * Holt ein spezifisches Dokument
   */
  const getDocument = (
    documentType: string, 
    categoryCode?: string, 
    side: 'front' | 'back' = 'front'
  ): UserDocument | undefined => {
    return documents.value.find(doc => 
      doc.document_type === documentType &&
      doc.side === side &&
      (categoryCode ? doc.category_code === categoryCode : !doc.category_code)
    )
  }

  /**
   * Speichert ein neues Dokument
   */
  const saveDocument = async (documentData: {
    user_id: string
    tenant_id: string
    document_type: string
    category_code?: string
    side?: 'front' | 'back'
    file_name: string
    file_size?: number
    file_type: string
    storage_path: string
    title?: string
    description?: string
  }): Promise<UserDocument | null> => {
    loading.value = true
    error.value = null

    try {
      // Prüfe ob bereits ein Dokument dieses Typs existiert
      let query = supabase
        .from('user_documents')
        .select('id')
        .eq('user_id', documentData.user_id)
        .eq('document_type', documentData.document_type)
        .eq('side', documentData.side || 'front')
        .is('deleted_at', null)

      // category_code korrekt vergleichen (NULL mit .is, sonst .eq)
      if (documentData.category_code) {
        query = query.eq('category_code', documentData.category_code)
      } else {
        query = query.is('category_code', null)
      }

      const existing = await query.maybeSingle()

      let result

      if (existing.data) {
        // Update existierendes Dokument
        const { data, error: updateError } = await supabase
          .from('user_documents')
          .update({
            file_name: documentData.file_name,
            file_size: documentData.file_size,
            file_type: documentData.file_type,
            storage_path: documentData.storage_path,
            title: documentData.title,
            description: documentData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.data.id)
          .select()
          .single()

        if (updateError) throw updateError
        result = data
      } else {
        // Erstelle neues Dokument
        const { data, error: insertError } = await supabase
          .from('user_documents')
          .insert({
            ...documentData,
            side: documentData.side || 'front'
          })
          .select()
          .single()

        if (insertError) throw insertError
        result = data
      }

      // Aktualisiere lokale Liste
      await loadDocuments(documentData.user_id)
      
      return result
    } catch (err: any) {
      console.error('Error saving document:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Löscht ein Dokument (Soft Delete)
   */
  const deleteDocument = async (documentId: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('user_documents')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (deleteError) throw deleteError

      // Entferne aus lokaler Liste
      documents.value = documents.value.filter(doc => doc.id !== documentId)
      
      return true
    } catch (err: any) {
      console.error('Error deleting document:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Markiert ein Dokument als verifiziert
   */
  const verifyDocument = async (documentId: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          is_verified: true,
          verification_date: new Date().toISOString()
        })
        .eq('id', documentId)

      if (updateError) throw updateError

      // Aktualisiere lokales Dokument
      const docIndex = documents.value.findIndex(doc => doc.id === documentId)
      if (docIndex !== -1) {
        documents.value[docIndex].is_verified = true
        documents.value[docIndex].verification_date = new Date().toISOString()
      }
      
      return true
    } catch (err: any) {
      console.error('Error verifying document:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload-Funktion für Dateien
   * Verwendet dasselbe Format wie die Registrierung für Konsistenz
   */
  const uploadFile = async (
    file: File, 
    userId: string, 
    documentType: string, 
    categoryCode?: string,
    side: 'front' | 'back' = 'front'
  ): Promise<string | null> => {
    try {
      // Generiere eindeutigen Dateinamen im gleichen Format wie bei Registrierung
      // Format: {documentType}_{categoryCode}_{side}_{timestamp}.{ext}
      // Beispiel: lernfahrausweis_B_front_1733849420123.jpg
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      
      let fileName: string
      if (categoryCode) {
        // Mit Kategorie: lernfahrausweis_B_front_1733849420123.jpg
        fileName = `${documentType}_${categoryCode}_${side}_${timestamp}.${fileExtension}`
      } else {
        // Ohne Kategorie: license_front_1733849420123.jpg
        fileName = `${documentType}_${side}_${timestamp}.${fileExtension}`
      }
      
      // Upload zu Supabase Storage im {userId}/ Ordner (wie bei Registrierung)
      const storagePath = `${userId}/${fileName}`
      
      logger.debug('📤 Uploading file to storage:', {
        bucket: 'user-documents',
        path: storagePath,
        fileName,
        documentType,
        categoryCode,
        side
      })
      
      const { data, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      logger.debug('✅ File uploaded successfully:', data.path)
      return data.path
    } catch (err: any) {
      console.error('Error uploading file:', err)
      error.value = err.message
      return null
    }
  }

  /**
   * Holt öffentliche URL für ein Dokument
   */
  const getPublicUrl = (storagePath: string): string => {
    const { data } = supabase.storage
      .from('user-documents')
      .getPublicUrl(storagePath)
    
    return data.publicUrl
  }

  // Computed Properties
  const documentsByType = computed(() => {
    const grouped: Record<string, UserDocument[]> = {}
    documents.value.forEach(doc => {
      const key = doc.category_code ? `${doc.document_type}_${doc.category_code}` : doc.document_type
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(doc)
    })
    return grouped
  })

  const verifiedDocuments = computed(() => {
    return documents.value.filter(doc => doc.is_verified)
  })

  const unverifiedDocuments = computed(() => {
    return documents.value.filter(doc => !doc.is_verified)
  })

  return {
    // State
    documents: computed(() => documents.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    
    // Computed
    documentsByType,
    verifiedDocuments,
    unverifiedDocuments,
    
    // Methods
    loadDocuments,
    getDocumentsByType,
    hasDocument,
    getDocument,
    saveDocument,
    deleteDocument,
    verifyDocument,
    uploadFile,
    getPublicUrl
  }
}











