import { test, expect, type Page, type Route } from '@playwright/test'
import {
  procVacMetadataFixture,
  procVacReferenceOptionsFixture,
  procVacRowsFixture,
} from './fixtures/procvac'

type PostedForm = Record<string, string>

declare global {
  interface Window {
    __procvacCreateCalls: Array<[string, number]>
    openCreateRecordForm: (tableId: string, parentId: number) => void
  }
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    const server = `${window.location.origin}/api`
    const NativeDate = Date
    const fixedNow = new NativeDate('2026-05-10T12:00:00Z').getTime()
    class FixedDate extends NativeDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        super(...(args.length ? args : [fixedNow]))
      }

      static now() {
        return fixedNow
      }
    }
    FixedDate.UTC = NativeDate.UTC
    FixedDate.parse = NativeDate.parse
    window.Date = FixedDate

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
          grants: { '8137': 'WRITE' },
          ownedDatabases: [],
        },
      },
    }

    window.__procvacCreateCalls = []
    window.openCreateRecordForm = (tableId: string, parentId: number) => {
      window.__procvacCreateCalls.push([tableId, parentId])
    }

    localStorage.setItem('integram_server', server)
    localStorage.setItem('integram_session', JSON.stringify(session))
    localStorage.setItem('integram_grants', JSON.stringify({ '8137': 'WRITE' }))
    localStorage.setItem('cookie_consent', '1')
  })
}

async function mockProcVacApi(page: Page) {
  const requests: Array<{ method: string, path: string, search: string }> = []
  const statusUpdates: PostedForm[] = []

  await page.route('**/api/my/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    requests.push({ method: request.method(), path, search: url.search })

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

    if (path.endsWith('/metadata/8137')) {
      await route.fulfill({ json: procVacMetadataFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/object/8137')) {
      await route.fulfill({ json: procVacRowsFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/_ref_reqs/8140')) {
      await route.fulfill({ json: procVacReferenceOptionsFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/_m_set/8162')) {
      statusUpdates.push(Object.fromEntries(new URLSearchParams(request.postData() || '').entries()))
      await route.fulfill({ json: { ok: true, id: '8162' }, headers: corsHeaders })
      return
    }

    await route.fulfill({ json: {}, headers: corsHeaders })
  })

  return { requests, statusUpdates }
}

test.describe('ProcVac workspace parity', () => {
  test('loads rows, searches, edits status, opens create workflows, and captures the migrated workspace', async ({ page }) => {
    await seedSession(page)
    const api = await mockProcVacApi(page)

    await page.goto('/my/procvac')

    await expect(page.getByRole('heading', { name: 'ProcVac' })).toBeVisible()
    await expect(page.getByTestId('procvac-section-active')).toContainText('Актуальные вакансии')
    await expect(page.getByTestId('procvac-section-active')).toContainText('1')
    await expect(page.getByTestId('procvac-row-8162')).toContainText('Менеджер')
    await expect(page.getByTestId('procvac-cell-8162-department')).toHaveText('ДД')
    await expect(page.getByTestId('procvac-cell-8162-events').getByRole('link', { name: 'Посмотреть события: 3' }))
      .toHaveAttribute('href', /\/my\/table\/5616\?F_U=8162$/)

    const objectRequest = api.requests.find(item => item.path.endsWith('/object/8137'))
    expect(objectRequest?.search).toContain('JSON_OBJ=')
    expect(objectRequest?.search).toContain('LIMIT=10000')
    expect(objectRequest?.search).toContain('ORDER=8140')

    await page.getByPlaceholder('Быстрый поиск').fill('педагог')
    await expect(page.getByTestId('procvac-row-8200')).toBeVisible()
    await expect(page.getByTestId('procvac-row-8162')).toHaveCount(0)
    await expect(page.getByTestId('procvac-cell-8200-title').locator('mark')).toHaveText('Педагог')

    await page.getByPlaceholder('Быстрый поиск').clear()
    await page.getByRole('button', { name: 'Развернуть' }).click()
    await expect(page.getByTestId('procvac-row-9000')).toContainText('Архивная')

    await page.getByTestId('procvac-cell-8162-status').click()
    await page.getByTestId('procvac-cell-8162-status').locator('select').selectOption('8169')

    await expect.poll(() => api.statusUpdates.length).toBe(1)
    expect(api.statusUpdates[0]).toMatchObject({
      _xsrf: 'test-xsrf',
      t8140: '8169',
    })
    await expect(page.getByTestId('procvac-cell-8162-status')).toHaveText('Не начато')

    await page.getByTestId('procvac-row-8162').getByRole('button', { name: 'Создать событие' }).click()
    await page.getByRole('button', { name: 'Добавить вакансию' }).click()
    await expect.poll(() => page.evaluate(() => window.__procvacCreateCalls)).toEqual([
      ['5616', 8162],
      ['8137', 1],
    ])

    await page.getByTestId('procvac-grid').evaluate((element) => {
      element.scrollLeft = 0
      element.scrollTop = 0
    })
    await page.screenshot({ path: 'docs/screenshots/procvac-workspace-after.png', fullPage: true })
  })
})
