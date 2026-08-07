import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { HelpArticle, HelpRole } from '~/utils/helpMarkdown'

export function useHelpDocs() {
  const authStore = useAuthStore()
  const { userRole, isClient, isStaff, isAdmin, isSuperAdmin } = storeToRefs(authStore)

  const { data: allArticles, pending, error, refresh } = useAsyncData(
    'help-articles',
    () => $fetch<HelpArticle[]>('/api/help/articles'),
    { default: () => [] }
  )

  const helpRole = computed<HelpRole | null>(() => {
    if (isClient.value) return 'client'
    if (isStaff.value) return 'staff'
    if (isAdmin.value || isSuperAdmin.value || userRole.value === 'tenant_admin' || userRole.value === 'sub_admin') {
      return 'admin'
    }
    return null
  })

  /** Roles the current user may read (admins also get staff docs). */
  const visibleRoles = computed<HelpRole[]>(() => {
    const role = helpRole.value
    if (!role) return []
    if (role === 'admin') return ['admin', 'staff']
    return [role]
  })

  const articles = computed(() =>
    (allArticles.value || []).filter((a) => visibleRoles.value.includes(a.role))
  )

  const articlesByRole = computed(() => {
    const groups: Record<HelpRole, HelpArticle[]> = {
      client: [],
      staff: [],
      admin: []
    }
    for (const article of articles.value) {
      groups[article.role].push(article)
    }
    return groups
  })

  function getArticle(slug: string): HelpArticle | undefined {
    return articles.value.find((a) => a.slug === slug)
  }

  function roleLabel(role: HelpRole): string {
    if (role === 'client') return 'Für Kundinnen & Kunden'
    if (role === 'staff') return 'Für Mitarbeitende'
    return 'Für Admins'
  }

  return {
    helpRole,
    visibleRoles,
    articles,
    articlesByRole,
    getArticle,
    roleLabel,
    allArticles,
    pending,
    error,
    refresh
  }
}
