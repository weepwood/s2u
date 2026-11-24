import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config.js'
export default defineConfig({
  ...base,
  testMatch: /cross-browser\.spec\.js/,
  // 正式视觉验收不将重试通过视为稳定通过。
  failOnFlakyTests: !!process.env.CI,
  projects: [
    { name:'chromium', use:{...devices['Desktop Chrome']} },
    { name:'firefox', use:{...devices['Desktop Firefox']} },
    { name:'webkit', use:{...devices['Desktop Safari']} },
  ],
})
