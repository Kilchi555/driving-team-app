function isGrid(el: Element) {
  return el.classList.contains('grid')
}

function childCount(el: Element) {
  return el.children.length
}

function markMotionTargets(root: ParentNode = document) {
  const first = document.querySelector('section')
  root.querySelectorAll('section .grid').forEach((grid) => {
    if (!isGrid(grid)) return
    if (grid.closest('footer')) return
    if (first && first.contains(grid)) return
    if (grid.hasAttribute('data-reveal-stagger') || grid.hasAttribute('data-reveal-split')) return
    const n = childCount(grid)
    if (n === 2 && /grid-cols-2/.test(grid.className)) {
      grid.setAttribute('data-reveal-split', '')
      return
    }
    if (n >= 2 && n <= 12) grid.setAttribute('data-reveal-stagger', '')
  })
}

export default defineNuxtPlugin(() => {
  let io: IntersectionObserver | null = null
  let scheduled = false

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const reveal = (el: Element) => {
    el.classList.add('is-in')
    io?.unobserve(el)
  }

  const observe = () => {
    markMotionTargets()
    const nodes = document.querySelectorAll('section, footer, [data-reveal]')
    if (!nodes.length) return

    if (reduced()) {
      nodes.forEach((el) => el.classList.add('is-in'))
      return
    }

    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            reveal(entry.target)
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
      )
    }

    const first = document.querySelector('section')

    nodes.forEach((el) => {
      if (el === first) return
      if (el.classList.contains('is-in')) return
      io?.observe(el)
    })
  }

  const schedule = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      observe()
    })
  }

  const nuxtApp = useNuxtApp()
  const router = useRouter()

  onNuxtReady(observe)
  nuxtApp.hook('page:finish', () => {
    requestAnimationFrame(observe)
    window.setTimeout(observe, 420)
  })
  router.afterEach(() => schedule())
})
