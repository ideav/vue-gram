import { defineConfig } from '@playwright/test'

const e2ePort = Number(process.env.PLAYWRIGHT_PORT || 3000)
const e2eHost = process.env.PLAYWRIGHT_HOST || '127.0.0.1'
const e2eBaseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${e2eHost}:${e2ePort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: e2eBaseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host ${e2eHost} --port ${e2ePort} --strictPort`,
    url: e2eBaseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 30_000,
  },
})
