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
      
      const { data, error } = await $fetch('/api/sms/send', {
        method: 'POST',
        body: {
          phone: phoneNumber,
          message: message,
          senderName: senderName
        }
      }) as any;

      if (error || !data?.success) {
        console.error('❌ SMS API error:', error);
        return { success: false, error: error?.message || 'SMS sending failed' };
      }

      logger.debug('✅ SMS sent successfully via local API:', data);
      return { success: true, data: data.smsData };

    } catch (err: any) {
      console.error('❌ Unexpected SMS error:', err);
      logger.error('SMSService', 'SMS sending failed:', { error: err.message });
      
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