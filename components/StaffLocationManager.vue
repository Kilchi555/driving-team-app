<template>
  <div class="staff-location-manager p-6">
    <h2 class="text-3xl font-bold mb-4 text-gray-800 ">Verwaltung der Abholorte</h2>
    <p class="text-gray-600 mb-6">Hier können Sie Ihre Standard-Abholorte hinzufügen, bearbeiten oder löschen. Clients können nur die hier definierten Orte sehen und auswählen.</p>

    <div v-if="locations.length > 0" class="space-y-4 mb-8">
      <UCard
        v-for="location in locations"
        :key="location.id"
        class="location-item"
      >
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-semibold text-lg text-gray-900 ">{{ location.name }}</h3>
            <p class="text-gray-600 text-sm">{{ location.adress }}</p>
          </div>
          <div class="flex space-x-2">
            <UButton
              @click="editLocation(location)"
              color="warning" variant="solid"
              icon="i-heroicons-pencil-square"
              size="sm"
            >
              Bearbeiten
            </UButton>
            <UButton
              @click="confirmDeleteLocation(location.id)"
              color="error" variant="solid"
              icon="i-heroicons-trash"
              size="sm"
            >
              Löschen
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
    <p v-else class="text-gray-500 mb-8">Noch keine Abholorte hinzugefügt.</p>

    <UCard class="location-form p-6">
      <h3 class="text-2xl font-semibold mb-4 text-gray-800 ">
        {{ isEditing ? 'Ort bearbeiten' : 'Neuen Ort hinzufügen' }}
      </h3>
      <div class="space-y-4">
        <UFormGroup label="Name des Ortes" name="locationName">
          <UInput
            type="text"
            id="locationName"
            v-model="currentLocation.name"
            placeholder="z.B. Bahnhof Uster"
            size="lg"
            :ui="{ color: { gray: { outline: 'focus:ring-blue-500' } } }"
          />
        </UFormGroup>
        <UFormGroup label="Adresse" name="locationAdress">
          <UInput
            type="text"
            id="locationAdress"
            v-model="currentLocation.adress"
            placeholder="z.B. Bahnhofstrasse 1, 8610 Uster"
            size="lg"
            :ui="{ color: { gray: { outline: 'focus:ring-blue-500' } } }"
          />
        </UFormGroup>
        <div class="flex space-x-2 pt-2">
          <UButton
            @click="saveLocation"
            color="primary"
            variant="solid"
            size="lg"
            block
            :disabled="!isFormValid"
            :loading="isSaving"
          >
            {{ isEditing ? 'Änderungen speichern' : 'Ort hinzufügen' }}
          </UButton>
          <UButton
            v-if="isEditing"
            @click="cancelEdit"
            color="neutral" variant="outline"
            size="lg"
            block
          >
            Abbrechen
          </UButton>
        </div>
      </div>
    </UCard>

    <UModal v-model="showDeleteConfirm">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 ' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 ">
              Ort löschen bestätigen
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="my-0" @click="cancelDelete" />
          </div>
        </template>
        <p class="text-lg mb-4 text-gray-700 ">Sind Sie sicher, dass Sie diesen Ort löschen möchten?</p>
        <div class="flex justify-end space-x-4">
          <UButton @click="deleteLocation(locationToDeleteId)" color="error" variant="solid">Ja, löschen</UButton> <UButton @click="cancelDelete" color="neutral" variant="outline">Abbrechen</UButton> </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useSupabaseClient, useSupabaseUser } from '#imports';
import { useToast } from '#imports';

import type { Database } from '~/types/supabase';

// Definiere den Location-Typ direkt aus der Database-Typisierung
type Location = Database['public']['Tables']['locations']['Row'];
type LocationInsert = Database['public']['Tables']['locations']['Insert'];
type LocationUpdate = Database['public']['Tables']['locations']['Update'];


const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const toast = useToast();

const locations = ref<Location[]>([]);
const currentLocation = reactive<Partial<LocationInsert>>({ name: '', adress: '' });
const isEditing = ref(false);
const isSaving = ref(false);

const showDeleteConfirm = ref(false);
const locationToDeleteId = ref<string | null>(null);

