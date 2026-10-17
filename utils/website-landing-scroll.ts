/** Scroll behavior for landing-page hash targets. Reduced motion jumps. */
export function landingScrollBehavior(reduceMotion: boolean): ScrollBehavior {
  return reduceMotion ? 'auto' : 'smooth'
}

export function scrollToLandingTarget(id: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: landingScrollBehavior(reduce), block: 'start' })
}
