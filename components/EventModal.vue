<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import CustomersPage from '@/pages/customers.vue'; 

interface UserProfile {
  id: string; 
  created_at: string; 
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birthdate: string | null;
  street: string | null;
  street_nr: string | null;
  zip: string | null;
  city: string | null;
  is_active: boolean;
  assigned_staff: string | null;
  category: string | null;
}

const props = defineProps<{
  isVisible: boolean
  eventData?: any
  mode: 'view' | 'edit' | 'create'
}>()

const emit = defineEmits(['close', 'save-event', 'delete-event'])

const localEventData = ref<any>({
  title: '',
  start: '',
  end: '',
  extendedProps: {
    location: '',
    staff_note: '',
    client_note: ''
  },
  allDay: false // Standardwert hinzufügen
})
const isEditing = ref(false)

watch(() => [props.eventData, props.mode], ([newEventData, newMode]) => {
  if (newEventData) {
    const defaultExtendedProps = { location: '', staff_note: '', client_note: '' };
    localEventData.value = {
      ...JSON.parse(JSON.stringify(newEventData)),
      extendedProps: {
        ...defaultExtendedProps,
        ...(newEventData.extendedProps || {})
      }
    };
  } else {
    localEventData.value = {
      title: '',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      extendedProps: {
        location: '',
        staff_note: '',
        client_note: ''
      },
      allDay: false
    };
  }
  isEditing.value = newMode === 'edit' || newMode === 'create';
}, { immediate: true, deep: true });

const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Neuer Termin'
  if (props.mode === 'edit') return 'Termin bearbeiten'
  return 'Termin Details'
})

const save = () => {
  emit('save-event', localEventData.value)
}

const deleteEv = () => {
  if (confirm('Sind Sie sicher, dass Sie diesen Termin löschen möchten?')) {
    emit('delete-event', localEventData.value)
  }
}

const closeModal = () => {
  emit('close')
}

const formatDateTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toISOString = (dateTimeLocal: string): string => {
  if (!dateTimeLocal) return '';
  return new Date(dateTimeLocal).toISOString();
};
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <h2 class="text-xl font-bold mb-4">{{ modalTitle }}</h2>

      <form @submit.prevent="save">
        <div class="mb-3">
          <label for="event-title" class="block text-sm font-medium text-gray-700">Titel:</label>
          <input type="text" id="event-title" v-model="localEventData.title"
                 :readonly="!isEditing"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
        </div>

        <div class="mb-3">
          <label for="event-customer" class="block text-sm font-medium text-gray-700">Zugewiesener Kunde:</label>
          <div class="flex items-center gap-2">
            <input type="text" id="event-customer"
                   :value="getSelectedCustomerName"
                   readonly
                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 cursor-pointer"
                   @click="isEditing && openCustomerSelector()"
            >
            <button v-if="isEditing" type="button" @click="openCustomerSelector"
                    class="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">
              Auswählen
            </button>
            <button v-if="isEditing && selectedCustomer" type="button" @click="selectedCustomer = null; localEventData.extendedProps.client_id = null; localEventData.extendedProps.client_name = null;"
                    class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">
              X
            </button>
          </div>
        </div>
        <div class="mb-3">
          <label for="event-start" class="block text-sm font-medium text-gray-700">Start:</label>
          <input type="datetime-local" id="event-start"
                 :value="formatDateTime(localEventData.start)"
                 @input="localEventData.start = toISOString(($event.target as HTMLInputElement).value)"
                 :readonly="!isEditing"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
        </div>

        <div class="mb-3">
          <label for="event-end" class="block text-sm font-medium text-gray-700">Ende:</label>
          <input type="datetime-local" id="event-end"
                 :value="formatDateTime(localEventData.end)"
                 @input="localEventData.end = toISOString(($event.target as HTMLInputElement).value)"
                 :readonly="!isEditing"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
        </div>

        <div class="mb-3">
          <label for="event-all-day" class="block text-sm font-medium text-gray-700">Ganztägig:</label>
          <input type="checkbox" id="event-all-day" v-model="localEventData.allDay"
                 :disabled="!isEditing"
                 class="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
        </div>

        <div class="mb-3">
          <label for="event-location" class="block text-sm font-medium text-gray-700">Ort:</label>
          <input type="text" id="event-location" v-model="localEventData.extendedProps.location"
                 :readonly="!isEditing"
                 class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
        </div>

        <div class="mb-3">
          <label for="event-staff-note" class="block text-sm font-medium text-gray-700">Mitarbeiter Notiz:</label>
          <textarea id="event-staff-note" v-model="localEventData.extendedProps.staff_note"
                    :readonly="!isEditing" rows="3"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
        </div>

        <div class="mb-3">
          <label for="event-client-note" class="block text-sm font-medium text-gray-700">Kunden Notiz:</label>
          <textarea id="event-client-note" v-model="localEventData.extendedProps.client_note"
                    :readonly="!isEditing" rows="3"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <button type="button" @click="closeModal"
                  class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Schliessen</button>

          <button v-if="mode !== 'view'" type="submit"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Speichern</button>

          <button v-if="mode === 'edit'" type="button" @click="deleteEv"
                  class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Löschen</button>
        </div>
      </form>
    </div>

    <div v-if="showCustomerSelectorModal" class="modal-overlay">
      <div class="modal-content large-modal">
        <CustomersPage
          :isSelectionMode="true"
          @select-customer="handleCustomerSelected"
          @close="closeCustomerSelector"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large-modal {
  max-width: 800px;
  width: 95%;
}

input[type="text"],
input[type="email"],
input[type="datetime-local"],
textarea {
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5rem;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

input:focus,
textarea:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

input[type="checkbox"] {
  height: 1.25rem;
  width: 1.25rem;
}

input[readonly],
textarea[readonly] {
  background-color: #f9fafb;
  cursor: default;
}
</style>