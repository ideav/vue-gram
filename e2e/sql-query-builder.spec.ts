import { expect, test, type Page, type Route } from '@playwright/test'

const reportId = '900'

const editData = {
  obj: { id: 900, val: 'Продажи' },
  reqs: {
    95: { value: '1' },
    134: { value: '25' }
  }
}

const columnsData = {
  object: [
    { id: 1001, val: 'Сумма', ref: 501 }
  ],
  reqs: {
    1001: {
      100: 'Сумма продаж',
      102: '100',
      109: '-1'
    }
  },
  rep_col_list: [
    { id: 42, table: 42, name: 'Заказы', type: '42' },
    { id: 501, table: 42, name: 'Заказы -> Сумма', type: 'NUMBER', format: 'NUMBER' }
  ]
}

const joinsData = {
  object: [
    { id: 7001, val: 42 }
  ],
  reqs: {
    7001: {
      265: 'orders',
      266: 'aorders.id=r501.t'
    }
  }
}

const previewData = {
  columns: [
    { id: 1001, name: 'Сумма продаж', totals: '300' }
  ],
  data: [
    ['100', '200']
  ]
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body)
  })
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('integram_session', JSON.stringify({
      database: 'my',
      token: 'auth-token',
      xsrfToken: 'xsrf-token',
      authServer: window.location.origin,
      authDatabase: 'my'
    }))
    localStorage.setItem('integram_server', window.location.origin)
  })
}

test('SQL query builder loads report, saves a column setting, and refreshes preview', async ({ page }) => {
  const setRequests: string[] = []

  await seedSession(page)
  await page.route(/\/(?:api\/)?my\/xsrf(?:\?|$)/, route => fulfillJson(route, {
    token: 'auth-token',
    _xsrf: 'xsrf-token',
    id: '1',
    user: 'tester',
    role: 'admin'
  }))
  await page.route(/\/(?:api\/)?my\/edit_obj\/900(?:\?|$)/, route => fulfillJson(route, editData))
  await page.route(/\/(?:api\/)?my\/object\/28(?:\?|$)/, route => fulfillJson(route, columnsData))
  await page.route(/\/(?:api\/)?my\/object\/44(?:\?|$)/, route => fulfillJson(route, joinsData))
  await page.route(/\/(?:api\/)?my\/report\/900(?:\?|$)/, route => fulfillJson(route, previewData))
  await page.route(/\/(?:api\/)?my\/_m_set\/1001(?:\?|$)/, async (route) => {
    setRequests.push(route.request().postData() || '')
    await fulfillJson(route, { ok: true })
  })

  await page.goto(`/my/sql/${reportId}`)

  await expect(page.getByTestId('sql-report-title')).toContainText('Продажи')
  await expect(page.getByTestId('sql-preview')).toContainText('LEFT JOIN orders ON aorders.id=r501.t')
  await expect(page.getByTestId('preview-table')).toContainText('100')
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

  await page.getByTestId('column-alias-1001').fill('Gross')
  await page.getByTestId('column-alias-1001').blur()

  await expect.poll(() => setRequests.join('\n')).toContain('t100=Gross')

  await page.getByTestId('builder-preview-button').click()
  await expect(page.getByTestId('preview-table')).toContainText('200')
})
