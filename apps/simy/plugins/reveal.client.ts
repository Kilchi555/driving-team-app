export default defineNuxtPlugin(() => {
  const observe = () => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')
    if (!nodes.length) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((el) => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    nodes.forEach((el) => io.observe(el))
  }

  const router = useRouter()
  onNuxtReady(observe)
  router.afterEach(() => {
    requestAnimationFrame(observe)
  })
})
