<template>
  <div class="bg-white min-h-screen">
    <!-- Header -->
    <section class="bg-red-600 text-white py-12">
      <div class="container mx-auto px-4">
        <NuxtLink to="/nothelferkurs/" class="inline-flex items-center text-red-100 hover:text-white mb-4">
          ← Zurück zum Nothelferkurs
        </NuxtLink>
        <h1 class="text-4xl font-bold">
          {{ provider === 'nothelfer' ? '🏥 Nothelfer am Bahnhof' : '✈️ Flying-Instructor' }}
        </h1>
        <p class="text-red-100 mt-2">Buchungsformular</p>
      </div>
    </section>

    <!-- iframe Container - Full Width, no sandbox restrictions -->
    <div class="w-full">

      <!-- Nothelfer am Bahnhof -->
      <div v-if="provider === 'nothelfer'" class="w-full">
        <iframe
          id="courses-altstetten"
          title="Nothelferkurs Altstetten"
          height="1800"
          src="https://namb.ch/iframe/nothelferkurs-altstetten"
          style="border: none; width: 100%; display: block;"
        ></iframe>
        <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            ✓ Buchungsformular von Nothelfer am Bahnhof |
            Support: <a href="https://www.nothelferambahnhof.ch/support" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline">nothelferambahnhof.ch/support →</a>
          </p>
        </div>
      </div>

      <!-- Flying-Instructor -->
      <div v-if="provider === 'flying'" class="w-full">
        <iframe
          src="https://flying-instructor.ch/iframe/Dxez1tKe5Z4ITnBy2iRdexoOXgvVrshe.eiurNYlQ"
          title="Flying-Instructor - Buchungsformular"
          style="border: none; width: 100%; display: block; height: 1000px;"
        ></iframe>
        <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            ✓ Buchungsformular von Flying-Instructor |
            <a href="tel:0435439898" class="text-red-600 hover:underline">043 543 98 98</a> |
            <a href="mailto:info@flying-instructor.ch" class="text-red-600 hover:underline">info@flying-instructor.ch</a>
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const provider = computed(() => route.params.provider as string)

useHead({
  title: provider.value === 'nothelfer'
    ? 'Nothelfer am Bahnhof - Buchen | Driving Team'
    : 'Flying-Instructor - Buchen | Driving Team',
  meta: [
    {
      name: 'description',
      content: provider.value === 'nothelfer'
        ? 'Buchen Sie Ihren Nothelferkurs bei Nothelfer am Bahnhof'
        : 'Buchen Sie Ihren Nothelferkurs bei Flying-Instructor'
    },
    { name: 'robots', content: 'noindex, nofollow' },
    {
      property: 'og:title',
      content: provider.value === 'nothelfer'
        ? 'Nothelferkurs buchen – Nothelfer am Bahnhof | Driving Team'
        : 'Nothelferkurs buchen – Flying-Instructor | Driving Team'
    }
  ],
  link: [
    {
      rel: 'canonical',
      href: `https://drivingteam.ch/nothelferkurs-buchen/${provider.value}/`
    }
  ]
})
</script>
