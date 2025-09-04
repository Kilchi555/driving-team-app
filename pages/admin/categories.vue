<template>
  <div class="bg-gray-50">
    <!-- Page Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Kategorien verwalten</h1>
          </div>
          <button
            @click="openCreateModal"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Neue Kategorie
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <LoadingLogo size="lg" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Kategorien</h3>
            <p class="mt-2 text-sm text-red-700">{{ error }}</p>
            <button
              @click="loadCategories"
              class="mt-3 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>

      <!-- Categories List -->
      <div v-else class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lektionsdauern (Min)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prüfungsdauer (Min)
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farbe
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="category in categories" :key="category.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {{ category.code }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ category.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="(duration, index) in category.lesson_duration_minutes"
                        :key="index"
                        class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                      >
                        {{ duration }} Min
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ category.exam_duration_minutes }} Min
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div
                        class="w-6 h-6 rounded border border-gray-300"
                        :style="{ backgroundColor: category.color }"
                      ></div>
                      <span class="ml-2 text-sm text-gray-500">{{ category.color }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      ]"
                    >
                      {{ category.is_active ? 'Aktiv' : 'Inaktiv' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center space-x-2">
                      <button
                        @click="openEditModal(category)"
                        class="text-blue-600 hover:text-blue-900"
                      >
                        Bearbeiten
                      </button>
                      <button
                        @click="toggleCategoryStatus(category)"
                        :class="[
                          'px-2 py-1 rounded text-xs',
                          category.is_active
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        ]"
                      >
                        {{ category.is_active ? 'Deaktivieren' : 'Aktivieren' }}
                      </button>
                      <button
                        @click="deleteCategory(category)"
                        class="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-if="categories.length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Kategorien</h3>
            <p class="mt-1 text-sm text-gray-500">Erstellen Sie Ihre erste Kategorie.</p>
            <div class="mt-6">
              <button
                @click="openCreateModal"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Neue Kategorie erstellen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div class="bg-blue-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">
              {{ editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie' }}
            </h3>
            <button @click="closeModal" class="text-white hover:text-blue-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="p-6">
          <form @submit.prevent="saveCategory" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Code
              </label>
              <input
                v-model="categoryForm.code"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. A, B, C..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                v-model="categoryForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. Kategorie A, Kategorie B..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                v-model="categoryForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Beschreibung der Kategorie..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Farbe
              </label>
              <input
                v-model="categoryForm.color"
                type="color"
                class="w-full h-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Lektionsdauern (Minuten)
              </label>
              <div class="space-y-2">
                <div v-for="(duration, index) in categoryForm.lesson_duration_minutes" :key="index" class="flex space-x-2">
                  <input
                    v-model="categoryForm.lesson_duration_minutes[index]"
                    type="number"
                    min="15"
                    max="180"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    @click="removeLessonDuration(index)"
                    class="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Entfernen
                  </button>
                </div>
                <button
                  type="button"
                  @click="addLessonDuration"
                  class="w-full px-3 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  + Lektionsdauer hinzufügen
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Prüfungsdauer (Minuten)
              </label>
              <input
                v-model="categoryForm.exam_duration_minutes"
                type="number"
                min="15"
                max="180"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. 45"
              />
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {{ editingCategory ? 'Aktualisieren' : 'Hinzufügen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import LoadingLogo from '~/components/LoadingLogo.vue'

// Use admin layout
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

// Types
interface Category {
  id: number
  code: string
  name: string
  description?: string
  color: string
  is_active: boolean
  lesson_duration_minutes: number[]
  exam_duration_minutes: number
  created_at: string
  updated_at?: string
}

// State
const categories = ref<Category[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showModal = ref(false)
const editingCategory = ref<Category | null>(null)

// Form state
const categoryForm = ref({
  code: '',
  name: '',
  description: '',
  color: '#3B82F6',
  lesson_duration_minutes: [45],
  exam_duration_minutes: 45
})

// Methods
const loadCategories = async () => {
  isLoading.value = true
  error.value = null

  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .order('code', { ascending: true })

    if (fetchError) throw fetchError

    categories.value = data || []
    console.log('✅ Categories loaded:', categories.value.length)
  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    error.value = err.message || 'Fehler beim Laden der Kategorien'
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  editingCategory.value = null
  showModal.value = true
}

const openEditModal = (category: Category) => {
  editingCategory.value = { ...category }
  categoryForm.value = {
    code: category.code,
    name: category.name,
    description: category.description || '',
    color: category.color,
    lesson_duration_minutes: [...category.lesson_duration_minutes],
    exam_duration_minutes: category.exam_duration_minutes
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingCategory.value = null
  categoryForm.value = {
    code: '',
    name: '',
    description: '',
    color: '#3B82F6',
    lesson_duration_minutes: [45],
    exam_duration_minutes: 45
  }
}

const onCategorySaved = async () => {
  closeModal()
  await loadCategories()
}

const saveCategory = async () => {
  try {
    const supabase = getSupabase()
    
    if (editingCategory.value) {
      // Update
      const { error: updateError } = await supabase
        .from('categories')
        .update(categoryForm.value)
        .eq('id', editingCategory.value.id)
      
      if (updateError) throw updateError
      console.log('✅ Category updated:', categoryForm.value.code)
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('categories')
        .insert(categoryForm.value)
      
      if (insertError) throw insertError
      console.log('✅ Category created:', categoryForm.value.code)
    }
    
    await loadCategories()
    closeModal()
  } catch (err: any) {
    console.error('❌ Error saving category:', err)
    alert(`Fehler beim Speichern: ${err.message}`)
  }
}

const addLessonDuration = () => {
  categoryForm.value.lesson_duration_minutes.push(45)
}

const removeLessonDuration = (index: number) => {
  if (categoryForm.value.lesson_duration_minutes.length > 1) {
    categoryForm.value.lesson_duration_minutes.splice(index, 1)
  }
}

const toggleCategoryStatus = async (category: Category) => {
  try {
    const supabase = getSupabase()
    const { error: updateError } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id)

    if (updateError) throw updateError

    // Update local state
    category.is_active = !category.is_active
    console.log('✅ Category status toggled:', category.code, category.is_active)
  } catch (err: any) {
    console.error('❌ Error toggling category status:', err)
    alert(`Fehler beim Ändern des Status: ${err.message}`)
  }
}

const deleteCategory = async (category: Category) => {
  if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
    return
  }

  try {
    const supabase = getSupabase()
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)

    if (deleteError) throw deleteError

    // Remove from local state
    categories.value = categories.value.filter(c => c.id !== category.id)
    console.log('✅ Category deleted:', category.code)
  } catch (err: any) {
    console.error('❌ Error deleting category:', err)
    alert(`Fehler beim Löschen der Kategorie: ${err.message}`)
  }
}

// Lifecycle
onMounted(() => {
  loadCategories()
})
</script>
