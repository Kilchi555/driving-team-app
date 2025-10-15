<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Kurs anmelden</h1>
          <div v-if="course" class="text-gray-600">
            <h2 class="text-xl font-semibold">{{ course.name }}</h2>
            <p v-if="course.description" class="mt-2">{{ course.description }}</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="text-gray-600">Lade Kursinformationen...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="text-red-600 mb-4">{{ error }}</div>
          <button
            @click="goBack"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>

        <!-- Course Full -->
        <div v-else-if="course && isCourseFull" class="text-center py-8">
          <div class="text-red-600 mb-4">
            <h3 class="text-lg font-semibold">Kurs ist ausgebucht</h3>
            <p class="mt-2">Dieser Kurs hat bereits die maximale Anzahl an Teilnehmern erreicht.</p>
          </div>
          <button
            @click="goBack"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>

        <!-- Email Check Form -->
        <div v-else-if="course && !showLoginForm && !showRegistrationForm" class="space-y-6">
          <div class="text-center mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">E-Mail-Adresse eingeben</h3>
            <p class="text-gray-600">Geben Sie Ihre E-Mail-Adresse ein, um fortzufahren</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail-Adresse *</label>
            <input
              v-model="emailCheck.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ihre@email.ch"
            />
          </div>

          <div class="flex space-x-3">
            <button
              type="button"
              @click="goBack"
              class="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              @click="checkEmail"
              :disabled="!emailCheck.email || isCheckingEmail"
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {{ isCheckingEmail ? 'Prüfen...' : 'Weiter' }}
            </button>
          </div>
        </div>

        <!-- Login Form for Existing Users -->
        <form v-else-if="course && showLoginForm" @submit.prevent="loginAndEnroll" class="space-y-6">
          <div class="text-center mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Anmelden</h3>
            <p class="text-gray-600">Sie haben bereits ein Konto. Bitte melden Sie sich an.</p>
            <p class="text-sm text-gray-500 mt-2">E-Mail: {{ emailCheck.email }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Passwort *</label>
            <input
              v-model="loginForm.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ihr Passwort"
            />
          </div>

          <div class="flex space-x-3">
            <button
              type="button"
              @click="goBackToEmailCheck"
              class="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="submit"
              :disabled="!loginForm.password || isSubmitting"
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {{ isSubmitting ? 'Anmelden...' : 'Anmelden & Kursanmeldung' }}
            </button>
          </div>

          <div class="text-center">
            <button
              type="button"
              @click="forgotPassword"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Passwort vergessen?
            </button>
          </div>
        </form>

        <!-- Registration Form for New Users -->
        <form v-else-if="course && showRegistrationForm" @submit.prevent="registerAndEnroll" class="space-y-6">
          <div class="text-center mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Neues Konto erstellen</h3>
            <p class="text-gray-600">Erstellen Sie ein Konto und melden Sie sich für den Kurs an</p>
          </div>

          <!-- Course Details -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Maximale Teilnehmer:</span>
                <span class="ml-2">{{ course.max_participants }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Aktuelle Teilnehmer:</span>
                <span class="ml-2">{{ course.current_participants || 0 }}</span>
              </div>
              <div v-if="course.instructor" class="col-span-2">
                <span class="font-medium text-gray-700">Kursleiter:</span>
                <span class="ml-2">{{ getInstructorName(course) }}</span>
              </div>
              <div v-if="course.next_session" class="col-span-2">
                <span class="font-medium text-gray-700">Nächste Session:</span>
                <span class="ml-2">{{ formatDateTime(course.next_session.start_time) }}</span>
              </div>
            </div>
          </div>

          <!-- Registration Form -->
          <div class="space-y-4">
            <!-- Personal Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
                <input
                  v-model="registrationForm.first_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
                <input
                  v-model="registrationForm.last_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
              <input
                v-model="registrationForm.email"
                type="email"
                required
                readonly
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <!-- Password -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Passwort *</label>
                <input
                  v-model="registrationForm.password"
                  type="password"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Passwort bestätigen *</label>
                <input
                  v-model="registrationForm.confirmPassword"
                  type="password"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Contact Info -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
              <input
                v-model="registrationForm.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+41 79 123 45 67"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Geburtsdatum</label>
              <input
                v-model="registrationForm.birthdate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Address -->
            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Adresse</h4>
              
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                  <input
                    v-model="registrationForm.street"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Musterstrasse"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                  <input
                    v-model="registrationForm.street_nr"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <input
                    v-model="registrationForm.zip"
                    type="text"
                    pattern="[0-9]{4}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8000"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                  <input
                    v-model="registrationForm.city"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zürich"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nachricht (optional)</label>
              <textarea
                v-model="registrationForm.message"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Zusätzliche Informationen oder Fragen..."
              ></textarea>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex space-x-3">
            <button
              type="button"
              @click="goBackToEmailCheck"
              class="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !registrationForm.first_name || !registrationForm.last_name || !registrationForm.password || !registrationForm.confirmPassword"
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {{ isSubmitting ? 'Registrieren...' : 'Registrieren & Anmelden' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

// State
const course = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const isSubmitting = ref(false)
const isCheckingEmail = ref(false)

// Form states
const showLoginForm = ref(false)
const showRegistrationForm = ref(false)

const emailCheck = ref({
  email: ''
})

const loginForm = ref({
  password: ''
})

const registrationForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  message: ''
})

// Computed
const isCourseFull = computed(() => {
  if (!course.value) return false
  return (course.value.current_participants || 0) >= (course.value.max_participants || 0)
})

// Methods
const loadCourse = async () => {
  try {
    const courseId = route.params.id as string
    
    const { data, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        course_category:course_categories(name, icon, color),
        instructor:users!courses_instructor_id_fkey(first_name, last_name),
        next_session:course_sessions(start_time),
        registrations:course_registrations(status)
      `)
      .eq('id', courseId)
      .eq('status', 'active')
      .single()

    if (courseError) throw courseError

    // Calculate current participants
    const confirmedRegistrations = course.value?.registrations?.filter((r: any) => r.status === 'confirmed') || []
    course.value = {
      ...course.value,
      current_participants: confirmedRegistrations.length
    }

    course.value = data
  } catch (err: any) {
    console.error('Error loading course:', err)
    error.value = 'Kurs nicht gefunden oder nicht verfügbar'
  } finally {
    isLoading.value = false
  }
}

const checkEmail = async () => {
  try {
    isCheckingEmail.value = true

    // Check if user exists
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', emailCheck.value.email)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (existingUser) {
      // User exists - show login form
      showLoginForm.value = true
      registrationForm.value.email = emailCheck.value.email
    } else {
      // User doesn't exist - show registration form
      showRegistrationForm.value = true
      registrationForm.value.email = emailCheck.value.email
    }
  } catch (err: any) {
    console.error('Error checking email:', err)
    alert('Fehler beim Prüfen der E-Mail-Adresse. Bitte versuchen Sie es erneut.')
  } finally {
    isCheckingEmail.value = false
  }
}

const loginAndEnroll = async () => {
  try {
    isSubmitting.value = true

    // Sign in user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailCheck.value.email,
      password: loginForm.value.password
    })

    if (authError) throw authError

    // Create enrollment
    await createEnrollment()

    alert('Anmeldung erfolgreich! Sie erhalten eine Bestätigungs-E-Mail.')
    goBack()
  } catch (err: any) {
    console.error('Error logging in and enrolling:', err)
    alert('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.')
  } finally {
    isSubmitting.value = false
  }
}

const registerAndEnroll = async () => {
  try {
    isSubmitting.value = true

    // Validate password confirmation
    if (registrationForm.value.password !== registrationForm.value.confirmPassword) {
      alert('Passwörter stimmen nicht überein.')
      return
    }

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registrationForm.value.email,
      password: registrationForm.value.password,
      options: {
        data: {
          first_name: registrationForm.value.first_name,
          last_name: registrationForm.value.last_name,
          phone: registrationForm.value.phone,
          birthdate: registrationForm.value.birthdate,
          street: registrationForm.value.street,
          street_nr: registrationForm.value.street_nr,
          zip: registrationForm.value.zip,
          city: registrationForm.value.city
        }
      }
    })

    if (authError) throw authError

    // Wait a moment for user creation
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create enrollment
    await createEnrollment()

    alert('Registrierung und Kursanmeldung erfolgreich! Sie erhalten eine Bestätigungs-E-Mail.')
    goBack()
  } catch (err: any) {
    console.error('Error registering and enrolling:', err)
    alert('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.')
  } finally {
    isSubmitting.value = false
  }
}

const createEnrollment = async () => {
  const { data, error } = await $fetch('/api/courses/enroll', {
    method: 'POST',
    body: {
      courseId: course.value.id,
      participant: {
        first_name: registrationForm.value.first_name,
        last_name: registrationForm.value.last_name,
        email: registrationForm.value.email,
        phone: registrationForm.value.phone,
        birthdate: registrationForm.value.birthdate,
        street: registrationForm.value.street,
        street_nr: registrationForm.value.street_nr,
        zip: registrationForm.value.zip,
        city: registrationForm.value.city,
        message: registrationForm.value.message
      }
    }
  })

  if (error) throw new Error(error)
  return data
}

const goBackToEmailCheck = () => {
  showLoginForm.value = false
  showRegistrationForm.value = false
  loginForm.value.password = ''
  registrationForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: '',
    message: ''
  }
}

const forgotPassword = async () => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(emailCheck.value.email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) throw error
    
    alert('Passwort-Reset E-Mail wurde gesendet!')
  } catch (err: any) {
    console.error('Error sending password reset:', err)
    alert('Fehler beim Senden der Passwort-Reset E-Mail.')
  }
}

const getInstructorName = (course: any) => {
  if (course.external_instructor_name) {
    return course.external_instructor_name
  }
  if (course.instructor) {
    return `${course.instructor.first_name} ${course.instructor.last_name}`
  }
  return 'Nicht zugewiesen'
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  loadCourse()
})
</script>

<style scoped>
/* Additional styling if needed */
</style>
