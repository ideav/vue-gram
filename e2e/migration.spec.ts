import { expect, test, type Page } from '@playwright/test'
import {
  migrationDirectoryHtml,
  migrationDryRunPackageFixture,
  migrationMetadataFixture,
  migrationQueriesFixture,
  migrationSettingsFixture
} from '../src/components/integram/__fixtures__/migration.js'

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
      roleId: 1,
      grants: { admin: 'WRITE', FILE: 'WRITE' },
      ownedDatabases: []
    }
  }
}

async function mockIntegramApi(page: Page) {
  await page.route('https://app.integram.io/api/my/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.endsWith('/xsrf')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'auth-token',
          _xsrf: 'xsrf-token',
          id: '1',
          user: 'admin',
          role: 'admin',
          roleId: 1,
          grants: { admin: 'WRITE', FILE: 'WRITE' }
        })
      })
      return
    }

    if (path.endsWith('/metadata')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(migrationMetadataFixture)
      })
      return
    }

    if (path.endsWith('/object/22')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(migrationQueriesFixture)
      })
      return
    }

    if (path.endsWith('/object/269')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(migrationSettingsFixture)
      })
      return
    }

    if (path.endsWith('/dir_admin')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: migrationDirectoryHtml
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
    localStorage.setItem('role', 'admin')
    localStorage.setItem('roleId', '1')
    localStorage.setItem('id', '1')
    localStorage.setItem('db', 'my')
    localStorage.setItem('integram_grants', JSON.stringify({ admin: 'WRITE', FILE: 'WRITE' }))
  }, session)
}

test.describe('Migration workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockIntegramApi(page)
    await seedSession(page)
  })

  test('opens migr and runs a mocked dry-run action', async ({ page }) => {
    await page.goto('/my/migr')

    await expect(page.getByTestId('migration-workspace')).toBeVisible()
    await expect(page.getByTestId('migration-table-101')).toBeVisible()
    await expect(page.getByTestId('migration-file-dashboard.html')).toBeVisible()

    const cookieAccept = page.getByRole('button', { name: 'Принять' })
    if (await cookieAccept.isVisible().catch(() => false)) {
      await cookieAccept.click()
    }

    await page.getByTestId('migration-import-input').fill(JSON.stringify(migrationDryRunPackageFixture, null, 2))
    await page.getByTestId('migration-dry-run').click()
    await page.getByRole('button', { name: 'Проверить', exact: true }).click()

    await expect(page.getByTestId('migration-dry-run-summary')).toContainText('Таблицы: 1')
    await expect(page.getByTestId('migration-log')).toContainText('Dry-run завершен')

    if (process.env.CAPTURE_MIGR_SCREENSHOTS === '1') {
      await page.screenshot({ path: 'docs/screenshots/migration-workspace.png', fullPage: true })
    }
  })
})
