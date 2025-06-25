<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import CustomersPage from '@/pages/customers.vue'; // Stelle sicher, dass dieser Pfad korrekt ist

// Definiere das UserProfile Interface wie zuvor.
// Am besten wäre es, dies global in `types/supabase.ts` zu haben
// und dann hier zu importieren: import type { Database } from '~/types/supabase';
// und dann UserProfile als Database['public']['Tables']['users']['Row'] zu definieren
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
  // Hier könnten weitere Felder für das Payment-Onboarding hinzukommen
  // payment_provider_customer_id: string | null;
  // has_payment_method: boolean;
  // onboarding_completed: boolean;
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
    client_note: '',
    client_id: null, // NEU: ID des ausgewählten Kunden
    client_name: null // NEU: Name des ausgewählten Kunden (zur Anzeige)
  },
  allDay: false
})
const isEditing = ref(false)

// NEUE REFS UND FUNKTIONEN FÜR KUNDENAUSWAHL
const showCustomerSelectorModal = ref(false)
const selectedCustomer = ref<UserProfile | null>(null) // Speichert das volle Kundenobjekt

const openCustomerSelector = () => {
  if (isEditing.value) { // Nur öffnen, wenn im Edit- oder Create-Modus
    showCustomerSelectorModal.value = true
  }
}

const closeCustomerSelector = () => {
  showCustomerSelectorModal.value = false
}

const handleCustomerSelected = (customer: UserProfile) => {
  selectedCustomer.value = customer
  // Aktualisiere localEventData mit den Informationen des ausgewählten Kunden
  localEventData.value.extendedProps.client_id = customer.id
  localEventData.value.extendedProps.client_name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
  closeCustomerSelector() // Schliesse das Modal nach Auswahl
}

const getSelectedCustomerName = computed(() => {
  // Wenn ein Kunde ausgewählt ist ODER wenn client_name bereits in eventData ist
  if (selectedCustomer.value) {
    return `${selectedCustomer.value.first_name || ''} ${selectedCustomer.value.last_name || ''}`.trim();
  }
  // Wenn eventData bereits einen client_name enthält (z.B. beim Bearbeiten eines bestehenden Termins)
  if (localEventData.value.extendedProps?.client_name) {
    return localEventData.value.extendedProps.client_name;
  }
  return ''; // Nichts ausgewählt
});


watch(() => [props.eventData, props.mode], ([newEventData, newMode]) => {
  if (newEventData) {
    const defaultExtendedProps = { location: '', staff_note: '', client_note: '', client_id: null, client_name: null }; // Default für neue Felder
    localEventData.value = {
      ...JSON.parse(JSON.stringify(newEventData)),
      extendedProps: {
        ...defaultExtendedProps,
        ...(newEventData.extendedProps || {})
      }
    };
    // Wenn eventData einen Kunden enthält, initialisiere selectedCustomer
    if (localEventData.value.extendedProps?.client_id) {
      // Hier müsstest du den vollständigen Kunden über die ID abrufen,
      // um `selectedCustomer` zu befüllen. Fürs Erste reicht es, den Namen zu setzen.
      // Echte Implementierung würde einen Supabase-Aufruf hier benötigen.
      // Für jetzt, setzen wir einfach ein Dummy-Objekt mit ID und Name
      selectedCustomer.value = { 
        id: localEventData.value.extendedProps.client_id, 
        first_name: localEventData.value.extendedProps.client_name?.split(' ')[0] || '',
        last_name: localEventData.value.extendedProps.client_name?.split(' ')[1] || '',
        // ... weitere benötigte Felder (könnten leer bleiben, da nur Name und ID verwendet werden)
      } as UserProfile; // Type-Cast, da wir nicht alle Felder haben
    } else {
      selectedCustomer.value = null; // Kein Kunde zugewiesen
    }

  } else {
    localEventData.value = {
      title: '',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      extendedProps: {
        location: '',
        staff_note: '',
        client_note: '',
        client_id: null,
        client_name: null
      },
      allDay: false
    };
    selectedCustomer.value = null; // Bei neuem Termin auch selectedCustomer zurücksetzen
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