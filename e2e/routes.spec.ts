import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'

const objectListResponse = {
  type: { id: '110', val: 'Contracts', up: '0' },
  object: [
    { id: '285', val: 'Contract A', ord: 1, up: '1' },
  ],
  list: [
    {
      id: '285',
      val: 'Contract A',
      up: '1',
      320: 'ACME',
      ref_320: '200:42',
      410: 'Urgent, External',
      ref_410: '210:7,8',
      411: '3',
    },
  ],
  req_order: ['320', '410', '411'],
  req_type: {
    320: 'Client',
    410: 'Tags',
    411: 'Tasks',
  },
  req_base: {
    320: 'SHORT',
    410: 'SHORT',
    411: 'ARRAY',
  },
  ref_type: {
    320: '200',
    410: '210',
  },
  req_attrs: {
    410: ':MULTI:',
  },
  arr_type: {
    411: '1',
  },
  reqs: {
    285: {
      320: 'ACME',
      ref_320: '200:42',
      410: 'Urgent, External',
      ref_410: '210:7,8',
      411: '3',
    },
  },
}

const objectEditResponse = {
  obj: { id: '285', typ: '110', val: 'Contract A', up: '1' },
  metadata: objectListResponse.type,
  reqs: {
    320: 'ACME',
    410: 'Urgent, External',
    411: '3',
  },
  arr_type: objectListResponse.arr_type,
}

const metadataResponse = {
  type: objectListResponse.type,
  reqs: [
    { id: '320', val: 'Client', type: '3', ref: '200', reft: '200', attrs: '' },
    { id: '410', val: 'Tags', type: '3', ref: '210', reft: '210', attrs: ':MULTI:' },
    { id: '411', val: 'Tasks', type: '4', attrs: '' },
  ],
}

const dictionaryResponse = {
  110: 'Contracts',
  200: 'Clients',
  210: 'Tags',
}

/**
 * Console error collector.
 * Ignores known noise: deprecation warnings, source-map warnings,
 * network errors for optional resources, and known PrimeVue deprecations.
 */
function collectErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    // Ignore noisy / non-actionable messages
    if (
      text.includes('deprecated') ||
      text.includes('Deprecation') ||
      text.includes('source map') ||
      text.includes('sourcemap') ||
      text.includes('favicon.ico') ||
      text.includes('net::ERR_') ||
      text.includes('Failed to load resource') ||
      text.includes('[webpack') ||
      text.includes('DevTools') ||
      text.includes('Download the Vue Devtools')
    ) return
    errors.push(msg)
  })
  // Also catch uncaught exceptions
  page.on('pageerror', (err) => {
    errors.push({
      type: () => 'error',
      text: () => `[pageerror] ${err.message}`,
      location: () => ({ url: '', lineNumber: 0, columnNumber: 0 }),
    } as unknown as ConsoleMessage)
  })
  return errors
}

/** Wait for the page to settle after navigation */
async function waitForSettle(page: Page, ms = 1500) {
  // Wait for network to be idle OR timeout
  await Promise.race([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.waitForTimeout(ms),
  ])
  // Extra settle time for Vue rendering
  await page.waitForTimeout(250)
}

