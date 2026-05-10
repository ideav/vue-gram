import { expect, test, type Page } from '@playwright/test'
import { dirAdminDirectoryHtml } from '../src/components/integram/__fixtures__/dirAdminFixtures.js'

const session = {
  version: 2,
  server: 'https://app.integram.io',
  currentDatabase: 'my',
  databases: {
    my: {
      token: 'auth-token',
      xsrfToken: 'xsrf-token',
      userId: '1',
      userName: 'admin',
      userRole: 'admin',
      grants: { FILE: 'WRITE' },
      ownedDatabases: []
    }
  }
}

async function mockIntegramApi(page: Page) {
  await page.route('https://app.integram.io/api/my/**', async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/xsrf')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'auth-token',
          _xsrf: 'xsrf-token',
          id: '1',
          user: 'admin',
          role: 'admin'
        })
      })
      return
    }

    if (url.pathname.endsWith('/dir_admin')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: dirAdminDirectoryHtml
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    })
  })
}

async function seedSession(page: Page) {
  await page.addInitScript((seededSession) => {
    localStorage.setItem('integram_session', JSON.stringify(seededSession))
    localStorage.setItem('integram_server', 'https://app.integram.io')
    localStorage.setItem('token', 'auth-token')
    localStorage.setItem('_xsrf', 'xsrf-token')
    localStorage.setItem('user', 'admin')
    localStorage.setItem('id', '1')
    localStorage.setItem('db', 'my')
  }, session)
}

test.describe('Directory admin workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockIntegramApi(page)
    await seedSession(page)
  })

  test('opens dir_admin and launches the legacy edit flow', async ({ page }) => {
    await page.goto('/my/dir_admin')

    await expect(page.getByText('Файлов: 2, каталогов: 1')).toBeVisible()
    await expect(page.getByTestId('dir-admin-file-layout.html')).toBeVisible()
    await expect(page.getByTestId('dir-admin-folder-partials')).toBeVisible()
    await expect(page.locator('.p-datatable-loading-overlay')).toHaveCount(0)

    const cookieAccept = page.getByRole('button', { name: 'Принять' })
    if (await cookieAccept.isVisible().catch(() => false)) {
      await cookieAccept.click()
    }

    if (process.env.CAPTURE_DIR_ADMIN_SCREENSHOTS === '1') {
      await page.screenshot({ path: 'docs/screenshots/dir-admin-workspace.png', fullPage: true })
    }

    await page.evaluate(() => {
      ;(window as unknown as { __dirAdminOpenedUrls: string[] }).__dirAdminOpenedUrls = []
      window.open = ((url?: string | URL) => {
        ;(window as unknown as { __dirAdminOpenedUrls: string[] }).__dirAdminOpenedUrls.push(String(url))
        return null
      }) as typeof window.open
    })

    await page.getByTestId('dir-admin-edit-layout.html').click()

    await expect.poll(() => {
      return page.evaluate(() => {
        return (window as unknown as { __dirAdminOpenedUrls?: string[] }).__dirAdminOpenedUrls?.[0]
      })
    }).toBe('/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=%2Femails&gf=layout.html')
  })
})
