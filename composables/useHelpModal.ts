import { ref, readonly } from 'vue'

const isOpen = ref(false)
const activeSlug = ref<string | null>(null)

export function useHelpModal() {
  function openHelp(slug?: string | null) {
    activeSlug.value = slug || null
    isOpen.value = true
  }

  function openArticle(slug: string) {
    activeSlug.value = slug
    isOpen.value = true
  }

  function showOverview() {
    activeSlug.value = null
  }

  function closeHelp() {
    isOpen.value = false
    activeSlug.value = null
  }

  return {
    isOpen: readonly(isOpen),
    activeSlug: readonly(activeSlug),
    openHelp,
    openArticle,
    showOverview,
    closeHelp
  }
}
