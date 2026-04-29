// Automatically injects a self-referencing hreflang tag on every page.
// This fixes the Ahrefs warning "Self-reference hreflang annotation missing".
// Pages with custom hreflang variants (e.g. wab-kurse with English) set their own
// additional hreflang links via <Head> — those are additive and not overridden here.
export default defineNuxtPlugin(() => {
  const route = useRoute()

  useHead(
    computed(() => {
      // Normalize to trailing slash to match canonical URLs on drivingteam.ch
      const path = route.path.endsWith('/') ? route.path : `${route.path}/`
      const url = `https://drivingteam.ch${path}`
      return {
        link: [
          { rel: 'alternate', hreflang: 'de-CH', href: url, key: 'hreflang-de-ch' },
          { rel: 'alternate', hreflang: 'x-default', href: url, key: 'hreflang-x-default' },
        ],
      }
    }),
  )
})
