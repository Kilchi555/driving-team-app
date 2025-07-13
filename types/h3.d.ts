// types/h3.d.ts
declare global {
  // Nuxt 3 Server API Global Functions
  function defineEventHandler(handler: (event: any) => any): any
  function readBody(event: any): Promise<any>
  function createError(error: { statusCode: number; statusMessage: string }): never
  function getHeader(event: any, name: string): string | undefined
  function $fetch<T = any>(url: string, options?: any): Promise<T>
}

export {}