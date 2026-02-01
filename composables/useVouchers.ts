// composables/useVouchers.ts
// Gutschein-Management Composable

import { ref, computed, readonly } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { generateVoucherPDFContent, generateVoucherEmailContent } from '~/utils/voucherGenerator'

export interface Voucher {
  id: string
  code: string
  name: string
  description?: string
  amount_chf: number
  amount_rappen: number
  remaining_amount_rappen: number
  voucher_recipient_name?: string
  voucher_recipient_email?: string
  voucher_buyer_name?: string
  voucher_buyer_email?: string
  payment_id?: string
  valid_until: string
  redeemed_at?: string
  redeemed_by?: string
  redeemed_for?: string
  usage_count: number
  is_active: boolean
  status: 'active' | 'redeemed' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface VoucherCreationData {
  name: string
  description?: string
  amount_rappen: number
  recipient_name?: string
  recipient_email?: string
  buyer_name?: string
  buyer_email?: string
  payment_id?: string
  valid_until?: string
}

export const useVouchers = () => {
  const vouchers = ref<Voucher[]>([])
  const currentVoucher = ref<Voucher | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeVouchers = computed(() => 
    vouchers.value.filter(v => v.status === 'active')
  )
  
  const redeemedVouchers = computed(() => 
    vouchers.value.filter(v => v.status === 'redeemed')
  )
  
  const expiredVouchers = computed(() => 
    vouchers.value.filter(v => v.status === 'expired')
  )

  // Methods
  const loadVouchers = async (userId?: string) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/vouchers/manage', {
        method: 'POST',
        body: {
          action: 'load',
          userId
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to load vouchers')
      }

      vouchers.value = (response.data || []).map((voucher: any) => ({
        ...voucher,
        description: voucher.description || undefined,
        amount_chf: voucher.discount_value,
        amount_rappen: voucher.max_discount_rappen,
        status: determineVoucherStatus(voucher)
      }))

      logger.debug('✅ Vouchers loaded:', vouchers.value.length)

    } catch (err: any) {
      console.error('❌ Error loading vouchers:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const determineVoucherStatus = (voucher: any): Voucher['status'] => {
    if (voucher.usage_count > 0) return 'redeemed'
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) return 'expired'
    if (!voucher.is_active) return 'cancelled'
    return 'active'
  }

  const createVoucher = async (voucherData: VoucherCreationData): Promise<Voucher | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/vouchers/manage', {
        method: 'POST',
        body: {
          action: 'create',
          voucherData: {
            name: voucherData.name,
            discount_type: 'fixed',
            discount_value: voucherData.amount_rappen / 100,
            max_discount_rappen: voucherData.amount_rappen,
            remaining_amount_rappen: voucherData.amount_rappen,
            min_amount_rappen: 0,
            usage_limit: 1,
            usage_count: 0,
            is_active: true,
            is_voucher: true,
            voucher_recipient_name: voucherData.recipient_name,
            voucher_recipient_email: voucherData.recipient_email,
            voucher_buyer_name: voucherData.buyer_name,
            voucher_buyer_email: voucherData.buyer_email,
            payment_id: voucherData.payment_id,
            applies_to: 'appointments',
            valid_until: voucherData.valid_until || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      }) as any

      if (!response?.success || !response?.data) {
        throw new Error('Failed to create voucher')
      }

      const data = response.data
      const newVoucher: Voucher = {
        ...data,
        amount_chf: data.discount_value,
        amount_rappen: data.max_discount_rappen,
        status: 'active'
      }

      vouchers.value.unshift(newVoucher)
      logger.debug('✅ Voucher created:', newVoucher.code)

