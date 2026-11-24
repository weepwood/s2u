import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config.js'
export default defineConfig({
  ...base,
  testMatch: /cross-browser\.spec\.js/,
  projects: [
    { name:'chromium', use:{...devices['Desktop Chrome']} },
    { name:'firefox', use:{...devices['Desktop Firefox']} },
    { name:'webkit', use:{...devices['Desktop Safari']} },
  ],
})
