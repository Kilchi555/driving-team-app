// composables/useSmsService.ts
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export const useSmsService = () => {
  const supabase = getSupabase();

  const sendSms = async (phoneNumber: string, message: string, senderName?: string) => {
    try {
      logger.debug('📱 SMS Service called:', { phoneNumber, message, senderName })
      
      // Use local API endpoint instead of Supabase Edge Function
      logger.debug('🚀 Using local /api/sms/send endpoint')
      
      const response = await $fetch('/api/sms/send', {
        method: 'POST',
        body: {
          phone: phoneNumber,
          message: message,
          senderName: senderName
        }
      }) as any;

      logger.debug('📱 API Response:', response)

      // Check if the response indicates success
      if (!response?.success) {
        const errorMsg = response?.message || response?.statusMessage || 'SMS sending failed';
        logger.debug('❌ SMS API returned error:', errorMsg);
        return { success: false, error: errorMsg };
      }

      logger.debug('✅ SMS sent successfully via local API:', response);
      return { success: true, data: response.smsData };

    } catch (err: any) {
      console.error('❌ Unexpected SMS error:', err);
      logger.debug('❌ SMS Service error details:', {
        message: err.message,
        status: err.status,
        data: err.data
      });
      
      return { 
        success: false, 
        error: err.message || 'SMS sending failed'
      };
    }
  };

  return {
    sendSms
  };
};