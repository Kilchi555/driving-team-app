import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['server/utils/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache']
  },
  define: {
    // Prevent vitest from loading .env
    'process.env.SUPABASE_URL': JSON.stringify('http://localhost:54321'),
    'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify('test-key')
  }
})




