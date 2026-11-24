import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /production\.spec\.js$/,
  reporter: 'github',
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'https://weepwood.github.io/s2u/',
    trace: 'retain-on-failure',
  },
})
