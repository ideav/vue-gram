import { expect, test, type Page } from '@playwright/test'

const session = {
  version: 2,
  server: 'https://dronedoc.ru',
  currentDatabase: 'my',
  databases: {
    my: {
      token: 'auth-token',
      xsrfToken: 'xsrf-token',
      userId: '1',
      userName: 'demo',
      userRole: 'admin',
      ownedDatabases: ['clientdb']
    }
  }
}

async function mockIntegramApi(page: Page) {
  await page.route('https://dronedoc.ru/**', async (route) => {
    const url = route.request().url()

    if (url.includes('/xsrf')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'auth-token',
          _xsrf: 'xsrf-token',
          id: '1',
          user: 'demo',
          role: 'admin'
        })
      })
      return
    }

    if (url.includes('/auth')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            login: 'demo',
            role: 'admin',
            bases: ['clientdb']
          }
        })
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

async function seedLegacyShellState(page: Page) {
  await page.addInitScript((seededSession) => {
    const hasCookie = (name: string) => document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith(`${name}=`))

    localStorage.setItem('token', 'auth-token')
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark')
    localStorage.setItem('integram_session', JSON.stringify(seededSession))
    if (!hasCookie('integram-table-font-settings')) {
      document.cookie = `integram-table-font-settings=${encodeURIComponent(JSON.stringify({ pageFontSize: 'larger' }))}; path=/`
    }
    if (!hasCookie('brand-bg-my')) document.cookie = 'brand-bg-my=0.4; path=/'
  }, session)
}

test.describe('Integram Vue shell parity', () => {
  test.beforeEach(async ({ page }) => {
    await mockIntegramApi(page)
    await seedLegacyShellState(page)
  })

  test('desktop shell restores legacy settings and user menu actions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/my/')

    await expect(page.locator('.navbar-brand .brand-name')).toHaveText('my')
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveClass(/brand-bg-on/)
    await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe('0.95rem')

    await page.getByRole('button', { name: 'Принять' }).click()
    await expect(page.locator('#cookie-consent')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('1')

    await page.getByTestId('user-menu-toggle').click()
    await expect(page.getByTestId('user-menu-dropdown')).toBeVisible()
    await expect(page.getByText('Бренд-фон')).toBeVisible()
    await expect(page.getByText('Сменить пароль')).toBeVisible()
    await expect(page.getByText('Выйти везде')).toBeVisible()

    if (process.env.CAPTURE_SHELL_SCREENSHOTS === '1') {
      await page.screenshot({ path: 'docs/screenshots/integram-shell-desktop.png', fullPage: true })
    }

    await page.getByTitle('Шрифт меньше').click()
    await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe('0.7rem')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveClass(/brand-bg-on/)
    await expect(page.locator('#cookie-consent')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe('0.7rem')
  })

  test('mobile shell opens the sidebar drawer, filters menu, and closes after navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 })
    await page.goto('/my/table')

    const sidebar = page.getByTestId('app-sidebar')
    await page.getByRole('button', { name: 'Принять' }).click()

    await expect(sidebar).not.toHaveClass(/mobile-open/)

    await page.getByTestId('mobile-sidebar-toggle').click()
    await expect(sidebar).toHaveClass(/mobile-open/)
    await expect.poll(() => sidebar.evaluate(el => Math.round(el.getBoundingClientRect().x))).toBe(0)
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

    if (process.env.CAPTURE_SHELL_SCREENSHOTS === '1') {
      await page.screenshot({ path: 'docs/screenshots/integram-shell-mobile.png', fullPage: true })
    }

    await page.locator('#menu-search').fill('sql')
    await expect(sidebar.getByText('SQL')).toBeVisible()
    await expect(sidebar.getByText('Объекты')).toHaveCount(0)

    await sidebar.getByText('SQL').click()
    await expect(page).toHaveURL(/\/my\/sql$/)
    await expect(sidebar).not.toHaveClass(/mobile-open/)
  })
})
