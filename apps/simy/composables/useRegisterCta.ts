import { registerUrlWithStoredRef } from '~/data/pricing'

/**
 * Reactive register CTA that keeps platform invite ?ref= from the URL
 * and/or localStorage (set by platform-referral middleware).
 */
export function useRegisterCta(businessType?: MaybeRefOrGetter<string | undefined>) {
  const route = useRoute()

  const registerCta = computed(() => {
    const fromQuery = typeof route.query.ref === 'string' ? route.query.ref : undefined
    return registerUrlWithStoredRef(toValue(businessType), fromQuery)
  })

  return { registerCta }
}
