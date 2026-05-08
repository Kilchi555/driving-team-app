// composables/useLogoUpload.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { compressImage } from '~/utils/imageCompression'

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) { u8arr[n] = bstr.charCodeAt(n) }
  return new File([u8arr], filename, { type: mime })
}

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

    if (file.size > 5 * 1024 * 1024) { // 5MB Limit (compressed before upload)
      uploadError.value = 'Datei zu groß! Maximale Größe: 5MB'
      return null
    }

    isUploading.value = true
    uploadError.value = null
    uploadProgress.value = 0

    try {
      const supabase = getSupabase()

      // Convert to WebP before uploading
      const base64Webp = await compressImage(file, 'square')
      const timestamp = Date.now()
      const webpFile = base64ToFile(base64Webp, `${tenantSlug}-logo-${timestamp}.webp`)
      const filePath = `tenant-logos/${webpFile.name}`

      logger.debug('🔄 Uploading logo:', filePath)

      // Upload zu Supabase Storage
      const { data: uploadData, error: storageError } = await supabase.storage
        .from('public')
        .upload(filePath, webpFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) {
        console.error('❌ Upload error:', storageError)
        throw new Error(`Upload fehlgeschlagen: ${storageError.message}`)
      }

      logger.debug('✅ Upload successful:', uploadData.path)

      // Öffentliche URL generieren
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(uploadData.path)

      if (!urlData.publicUrl) {
        throw new Error('Konnte keine öffentliche URL generieren')
      }

      logger.debug('✅ Public URL generated:', urlData.publicUrl)
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
      
      // Extrahiere Pfad aus URL - Supabase returns full public URL
      const url = new URL(logoUrl)
      let filePath: string | null = null
      
      // Try different path patterns
      if (url.pathname.includes('/storage/v1/object/public/public/')) {
        const pathParts = url.pathname.split('/storage/v1/object/public/public/')
        if (pathParts.length >= 2) {
          filePath = pathParts[1]
        }
      } else if (url.pathname.includes('/public/tenant-logos/')) {
        const pathParts = url.pathname.split('/public/tenant-logos/')
        if (pathParts.length >= 2) {
          filePath = `tenant-logos/${pathParts[1]}`
        }
      }
      
      if (!filePath) {
        throw new Error('Ungültige Logo-URL - kann Pfad nicht extrahieren')
      }
      
      logger.debug('🗑️ Deleting logo:', filePath)

      const { error: deleteError } = await supabase.storage
        .from('public')
        .remove([filePath])

      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        throw new Error(`Löschen fehlgeschlagen: ${deleteError.message}`)
      }

      logger.debug('✅ Logo deleted successfully')
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
      
      logger.debug('🔄 Updating tenant logo:', tenantId, logoUrl)

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

      logger.debug('✅ Tenant logo updated successfully')
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
      return 'Nur Bilddateien sind erlaubt'
    }

    if (file.size > 5 * 1024 * 1024) {
      return 'Datei zu groß! Maximale Größe: 5MB'
    }

    return null // Keine Fehler – Formatkonvertierung übernimmt compressImage
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
