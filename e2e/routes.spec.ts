import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'

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
async function waitForSettle(page: Page, ms = 3000) {
  // Wait for network to be idle OR timeout
  await Promise.race([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.waitForTimeout(ms),
  ])
  // Extra settle time for Vue rendering
  await page.waitForTimeout(500)
}

// ─── Login helper ────────────────────────────────────────────────
async function login(page: Page) {
  await page.goto('/login')
  await page.waitForSelector('#database')

  // Show server selector
  const serverToggle = page.locator('a:has-text("сервер"), a:has-text("server")')
  if (await serverToggle.count() > 0) {
    await serverToggle.first().click()
    await page.waitForTimeout(300)
  }

  // Fill database
  const dbInput = page.locator('#database')
  await dbInput.clear()
  await dbInput.fill('my')

  // Fill login
  const loginInput = page.locator('#login')
  await loginInput.clear()
  await loginInput.fill('d')

  // Fill password — PrimeVue Password component wraps an input
  const pwdInput = page.locator('#password').locator('input').first()
  await pwdInput.clear()
  await pwdInput.fill('d')

  // Submit
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to /my/
  await page.waitForURL('**/my/**', { timeout: 15_000 })
}

// ─── Tests ───────────────────────────────────────────────────────

test.describe('Route smoke tests', () => {
  test.describe.configure({ mode: 'serial' })

  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    // Login once, reuse session for all route tests
    await login(page)
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
  test('6. /my/object/{typeId} loads without errors', async () => {
    const id = typeId || '1'
    const errors = collectErrors(page)
    await page.goto(`/my/object/${id}`)
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 7. /my/edit_obj/{objectId} — extract objectId from object view
  test('7. /my/edit_obj/{objectId} loads without errors', async () => {
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
  test('12. /my/upload loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/upload')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 13. /my/dir_admin
  test('13. /my/dir_admin loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/dir_admin')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })

  // 14. /my/info
  test('14. /my/info loads without errors', async () => {
    const errors = collectErrors(page)
    await page.goto('/my/info')
    await waitForSettle(page)
    expect(errors.map(e => e.text())).toEqual([])
  })
})
