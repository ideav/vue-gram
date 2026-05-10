import { test, expect, type Page, type Route } from '@playwright/test'
import { tableFolders, tableTerms, writeGrants, readGrants } from './fixtures/tables-workspace'

type Grants = Record<string, string>

async function seedSession(page: Page, grants: Grants) {
  await page.addInitScript(({ seededGrants }) => {
    const server = window.location.origin
    const session = {
      version: 2,
      server,
      currentDatabase: 'my',
      databases: {
        my: {
          token: 'test-token',
          xsrfToken: 'test-xsrf',
          userId: 'fixture-user-id',
          userName: 'fixture-user',
          userRole: 'user',
          grants: seededGrants,
          ownedDatabases: [],
        },
      },
    }

    localStorage.setItem('integram_server', server)
    localStorage.setItem('integram_session', JSON.stringify(session))
    localStorage.setItem('integram_grants', JSON.stringify(seededGrants))
  }, { seededGrants: grants })
}

async function mockTablesApi(page: Page) {
  const createdTables: Array<Record<string, string>> = []
  const savedSettings: Array<string> = []

  await page.route(/\/(?:api\/)?my\/.+/, async (route: Route) => {
    const request = route.request()
    if (request.resourceType() === 'document') {
      await route.continue()
      return
    }

    const url = new URL(request.url())
    const path = decodeURIComponent(url.pathname)
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    if (path.endsWith('/xsrf')) {
      await route.fulfill({
        json: { token: 'test-token', _xsrf: 'test-xsrf', id: 'fixture-user-id', user: 'fixture-user', role: 'user' },
        headers: corsHeaders,
      })
      return
    }

    if (path.endsWith('/terms')) {
      await route.fulfill({ json: tableTerms, headers: corsHeaders })
      return
    }

    if (path.endsWith('/dict')) {
      await route.fulfill({
        json: Object.fromEntries(tableTerms.map(table => [String(table.id), table.name])),
        headers: corsHeaders,
      })
      return
    }

    if (path.endsWith('/object/269')) {
      await route.fulfill({
        json: {
          object: [
            {
              id: '777',
              val: 'fixture-user',
              reqs: {
                271: { val: 'UI' },
                273: { val: JSON.stringify(tableFolders) },
              },
            },
          ],
        },
        headers: corsHeaders,
      })
      return
    }

    if (path.endsWith('/_m_save/777')) {
      const body = new URLSearchParams(request.postData() || '')
      savedSettings.push(body.get('t273') || '')
      await route.fulfill({ json: { id: '777', ok: true }, headers: corsHeaders })
      return
    }

    if (path.endsWith('/_m_new/269')) {
      const body = new URLSearchParams(request.postData() || '')
      savedSettings.push(body.get('t273') || '')
      await route.fulfill({ json: { id: '777', obj: '777', ok: true }, headers: corsHeaders })
      return
    }

    if (path.endsWith('/_d_new')) {
      const body = new URLSearchParams(request.postData() || '')
      createdTables.push(Object.fromEntries(body.entries()))
      await route.fulfill({ json: { obj: '9001', id: '9001' }, headers: corsHeaders })
      return
    }

    await route.fulfill({ json: {}, headers: corsHeaders })
  })

  return { createdTables, savedSettings }
}

test.describe('Tables workspace parity', () => {
  test('opens from the old /tables URL, searches folders, moves a table, and creates through _d_new', async ({ page }) => {
    await seedSession(page, writeGrants)
    const api = await mockTablesApi(page)

    await page.goto('/my/tables')

    await expect(page).toHaveURL(/\/my\/table$/)
    await expect(page.getByRole('heading', { name: 'Таблицы' })).toBeVisible()
    await expect(page.locator('[data-folder-name="Избранное"] .folder-toggle-button')).toBeVisible()
    await expect(page.getByTestId('table-card-18')).toContainText('User')

    await page.getByPlaceholder('Поиск таблиц...').fill('role')
    await expect(page.getByTestId('table-card-42')).toBeVisible()
    await expect(page.getByTestId('table-card-18')).toBeHidden()

    await page.getByPlaceholder('Поиск таблиц...').clear()
    await page.locator('[data-folder-name="Служебные"] .folder-toggle-button').click()
    await page.getByTestId('table-card-22').dragTo(page.locator('[data-folder-name="Избранное"] .folder-content'))
    await expect.poll(() => api.savedSettings.length).toBeGreaterThan(0)
    expect(JSON.parse(api.savedSettings.at(-1) || '{}')['Избранное'].tabs).toContain('22')

    await page.getByRole('button', { name: 'Новая таблица' }).click()
    await page.getByLabel('Название таблицы').fill('Дата оплаты')
    await expect(page.locator('#new-table-type')).toHaveValue('9')
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect.poll(() => api.createdTables.length).toBe(1)
    expect(api.createdTables[0]).toMatchObject({
      val: 'Дата оплаты',
      t: '9',
      _xsrf: 'test-xsrf',
    })
  })

  test('hides create, edit, and move controls without structure WRITE grant', async ({ page }) => {
    await seedSession(page, readGrants)
    await mockTablesApi(page)

    await page.goto('/my/table')

    await expect(page.getByRole('heading', { name: 'Таблицы' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Новая таблица' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Добавить папку' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Переименовать папку Избранное' })).toHaveCount(0)
    await expect(page.getByTestId('table-card-18')).toHaveAttribute('draggable', 'false')
  })
})
