// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Forbid direct Supabase client DB queries in admin pages and components.
    // All DB access must go through server API endpoints (requireAdminProfile + getSupabaseAdmin).
    files: ['pages/admin/**/*.vue', 'pages/tenant-admin/**/*.vue', 'components/admin/**/*.vue'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='from'][callee.object.name='supabase']",
          message:
            'Direct Supabase client queries are forbidden in admin pages/components. Use a server API endpoint with requireAdminProfile() and getSupabaseAdmin() instead.',
        },
        {
          selector: "CallExpression[callee.object.callee.property.name='from']",
          message:
            'Direct Supabase client queries are forbidden in admin pages/components. Use a server API endpoint with requireAdminProfile() and getSupabaseAdmin() instead.',
        },
      ],
    },
  }
)
