/**
 * Returns inline style objects that use the tenant's CSS variable --color-primary
 * with a safe fallback. Use these for primary action buttons/elements so they
 * automatically reflect the tenant's brand color.
 */
export const usePrimaryColor = () => {
  const primaryBg = { backgroundColor: 'var(--color-primary, #111827)', color: '#ffffff' }
  const primaryText = { color: 'var(--color-primary, #111827)' }
  const primaryBorder = { borderColor: 'var(--color-primary, #111827)' }
  const primaryBgLight = { backgroundColor: 'color-mix(in srgb, var(--color-primary, #111827) 10%, white)' }

  return { primaryBg, primaryText, primaryBorder, primaryBgLight }
}
