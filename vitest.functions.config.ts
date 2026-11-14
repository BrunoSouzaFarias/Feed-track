import { defineConfig } from 'vitest/config'

// Executa as Cloud Functions contra os emuladores: `npm run test:functions`.
export default defineConfig({
  test: { environment: 'node', include: ['tests/functions/**/*.test.ts'], testTimeout: 30000, hookTimeout: 60000, fileParallelism: false },
})
