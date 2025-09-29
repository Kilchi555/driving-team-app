<!-- components/ProfileSetup.vue -->
<template>
  <div class="profile-setup">
    <div class="setup-container">
      <h2>Profil vervollständigen</h2>
      <p>Hallo {{ userEmail }}! Bitte vervollständige dein Profil:</p>
      
      <form @submit.prevent="createProfile" class="setup-form">
        <div class="form-group">
          <label for="companyName">Firmenname:</label>
          <input 
            id="companyName"
            v-model="profileData.company_name" 
            type="text"
            required 
            placeholder="Deine Firma"
          />
        </div>
        
        <div class="form-group">
          <label for="role">Rolle:</label>
          <select id="role" v-model="profileData.role" required>
            <option value="client">Kunde</option>
          </select>
          <p class="role-info">
            Neue Benutzer werden automatisch als Kunde registriert. 
            Für Staff- oder Admin-Zugriff wenden Sie sich an den Administrator.
          </p>
        </div>
        
        <button type="submit" :disabled="isLoading" class="submit-btn">
          {{ isLoading ? 'Erstelle Profil...' : 'Profil erstellen' }}
        </button>
      </form>
      
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { getSupabase } from '~/utils/supabase'

const emit = defineEmits(['profile-created'])

const { createUserProfile, isLoading, userError } = useCurrentUser()

const profileData = ref({
  company_name: '',
  role: 'client'
})

const error = ref('')
const userEmail = ref('')

onMounted(async () => {
  const supabase = getSupabase()
  const { data: authData } = await supabase.auth.getUser()
  userEmail.value = authData?.user?.email || ''
})

async function createProfile() {
  error.value = ''
  
  try {
    await createUserProfile(profileData.value)
    emit('profile-created')
  } catch (err) {
    error.value = userError.value || 'Fehler beim Erstellen des Profils'
  }
}
</script>

<style scoped>
.profile-setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f5f5f5;
}

.setup-container {
  max-width: 400px;
  width: 100%;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.setup-container h2 {
  margin-bottom: 10px;
  color: #333;
}

.setup-container p {
  margin-bottom: 25px;
  color: #666;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.submit-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}

.role-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}
</style>