import { expect, test, type Page, type Route } from '@playwright/test'

import {
  dashboardModelFixture,
  dashboardPeriodFixture,
  dashboardRecordFixture,
  dashboardReportFixture,
  dashboardValuesFixture
} from '../src/utils/__fixtures__/dashboard.js'

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body)
  })
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
          ownedDatabases: []
        }
      }
    }

    localStorage.setItem('token', 'test-token')
    localStorage.setItem('integram_server', window.location.origin)
    localStorage.setItem('integram_session', JSON.stringify(session))
  })
}

async function mockDashboardApi(page: Page) {
  const requests: string[] = []

  await page.route(/\/(?:api\/)?my\/.+/, async route => {
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const path = decodeURIComponent(url.pathname)
    requests.push(`${path}?${url.searchParams.toString()}`)

    if (path.endsWith('/my/xsrf') || path.endsWith('/api/my/xsrf')) {
      await fulfillJson(route, {
        token: 'test-token',
        _xsrf: 'test-xsrf',
        id: '1',
        user: 'Tester',
        role: 'admin'
      })
      return
    }

    if (path.endsWith('/my/object/900') || path.endsWith('/api/my/object/900')) {
      await fulfillJson(route, dashboardRecordFixture)
      return
    }

    if (path.endsWith('/my/report/Дэшборд') || path.endsWith('/api/my/report/Дэшборд')) {
      await fulfillJson(route, dashboardModelFixture)
      return
    }

    if (
      path.endsWith('/my/report/Дэшборд.ЗначенияЗаПериод') ||
      path.endsWith('/api/my/report/Дэшборд.ЗначенияЗаПериод')
    ) {
      await fulfillJson(route, dashboardValuesFixture)
      return
    }

    if (path.endsWith('/my/object/Месяц') || path.endsWith('/api/my/object/Месяц')) {
      await fulfillJson(route, dashboardPeriodFixture.Месяц)
      return
    }

    if (path.endsWith('/my/report/77') || path.endsWith('/api/my/report/77')) {
      await fulfillJson(route, dashboardReportFixture)
      return
    }

    await fulfillJson(route, [])
  })

  return requests
}

test('dashboard renders legacy table, chart, and pivot modes', async ({ page }) => {
  await seedSession(page)
  const requests = await mockDashboardApi(page)

  await page.goto('/my/dash/900')

  await expect(page.getByTestId('dashboard-view')).toBeVisible()
  const cookieButton = page.getByRole('button', { name: 'Принять' })
  if (await cookieButton.count()) await cookieButton.click()

  const revenuePanel = page.getByTestId('dashboard-panel').filter({ hasText: 'Revenue' })
  await revenuePanel.getByTestId('dashboard-mode-table').click()
  await expect(revenuePanel.getByTestId('dashboard-table')).toContainText('Profit')
  await expect(revenuePanel.getByTestId('dashboard-table')).toContainText('800')

  await revenuePanel.getByTestId('dashboard-mode-bar').click()
  await expect(revenuePanel.getByTestId('dashboard-chart')).toBeVisible()
  await expect(revenuePanel.locator('canvas')).toBeVisible()

  const pipelinePanel = page.getByTestId('dashboard-panel').filter({ hasText: 'Pipeline' })
  await pipelinePanel.getByTestId('dashboard-mode-pivot').click()
  await expect(pipelinePanel.getByTestId('dashboard-pivot')).toContainText('Won')
  await expect(pipelinePanel.getByTestId('dashboard-pivot')).toContainText('Ann')
  await expect(pipelinePanel.getByTestId('dashboard-pivot')).toContainText('500')

  await page.screenshot({ path: 'docs/screenshots/dashboard-parity.png', fullPage: true })

  expect(requests.some(request => request.includes('/report/Дэшборд?') && request.includes('JSON_KV'))).toBe(true)
  expect(requests.some(request => request.includes('/report/Дэшборд.ЗначенияЗаПериод?'))).toBe(true)
  expect(requests.some(request => request.includes('/object/Месяц?') && request.includes('JSON_DATA'))).toBe(true)
  expect(requests.some(request => request.includes('/report/77?') && request.includes('JSON'))).toBe(true)
})
