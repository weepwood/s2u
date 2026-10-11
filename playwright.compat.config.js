import { defineConfig, devices } from '@playwright/test'
import existing from './playwright.config.js'

export default defineConfig({
  ...existing,
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  retries: 0,
})
