import { test, expect } from '@playwright/test'
import path from 'path'

test('uploads a small fixture file through mocked legacy backend', async ({ page }) => {
  await page.route(/\/(?:api\/)?my\/xsrf(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-token',
        _xsrf: 'test-xsrf',
        id: '1',
        user: 'tester',
        role: 'admin'
      })
    })
  })

  await page.route(/\/(?:api\/)?my\/_upload(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        args: 'uploads/2026/upload-small.txt',
        file: {
          name: 'upload-small.txt',
          size: 11,
          type: 'text/plain'
        }
      })
    })
  })

  await page.addInitScript(() => {
    const session = {
      version: 2,
      server: window.location.origin,
      currentDatabase: 'my',
      databases: {
        my: {
          token: 'test-token',
          xsrfToken: 'test-xsrf',
          userId: '1',
          userName: 'tester',
          userRole: 'admin',
          ownedDatabases: []
        }
      }
    }
    localStorage.setItem('integram_server', window.location.origin)
    localStorage.setItem('integram_session', JSON.stringify(session))
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('_xsrf', 'test-xsrf')
    localStorage.setItem('user', 'tester')
    localStorage.setItem('id', '1')
    localStorage.setItem('db', 'my')
  })

  await page.goto('/my/upload')
  await page.setInputFiles('[data-testid="upload-input"]', path.join(process.cwd(), 'e2e/fixtures/upload-small.txt'))

  await expect(page.getByTestId('upload-selected')).toContainText('upload-small.txt')

  await page.getByTestId('upload-submit').click()

  await expect(page.getByTestId('upload-result-link')).toContainText('upload-small.txt')
  await expect(page.getByTestId('upload-result-link')).toHaveAttribute('href', /uploads\/2026\/upload-small\.txt/)
})
