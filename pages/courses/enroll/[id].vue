<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <div class="max-w-md w-full text-center">
      <div class="bg-white rounded-lg shadow p-8">
        <svg class="w-10 h-10 mx-auto mb-4 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <h1 class="text-xl font-semibold text-gray-900 mb-2">Weiterleitung …</h1>
        <p v-if="!errorMessage" class="text-sm text-gray-600">
          Du wirst zur aktuellen Kursanmeldung weitergeleitet.
        </p>
        <p v-else class="text-sm text-red-600">{{ errorMessage }}</p>
        <p v-if="errorMessage" class="mt-4">
          <NuxtLink to="/dashboard" class="text-sm font-semibold text-gray-700 underline hover:no-underline">
            Zurück zum Dashboard
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * DEPRECATED: /courses/enroll/:id
 *
 * This legacy enrollment page predates the public, tenant-scoped course page
 * at /customer/courses/:slug (which uses CourseEnrollmentModal + the public
 * `enroll-wallee` / `enroll-cash` API). It bypasses tenant feature flags
 * (`courses_enabled`, `wallee_enabled`) and the modern Wallee/credit flow.
 *
 * To prevent users from landing on a half-broken or inconsistent enrollment
 * flow, this route now resolves the course's tenant slug and redirects to
 * the modern public course page. If the lookup fails we send the user to
 * their dashboard with an explanatory message.
 */
import { ref, onMounted } from 'vue'
import { useRoute, navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

definePageMeta({ layout: 'default' })

const route = useRoute()
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  const courseId = (route.params.id as string) || ''
  if (!courseId) {
    errorMessage.value = 'Kein Kurs angegeben.'
    return
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('courses')
      .select('id, tenants:tenant_id(slug)')
      .eq('id', courseId)
      .maybeSingle()

    if (error || !data) {
      logger.warn('Legacy /courses/enroll redirect: course not found', { courseId, error })
      errorMessage.value = 'Dieser Kurs ist nicht mehr verfügbar.'
      return
    }

    const slug = (data as any).tenants?.slug
    if (!slug) {
      errorMessage.value = 'Kurs konnte keiner Fahrschule zugeordnet werden.'
      return
    }

    // Hash carries the course id so the modern page can auto-open the
    // enrollment modal for the right course.
    await navigateTo(`/customer/courses/${slug}#course-${courseId}`, { replace: true })
  } catch (err: any) {
    logger.error('Legacy /courses/enroll redirect failed', err)
    errorMessage.value = 'Weiterleitung fehlgeschlagen.'
  }
})
</script>
