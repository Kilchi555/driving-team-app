<!-- pages/debug-login.vue -->
<template>
  <div class="min-h-screen bg-white py-12 px-4">
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 border-4 border-black">
      <h1 class="text-4xl font-bold mb-8 text-center text-black">🔐 Login Debug</h1>
      
      <!-- Login Form -->
      <div class="space-y-6 mb-8">
        <div>
          <label class="block text-2xl font-bold text-black mb-2">Email:</label>
          <input 
            v-model="email"
            type="email" 
            class="block w-full border-4 border-black rounded-md px-4 py-4 text-2xl text-black bg-white"
            placeholder="test.zuerich@example.com"
          />
        </div>
        
        <div>
          <label class="block text-2xl font-bold text-black mb-2">Password:</label>
          <input 
            v-model="password"
            type="password" 
            class="block w-full border-4 border-black rounded-md px-4 py-4 text-2xl text-black bg-white"
            placeholder="123456"
          />
        </div>
        
        <div class="grid grid-cols-1 gap-4">
          <button 
            @click="testLogin"
            :disabled="isLoading"
            class="bg-black text-white py-4 px-8 rounded-md hover:bg-gray-800 disabled:opacity-50 text-2xl font-bold"
          >
            {{ isLoading ? 'Testing...' : 'TEST LOGIN' }}
          </button>
          
          <button 
            @click="testSupabaseDirectly"
            class="bg-blue-600 text-white py-4 px-8 rounded-md hover:bg-blue-700 text-2xl font-bold"
          >
            TEST SUPABASE DIRECTLY
          </button>
        </div>
      </div>

      <!-- Results -->
      <div v-if="result" class="mb-8 p-8 rounded-lg border-4" :class="result.success ? 'bg-green-200 border-green-600' : 'bg-red-200 border-red-600'">
        <h3 class="text-3xl font-bold mb-4" :class="result.success ? 'text-green-800' : 'text-red-800'">
          {{ result.success ? '✅ LOGIN SUCCESS!' : '❌ LOGIN FAILED' }}
        </h3>
        <div class="bg-white p-6 rounded border-4 border-black">
          <pre class="text-xl text-black overflow-auto whitespace-pre-wrap">{{ JSON.stringify(result, null, 2) }}</pre>
        </div>
      </div>

      <!-- Auth Store Status -->
      <div class="mb-8 p-8 bg-yellow-200 rounded-lg border-4 border-black">
        <h3 class="text-3xl font-bold text-black mb-4">Auth Store Status:</h3>
        <div class="text-2xl space-y-3 text-black">
          <div><strong>User:</strong> {{ authStore.user?.email || 'NONE' }}</div>
          <div><strong>Role:</strong> {{ authStore.userRole || 'NONE' }}</div>
          <div><strong>Loading:</strong> {{ authStore.loading }}</div>
          <div><strong>Error:</strong> {{ authStore.errorMessage || 'NONE' }}</div>
        </div>
      </div>

      <!-- Session Info -->
      <div v-if="sessionInfo" class="mb-8 p-8 bg-blue-200 rounded-lg border-4 border-black">
        <h3 class="text-3xl font-bold mb-4 text-black">Session Info:</h3>
        <div class="bg-white p-6 rounded border-4 border-black">
          <pre class="text-xl text-black overflow-auto whitespace-pre-wrap">{{ JSON.stringify(sessionInfo, null, 2) }}</pre>
        </div>
      </div>

      <!-- Instructions -->
      <div class="p-8 bg-gray-200 rounded-lg border-4 border-black">
        <h3 class="text-3xl font-bold mb-4 text-black">📝 Instructions:</h3>
        <div class="text-2xl text-black space-y-3">
          <div>• Press F12 to open Browser Console for detailed logs</div>
          <div>• Try different passwords if login fails</div>
          <div>• Check the exact error message in results</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getSupabase } from '~/utils/supabase'

// State
const email = ref('test.zuerich@example.com')
const password = ref('123456')
const isLoading = ref(false)
const result = ref(null)
const sessionInfo = ref(null)

// Auth Store
const authStore = useAuthStore()

// Methods
const testLogin = async () => {
  isLoading.value = true
  result.value = null
  
  try {
    console.log('🔄 Testing login with auth store...')
    console.log('📧 Email:', email.value)
    console.log('🔑 Password:', password.value)
    
    const supabase = getSupabase()
    const success = await authStore.login(email.value, password.value, supabase)
    
    // Convert reactive objects to plain objects for display
    const plainResult = {
      success,
      method: 'AuthStore',
      user: authStore.user ? {
        id: authStore.user.id,
        email: authStore.user.email,
        email_confirmed_at: authStore.user.email_confirmed_at
      } : null,
      role: authStore.userRole,
      error: authStore.errorMessage,
      loading: authStore.loading
    }
    
    result.value = plainResult
    
    console.log('✅ Auth store result:', plainResult)
    console.log('🔍 Raw user object:', authStore.user)
    console.log('🔍 Raw error:', authStore.errorMessage)
    
  } catch (error) {
    console.error('❌ Login test failed:', error)
    result.value = {
      success: false,
      method: 'AuthStore',
      error: error.message,
      stack: error.stack
    }
  } finally {
    isLoading.value = false
  }
}

const testSupabaseDirectly = async () => {
  try {
    console.log('🔄 Testing Supabase directly...')
    
    const supabase = getSupabase()
    
    // Test login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    console.log('🔐 Direct login result:', { data, error })
    
    sessionInfo.value = {
      loginData: data,
      loginError: error,
      timestamp: new Date().toISOString()
    }
    
    if (error) {
      result.value = {
        success: false,
        method: 'Direct Supabase',
        error: error.message,
        errorCode: error.code,
        errorStatus: error.status
      }
    } else {
      result.value = {
        success: true,
        method: 'Direct Supabase',
        user: data.user,
        session: data.session
      }
    }
    
  } catch (error) {
    console.error('❌ Direct Supabase test failed:', error)
    result.value = {
      success: false,
      method: 'Direct Supabase',
      error: error.message
    }
  }
}
</script>