      return newVoucher

    } catch (err: any) {
      console.error('❌ Error creating voucher:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  const findVoucherByCode = async (code: string): Promise<Voucher | null> => {
    try {
      const response = await $fetch('/api/vouchers/manage', {
        method: 'POST',
        body: {
          action: 'find-by-code',
          code
        }
      }) as any

      if (!response?.success || !response?.data) {
        return null
      }

      const data = response.data
      return {
        ...data,
        amount_chf: data.discount_value,
        amount_rappen: data.max_discount_rappen,
        status: determineVoucherStatus(data)
      }

    } catch (err: any) {
      console.error('❌ Error finding voucher:', err)
      return null
    }
  }

  const redeemVoucher = async (code: string, appointmentId: string, redeemerId: string, redeemerName?: string): Promise<{
    success: boolean
    message: string
    voucher?: Voucher
  }> => {
    try {
      logger.debug('🎁 Redeeming voucher via API:', { code, appointmentId, redeemerId })

      // Verwende die neue API-Route für bessere Validierung und Tracking
      const response = await $fetch('/api/vouchers/redeem', {
        method: 'POST',
        body: {
          voucherCode: code,
          appointmentId,
          redeemerId,
          redeemerName
        }
      }) as { success: boolean; message?: string; voucher?: any; error?: string }

      if (response.success && response.voucher) {
        // Update local state
        const updatedVoucher: Voucher = {
          id: response.voucher.id,
          code: response.voucher.code,
          name: response.voucher.name,
          description: undefined,
          amount_chf: response.voucher.amount_chf,
          amount_rappen: response.voucher.amount_chf * 100,
          remaining_amount_rappen: 0,
          voucher_recipient_name: undefined,
          voucher_recipient_email: undefined,
          voucher_buyer_name: undefined,
          voucher_buyer_email: undefined,
          payment_id: undefined,
          valid_until: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          redeemed_at: response.voucher.redeemed_at,
          redeemed_by: response.voucher.redeemed_by,
          redeemed_for: response.voucher.redeemed_for,
          usage_count: 1,
          is_active: false,
          status: 'redeemed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const index = vouchers.value.findIndex(v => v.code === code)
        if (index !== -1) {
          vouchers.value[index] = updatedVoucher
        }

        logger.debug('✅ Voucher redeemed successfully:', response.voucher.code)

        return {
          success: true,
          message: response.message || 'Gutschein erfolgreich eingelöst',
          voucher: updatedVoucher
        }
      } else {
        return {
          success: false,
          message: response.error || 'Fehler beim Einlösen des Gutscheins'
        }
      }

    } catch (err: any) {
      console.error('❌ Error redeeming voucher:', err)
      return {
        success: false,
        message: err.message || 'Fehler beim Einlösen des Gutscheins'
      }
    }
  }

  const generateVoucherPDF = async (voucherId: string): Promise<Blob | null> => {
    try {
      // Try to find in local vouchers first (for local state)
      const voucher = vouchers.value.find(v => v.id === voucherId)
      
      // If not found locally, still proceed with API call (voucher might be from payment)
      logger.debug(`📄 Generating PDF for voucher: ${voucherId} (found locally: ${!!voucher})`)

      // Verwende die API-Route für PDF-Generierung
      const response = await $fetch('/api/vouchers/download-pdf', {
        method: 'POST',
        body: { voucherId }
      }) as { success: boolean; pdfUrl?: string; error?: string }

      if (response.success && response.pdfUrl) {
        // Lade den HTML-Content
        const htmlResponse = await fetch(response.pdfUrl)
        const htmlContent = await htmlResponse.text()
        
        // Erstelle Blob für Download
        const blob = new Blob([htmlContent], { type: 'text/html' })
        return blob
      } else {
        throw new Error(response.error || 'PDF konnte nicht generiert werden')
      }

    } catch (err: any) {
      console.error('❌ Error generating voucher PDF:', err)
      return null
    }
  }

  const sendVoucherEmail = async (voucherId: string, recipientEmail?: string): Promise<{
    success: boolean
    message?: string
    error?: string
  }> => {
    try {
      const voucher = vouchers.value.find(v => v.id === voucherId)
      if (!voucher) {
        return {
          success: false,
          error: 'Gutschein nicht gefunden'
        }
      }

      // Verwende die API-Route für E-Mail-Versendung
      const response = await $fetch('/api/vouchers/send-email', {
        method: 'POST',
        body: { 
          voucherId,
          recipientEmail: recipientEmail || voucher.voucher_recipient_email
        }
      }) as { success: boolean; message?: string; error?: string }

      if (response.success) {
        logger.debug('✅ Voucher email sent:', voucher.code)
        return {
          success: true,
          message: response.message || 'E-Mail erfolgreich gesendet'
        }
      } else {
        return {
          success: false,
          error: response.error || 'E-Mail konnte nicht gesendet werden'
        }
      }

    } catch (err: any) {
      console.error('❌ Error sending voucher email:', err)
      return {
        success: false,
        error: err.message || 'Fehler beim Senden der E-Mail'
      }
    }
  }

  const downloadVoucherPDF = async (voucherId: string): Promise<void> => {
    try {
      const blob = await generateVoucherPDF(voucherId)
      if (!blob) {
        throw new Error('PDF konnte nicht generiert werden')
      }

      const voucher = vouchers.value.find(v => v.id === voucherId)
      const filename = `gutschein-${voucher?.code || voucherId}.html`

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      logger.debug('✅ Voucher PDF downloaded:', filename)

    } catch (err: any) {
      console.error('❌ Error downloading voucher PDF:', err)
      error.value = err.message
    }
  }

  const createVouchersAfterPurchase = async (paymentId: string): Promise<{
    success: boolean
    vouchersCreated?: number
    vouchers?: Array<{
      id: string
      code: string
      name: string
      amount_chf: number
    }>
    message?: string
    error?: string
  }> => {
    try {
      // Verwende die API-Route für automatische Gutschein-Erstellung
      const response = await $fetch('/api/vouchers/create-after-purchase', {
        method: 'POST',
        body: { paymentId }
      }) as { success: boolean; vouchersCreated?: number; vouchers?: any[]; message?: string; error?: string }

      if (response.success && response.vouchers) {
        // Füge neue Gutscheine zum lokalen State hinzu
        for (const voucher of response.vouchers) {
          const newVoucher: Voucher = {
            id: voucher.id,
            code: voucher.code,
            name: voucher.name,
            description: undefined,
            amount_chf: voucher.amount_chf,
            amount_rappen: voucher.amount_chf * 100,
            remaining_amount_rappen: voucher.amount_chf * 100,
            voucher_recipient_name: undefined,
            voucher_recipient_email: undefined,
            voucher_buyer_name: undefined,
            voucher_buyer_email: undefined,
            payment_id: paymentId,
            valid_until: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            redeemed_at: undefined,
            redeemed_by: undefined,
            redeemed_for: undefined,
            usage_count: 0,
            is_active: true,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          vouchers.value.unshift(newVoucher)
        }
        
        logger.debug('✅ Vouchers created and added to local state:', response.vouchersCreated)
      }

      return response

    } catch (err: any) {
      console.error('❌ Error creating vouchers after purchase:', err)
      return {
        success: false,
        error: err.message || 'Fehler bei der automatischen Gutschein-Erstellung'
      }
    }
  }

  return {
    // State
    vouchers: readonly(vouchers),
    currentVoucher: readonly(currentVoucher),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    activeVouchers,
    redeemedVouchers,
    expiredVouchers,

    // Methods
    loadVouchers,
    createVoucher,
    createVouchersAfterPurchase,
    findVoucherByCode,
    redeemVoucher,
    generateVoucherPDF,
    sendVoucherEmail,
    downloadVoucherPDF
  }
}
