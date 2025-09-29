import { getSupabase } from '~/utils/supabase'

export const useAnalytics = () => {
  const supabase = getSupabase()

  // Track an event
  const trackEvent = async (eventType: string, eventCategory: string, eventData?: any, metadata?: any) => {
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          event_category: eventCategory,
          event_data: eventData,
          metadata: metadata,
          response_time_ms: null, // Will be set by the tracking function
          ip_address: null, // Will be set by the tracking function
          user_agent: null // Will be set by the tracking function
        })

      if (error) {
        console.error('Error tracking event:', error)
      }
    } catch (error) {
      console.error('Error tracking event:', error)
    }
  }

  // Track API call
  const trackApiCall = async (endpoint: string, method: string, responseTime: number, success: boolean) => {
    await trackEvent(
      'api_call',
      'system',
      {
        endpoint,
        method,
        success,
        response_time_ms: responseTime
      }
    )
  }

  // Track user login
  const trackUserLogin = async (userId: string, loginMethod: string) => {
    await trackEvent(
      'user_login',
      'user',
      {
        user_id: userId,
        login_method: loginMethod,
        success: true
      }
    )
  }

  // Track appointment creation
  const trackAppointmentCreated = async (appointmentId: string, appointmentType: string, duration: number) => {
    await trackEvent(
      'appointment_created',
      'appointment',
      {
        appointment_id: appointmentId,
        appointment_type: appointmentType,
        duration_minutes: duration
      }
    )
  }

  // Track payment processed
  const trackPaymentProcessed = async (paymentId: string, amount: number, method: string, success: boolean) => {
    await trackEvent(
      'payment_processed',
      'payment',
      {
        payment_id: paymentId,
        amount,
        payment_method: method,
        success
      }
    )
  }

  // Track system error
  const trackError = async (errorType: string, errorMessage: string, context?: any) => {
    await trackEvent(
      'system_error',
      'system',
      {
        error_type: errorType,
        error_message: errorMessage,
        context
      }
    )
  }

  // Track performance metric
  const trackPerformanceMetric = async (metricName: string, metricValue: number, metricUnit: string, serviceName?: string) => {
    try {
      const { error } = await supabase
        .from('system_metrics')
        .insert({
          metric_name: metricName,
          metric_value: metricValue,
          metric_unit: metricUnit,
          service_name: serviceName
        })

      if (error) {
        console.error('Error tracking performance metric:', error)
      }
    } catch (error) {
      console.error('Error tracking performance metric:', error)
    }
  }

  return {
    trackEvent,
    trackApiCall,
    trackUserLogin,
    trackAppointmentCreated,
    trackPaymentProcessed,
    trackError,
    trackPerformanceMetric
  }
}
