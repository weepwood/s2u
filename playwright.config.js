import { defineConfig, devices } from '@playwright/test'

const subpath = process.env.S2U_SUBPATH_TEST === '1'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort${subpath ? ' --base /s2u/' : ''}`,
    url: `http://127.0.0.1:4173${subpath ? '/s2u/' : '/'}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
