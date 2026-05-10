import { chromium } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3002'
const screenshotPath = 'docs/screenshots/issue-34-readonly-actions-hidden.png'
const tableTerms = [
  { id: 18, type: 3, name: 'User' },
  { id: 42, type: 3, name: 'Role' },
  { id: 409, type: 8, name: 'Customer' },
  { id: 422, type: 9, name: 'Payment Date' },
  { id: 22, type: 3, name: 'Query' },
  { id: 269, type: 12, name: 'Settings' },
  { id: 901, type: 14, name: 'Invoice Amount' }
]
const tableFolders = {
  'Избранное': { open: true, tabs: ['18', '42'] },
  'Справочники': { open: true, tabs: ['409', '422'] },
  'Служебные': { open: false, tabs: ['22', '269'] }
}
const readGrants = { '1': 'READ' }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

await page.addInitScript(({ seededGrants }) => {
  const server = 'http://localhost:3000'
  const session = {
    version: 2,
    server,
    currentDatabase: 'my',
    databases: {
      my: {
        token: 'test-token',
        xsrfToken: 'test-xsrf',
        userId: 'fixture-user-id',
        userName: 'fixture-user',
        userRole: 'user',
        grants: seededGrants,
        ownedDatabases: []
      }
    }
  }

  localStorage.setItem('integram_server', server)
  localStorage.setItem('integram_session', JSON.stringify(session))
  localStorage.setItem('integram_grants', JSON.stringify(seededGrants))
}, { seededGrants: readGrants })

await page.route(/\/(?:api\/)?my\//, async (route) => {
  const request = route.request()
  if (request.resourceType() === 'document') {
    await route.continue()
    return
  }

  const url = new URL(request.url())
  const path = decodeURIComponent(url.pathname)
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  }

  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders })
    return
  }

  if (path.endsWith('/xsrf')) {
    await route.fulfill({
      json: { token: 'test-token', _xsrf: 'test-xsrf', id: 'fixture-user-id', user: 'fixture-user', role: 'user' },
      headers: corsHeaders
    })
    return
  }

  if (path.endsWith('/terms')) {
    await route.fulfill({ json: { terms: tableTerms }, headers: corsHeaders })
    return
  }

  if (path.endsWith('/dict')) {
    await route.fulfill({
      json: Object.fromEntries(tableTerms.map(table => [String(table.id), table.name])),
      headers: corsHeaders
    })
    return
  }

  if (path.endsWith('/object/269')) {
    await route.fulfill({
      json: {
        object: [
          {
            id: '777',
            val: 'fixture-user',
            reqs: {
              271: { val: 'UI' },
              273: { val: JSON.stringify(tableFolders) }
            }
          }
        ]
      },
      headers: corsHeaders
    })
    return
  }

  await route.fulfill({ json: {}, headers: corsHeaders })
})

await page.goto(`${baseURL}/my/table`)
await page.getByRole('heading', { name: 'Таблицы' }).waitFor()
const acceptCookies = page.getByRole('button', { name: 'Принять' })
if (await acceptCookies.count()) {
  await acceptCookies.click()
}
await page.screenshot({ path: screenshotPath, fullPage: true })
await browser.close()
