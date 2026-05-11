<template>
  <div class="p-6 max-w-6xl mx-auto">

    <!-- Header -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">📦 Lektionenpakete</h1>
        <p class="text-gray-500 mt-1">5er, 10er und Bundle-Pakete verwalten und Kunden zuweisen</p>
      </div>
      <button @click="openCreateModal" class="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
        + Neues Paket
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="['px-5 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900']">
        {{ tab.label }}
      </button>
    </div>

    <!-- ===== TAB: PAKETE ===== -->
    <div v-if="activeTab === 'packages'">
      <div v-if="isLoading" class="text-center py-12 text-gray-500">Pakete werden geladen...</div>
      <div v-else-if="packages.length === 0" class="text-center py-16 bg-white rounded-xl border border-dashed">
        <p class="text-4xl mb-3">📦</p>
        <p class="font-medium text-gray-700">Noch keine Pakete definiert</p>
        <p class="text-sm text-gray-500 mt-1">Klick auf „Neues Paket" um zu starten</p>
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="pkg in packages" :key="pkg.id"
          class="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <!-- Color bar -->
          <div class="h-1.5" :style="{ backgroundColor: pkg.color || '#3B82F6' }"></div>
          <div class="p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-semibold text-gray-900">{{ pkg.name }}</h3>
                <p v-if="pkg.description" class="text-sm text-gray-500 mt-0.5 line-clamp-2">{{ pkg.description }}</p>
              </div>
              <span :class="['text-xs px-2 py-1 rounded-full font-medium', pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500']">
                {{ pkg.is_active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Lektionen</span>
                <span class="font-medium">{{ pkg.lessons_count > 0 ? `${pkg.lessons_count}×` : '—' }}</span>
              </div>
              <div v-if="pkg.category_code" class="flex justify-between">
                <span class="text-gray-500">Kategorie</span>
                <span class="font-medium">Kat. {{ pkg.category_code }}</span>
              </div>
              <div v-if="pkg.includes_course" class="flex justify-between">
                <span class="text-gray-500">Inkl. Kurs</span>
                <span class="font-medium text-blue-700">{{ pkg.course_category || 'VKU' }}</span>
              </div>
              <div class="flex justify-between border-t pt-2 mt-2">
                <span class="text-gray-500">Preis</span>
                <div class="text-right">
                  <span class="font-bold text-gray-900">CHF {{ (pkg.price_rappen / 100).toFixed(2) }}</span>
                  <span v-if="pkg.regular_price_rappen" class="text-xs text-gray-400 line-through ml-2">
                    CHF {{ (pkg.regular_price_rappen / 100).toFixed(2) }}
                  </span>
                </div>
              </div>
              <div v-if="pkg.regular_price_rappen && pkg.regular_price_rappen > pkg.price_rappen"
                class="flex justify-between text-green-700">
                <span>Ersparnis</span>
                <span class="font-semibold">CHF {{ ((pkg.regular_price_rappen - pkg.price_rappen) / 100).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 mt-4">
              <button @click="openEditModal(pkg)"
                class="flex-1 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                Bearbeiten
              </button>
              <button @click="assignPackage(pkg)"
                class="flex-1 py-1.5 text-sm text-white rounded-lg transition-colors"
                :style="{ backgroundColor: pkg.color || '#3B82F6' }">
                Zuweisen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== TAB: ZUWEISUNGEN ===== -->
    <div v-if="activeTab === 'assignments'">
      <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div class="p-4 border-b flex items-center justify-between gap-4">
          <input v-model="assignmentSearch" type="text" placeholder="Suche nach Kunde..."
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span class="text-sm text-gray-500">{{ filteredAssignments.length }} Einträge</span>
        </div>

        <div v-if="isLoadingAssignments" class="text-center py-12 text-gray-500">Lade...</div>
        <div v-else-if="filteredAssignments.length === 0" class="text-center py-12 text-gray-400">
          Keine Zuweisungen gefunden
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Kunde</th>
              <th class="px-4 py-3 text-left">Paket</th>
              <th class="px-4 py-3 text-center">Lektionen</th>
              <th class="px-4 py-3 text-left">Gültig bis</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="cp in filteredAssignments" :key="cp.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ cp.users?.first_name }} {{ cp.users?.last_name }}</div>
                <div class="text-xs text-gray-400">{{ cp.users?.email }}</div>
              </td>
              <td class="px-4 py-3 text-gray-700">{{ cp.lesson_packages?.name }}</td>
              <td class="px-4 py-3 text-center">
                <div class="inline-flex items-center gap-1">
                  <span :class="['font-bold', remainingLessons(cp) > 0 ? 'text-green-700' : 'text-gray-400']">
                    {{ remainingLessons(cp) }}
                  </span>
                  <span class="text-gray-400">/ {{ cp.lessons_total }}</span>
                </div>
                <!-- Progress bar -->
                <div class="w-16 h-1.5 bg-gray-200 rounded-full mt-1 mx-auto">
                  <div class="h-1.5 bg-green-500 rounded-full" :style="{ width: `${Math.round(remainingLessons(cp) / cp.lessons_total * 100)}%` }"></div>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">
                {{ cp.expires_at ? new Date(cp.expires_at).toLocaleDateString('de-CH') : '—' }}
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium',
                  !cp.is_active ? 'bg-gray-100 text-gray-500' :
                  remainingLessons(cp) <= 0 ? 'bg-orange-100 text-orange-700' :
                  isExpired(cp) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700']">
                  {{ !cp.is_active ? 'Deaktiviert' : remainingLessons(cp) <= 0 ? 'Aufgebraucht' : isExpired(cp) ? 'Abgelaufen' : 'Aktiv' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button @click="toggleAssignment(cp)"
                  :class="['text-xs px-2 py-1 rounded transition-colors', cp.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800']">
                  {{ cp.is_active ? 'Sperren' : 'Aktivieren' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== MODAL: CREATE / EDIT PACKAGE ===== -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ editingPackage ? 'Paket bearbeiten' : 'Neues Paket' }}</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input v-model="form.name" type="text" placeholder="z.B. 10er Paket Kat. B"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea v-model="form.description" rows="2" placeholder="Kurze Beschreibung für Kunden..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Anzahl Lektionen *</label>
              <input v-model.number="form.lessons_count" type="number" min="0" placeholder="10"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p class="text-xs text-gray-400 mt-0.5">0 = nur Kurs, keine Fahrstunden</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie (optional)</label>
              <select v-model="form.category_code" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Alle</option>
                <option value="A">A – Motorrad</option>
                <option value="B">B – Auto</option>
                <option value="BE">BE – Auto + Anhänger</option>
                <option value="C">C – LKW</option>
              </select>
            </div>
          </div>

          <!-- Course bundle -->
          <div class="p-3 bg-blue-50 rounded-lg space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="form.includes_course" type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span class="text-sm font-medium text-gray-800">Inkl. Kurs (z.B. VKU)</span>
            </label>
            <div v-if="form.includes_course">
              <label class="block text-xs text-gray-600 mb-1">Kurs-Kategorie / Bezeichnung</label>
              <input v-model="form.course_category" type="text" placeholder="VKU"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Preis (CHF) *</label>
              <input v-model.number="form.price_chf" type="number" min="0" step="0.05" placeholder="850.00"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Normalpreis (CHF)</label>
              <input v-model.number="form.regular_price_chf" type="number" min="0" step="0.05" placeholder="950.00"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p class="text-xs text-gray-400 mt-0.5">Für Ersparnis-Anzeige</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gültigkeit (Tage)</label>
              <input v-model.number="form.valid_days" type="number" min="30" placeholder="365"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
              <input v-model="form.color" type="color"
                class="w-full h-10 border border-gray-300 rounded-lg px-1 py-1 cursor-pointer" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <input v-model="form.is_active" type="checkbox" id="pkg_active"
              class="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label for="pkg_active" class="text-sm font-medium text-gray-700">Paket ist aktiv</label>
          </div>
        </div>
        <div class="border-t px-6 py-4 flex gap-3 justify-end">
          <button @click="closeModal" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="savePackage" :disabled="!isFormValid || isSaving"
            class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {{ isSaving ? 'Speichern...' : editingPackage ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== MODAL: ASSIGN PACKAGE ===== -->
    <div v-if="showAssignModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="border-b px-6 py-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">Paket zuweisen: {{ assigningPackage?.name }}</h3>
          <button @click="showAssignModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Schüler *</label>
            <input v-model="assignSearch" type="text" placeholder="Name oder E-Mail eingeben..."
              @input="searchStudents"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div v-if="studentResults.length > 0" class="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button v-for="s in studentResults" :key="s.id" @click="selectStudent(s)"
                class="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0 transition-colors">
                <span class="font-medium">{{ s.first_name }} {{ s.last_name }}</span>
                <span class="text-gray-400 ml-2">{{ s.email }}</span>
              </button>
            </div>
            <div v-if="selectedStudent" class="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ {{ selectedStudent.first_name }} {{ selectedStudent.last_name }} ({{ selectedStudent.email }})
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ablaufdatum (optional)</label>
            <input v-model="assignExpiry" type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p class="text-xs text-gray-400 mt-0.5">Standard: {{ assigningPackage?.valid_days || 365 }} Tage ab heute</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notiz (optional)</label>
            <input v-model="assignNotes" type="text" placeholder="z.B. Barzahlung erhalten"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div class="border-t px-6 py-4 flex gap-3 justify-end">
          <button @click="showAssignModal = false" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="confirmAssign" :disabled="!selectedStudent || isAssigning"
            class="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {{ isAssigning ? 'Wird zugewiesen...' : 'Zuweisen' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })

const authStore = useAuthStore()

const tabs = [
  { id: 'packages', label: '📦 Pakete' },
  { id: 'assignments', label: '👤 Zuweisungen' }
]
const activeTab = ref('packages')

// Packages list
const packages = ref<any[]>([])
const isLoading = ref(true)

// Assignments list
const customerAssignments = ref<any[]>([])
const isLoadingAssignments = ref(false)
const assignmentSearch = ref('')

const filteredAssignments = computed(() => {
  if (!assignmentSearch.value) return customerAssignments.value
  const q = assignmentSearch.value.toLowerCase()
  return customerAssignments.value.filter((cp: any) => {
    const name = `${cp.users?.first_name} ${cp.users?.last_name} ${cp.users?.email}`.toLowerCase()
    return name.includes(q)
  })
})

// Package form modal
const showModal = ref(false)
const editingPackage = ref<any>(null)
const isSaving = ref(false)
const form = ref(defaultForm())

function defaultForm() {
  return {
    name: '',
    description: '',
    lessons_count: 10,
    category_code: '',
    includes_course: false,
    course_category: '',
    price_chf: 0,
    regular_price_chf: 0,
    valid_days: 365,
    color: '#3B82F6',
    is_active: true
  }
}

const isFormValid = computed(() => form.value.name && form.value.lessons_count >= 0 && form.value.price_chf > 0)

// Assign modal
const showAssignModal = ref(false)
const assigningPackage = ref<any>(null)
const assignSearch = ref('')
const assignNotes = ref('')
const assignExpiry = ref('')
const selectedStudent = ref<any>(null)
const studentResults = ref<any[]>([])
const isAssigning = ref(false)
let searchDebounce: any = null

// Load data
const loadPackages = async () => {
  isLoading.value = true
  try {
    const res = await $fetch('/api/admin/packages') as any
    packages.value = res.packages || []
  } finally {
    isLoading.value = false
  }
}

const loadAssignments = async () => {
  isLoadingAssignments.value = true
  try {
    const res = await $fetch('/api/admin/customer-packages') as any
    customerAssignments.value = res.customerPackages || []
  } finally {
    isLoadingAssignments.value = false
  }
}

onMounted(async () => {
  await loadPackages()
  await loadAssignments()
})

// Package helpers
const remainingLessons = (cp: any) => Math.max(0, cp.lessons_total - cp.lessons_used)
const isExpired = (cp: any) => cp.expires_at && new Date(cp.expires_at) < new Date()

// Package modal
const openCreateModal = () => {
  editingPackage.value = null
  form.value = defaultForm()
  showModal.value = true
}

const openEditModal = (pkg: any) => {
  editingPackage.value = pkg
  form.value = {
    name: pkg.name,
    description: pkg.description || '',
    lessons_count: pkg.lessons_count,
    category_code: pkg.category_code || '',
    includes_course: pkg.includes_course,
    course_category: pkg.course_category || '',
    price_chf: pkg.price_rappen / 100,
    regular_price_chf: pkg.regular_price_rappen ? pkg.regular_price_rappen / 100 : 0,
    valid_days: pkg.valid_days,
    color: pkg.color || '#3B82F6',
    is_active: pkg.is_active
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPackage.value = null
}

const savePackage = async () => {
  if (!isFormValid.value) return
  isSaving.value = true
  try {
    const payload: any = {
      name: form.value.name,
      description: form.value.description || null,
      lessons_count: form.value.lessons_count,
      category_code: form.value.category_code || null,
      includes_course: form.value.includes_course,
      course_category: form.value.includes_course ? form.value.course_category || null : null,
      price_rappen: Math.round(form.value.price_chf * 100),
      regular_price_rappen: form.value.regular_price_chf > 0 ? Math.round(form.value.regular_price_chf * 100) : null,
      valid_days: form.value.valid_days,
      color: form.value.color,
      is_active: form.value.is_active
    }
    if (editingPackage.value) {
      payload.id = editingPackage.value.id
      payload.action = 'update'
    }
    await $fetch('/api/admin/packages', { method: 'POST', body: payload })
    await loadPackages()
    closeModal()
  } finally {
    isSaving.value = false
  }
}

// Assign package to customer
const assignPackage = (pkg: any) => {
  assigningPackage.value = pkg
  selectedStudent.value = null
  assignSearch.value = ''
  assignNotes.value = ''
  assignExpiry.value = ''
  studentResults.value = []
  showAssignModal.value = true
}

const searchStudents = () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(async () => {
    const q = assignSearch.value.trim()
    if (q.length < 2) { studentResults.value = []; return }
    const supabase = getSupabase()
    const user = authStore.user
    if (!user) return
    const { data: userData } = await supabase.from('users').select('tenant_id').eq('auth_user_id', user.id).single()
    if (!userData) return
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('tenant_id', userData.tenant_id)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8)
    studentResults.value = data || []
  }, 300)
}

const selectStudent = (student: any) => {
  selectedStudent.value = student
  assignSearch.value = `${student.first_name} ${student.last_name}`
  studentResults.value = []
}

const confirmAssign = async () => {
  if (!selectedStudent.value || !assigningPackage.value) return
  isAssigning.value = true
  try {
    await $fetch('/api/admin/customer-packages', {
      method: 'POST',
      body: {
        userId: selectedStudent.value.id,
        packageId: assigningPackage.value.id,
        notes: assignNotes.value || null,
        expiresAt: assignExpiry.value || null
      }
    })
    await loadAssignments()
    showAssignModal.value = false
    activeTab.value = 'assignments'
  } finally {
    isAssigning.value = false
  }
}

const toggleAssignment = async (cp: any) => {
  await $fetch('/api/admin/customer-packages', { method: 'POST', body: { action: 'revoke', id: cp.id } })
  await loadAssignments()
}
</script>
