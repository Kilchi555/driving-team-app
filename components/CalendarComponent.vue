<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import deLocale from '@fullcalendar/core/locales/de'

const calendar = ref()

// NEU: Variablen für das zentrale Modal
const isModalVisible = ref(false)
const modalEventData = ref<any>(null) // Enthält die Daten für das Modal (Terminobjekt oder leeres Objekt für neu)
const modalMode = ref<'view' | 'edit' | 'create'>('create') // Steuert den Modus des Modals

// Bestehende ref-Variablen für das Kontextmenü und Kopieren/Einfügen
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const clickedEvent = ref<any>(null) // Speichert den Event, auf den geklickt wurde
const copiedEvent = ref<CalendarEvent | null>(null) // Speichert den kopierten Event

defineExpose({
  getApi: () => calendar.value?.getApi?.()
})

// Aktualisierte Typdefinition für CalendarEvent mit ID und allDay
type CalendarEvent = {
  id: string // Hinzugefügt: ID ist essentiell für die Bearbeitung und Löschung
  title: string
  start: string
  end: string
  allDay?: boolean; // Korrektur: Hinzugefügt, um den 'allDay' Fehler zu beheben
  extendedProps?: {
    location?: string
    staff_note?: string
    client_note?: string
  }
}

// Beispiel-Termine mit IDs
const calendarEvents = ref<CalendarEvent[]>([
  {
    id: 'test-event-1', // Beispiel-ID
    title: 'Test-Termin',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    extendedProps: {
      location: 'Zürich',
      staff_note: 'Achtung: Spezialfall'
    }
  }
])

const emit = defineEmits(['view-updated'])

// NEU: Funktion zum Öffnen des Modals im Erstellungsmodus (z.B. für einen "Neuer Termin"-Button)
const openCreateModal = () => {
  isModalVisible.value = true;
  modalMode.value = 'create';
  modalEventData.value = {
    title: '',
    start: new Date().toISOString(), // Standard Startzeit (jetzt)
    end: new Date(Date.now() + 3600000).toISOString(), // Standard Endzeit (1 Stunde später)
    extendedProps: {
      location: '',
      staff_note: '',
      client_note: ''
    },
    allDay: false // Standardwert
  };
};

// NEU: Handler für das Speichern eines Events vom EventModal
const handleSaveEvent = (eventData: CalendarEvent) => {
  if (eventData.id) {
    // Event aktualisieren: Finde das Event anhand der ID und ersetze es
    const index = calendarEvents.value.findIndex(e => e.id === eventData.id);
    if (index !== -1) {
      calendarEvents.value[index] = eventData;
    }
  } else {
    // Neues Event hinzufügen: Generiere eine neue ID und füge es hinzu
    const newId = Date.now().toString(); // Einfache ID-Generierung für Demo
    calendarEvents.value.push({ ...eventData, id: newId });
  }
  isModalVisible.value = false; // Modal schliessen
  // Optional: Kalender aktualisieren, falls nötig (FullCalendar reagiert oft automatisch)
  // calendar.value.getApi().refetchEvents();
};

// NEU: Handler für das Löschen eines Events vom EventModal
const handleDeleteEvent = (eventData: CalendarEvent) => {
  // Event anhand der ID aus dem Array entfernen
  calendarEvents.value = calendarEvents.value.filter(e => e.id !== eventData.id);
  isModalVisible.value = false; // Modal schliessen
  // Optional: Kalender aktualisieren, falls nötig
  // calendar.value.getApi().refetchEvents();
};


// Anpassung deiner Kontextmenü-Funktionen, um das Modal zu nutzen

const editEventFromContextMenu = () => {
  if (clickedEvent.value) {
    isModalVisible.value = true;
    modalMode.value = 'edit';
    modalEventData.value = {
      id: clickedEvent.value.id,
      title: clickedEvent.value.title,
      start: clickedEvent.value.startStr,
      end: clickedEvent.value.endStr,
      allDay: clickedEvent.value.allDay, // allDay hier übergeben
      extendedProps: { ...clickedEvent.value.extendedProps }
    };
  }
  showContextMenu.value = false;
};

const duplicateEvent = () => {
    if (clickedEvent.value) {
        isModalVisible.value = true;
        modalMode.value = 'create'; // Öffne als neuen Termin
        // Erstelle eine Kopie der Daten, passe Titel und Zeiten an
        modalEventData.value = {
            title: clickedEvent.value.title + ' (Kopie)',
            start: new Date(new Date(clickedEvent.value.start).getTime() + 3600000).toISOString(), // 1 Stunde später
            end: new Date(new Date(clickedEvent.value.end).getTime() + 3600000).toISOString(), // 1 Stunde später
            allDay: clickedEvent.value.allDay, // allDay hier übergeben
            extendedProps: { ...clickedEvent.value.extendedProps }
        };
    }
    showContextMenu.value = false;
};

