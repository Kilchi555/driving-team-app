// types/wallee.ts
export interface WalleeTransactionResult {
  success: boolean
  error: string
  transactionId?: string
  paymentUrl?: string
}

export interface WalleeConnectionResult {
  success: boolean
  error: string
  spaceId?: string
  connected?: boolean
}

export interface WalleeService {
  createTransaction: () => Promise<WalleeTransactionResult>
  testSpaceConnection: () => Promise<WalleeConnectionResult>
}

// Erweitere die Nuxt App Types
declare module '#app' {
  interface NuxtApp {
    $wallee: WalleeService
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $wallee: WalleeService
  }
}

export interface WalleeConfig {
  spaceId: number
  userId: number
  apiSecret: string
  environment: 'test' | 'live'
}

export interface PaymentData {
  id: string
  category: string
  totalAmount: number
  userId: string
  userEmail: string
  firstName: string
  lastName: string
  duration: number
}

export interface WalleeResponse {
  success: boolean
  error?: string
  statusCode?: number
  transactionId?: string
  paymentPageUrl?: string
}