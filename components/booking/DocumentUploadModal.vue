<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <h2 class="text-xl font-bold text-gray-900">Dokumente hochladen</h2>
        <p class="text-sm text-gray-600 mt-1">
          Bitte laden Sie die folgenden Dokumente hoch, um fortzufahren.
        </p>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <div
          v-for="doc in requiredDocuments"
          :key="doc.id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex items-start gap-3 mb-4">
            <span class="text-2xl">{{ doc.icon }}</span>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900">{{ doc.title }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ doc.description }}</p>
            </div>
          </div>

          <!-- Upload Areas -->
          <div class="space-y-3">
            <!-- Front Side -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorderseite <span class="text-red-500">*</span>
              </label>
              <div
                @click="triggerFileInput(`input_${doc.id}_front`)"
                @dragover.prevent
                @drop.prevent="handleDrop($event, doc.id, 'front')"
                class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <input
                  :id="`input_${doc.id}_front`"
                  type="file"
                  accept="image/*,.pdf"
                  class="hidden"
                  @change="handleFileSelect($event, doc.id, 'front')"
                >
                <div v-if="uploads[`${doc.id}_front`]">
                  <svg class="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <p class="text-sm text-gray-900 font-medium">{{ uploads[`${doc.id}_front`].name }}</p>
                  <button
                    @click.stop="removeFile(doc.id, 'front')"
                    class="text-xs text-red-600 hover:text-red-700 mt-1"
                  >
                    Entfernen
                  </button>
                </div>
                <div v-else>
                  <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <p class="text-sm text-gray-600">Klicken oder Datei hierher ziehen</p>
                  <p class="text-xs text-gray-500 mt-1">JPG, PNG oder PDF (max. 5MB)</p>
                </div>
              </div>
            </div>

            <!-- Back Side (if required) -->
            <div v-if="doc.requires_both_sides">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Rückseite <span class="text-red-500">*</span>
              </label>
              <div
                @click="triggerFileInput(`input_${doc.id}_back`)"
                @dragover.prevent
                @drop.prevent="handleDrop($event, doc.id, 'back')"
                class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                <input
                  :id="`input_${doc.id}_back`"
                  type="file"
                  accept="image/*,.pdf"
                  class="hidden"
                  @change="handleFileSelect($event, doc.id, 'back')"
                >
                <div v-if="uploads[`${doc.id}_back`]">
                  <svg class="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <p class="text-sm text-gray-900 font-medium">{{ uploads[`${doc.id}_back`].name }}</p>
                  <button
                    @click.stop="removeFile(doc.id, 'back')"
                    class="text-xs text-red-600 hover:text-red-700 mt-1"
                  >
                    Entfernen
                  </button>
                </div>
                <div v-else>
                  <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <p class="text-sm text-gray-600">Klicken oder Datei hierher ziehen</p>
                  <p class="text-xs text-gray-500 mt-1">JPG, PNG oder PDF (max. 5MB)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
        <button
          @click="$emit('close')"
          :disabled="isUploading"
          class="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          @click="handleUpload"
          :disabled="!isValid || isUploading"
          class="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isUploading ? 'Wird hochgeladen...' : 'Hochladen & Fortfahren' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

const props = defineProps<{
  requiredDocuments: any[]
}>()

const emit = defineEmits(['close', 'success'])

const supabase = getSupabase()
const uploads = ref<Record<string, File>>({})
const isUploading = ref(false)
const error = ref('')

const isValid = computed(() => {
  for (const doc of props.requiredDocuments) {
    if (!uploads.value[`${doc.id}_front`]) return false
    if (doc.requires_both_sides && !uploads.value[`${doc.id}_back`]) return false
  }
  return true
})

const triggerFileInput = (inputId: string) => {
  const input = document.getElementById(inputId) as HTMLInputElement
  input?.click()
}

const handleFileSelect = (event: Event, docId: string, side: 'front' | 'back') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Datei ist zu gross (max. 5MB)'
      return
    }
    
    uploads.value[`${docId}_${side}`] = file
    error.value = ''
  }
}

const handleDrop = (event: DragEvent, docId: string, side: 'front' | 'back') => {
  const file = event.dataTransfer?.files[0]
  
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = 'Datei ist zu gross (max. 5MB)'
      return
    }
    
    uploads.value[`${docId}_${side}`] = file
    error.value = ''
  }
}

const removeFile = (docId: string, side: 'front' | 'back') => {
  delete uploads.value[`${docId}_${side}`]
}

const handleUpload = async () => {
  isUploading.value = true
  error.value = ''

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('Benutzerdaten nicht gefunden')

    // Upload all files
    for (const doc of props.requiredDocuments) {
      const frontFile = uploads.value[`${doc.id}_front`]
      const backFile = uploads.value[`${doc.id}_back`]

      if (frontFile) {
        const frontPath = `${userData.id}/${doc.storage_prefix}/${doc.id}_front_${Date.now()}.${frontFile.name.split('.').pop()}`
        const { error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(frontPath, frontFile)

        if (uploadError) throw uploadError
      }

      if (backFile) {
        const backPath = `${userData.id}/${doc.storage_prefix}/${doc.id}_back_${Date.now()}.${backFile.name.split('.').pop()}`
        const { error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(backPath, backFile)

        if (uploadError) throw uploadError
      }
    }

    logger.debug('✅ Documents uploaded successfully')
    emit('success')
  } catch (err: any) {
    console.error('Upload error:', err)
    error.value = err.message || 'Fehler beim Hochladen. Bitte versuchen Sie es erneut.'
  } finally {
    isUploading.value = false
  }
}
</script>