const copyEvent = () => {
  if (clickedEvent.value) {
    copiedEvent.value = {
      id: clickedEvent.value.id, // ID mitkopieren, auch wenn sie für Einfügen nicht direkt genutzt wird
      title: clickedEvent.value.title,
      start: clickedEvent.value.startStr,
      end: clickedEvent.value.endStr,
      allDay: clickedEvent.value.allDay, // allDay hier übergeben
      extendedProps: { ...clickedEvent.value.extendedProps }
    }
    console.log('Termin kopiert:', copiedEvent.value.title)
  }
  showContextMenu.value = false
}

const pasteEvent = (arg: { date: Date }) => { // Typ des Arguments korrigiert
  if (copiedEvent.value) {
    isModalVisible.value = true;
    modalMode.value = 'create';
    const durationMs = new Date(copiedEvent.value.end).getTime() - new Date(copiedEvent.value.start).getTime();
    modalEventData.value = {
      title: copiedEvent.value.title,
      start: arg.date.toISOString(),
      end: new Date(arg.date.getTime() + durationMs).toISOString(),
      allDay: copiedEvent.value.allDay, // allDay hier übergeben
      extendedProps: { ...copiedEvent.value.extendedProps }
    };
  }
  showContextMenu.value = false;
};

// Löschen über Kontextmenü nutzt jetzt den zentralen handleDeleteEvent
const deleteEventFromContextMenu = () => {
  if (clickedEvent.value && clickedEvent.value.id) {
    // Rufe die zentrale Löschfunktion auf, die auch das Modal schliesst
    handleDeleteEvent({ id: clickedEvent.value.id, title: '', start: '', end: '' }); // Übergibt das minimale Event-Objekt mit ID
  }
  showContextMenu.value = false;
};


// Definiere die Optionen hier, da die Plugins direkt verwendet werden
const calendarOptions = ref<CalendarOptions>({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: deLocale,
  timeZone: 'local',
  height: 'auto',
  stickyHeaderDates: true,
  headerToolbar: false, // Toolbar ausgeblendet
  selectable: true, // Ermöglicht das Ziehen und Auswählen von Bereichen
  editable: true, // Ermöglicht das Verschieben und Ändern der Grösse von Terminen
  selectMirror: true, // Spiegelt die Auswahl beim Ziehen
  events: calendarEvents.value, // Bindet die Termine an den Kalender
  slotMinTime: '06:00:00', // Startzeit der Anzeige
  slotMaxTime: '22:00:00', // Endzeit der Anzeige
  allDaySlot: false, // Ganztägiger Slot am oberen Rand ausblenden

  datesSet(info) {
    emit('view-updated', info.start)
  },
  eventAllow: (dropInfo: any) => {
    const now = new Date()
    return dropInfo.start > now // Termine nur in der Zukunft zulassen
  },
  dayHeaderContent: (arg: any) => {
    const date = arg.date
    const weekday = date.toLocaleDateString('de-CH', { weekday: 'short' }) // z. B. "Mo"
    const day = date.getDate().toString().padStart(2, '0') // z. B. "24"

    return {
      html: `<div class="fc-day-header-content"><span class="block">${weekday}</span><span class="block">${day}</span></div>`
    }
  },
  eventContent: (arg: any) => {
    const { title } = arg.event
    const ext = arg.event.extendedProps
    return {
      html: `
        <div class="fc-event-custom">
          <div class="event-name">${title || 'Termin'}</div>
          ${ext?.location ? `<div class="event-subline">📍 ${ext.location}</div>` : ''}
        </div>
      `
    }
  },

  // NEU: Unified select Handler (für Bereichs-Auswahl)
  select: (arg) => {
    isModalVisible.value = true;
    modalMode.value = 'create';
    modalEventData.value = {
      title: '',
      start: arg.startStr,
      end: arg.endStr,
      allDay: arg.allDay, // Korrektur: allDay Property hinzugefügt
      extendedProps: {
        location: '',
        staff_note: '',
        client_note: ''
      }
    };
    calendar.value.getApi().unselect(); // Auswahl im Kalender aufheben
  },

  // NEU: unified eventClick Handler (für Klick auf bestehenden Termin)
  eventClick: (clickInfo) => {
    isModalVisible.value = true;
    modalMode.value = 'edit'; // Oder 'view', wenn nur Ansicht erlaubt ist
    modalEventData.value = {
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      allDay: clickInfo.event.allDay, // allDay hier übergeben
      extendedProps: { ...clickInfo.event.extendedProps }
    };
  },

  // NEU: dateClick Handler (für Klick auf leeren Tag/Zeit-Slot)
  dateClick: (arg) => {
    // Prüfen, ob es ein Rechtsklick war (für Desktop-Kontextmenü beibehalten)
    if (arg.jsEvent.button === 2) {
      arg.jsEvent.preventDefault(); // Verhindert Standard-Browser-Kontextmenü
      showContextMenu.value = true;
      contextMenuX.value = arg.jsEvent.clientX;
      contextMenuY.value = arg.jsEvent.clientY;
      clickedEvent.value = null; // Bei Klick auf Hintergrund kein spezifisches Event ausgewählt
      // Wenn etwas kopiert wurde, soll die Paste-Option verfügbar sein
    } else { // Linksklick auf einen leeren Slot
      isModalVisible.value = true;
      modalMode.value = 'create';
      modalEventData.value = {
        title: '',
        start: arg.date.toISOString(), // Start ist der Klickzeitpunkt
        end: new Date(arg.date.getTime() + 3600000).toISOString(), // Ende ist 1 Stunde später
        allDay: arg.allDay, // allDay hier übergeben
        extendedProps: {
          location: '',
          staff_note: '',
          client_note: ''
        }
      };
    }
  },

  // eventDidMount für Kontextmenü (Rechtsklick auf Desktop)
  eventDidMount: (info) => {
      info.el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showContextMenu.value = true;
          contextMenuX.value = e.clientX;
          contextMenuY.value = e.clientY;
          clickedEvent.value = info.event;
      });
  },

  eventDrop: (dropInfo) => {
    // Logik zum Aktualisieren des Events im Array (via ID)
    const index = calendarEvents.value.findIndex(e => e.id === dropInfo.event.id);
    if (index !== -1) {
      calendarEvents.value[index].start = dropInfo.event.startStr;
      calendarEvents.value[index].end = dropInfo.event.endStr;
      calendarEvents.value[index].allDay = dropInfo.event.allDay; // allDay aktualisieren
    }
    console.log('Termin verschoben:', dropInfo.event);
  },
  eventResize: (resizeInfo) => {
    // Logik zum Aktualisieren des Events im Array (via ID)
    const index = calendarEvents.value.findIndex(e => e.id === resizeInfo.event.id);
    if (index !== -1) {
      calendarEvents.value[index].start = resizeInfo.event.startStr;
      calendarEvents.value[index].end = resizeInfo.event.endStr;
      calendarEvents.value[index].allDay = resizeInfo.event.allDay; // allDay aktualisieren
    }
    console.log('Termin Grösse geändert:', resizeInfo.event);
  },
})

