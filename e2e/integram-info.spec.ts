import { expect, test, type Page } from '@playwright/test'

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('integram_server', 'http://localhost:3000')
    localStorage.setItem('integram_session', JSON.stringify({
      version: 2,
      server: 'http://localhost:3000',
      currentDatabase: 'my',
      databases: {
        my: {
          token: 'test-token',
          xsrfToken: 'test-xsrf',
          userId: '1',
          userName: 'tester',
          userRole: 'admin',
          grants: { 1: 'WRITE' },
          ownedDatabases: []
        }
      }
    }))
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('_xsrf', 'test-xsrf')
    localStorage.setItem('user', 'tester')
    localStorage.setItem('id', '1')
    localStorage.setItem('db', 'my')
  })

  await page.route('**/api/my/**', async (route) => {
    const url = new URL(route.request().url())
    const body = url.pathname.includes('/xsrf')
      ? { token: 'test-token', _xsrf: 'test-xsrf', id: '1', user: 'tester', role: 'admin' }
      : {}

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    })
  })
}

test.describe('Integram info diagnostics workspace', () => {
  test('opens info route and shows key diagnostics sections', async ({ page }) => {
    await seedSession(page)
    await page.goto('/my/info')

    await expect(page.getByRole('heading', { name: 'Информация и диагностика' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Среда выполнения' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'База данных' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Окружение' })).toBeVisible()
    await expect(page.getByTestId('info-admin-debug')).toBeVisible()
  })
})
