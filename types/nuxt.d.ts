// types/nuxt.d.ts
// Global type declarations for Nuxt macros

declare global {
  function definePageMeta(options: {
    middleware?: string | string[]
    layout?: string | false
    ssr?: boolean
    [key: string]: any
  }): void
}

export {}