async function installApiMocks(page: Page) {
  await page.route('**/api/my/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    let body: unknown = {}
    if (path.includes('/dict')) {
      body = dictionaryResponse
    } else if (path.includes('/metadata/')) {
      body = metadataResponse
    } else if (path.includes('/edit_obj/')) {
      body = objectEditResponse
    } else if (path.includes('/object/285')) {
      body = {}
    } else if (path.includes('/object/')) {
      body = objectListResponse
    } else if (path.includes('/xsrf')) {
      body = { token: 'test-token', _xsrf: 'test-xsrf', id: '1', user: 'tester' }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function authenticateForRoutes(page: Page) {
  await installApiMocks(page)
  await page.addInitScript(() => {
    const session = {
      database: 'my',
      token: 'test-token',
      xsrfToken: 'test-xsrf',
      userId: '1',
      userName: 'tester',
      userRole: 'admin',
      authServer: 'http://localhost:3000',
      authDatabase: 'my',
    }
    localStorage.setItem('integram_server', 'http://localhost:3000')
    localStorage.setItem('integram_session', JSON.stringify(session))
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('_xsrf', 'test-xsrf')
    localStorage.setItem('user', 'tester')
    localStorage.setItem('id', '1')
    localStorage.setItem('db', 'my')
  })
  await page.goto('/my/')
  await page.waitForURL('**/my/**')
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Route smoke tests', () => {
  test.describe.configure({ mode: 'serial' })

  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await authenticateForRoutes(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  // 1. /login (public, no auth needed — test independently)
  test('1. /login loads without errors', async ({ browser }) => {
    const fresh = await browser.newPage()
    const errors = collectErrors(fresh)
    await fresh.goto('/login')
    await waitForSettle(fresh)
    expect(errors.map(e => e.text())).toEqual([])
    await fresh.close()
  })

  // 2. /my/ — landing page (already navigated after login)
  test('2. /my/ loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 3. /my/dict
  test('3. /my/dict loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/dict')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 4. /my/table
  test('4. /my/table loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/table')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 5. /my/table/{typeId} — extract typeId from the table list page
  let typeId: string | null = null

  test('5. /my/table/{typeId} loads without errors', async () => {
    // First navigate to /my/table to find a typeId
    await page.goto('/my/table')
    await waitForSettle(page)

    // Try to find a link to a table view
    const tableLink = page.locator('a[href*="/my/table/"]').first()
    if (await tableLink.count() > 0) {
      const href = await tableLink.getAttribute('href')
      const match = href?.match(/\/my\/table\/(\d+)/)
      if (match) typeId = match[1]
    }

    // Fallback: look for any clickable row/link that navigates to a table
    if (!typeId) {
      // Try clicking the first data row
      const rows = page.locator('tr[data-p-index], .p-datatable-tbody tr').first()
      if (await rows.count() > 0) {
        await rows.click()
        await waitForSettle(page)
        const url = page.url()
        const match = url.match(/\/my\/table\/(\d+)/)
        if (match) typeId = match[1]
      }
    }

    if (!typeId) {
      // Use a safe default
      typeId = '1'
    }

    const errors = collectErrors(page)
    await page.goto(`/my/table/${typeId}`)
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 6. /my/object/{typeId}
  test('6. /my/object/{typeId} deep link loads without errors', async () => {
    const id = typeId || '1'
    const errors = collectErrors(page)
    await page.goto(`/my/object/${id}`)
    await waitForSettle(page)
    await expect(page).toHaveURL(new RegExp(`/my/object/${id}(?:[?#].*)?$`))
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 7. /my/edit_obj/{objectId} — extract objectId from object view
  test('7. /my/edit_obj/{objectId} deep link loads without errors', async () => {
    // Navigate to object view to find an objectId
    const id = typeId || '1'
    await page.goto(`/my/object/${id}`)
    await waitForSettle(page)

    let objectId: string | null = null

    // Try to find a link to edit object
    const editLink = page.locator('a[href*="/my/edit_obj/"]').first()
    if (await editLink.count() > 0) {
      const href = await editLink.getAttribute('href')
      const match = href?.match(/\/my\/edit_obj\/(\d+)/)
      if (match) objectId = match[1]
    }

    // Fallback: try to find any object link or row
    if (!objectId) {
      const objLink = page.locator('a[href*="/edit_obj/"]').first()
      if (await objLink.count() > 0) {
        const href = await objLink.getAttribute('href')
        const match = href?.match(/edit_obj\/(\d+)/)
        if (match) objectId = match[1]
      }
    }

    if (!objectId) objectId = '1'

    const errors = collectErrors(page)
    await page.goto(`/my/edit_obj/${objectId}`)
    await waitForSettle(page)
    await expect(page).toHaveURL(new RegExp(`/my/edit_obj/${objectId}(?:[?#].*)?$`))
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 8. /my/edit_types
  test('8. /my/edit_types loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/edit_types')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 9. /my/sql
  test('9. /my/sql loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/sql')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 10. /my/report
  test('10. /my/report loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/report')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 11. /my/form
  test('11. /my/form loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/form')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 12. /my/upload
  test('12. /my/quiz loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/quiz')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 13. /my/upload
  test('13. /my/upload loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/upload')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 14. /my/dir_admin
  test('14. /my/dir_admin loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/dir_admin')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 15. /my/info
  test('15. /my/info loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/info')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })
})
