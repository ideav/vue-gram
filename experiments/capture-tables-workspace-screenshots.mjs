import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'

const baseURL = process.env.BASE_URL || 'http://localhost:3000'
const outputDir = new URL('../docs/screenshots/', import.meta.url)

const tableTerms = [
  { id: 18, type: 3, name: 'User' },
  { id: 42, type: 3, name: 'Role' },
  { id: 409, type: 8, name: 'Customer' },
  { id: 422, type: 9, name: 'Payment Date' },
  { id: 22, type: 3, name: 'Query' },
  { id: 269, type: 12, name: 'Settings' },
  { id: 901, type: 14, name: 'Invoice Amount' },
]

const tableFolders = {
  Избранное: { open: true, tabs: ['18', '42'] },
  Справочники: { open: true, tabs: ['409', '422'] },
  Служебные: { open: false, tabs: ['22', '269'] },
}

const grants = { 1: 'WRITE' }

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

try {
  await captureWorkspace('light', false)
  await captureWorkspace('dark', true)
} finally {
  await browser.close()
}

async function captureWorkspace(name, darkTheme) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  await seedSession(page, darkTheme)
  await mockTablesApi(page)

  await page.goto(`${baseURL}/my/table`)
  await page.getByRole('heading', { name: 'Таблицы' }).waitFor()
  await page.screenshot({
    path: new URL(`tables-workspace-${name}.png`, outputDir).pathname,
    fullPage: true,
  })

  await page.close()
}

async function seedSession(page, darkTheme) {
  await page.addInitScript(
    ({ baseURL, grants, darkTheme }) => {
      const origin = new URL(baseURL).origin
      localStorage.setItem('integram_server', origin)
      localStorage.setItem('integram_grants', JSON.stringify(grants))
      localStorage.setItem('darkTheme', String(darkTheme))
      localStorage.setItem(
        'integram_session',
        JSON.stringify({
          version: 2,
          server: origin,
          currentDatabase: 'my',
          databases: {
            my: {
              token: 'test-token',
              xsrfToken: 'test-xsrf',
              userId: '7',
              userName: 'demo',
              userRole: 'admin',
              grants,
            },
          },
        })
      )
    },
    { baseURL, grants, darkTheme }
  )
}

async function mockTablesApi(page) {
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
    }

    if (path.endsWith('/xsrf')) {
      await route.fulfill({ json: { xsrf: 'test-xsrf' }, headers })
      return
    }

    if (path.endsWith('/terms')) {
      await route.fulfill({ json: tableTerms, headers })
      return
    }

    if (path.endsWith('/dict')) {
      await route.fulfill({
        json: Object.fromEntries(tableTerms.map(table => [String(table.id), table.name])),
        headers,
      })
      return
    }

    if (path.endsWith('/object/269')) {
      await route.fulfill({
        json: [{ id: 777, reqs: { 273: { val: JSON.stringify(tableFolders) } } }],
        headers,
      })
      return
    }

    if (path.endsWith('/_m_save/777')) {
      await route.fulfill({ json: { success: true, id: 777 }, headers })
      return
    }

    await route.continue()
  })
}
