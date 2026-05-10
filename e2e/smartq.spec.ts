import { expect, test, type Page, type Route } from '@playwright/test'

const reportId = '900'

const editData = {
  obj: { id: 900, typ: 22, val: 'Продажи по клиентам' },
  reqs: {
    134: { value: '25' }
  }
}

const reportData = {
  header: 'Продажи по клиентам',
  columns: [
    { id: 1001, name: 'Customer Name', format: 'SHORT' },
    { id: 1002, name: 'Amount', format: 'NUMBER' },
    { id: 1003, name: 'Status', format: 'SHORT' },
  ],
  data: [
    ['Acme Corp', '100', 'Open'],
    ['Beta LLC', '200', 'Closed'],
  ],
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
      authServer: 'https://app.integram.io',
      authDatabase: 'my'
    }))
  })
}

test('SmartQ loads a mocked report and renders a mocked AI-chat response', async ({ page }) => {
  const chatRequests: string[] = []

  await seedSession(page)
  await page.route(/\/api\/my\/xsrf(?:\?|$)/, route => fulfillJson(route, {
    token: 'auth-token',
    _xsrf: 'xsrf-token',
    id: '1',
    user: 'Tester',
    role: 'admin',
  }))
  await page.route(`**/api/my/edit_obj/${reportId}?**`, route => fulfillJson(route, editData))
  await page.route(`**/api/my/report/${reportId}?**`, route => fulfillJson(route, reportData))
  await page.route('**/api/my/ai-chat?**', async (route) => {
    chatRequests.push(route.request().postData() || '')
    await fulfillJson(route, {
      message: 'Найдено 2 строки, сумма 300'
    })
  })

  await page.goto(`/my/smartq/${reportId}`)

  await expect(page.getByTestId('smartq-title')).toContainText('Продажи по клиентам')
  await expect(page.locator('#report_table')).toContainText('Acme Corp')
  await expect(page.locator('#report_table')).toContainText('Closed')

  await page.getByRole('textbox', { name: 'Спросить по результатам' }).fill('Суммируй результат')
  await page.getByTestId('smartq-chat-send').click()

  await expect(page.getByTestId('smartq-chat-messages')).toContainText('Найдено 2 строки')
  await expect.poll(() => chatRequests.join('\n')).toContain('message=%D0%A1%D1%83%D0%BC%D0%BC%D0%B8%D1%80%D1%83%D0%B9')
})