const isCalendarReady = ref(false)

onMounted(() => {
  isCalendarReady.value = true
  emit('view-updated', calendar.value?.getApi()?.view?.currentStart)

  // Listener zum Schliessen des Kontextmenüs bei Klick ausserhalb
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    // Sicherstellen, dass der Klick nicht auf das Kontextmenü selbst ging
    if (showContextMenu.value && !target.closest('.context-menu')) {
      showContextMenu.value = false;
    }
  });
})
</script>

<template>
  <ClientOnly>
    <FullCalendar
      v-if="isCalendarReady"
      ref="calendar"
      :options="calendarOptions"
    />
    <div v-else>
      Kalender wird geladen...
    </div>

    <EventModal
      :is-visible="isModalVisible"
      :event-data="modalEventData"
      :mode="modalMode"
      @close="isModalVisible = false"
      @save-event="handleSaveEvent"
      @delete-event="handleDeleteEvent"
    />

    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop=""
    >
      <div v-if="clickedEvent" class="context-menu-item" @click="editEventFromContextMenu">Termin bearbeiten</div>
      <div v-if="clickedEvent" class="context-menu-item" @click="duplicateEvent">Termin duplizieren</div>
      <div v-if="clickedEvent" class="context-menu-item" @click="copyEvent">Termin kopieren</div>
      <div v-if="clickedEvent" class="context-menu-item" @click="deleteEventFromContextMenu">Termin löschen</div>
      <div v-if="!clickedEvent && copiedEvent" class="context-menu-item" @click="pasteEvent({ date: new Date(contextMenuY)}) ">Termin hier einfügen</div>
      <div v-if="!clickedEvent && !copiedEvent" class="context-menu-item disabled">Nichts zum Einfügen</div>
    </div>
  </ClientOnly>
</template>

<style>
/* Dein bestehendes CSS (falls nicht schon im Projekt) */
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 150px;
  border-radius: 4px;
  overflow: hidden;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
}

.context-menu-item:hover {
  background-color: #f0f0f0;
}

.context-menu-item.disabled {
  color: #bbb;
  cursor: not-allowed;
  background-color: #f9f9f9;
}

.fc-event-custom {
  font-size: 0.75rem;
  padding: 2px;
}
.event-name {
  font-weight: bold;
}
.event-subline {
  font-size: 0.75rem;
  color: #4b5563;
}
.fc .fc-timegrid-slot-label-cushion {
  font-size: 0.7rem;  /* entspricht text-xs */
  color: #6b7280;      /* Tailwind text-gray-500 */
  padding-left: 0.15rem;
}

/* 🧱 Wichtig: Toolbar wird als Flexbox behandelt */
.fc .fc-toolbar {
  display: flex;
  align-items: center;        /* ⬅️ vertikal mittig ausrichten */
  justify-content: center;    /* ⬅️ horizontal zentrieren (optional) */
  min-height: 3.5rem;         /* ⬅️ genug Höhe für zentriertes Layout */
}

/* 🧱 Jedes Button-Chunk innerhalb zentrieren */
.fc .fc-toolbar-chunk {
  display: flex;
  align-items: center;
}

/* 🎯 Optional: Style für die Buttons */
.fc .fc-button {
  padding: 0.5rem 0.5rem !important;
  font-size: 0.875rem;
  line-height: 1.25rem;
  z-index: 100;
}
</style>