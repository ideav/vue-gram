import { expect, test, type Page } from '@playwright/test'

const reportResponse = {
  header: 'Sales report',
  columns: [
    { id: 1001, name: 'Created At', type: 3, format: 'DATE' },
    { id: 1002, name: 'Amount', type: 13, format: 'NUMBER', totals: '300' },
    { id: 1003, name: 'Status', type: 3, format: 'SHORT' },
  ],
  data: [
    ['2026-05-01', '100', 'Open'],
    ['2026-05-02', '200', 'Closed'],
  ],
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    const session = {
      version: 2,
      server: window.location.origin,
      currentDatabase: 'my',
      databases: {
        my: {
          token: 'test-token',
          xsrfToken: 'test-xsrf',
          userId: '1',
          userName: 'Tester',
          userRole: 'admin',
          ownedDatabases: [],
        },
      },
    }

    localStorage.setItem('token', 'test-token')
    localStorage.setItem('integram_server', window.location.origin)
    localStorage.setItem('integram_session', JSON.stringify(session))
  })
}

async function mockIntegramApi(page: Page) {
  const reportUrls: string[] = []

  await page.route(/\/(?:api\/)?my\/xsrf(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-token',
        _xsrf: 'test-xsrf',
        id: '1',
        user: 'Tester',
        role: 'admin',
      }),
    })
  })

  await page.route(/\/(?:api\/)?my\/report\/42(?:\?|$)/, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }

    reportUrls.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(reportResponse),
    })
  })

  return reportUrls
}

test.describe('Integram report routes', () => {
  let reportUrls: string[]

  test.beforeEach(async ({ page }) => {
    await seedSession(page)
    reportUrls = await mockIntegramApi(page)
  })

  test('opens a normal report with serialized filter params', async ({ page }) => {
    await page.goto('/my/report/42?FR_Status=Open')

    await expect(page.locator('#report_table')).toBeVisible()
    await expect(page.locator('#report_table')).toContainText('Created At')
    await expect(page.locator('#report_table')).toContainText('2026-05-01')
    await expect(page.locator('#report_table')).toContainText('Open')

    expect(reportUrls.some((requestUrl) => {
      const url = new URL(requestUrl)
      return url.searchParams.has('JSON') && url.searchParams.get('FR_Status') === 'Open'
    })).toBe(true)
  })

  test('opens an embedded report', async ({ page }) => {
    await page.goto('/my/report/42/embed?LIMIT=0%2C20')

    await expect(page.locator('#report_table')).toBeVisible()
    await expect(page.getByText('Sales report')).toBeVisible()
    await expect(page.locator('#report_table')).toContainText('Closed')

    expect(reportUrls.some((requestUrl) => {
      const url = new URL(requestUrl)
      return url.searchParams.has('JSON') && url.searchParams.get('LIMIT') === '0,20'
    })).toBe(true)
  })
})