const isFormValid = computed(() => {
  return !!currentLocation.name && !!currentLocation.adress;
});

const fetchLocations = async () => {
  if (!user.value || !user.value.id) {
    locations.value = [];
    toast.add({
      title: 'Fehler',
      description: 'Benutzer ist nicht angemeldet oder ID nicht verfügbar.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error' // GEÄNDERT: 'red' zu 'error'
    });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('staff_id', user.value.id);

    if (error) throw error;
    locations.value = data;
  } catch (error: any) {
    console.error('Fehler beim Laden der Orte:', error.message);
    toast.add({
      title: 'Fehler beim Laden',
      description: error.message || 'Orte konnten nicht geladen werden.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error' // GEÄNDERT: 'red' zu 'error'
    });
  }
};

const saveLocation = async () => {
  isSaving.value = true;
  if (!user.value || !user.value.id || !isFormValid.value) {
    toast.add({
      title: 'Validierungsfehler',
      description: 'Bitte füllen Sie alle erforderlichen Felder aus und stellen Sie sicher, dass Sie angemeldet sind.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error' // GEÄNDERT: 'red' zu 'error'
    });
    isSaving.value = false;
    return;
  }

  try {
    let error = null;
    if (isEditing.value && currentLocation.id) {
      const updatePayload: LocationUpdate = {
        name: currentLocation.name,
        adress: currentLocation.adress
      };
      const { error: updateError } = await supabase
        .from('locations')
        .update(updatePayload)
        .eq('id', currentLocation.id)
        .eq('staff_id', user.value.id);
      error = updateError;
    } else {
      const insertPayload: LocationInsert = {
        name: currentLocation.name as string,
        adress: currentLocation.adress as string,
        staff_id: user.value.id
      };
      const { error: insertError } = await supabase
        .from('locations')
        .insert(insertPayload);
      error = insertError;
    }

    if (error) throw error;

    toast.add({
      title: 'Erfolg!',
      description: `Ort erfolgreich ${isEditing.value ? 'aktualisiert' : 'hinzugefügt'}!`,
      icon: 'i-heroicons-check-circle',
      color: 'success' // GEÄNDERT: 'green' zu 'success'
    });

    resetForm();
    await fetchLocations();
  } catch (error: any) {
    console.error('Fehler beim Speichern des Ortes:', error.message);
    toast.add({
      title: 'Speicherfehler',
      description: error.message || 'Fehler beim Speichern des Ortes.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error' // GEÄNDERT: 'red' zu 'error'
    });
  } finally {
    isSaving.value = false;
  }
};

const editLocation = (location: Location) => {
  isEditing.value = true;
  Object.assign(currentLocation, location);
};

const cancelEdit = () => {
  isEditing.value = false;
  resetForm();
};

const resetForm = () => {
  currentLocation.id = undefined;
  currentLocation.name = '';
  currentLocation.adress = '';
  currentLocation.created_at = undefined;
  currentLocation.staff_id = undefined;
  isEditing.value = false;
};

const confirmDeleteLocation = (id: string) => {
  locationToDeleteId.value = id;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  locationToDeleteId.value = null;
};

const deleteLocation = async (id: string | null) => {
  if (!id || !user.value || !user.value.id) {
    toast.add({
      title: 'Fehler',
      description: 'Keine gültige Ort-ID oder keine Berechtigung zum Löschen.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error' // GEÄNDERT: 'red' zu 'error'
    });
    return;
  }
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('staff_id', user.value.id);

    if (error) throw error;

    toast.add({
      title: 'Erfolg!',
      description: 'Ort erfolgreich gelöscht!',
      icon: 'i-heroicons-trash',
      color: 'success' // GEÄNDERT: 'green' zu 'success'
    });
    await fetchLocations();
    cancelDelete();
  } catch (error: any) {
    console.error('Fehler beim Löschen des Ortes:', error.message);
    toast.add({
      title: 'Löschfehler',
      description: error.message || 'Fehler beim Löschen des Ortes.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error' // GEÄNDERT: 'red' zu 'error'
    });
  }
};

onMounted(async () => {
  await fetchLocations();
});
</script>

<style scoped>
/* Scoped styles here if needed. Tailwind CSS classes are preferred. */
</style>