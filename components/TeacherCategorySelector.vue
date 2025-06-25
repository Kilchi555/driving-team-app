<template>
  <div class="teacher-category-selector">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800">Unterrichtete Führerscheinkategorien</h2>
    <p class="text-gray-600 mb-6">Wählen Sie die Kategorien aus, die Sie unterrichten dürfen:</p>

    <div v-if="categories.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      <div v-for="category in categories" :key="category.id" class="flex items-center">
        <input
          type="checkbox"
          :id="`category-${category.id}`"
          :value="category.id"
          v-model="selectedTeacherCategories"
          @change="markAsChanged"
          class="form-checkbox h-5 w-5 text-blue-600 rounded"
        />
        <label :for="`category-${category.id}`" class="ml-2 text-gray-700 cursor-pointer">
            <span class="font-medium">{{ category.name }}</span>
            <span v-if="category.description" class="text-sm text-gray-500"> ({{ category.description }})</span>
        </label>
      </div>
    </div>
    <p v-else class="text-gray-500">Lade Kategorien...</p>

    <div v-if="isChanged" class="save-status-indicator bg-yellow-100 text-yellow-800 p-3 rounded-md mb-4 text-center">
        <p class="text-sm italic">Änderungen ungespeichert...</p>
    </div>

    <button
      @click="saveTeacherCategories"
      :disabled="!isChanged"
      class="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white font-semibold rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Kategorien speichern
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useSupabaseClient, useAuth } from '#imports';

const supabase = useSupabaseClient();
const { user } = useAuth();

const categories = ref([]);
const selectedTeacherCategories = ref([]);
const initialSelectedCategories = ref([]);
const isChanged = ref(false);

const fetchCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');
    if (error) throw error;
    categories.value = data;
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error.message);
    // Hier könntest du einen Toaster oder eine Fehleranzeige nutzen
  }
};

const fetchTeacherCategories = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('teacher_categories')
      .select('category_id')
      .eq('teacher_id', teacherId);
    if (error) throw error;
    selectedTeacherCategories.value = data.map(item => item.category_id);
    initialSelectedCategories.value = [...selectedTeacherCategories.value];
    isChanged.value = false; // Initial ist nichts geändert
  } catch (error) {
    console.error('Fehler beim Laden der Lehrer-Kategorien:', error.message);
    // Hier könntest du einen Toaster oder eine Fehleranzeige nutzen
  }
};

const saveTeacherCategories = async () => {
  if (!user.value || user.value.role !== 'staff') {
    alert('Sie haben keine Berechtigung, diese Einstellungen zu ändern.');
    return;
  }

  try {
    // 1. Vorhandene Kategorien des Lehrers löschen
    const { error: deleteError } = await supabase
      .from('teacher_categories')
      .delete()
      .eq('teacher_id', user.value.id);
    if (deleteError) throw deleteError;

    // 2. Nur einfügen, wenn Kategorien ausgewählt wurden
    if (selectedTeacherCategories.value.length > 0) {
      const categoriesToInsert = selectedTeacherCategories.value.map(categoryId => ({
        teacher_id: user.value.id,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabase
        .from('teacher_categories')
        .insert(categoriesToInsert);
      if (insertError) throw insertError;
    }

    isChanged.value = false; // Zurücksetzen nach erfolgreichem Speichern
    initialSelectedCategories.value = [...selectedTeacherCategories.value]; // Aktualisiere den Initialzustand
    // "Toaster beim Speichern" - Simuliert mit alert
    alert('Kategorien erfolgreich gespeichert!'); // 
  } catch (error) {
    console.error('Fehler beim Speichern der Kategorien:', error.message);
    // "Fehleranzeigen bei Validierungen" - Simuliert mit alert
    alert('Fehler beim Speichern der Kategorien: ' + error.message); // 
  }
};

const markAsChanged = () => {
  const sortedCurrent = [...selectedTeacherCategories.value].sort();
  const sortedInitial = [...initialSelectedCategories.value].sort();
  isChanged.value = JSON.stringify(sortedCurrent) !== JSON.stringify(sortedInitial);
};

onMounted(async () => {
  await fetchCategories();
  if (user.value && user.value.role === 'staff') {
    await fetchTeacherCategories(user.value.id);
  }
});

watch(selectedTeacherCategories, markAsChanged, { deep: true });
</script>

<style scoped>
/* Das Styling kann durch Tailwind CSS-Klassen direkt im Template ersetzt werden,
   was für Nuxt-Projekte üblich ist. Die hier gezeigten Stile dienen nur als Beispiel,
   falls du kein Tailwind oder ein ähnliches Utility-CSS-Framework verwendest. */
.teacher-category-selector {
  /* Beispiel: padding, border, shadow */
}

/* Du könntest hier auch die Projektfarben verwenden:
   #62b22f, #019ee5, #666666, #1d1e19 
*/
.form-checkbox:checked {
  background-color: #019ee5; /* Beispiel für Farbe des Checkbox-Hakens */
  border-color: #019ee5;
}

.save-status-indicator {
    /* bg-yellow-100 und text-yellow-800 sind bereits Tailwind-Klassen */
}

/* Button-Farben passend zum Projekt CI/CD  */
.bg-blue-500 {
  background-color: #019ee5;
}
.hover\:bg-blue-600:hover {
  background-color: #008ecc; /* Etwas dunkler für Hover */
}
.focus\:ring-blue-500:focus {
  box-shadow: 0 0 0 3px rgba(1, 158, 229, 0.5); /* Ring-Farbe passend */
}
</style>