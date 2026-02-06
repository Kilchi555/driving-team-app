<!-- components/TenantLogoUpload.vue -->
<template>
  <div class="tenant-logo-upload">
    <div class="upload-section">
      <h3>{{ t('admin.branding.logoUpload') }}</h3>
      
      <div class="upload-grid">
        <!-- Logo Square -->
        <div class="upload-item">
          <div class="preview-container" @click="triggerFileInput('logo_square')">
            <img v-if="previews.logo_square" :src="previews.logo_square" alt="Logo Square" class="preview-image" />
            <div v-else class="placeholder">
              <IconUpload :size="32" />
              <p>{{ t('admin.branding.logoSquare') }}</p>
            </div>
          </div>
          <input
            ref="fileInputSquare"
            type="file"
            hidden
            accept="image/*"
            @change="(e) => handleFileSelect(e, 'logo_square')"
          />
          <button v-if="previews.logo_square" @click="deleteAsset('logo_square')" class="btn-delete">
            {{ t('common.delete') }}
          </button>
        </div>

        <!-- Logo Wide -->
        <div class="upload-item">
          <div class="preview-container" @click="triggerFileInput('logo_wide')">
            <img v-if="previews.logo_wide" :src="previews.logo_wide" alt="Logo Wide" class="preview-image" />
            <div v-else class="placeholder">
              <IconUpload :size="32" />
              <p>{{ t('admin.branding.logoWide') }}</p>
            </div>
          </div>
          <input
            ref="fileInputWide"
            type="file"
            hidden
            accept="image/*"
            @change="(e) => handleFileSelect(e, 'logo_wide')"
          />
          <button v-if="previews.logo_wide" @click="deleteAsset('logo_wide')" class="btn-delete">
            {{ t('common.delete') }}
          </button>
        </div>

        <!-- Favicon -->
        <div class="upload-item">
          <div class="preview-container" @click="triggerFileInput('favicon')">
            <img v-if="previews.favicon" :src="previews.favicon" alt="Favicon" class="preview-image" />
            <div v-else class="placeholder">
              <IconUpload :size="32" />
              <p>{{ t('admin.branding.favicon') }}</p>
            </div>
          </div>
          <input
            ref="fileInputFavicon"
            type="file"
            hidden
            accept="image/*"
            @change="(e) => handleFileSelect(e, 'favicon')"
          />
          <button v-if="previews.favicon" @click="deleteAsset('favicon')" class="btn-delete">
            {{ t('common.delete') }}
          </button>
        </div>
      </div>

      <!-- Upload Status -->
      <div v-if="uploadStatus" :class="['upload-status', uploadStatus.type]">
        <p>{{ uploadStatus.message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconUpload from '~icons/mdi/upload'

const { t } = useI18n()
const emit = defineEmits<{
  uploadComplete: [asset: any]
}>()

interface Props {
  tenantId: string
}

const props = defineProps<Props>()

// File inputs
const fileInputSquare = ref<HTMLInputElement>()
const fileInputWide = ref<HTMLInputElement>()
const fileInputFavicon = ref<HTMLInputElement>()

// Preview URLs and upload state
const previews = reactive({
  logo_square: '',
  logo_wide: '',
  favicon: ''
})

const uploading = ref(false)
const uploadStatus = ref<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null)

// File input handling
function triggerFileInput(type: string) {
  switch (type) {
    case 'logo_square':
      fileInputSquare.value?.click()
      break
    case 'logo_wide':
      fileInputWide.value?.click()
      break
    case 'favicon':
      fileInputFavicon.value?.click()
      break
  }
}

// Handle file selection and upload
async function handleFileSelect(event: Event, assetType: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    uploadStatus.value = {
      type: 'error',
      message: t('admin.branding.fileTooLarge')
    }
    return
  }

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    previews[assetType as keyof typeof previews] = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Upload file
  await uploadFile(file, assetType)
}

// Upload file to server
async function uploadFile(file: File, assetType: string) {
  uploading.value = true
  uploadStatus.value = { type: 'loading', message: t('admin.branding.uploading') }

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('assetType', assetType)
    formData.append('tenantId', props.tenantId)

    const response = await $fetch('/api/tenant/upload-logo', {
      method: 'POST',
      body: formData
    })

    uploadStatus.value = {
      type: 'success',
      message: t('admin.branding.uploadSuccess')
    }

    emit('uploadComplete', response.asset)

    // Clear status after 3 seconds
    setTimeout(() => {
      uploadStatus.value = null
    }, 3000)
  } catch (error: any) {
    uploadStatus.value = {
      type: 'error',
      message: error.data?.message || t('admin.branding.uploadFailed')
    }
  } finally {
    uploading.value = false
  }
}

// Delete asset
async function deleteAsset(assetType: string) {
  try {
    await $fetch(`/api/tenant/delete-asset`, {
      method: 'DELETE',
      body: {
        tenantId: props.tenantId,
        assetType
      }
    })

    previews[assetType as keyof typeof previews] = ''
    uploadStatus.value = {
      type: 'success',
      message: t('admin.branding.deleteSuccess')
    }
  } catch (error: any) {
    uploadStatus.value = {
      type: 'error',
      message: error.data?.message || t('admin.branding.deleteFailed')
    }
  }
}
</script>

<style scoped lang="scss">
.tenant-logo-upload {
  .upload-section {
    padding: 2rem;
    background: var(--surface-color, #f5f5f5);
    border-radius: 8px;

    h3 {
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      font-weight: 600;
    }
  }

  .upload-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .upload-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-container {
    cursor: pointer;
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 1rem;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    transition: all 0.2s;

    &:hover {
      border-color: var(--primary-color, #007bff);
      background: var(--primary-color, #007bff) / 0.05;
    }
  }

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #999;

    p {
      margin: 0;
      font-size: 0.875rem;
      text-align: center;
    }
  }

  .btn-delete {
    padding: 0.5rem 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;

    &:hover {
      background: #fdd;
      border-color: #f99;
    }
  }

  .upload-status {
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;

    &.loading {
      background: #e3f2fd;
      color: #1976d2;
    }

    &.success {
      background: #e8f5e9;
      color: #388e3c;
    }

    &.error {
      background: #fee;
      color: #c62828;
    }

    p {
      margin: 0;
      font-size: 0.875rem;
    }
  }
}
</style>
