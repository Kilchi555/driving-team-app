import { registerUrlWithStoredRef } from '~/data/pricing'
import { businessTypeFromPath } from '~/data/verticals'

/**
 * Reactive register CTA that keeps platform invite ?ref= from the URL
 * and/or localStorage (set by platform-referral middleware).
 *
 * When no explicit businessType is passed (Nav/Footer), infer it from the
 * current path so industry pages still deep-link with ?type=… (e.g. /fahrschule
 * → driving_school). Explicit overrides always win.
 */
export function useRegisterCta(businessType?: MaybeRefOrGetter<string | undefined>) {
  const route = useRoute()

  const registerCta = computed(() => {
    const fromQuery = typeof route.query.ref === 'string' ? route.query.ref : undefined
    const explicit = toValue(businessType)
    const inferred = businessTypeFromPath(route.path)
    return registerUrlWithStoredRef(explicit || inferred, fromQuery)
  })

  return { registerCta }
}
