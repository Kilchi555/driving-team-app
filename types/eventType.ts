// types/eventTypes.ts
export interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
  default_price_rappen?: number // New field for default price in rappen
  default_fee_rappen?: number // New field for default fee in rappen
  require_payment?: boolean
}