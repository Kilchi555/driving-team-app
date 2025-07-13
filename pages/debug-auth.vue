<!-- pages/debug-auth.vue -->
<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Auth Debug</h1>
    
    <div class="space-y-4">
      <div>
        <h3 class="font-semibold">Auth Store State:</h3>
        <pre class="bg-gray-100 p-4 rounded">{{ authState }}</pre>
      </div>
      
      <div>
        <h3 class="font-semibold">Supabase User:</h3>
        <pre class="bg-gray-100 p-4 rounded">{{ supabaseUser }}</pre>
      </div>
      
      <div>
        <h3 class="font-semibold">Session:</h3>
        <pre class="bg-gray-100 p-4 rounded">{{ session }}</pre>
      </div>
      
      <button 
        @click="testLogin"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Login
      </button>
    </div>
  </div>
</template>

<script setup>
import { getSupabase } from '~/utils/supabase'

const authStore = useAuthStore()
const { user, userRole, loading, errorMessage } = storeToRefs(authStore)
const supabase = getSupabase()

const supabaseUser = ref(null)
const session = ref(null)

const authState = computed(() => ({
  user: user.value,
  userRole: userRole.value,
  loading: loading.value,
  errorMessage: errorMessage.value
}))

const testLogin = async () => {
  console.log('🔄 Testing login...')
  
  const result = await authStore.login(
    'test.zuerich@example.com',
    'Test2025!',
    supabase
  )
  
  console.log('✅ Login result:', result)
}

const checkSession = async () => {
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  session.value = currentSession
  
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  supabaseUser.value = currentUser
}

onMounted(() => {
  checkSession()
})
</script>