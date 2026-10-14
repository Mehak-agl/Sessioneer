import { defineConfig, devices } from '@playwright/test'

// Full-stack E2E: the real Spring Boot backend (localhost:8080) and Postgres
// must already be running, with email switched off — see e2e/README.md.
// The backend only allows browser requests from http://localhost:5173, so
// the tests use the normal dev server port.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
