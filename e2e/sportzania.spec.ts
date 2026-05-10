import { test, expect, type Page, type Route } from '@playwright/test'
import {
  ratingReportFixture,
  structRowsFixture,
  taskdashReportFixture,
} from '../src/utils/__fixtures__/sportzania.js'

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
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('_xsrf', 'test-xsrf')
    localStorage.setItem('user', 'fixture-user')
    localStorage.setItem('id', 'fixture-user-id')
    localStorage.setItem('db', 'my')
  })
}

async function mockSportzaniaApi(page: Page) {
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

    if (path.endsWith('/report/155675')) {
      await route.fulfill({ json: taskdashReportFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/report/155768')) {
      await route.fulfill({ json: ratingReportFixture, headers: corsHeaders })
      return
    }

    if (path.endsWith('/report/8027')) {
      await route.fulfill({ json: structRowsFixture, headers: corsHeaders })
      return
    }

    await route.fulfill({ json: {}, headers: corsHeaders })
  })
}

test.describe('Sportzania workspaces', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page)
    await mockSportzaniaApi(page)
  })

  test('opens each migrated route and ProcVac fallback', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
        errors.push(message.text())
      }
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/my/sportzania/taskdash')
    await expect(page.getByTestId('sportzania-taskdash')).toBeVisible()
    await expect(page.getByTestId('taskdash-monthly-series')).toContainText('Фев 2026')
    await page.screenshot({ path: 'docs/screenshots/sportzania-taskdash.png', fullPage: true })

    await page.goto('/my/sportzania/rating')
    await expect(page.getByTestId('sportzania-rating')).toBeVisible()
    await expect(page.getByTestId('rating-table')).toContainText('Анна Орлова')
    await page.screenshot({ path: 'docs/screenshots/sportzania-rating.png', fullPage: true })

    await page.goto('/my/sportzania/struct')
    await expect(page.getByTestId('sportzania-struct')).toBeVisible()
    await expect(page.locator('.org-node-dept', { hasText: 'Sportzania' })).toBeVisible()
    await page.screenshot({ path: 'docs/screenshots/sportzania-struct.png', fullPage: true })

    await page.goto('/my/sportzania/procvac')
    await expect(page.getByTestId('sportzania-procvac-fallback')).toBeVisible()

    expect(errors).toEqual([])
  })

  test('redirects legacy Sportzania aliases to Vue workspace routes', async ({ page }) => {
    await page.goto('/my/taskdash?FR_%D0%9C%D0%B5%D1%81%D1%8F%D1%86=01.01.2026#grid')
    await expect(page).toHaveURL(/\/my\/sportzania\/taskdash\?/)
    expect(new URL(page.url()).hash).toBe('#grid')

    await page.goto('/my/rating')
    await expect(page).toHaveURL(/\/my\/sportzania\/rating$/)

    await page.goto('/my/struct')
    await expect(page).toHaveURL(/\/my\/sportzania\/struct$/)
  })
})
