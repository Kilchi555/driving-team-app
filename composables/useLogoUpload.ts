// composables/useLogoUpload.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useLogoUpload = () => {
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)
  const uploadProgress = ref(0)

  /**
   * Lädt ein Logo hoch und gibt die öffentliche URL zurück
   */
  const uploadLogo = async (file: File, tenantSlug: string): Promise<string | null> => {
    if (!file) {
      uploadError.value = 'Keine Datei ausgewählt'
      return null
    }

    // Validierung
    if (!file.type.startsWith('image/')) {
      uploadError.value = 'Nur Bilddateien sind erlaubt'
      return null
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB Limit
      uploadError.value = 'Datei zu groß! Maximale Größe: 2MB'
      return null
    }

    isUploading.value = true
    uploadError.value = null
    uploadProgress.value = 0

    try {
      const supabase = getSupabase()
      
      // Dateiname generieren
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${tenantSlug}-logo-${timestamp}.${fileExtension}`
      const filePath = `tenant-logos/${fileName}`

      console.log('🔄 Uploading logo:', filePath)

      // Upload zu Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`)
      }

      console.log('✅ Upload successful:', uploadData.path)

      // Öffentliche URL generieren
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(uploadData.path)

      if (!urlData.publicUrl) {
        throw new Error('Konnte keine öffentliche URL generieren')
      }

      console.log('✅ Public URL generated:', urlData.publicUrl)
      uploadProgress.value = 100

      return urlData.publicUrl

    } catch (err: any) {
      console.error('❌ Logo upload error:', err)
      uploadError.value = err.message || 'Upload fehlgeschlagen'
      return null
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Löscht ein bestehendes Logo
   */
  const deleteLogo = async (logoUrl: string): Promise<boolean> => {
    try {
      const supabase = getSupabase()
      
      // Extrahiere Pfad aus URL
      const url = new URL(logoUrl)
      const pathParts = url.pathname.split('/storage/v1/object/public/public/')
      if (pathParts.length < 2) {
        throw new Error('Ungültige Logo-URL')
      }
      
      const filePath = pathParts[1]
      console.log('🗑️ Deleting logo:', filePath)

      const { error: deleteError } = await supabase.storage
        .from('public')
        .remove([filePath])

      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        throw new Error(`Löschen fehlgeschlagen: ${deleteError.message}`)
      }

      console.log('✅ Logo deleted successfully')
      return true

    } catch (err: any) {
      console.error('❌ Logo delete error:', err)
      uploadError.value = err.message || 'Löschen fehlgeschlagen'
      return false
    }
  }

  /**
   * Aktualisiert die Logo-URL in der Tenants-Tabelle
   */
  const updateTenantLogo = async (tenantId: string, logoUrl: string | null): Promise<boolean> => {
    try {
      const supabase = getSupabase()
      
      console.log('🔄 Updating tenant logo:', tenantId, logoUrl)

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ 
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (updateError) {
        console.error('❌ Update error:', updateError)
        throw new Error(`Update fehlgeschlagen: ${updateError.message}`)
      }

      console.log('✅ Tenant logo updated successfully')
      return true

    } catch (err: any) {
      console.error('❌ Tenant logo update error:', err)
      uploadError.value = err.message || 'Update fehlgeschlagen'
      return false
    }
  }

  /**
   * Kompletter Logo-Upload-Prozess
   */
  const uploadAndSetLogo = async (file: File, tenantId: string, tenantSlug: string): Promise<string | null> => {
    try {
      // 1. Datei hochladen
      const logoUrl = await uploadLogo(file, tenantSlug)
      if (!logoUrl) return null

      // 2. Tenant aktualisieren
      const success = await updateTenantLogo(tenantId, logoUrl)
      if (!success) {
        // Rollback: Logo löschen wenn Update fehlschlägt
        await deleteLogo(logoUrl)
        return null
      }

      return logoUrl

    } catch (err: any) {
      console.error('❌ Complete logo upload process failed:', err)
      uploadError.value = err.message || 'Logo-Upload fehlgeschlagen'
      return null
    }
  }

  /**
   * Logo entfernen (aus Storage und Datenbank)
   */
  const removeTenantLogo = async (tenantId: string, currentLogoUrl?: string): Promise<boolean> => {
    try {
      // 1. Aus Datenbank entfernen
      const dbSuccess = await updateTenantLogo(tenantId, null)
      if (!dbSuccess) return false

      // 2. Aus Storage löschen (falls URL vorhanden)
      if (currentLogoUrl) {
        await deleteLogo(currentLogoUrl)
      }

      return true

    } catch (err: any) {
      console.error('❌ Remove tenant logo failed:', err)
      uploadError.value = err.message || 'Logo entfernen fehlgeschlagen'
      return false
    }
  }

  /**
   * Validiert eine Bilddatei
   */
  const validateImageFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Nur Bilddateien sind erlaubt (JPG, PNG, GIF, WebP)'
    }

    if (file.size > 2 * 1024 * 1024) {
      return 'Datei zu groß! Maximale Größe: 2MB'
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return 'Nicht unterstütztes Dateiformat. Erlaubt: JPG, PNG, GIF, WebP'
    }

    return null // Keine Fehler
  }

  return {
    // State
    isUploading: readonly(isUploading),
    uploadError: readonly(uploadError),
    uploadProgress: readonly(uploadProgress),

    // Methods
    uploadLogo,
    deleteLogo,
    updateTenantLogo,
    uploadAndSetLogo,
    removeTenantLogo,
    validateImageFile
  }
}
