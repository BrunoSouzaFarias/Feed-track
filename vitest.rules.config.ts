import { defineConfig } from 'vitest/config'

// Testes das regras do Firestore (exigem o emulador: `npm run test:rules`).
export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.ts'], testTimeout: 20000 },
})
