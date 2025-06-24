<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useSupabaseClient, useSupabaseUser } from '#imports';
import type { UserProfile } from '~/types/UserProfile';

// --- NEU: Props für die Komponente ---
const props = defineProps<{
  isSelectionMode?: boolean; // Wenn true, wird sie als Auswahl-Komponente verwendet
}>();

// --- NEU: Emits für die Komponente ---
const emit = defineEmits(['select-customer', 'close']); // Event, um den ausgewählten Kunden zurückzugeben


// Supabase Clients
const supabase = useSupabaseClient();
const user = useSupabaseUser();

// Reactive Variablen für Daten und Status
const customers = ref<UserProfile[]>([]);
const error = ref<string | null>(null);
const loading = ref<boolean>(true);

// Filter-Variablen
const showOnlyMyStudents = ref<boolean>(false);
const showActiveOnly = ref<boolean>(true);
const searchTerm = ref<string>('');
const categoryFilter = ref<string>('');

// Beispiel-Kategorien (passen Sie diese an Ihre tatsächlichen Kategorien an)
const categoryOptions = ref([
  { label: 'Bitte auswählen', value: '' },
  { label: 'Kategorie A1 | A35kW | A', value: 'kategorie_a' },
  { label: 'Kategorie B', value: 'kategorie_b' },
  { label: 'Kategorie BE', value: 'kategorie_be' },
  { label: 'Kategorie C1 | D1', value: 'kategorie_c1_d1' },
  { label: 'Kategorie C', value: 'kategorie_c' },
  { label: 'Kategorie CE', value: 'kategorie_ce' },
  { label: 'Kategorie D', value: 'kategorie_d' },
  { label: 'Kategorie Motorboot', value: 'kategorie_motorboot' },
  { label: 'Kategorie BPT', value: 'kategorie_bpt' },
]);


// Eine Computed Property, um den vollen Namen der Kunden zu generieren
const getFullName = (customer: UserProfile) => {
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
};

// Funktion zum Abrufen der Kundendaten mit Filtern
const fetchCustomers = async () => {
  loading.value = true;
  error.value = null;

  try {
    let query = supabase.from('users').select('*');

    // Filter für "Nur meine Fahrschüler"
    if (showOnlyMyStudents.value && user.value?.id) {
      query = query.eq('assigned_staff', user.value.id);
    } else if (showOnlyMyStudents.value && !user.value?.id) {
        customers.value = [];
        loading.value = false;
        return;
    }

    // Filter für aktive/inaktive
    if (showActiveOnly.value) {
      query = query.eq('is_active', true);
    } else {
      query = query.eq('is_active', false);
    }

    // Filter für Kategorie
    if (categoryFilter.value) {
      query = query.eq('category', categoryFilter.value);
    }

    // Suchfunktion
    if (searchTerm.value) {
      const search = `%${searchTerm.value}%`;
      query = query.or(
        `first_name.ilike.${search},last_name.ilike.${search},email.ilike.${search},phone.ilike.${search},street.ilike.${search},city.ilike.${search}`
      );
    }

    // Standard-Sortierung
    query = query.order('last_name', { ascending: true });

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Fehler beim Abrufen der Kunden:', fetchError);
      error.value = fetchError.message;
    } else {
      customers.value = data || [];
    }
  } catch (err: any) {
    console.error('Unerwarteter Fehler:', err);
    error.value = err.message || 'Ein unerwarteter Fehler ist aufgetreten.';
  } finally {
    loading.value = false;
  }
};

// Beobachten, wenn sich Filter oder Suchbegriff ändern, um Daten neu zu laden
watch([showOnlyMyStudents, showActiveOnly, searchTerm, categoryFilter], () => {
  fetchCustomers();
});

onMounted(() => {
  fetchCustomers();
});

// NEU: Funktion, um einen Kunden auszuwählen und an das Eltern-Modal zurückzugeben
const selectCustomer = (customer: UserProfile) => {
  if (props.isSelectionMode) { // Nur im Auswahl-Modus emittieren
    emit('select-customer', customer);
  }
};

// NEU: Funktion zum Schliessen des Selector-Modals (wenn im Auswahl-Modus)
const closeSelector = () => {
  if (props.isSelectionMode) { // Nur im Auswahl-Modus emittieren
    emit('close');
  }
};
</script>

<template>
  <h1 :class="{'text-3xl font-bold mb-4': !props.isSelectionMode, 'text-2xl font-bold mb-2': props.isSelectionMode}">
    {{ props.isSelectionMode ? 'Schüler auswählen' : 'Kundenliste' }}
  </h1>

  <div class="mb-4 bg-white p-3 rounded-lg shadow-md flex flex-wrap md:flex-nowrap items-center gap-2">
    <label class="flex items-center gap-1 text-sm md:text-base">
      <input type="checkbox" v-model="showOnlyMyStudents" class="form-checkbox h-4 w-4 md:h-5 md:w-5 text-blue-600 rounded">
      <span>Eigene</span>
    </label>

    <label class="flex items-center gap-1 text-sm md:text-base">
      <input type="checkbox" v-model="showActiveOnly" class="form-checkbox h-4 w-4 md:h-5 md:w-5 text-green-600 rounded">
      <span>Aktive</span>
    </label>

    <select v-model="categoryFilter" class="p-1.5 md:p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base flex-grow">
      <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <input
      type="text"
      v-model="searchTerm"
      placeholder="Suchen..."
      class="flex-grow p-1.5 md:p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base w-full md:w-auto"
    >
  </div>

  <div v-if="loading" class="text-center text-blue-500 text-lg">
    Daten werden geladen...
  </div>

  <div v-else-if="error" class="text-red-500 mb-4 text-center">
    Fehler: {{ error }}
  </div>

  <div v-else-if="customers.length === 0" class="text-gray-600 text-center text-lg">
    Keine Kunden gefunden, die den Filtern entsprechen.
  </div>

  <ul v-else :class="{'space-y-4': !props.isSelectionMode, 'space-y-3 max-h-80 overflow-y-auto border rounded-md p-2': props.isSelectionMode}">
    <li v-for="customer in customers" :key="customer.id"
        :class="{'bg-white shadow p-4 rounded-lg': !props.isSelectionMode, 'bg-gray-50 hover:bg-blue-100 cursor-pointer p-3 rounded-lg flex justify-between items-center transition-colors duration-200': props.isSelectionMode}"
        @click="selectCustomer(customer)">
      <div>
        <h2 :class="{'text-xl font-semibold': !props.isSelectionMode, 'text-lg font-semibold': props.isSelectionMode}">
          {{ getFullName(customer) }}
        </h2>
        <p class="text-gray-700">E-Mail: {{ customer.email }}</p>
        <p v-if="customer.phone" class="text-gray-700">Telefon: {{ customer.phone }}</p>
        <p class="text-gray-500">Status: <span :class="{'text-green-600': customer.is_active, 'text-red-600': !customer.is_active}">{{ customer.is_active ? 'Aktiv' : 'Inaktiv' }}</span></p>
        <p class="text-gray-500">Zugewiesen an: {{ customer.assigned_staff || 'Nicht zugewiesen' }}</p>
        <p class="text-gray-500">Kategorie: {{ customer.category || 'Nicht definiert' }}</p>
      </div>
    </li>
  </ul>

  <div v-if="props.isSelectionMode" class="flex justify-end mt-4">
    <button @click="closeSelector" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
      Schliessen
    </button>
  </div>
</template>