import { defineConfig } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT || '3000'
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
