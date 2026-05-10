import { expect, test, type Page } from '@playwright/test'
import cabinetRows from '../src/services/__fixtures__/integramApi/cabinet-profile.json' assert { type: 'json' }

const session = {
  version: 2,
  server: 'https://dronedoc.ru',
  currentDatabase: 'my',
  databases: {
    my: {
      token: 'auth-token',
      xsrfToken: 'xsrf-token',
      userId: '194856',
      userName: 'alice@example.test',
      userRole: 'user',
      ownedDatabases: ['alpha']
    }
  }
}

async function seedSession(page: Page) {
  await page.addInitScript((seededSession) => {
    localStorage.setItem('integram_session', JSON.stringify(seededSession))
    localStorage.setItem('token', 'auth-token')
    localStorage.setItem('_xsrf', 'xsrf-token')
    localStorage.setItem('user', 'alice@example.test')
    localStorage.setItem('id', '194856')
    localStorage.setItem('db', 'my')
  }, session)
}

test.describe('Integram cabinet parity', () => {
  test('opens cabinet and saves a mocked database setting', async ({ page }) => {
    await seedSession(page)

    let settingsBody = ''

    await page.route('https://dronedoc.ru/**', async (route) => {
      const url = new URL(route.request().url())

      if (url.pathname.endsWith('/xsrf')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'auth-token',
            _xsrf: 'xsrf-token',
            id: '194856',
            user: 'alice@example.test',
            role: 'user'
          })
        })
        return
      }

      if (url.pathname.endsWith('/report/313')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(cabinetRows)
        })
        return
      }

      if (url.pathname.endsWith('/report/1095') || url.pathname.endsWith('/report/380')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
        return
      }

      if (url.pathname.endsWith('/_m_set/7001')) {
        settingsBody = route.request().postData() || ''
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    })

    await page.goto('/my/cabinet')

    await expect(page.getByRole('heading', { name: 'Мои базы данных' })).toBeVisible()
    await page.getByTestId('database-description-7001').fill('Updated from smoke')
    await page.getByTestId('save-database-7001').click()

    await expect.poll(() => settingsBody).toContain('t276=Updated+from+smoke')
    expect(settingsBody).toContain('_xsrf=xsrf-token')
  })
})
