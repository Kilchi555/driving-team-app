<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <!-- Header -->
      <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          📋 Arztzeugnis hochladen
        </h2>
        <p class="text-sm text-orange-100 mt-1">
          Laden Sie ein Arztzeugnis oder Unfallbericht hoch, um Ihre Stornogebühr zu reduzieren oder zu vermeiden.
        </p>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <!-- File Upload Area -->
        <div
          @click="triggerFileInput"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400'
          ]"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*,.pdf"
            @change="handleFileSelect"
            class="hidden"
          />
          
          <div class="text-4xl mb-2">📁</div>
          <p class="font-medium text-gray-900">Datei auswählen oder hier ablegen</p>
          <p class="text-sm text-gray-500 mt-1">
            PDF, JPG, PNG (max. 10 MB)
          </p>
        </div>

        <!-- Selected File Display -->
        <div v-if="selectedFile" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm font-medium text-green-800">
            ✅ {{ selectedFile.name }}
          </p>
          <p class="text-xs text-green-600 mt-1">
            {{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB
          </p>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm font-medium text-red-800">❌ {{ error }}</p>
        </div>

        <!-- Info Text -->
        <div
          class="rounded-lg p-4 border"
          :style="{ background: `${primaryColor}15`, borderColor: `${primaryColor}33` }"
        >
          <p class="text-xs font-medium mb-2" :style="{ color: primaryColor }">Hinweise:</p>
          <ul class="text-xs space-y-1 list-disc list-inside" :style="{ color: primaryColor }">
            <li>Arztzeugnis oder Unfallbericht erforderlich</li>
            <li>Dokument muss Ihr Name und Datum enthalten</li>
            <li>Nach Upload wird das Dokument überprüft</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-4 flex gap-3 border-t rounded-b-lg">
        <button
          @click="close"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="upload"
          :disabled="!selectedFile || isUploading"
          class="flex-1 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isUploading ? 'Wird hochgeladen...' : 'Hochladen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

const { primaryColor } = useTenantBranding()

interface Props {
  isVisible: boolean
  payment: any
}

interface Emits {
  (e: 'close'): void
  (e: 'uploaded'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)
const error = ref<string | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files && files[0]) {
    selectFile(files[0])
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    selectFile(files[0])
  }
}

const selectFile = (file: File) => {
  error.value = null
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Nur PDF, JPG, PNG und WebP Dateien sind erlaubt'
    return
  }
  
  // Validate file size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'Datei darf maximal 10 MB groß sein'
    return
  }
  
  selectedFile.value = file
}

const upload = async () => {
  if (!selectedFile.value || !props.payment) return
  
  isUploading.value = true
  error.value = null
  
  try {
    const appointment = Array.isArray(props.payment.appointments) 
      ? props.payment.appointments[0] 
      : props.payment.appointments
    
    if (!appointment) {
      throw new Error('Termin nicht gefunden')
    }
    
    // Use secure API for upload instead of direct storage access
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('documentType', 'medical_certificate')
    formData.append('appointmentId', appointment.id)
    
    const response = await $fetch('/api/customer/upload-document', {
      method: 'POST',
      body: formData
    })
    
    if (!response.success) {
      throw new Error('Upload fehlgeschlagen')
    }
    
    // Update appointment status via secure API
    await $fetch('/api/customer/update-medical-certificate', {
      method: 'POST',
      body: {
        appointmentId: appointment.id,
        medical_certificate_status: 'uploaded',
        medical_certificate_url: response.document?.path,
        medical_certificate_uploaded_at: new Date().toISOString()
      }
    })
    
    console.log('✅ Medical certificate uploaded successfully')
    
    // Notify parent
    emit('uploaded')
    close()
    
  } catch (err: any) {
    console.error('❌ Error uploading certificate:', err)
    error.value = err.message || 'Fehler beim Hochladen des Zeugnisses'
  } finally {
    isUploading.value = false
  }
}

const close = () => {
  selectedFile.value = null
  error.value = null
  isDragging.value = false
  emit('close')
}
</script>

