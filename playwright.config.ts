import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['PLAYWRIGHT_TEST_BASE_URL'];
const username = process.env['RECEIPT_SUGGEST_E2E_USERNAME'];
const password = process.env['RECEIPT_SUGGEST_E2E_PASSWORD'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: baseURL ?? 'http://127.0.0.1:4200',
    ...(username && password ? { httpCredentials: { username, password } } : {}),
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  ...(baseURL ? {} : {
    webServer: {
      command: 'npm start -- --host 127.0.0.1',
      url: 'http://127.0.0.1:4200',
      reuseExistingServer: false
    }
  })
});
