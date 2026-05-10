import { test, expect, type Page, type Route } from '@playwright/test'
import {
  cardsMetadataFixture,
  cardsRowsFixture,
  funnelRowsFixture,
  kanbanReportFixture,
  kanbanStagesFixture,
} from './fixtures/crm-workspaces'

type PostedForm = Record<string, string>

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    const server = `${window.location.origin}/api`
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
          grants: { '1': 'WRITE' },
          ownedDatabases: [],
        },
      },
    }

    localStorage.setItem('integram_server', server)
    localStorage.setItem('integram_session', JSON.stringify(session))
    localStorage.setItem('integram_grants', JSON.stringify({ '1': 'WRITE' }))
    localStorage.setItem('cookie_consent', '1')
  })
}

async function mockCrmApi(page: Page) {
  const statusUpdates: PostedForm[] = []

  await page.route('**/api/my/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
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

    if (path.endsWith('/report/9100')) {
      await route.fulfill({ json: kanbanReportFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/report/9200')) {
      await route.fulfill({ json: kanbanStagesFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/report/7701')) {
      await route.fulfill({ json: funnelRowsFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/metadata/18')) {
      await route.fulfill({ json: cardsMetadataFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/object/18')) {
      await route.fulfill({ json: cardsRowsFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/_m_set/101')) {
      statusUpdates.push(Object.fromEntries(new URLSearchParams(request.postData() || '').entries()))
      await route.fulfill({ json: { ok: true, id: '101' }, headers: corsHeaders })
      return
    }

    await route.fulfill({ json: {}, headers: corsHeaders })
  })

  return { statusUpdates }
}

test.describe('CRM workspaces parity', () => {
  test('renders kanban, posts drag status updates, and opens funnel/cards views', async ({ page }) => {
    await seedSession(page)
    const api = await mockCrmApi(page)

    await page.goto('/my/kanban/9100?statuses=9200')
    await expect(page.getByRole('heading', { name: 'Канбан' })).toBeVisible()
    await expect(page.getByTestId('kanban-card-101')).toContainText('Интеграм')
    await expect(page.getByTestId('kanban-stage-374')).toContainText('3 000 000')

    await page.locator('label.filter-field', { hasText: 'Продукт' }).locator('select').selectOption('CRM')
    await expect(page.getByTestId('kanban-card-102')).toHaveCount(0)
    await expect(page.getByTestId('kanban-card-103')).toBeVisible()

    await page.getByTestId('kanban-card-101').dragTo(page.getByTestId('kanban-stage-324'))
    await expect.poll(() => api.statusUpdates.length).toBe(1)
    expect(api.statusUpdates[0]).toMatchObject({
      t350: '324',
      _xsrf: 'test-xsrf',
    })
    expect(api.statusUpdates[0].t357).toMatch(/^\d+$/)
    await expect(page.getByTestId('kanban-stage-324')).toContainText('Интеграм')
    await expect(page.locator('.p-toast-message')).toHaveCount(0)
    await page.screenshot({ path: 'docs/screenshots/kanban-workspace-after.png', fullPage: true })

    await page.goto('/my/funnel/7701')
    await expect(page.getByRole('heading', { name: 'Воронка' })).toBeVisible()
    await expect(page.getByTestId('funnel-chart')).toContainText('Первый контакт')
    await page.getByRole('button', { name: 'Таблица' }).click()
    await expect(page.getByTestId('funnel-table')).toContainText('Frontend')
    await page.getByRole('button', { name: 'График' }).click()
    await page.screenshot({ path: 'docs/screenshots/funnel-workspace-after.png', fullPage: true })

    await page.goto('/my/cards/18')
    await expect(page.getByRole('heading', { name: 'Карточки' })).toBeVisible()
    await expect(page.getByTestId('crm-card-287')).toContainText('ru2')
    await expect(page.getByTestId('crm-card-287')).toContainText('admin')
    await expect(page.getByTestId('crm-card-287')).toContainText('Мефистоклюс')
  })
})
