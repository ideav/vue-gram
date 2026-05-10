import { expect, test, type Page } from '@playwright/test'

const legacyMenuData = [
  { menu_id: 'root', menu_up: '', name: 'Рабочие места', href: '', icon: '<i class="pi pi-folder"></i>' },
  { menu_id: 'table', menu_up: 'root', name: 'Таблицы', href: 'table', icon: '<i class="pi pi-table"></i>' },
  { menu_id: 'sql', menu_up: 'root', name: 'SQL', href: 'sql', icon: '<i class="pi pi-database"></i>' },
  { menu_id: 'report', menu_up: 'root', name: 'Запросы', href: 'report', icon: '<i class="pi pi-chart-bar"></i>' },
  { menu_id: 'info', menu_up: '', name: 'Информация', href: 'info', icon: '<i class="pi pi-info-circle"></i>' },
]

async function seedIntegramSession(page: Page) {
  await page.addInitScript((menuData) => {
    window.localStorage.setItem('integram_locale', 'ru')
    window.localStorage.setItem('integram_session', JSON.stringify({
      version: 2,
      server: 'http://localhost:3000',
      currentDatabase: 'my',
      databases: {
        my: {
          token: 'token',
          xsrfToken: 'xsrf',
          userId: '1',
          userName: 'tester',
          userRole: 'admin',
          ownedDatabases: []
        }
      }
    }))
    ;(window as typeof window & { menuData: unknown }).menuData = menuData
  }, legacyMenuData)

  await page.route('**/api/**', async (route) => {
    if (route.request().url().includes('/xsrf')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ token: 'token', _xsrf: 'xsrf', user: 'tester', role: 'admin' })
      })
      return
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({})
    })
  })
}

test.describe('Integram legacy menu shell', () => {
  test('renders nested server menuData, search, active state, collapse, and resizing on desktop', async ({ page }) => {
    await seedIntegramSession(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/my/info')

    const sidebar = page.locator('#app-sidebar')
    await expect(sidebar).toBeVisible()
    await expect(page.locator('[data-menu-id="info"]')).toHaveClass(/active/)

    await page.locator('[data-menu-id="root"]').click()
    await expect(page.locator('[data-menu-id="sql"]')).toBeVisible()

    await page.locator('#menu-search').fill('SQL')
    await expect(page.locator('[data-menu-id="sql"]')).toBeVisible()
    await expect(page.locator('[data-menu-id="info"]')).toBeHidden()

    await page.locator('#menu-search-clear').click()
    await expect(page.locator('[data-menu-id="info"]')).toBeVisible()

    const box = await sidebar.boundingBox()
    const handleBox = await page.locator('.sidebar-resize-handle').boundingBox()
    expect(box).not.toBeNull()
    expect(handleBox).not.toBeNull()
    if (box && handleBox) {
      const initialWidth = Math.round(box.width)
      const startX = Math.round(handleBox.x + handleBox.width / 2)
      const y = Math.round(handleBox.y + handleBox.height / 2)
      await page.mouse.move(startX, y)
      await page.mouse.down()
      await page.mouse.move(startX + 160, y, { steps: 8 })
      await page.mouse.up()
      await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width || 0)).toBeGreaterThan(initialWidth + 50)
    }

    await page.locator('#sidebar-toggle').click()
    await expect(sidebar).toHaveClass(/collapsed/)
  })

  test('opens and closes the mobile drawer around legacy menu navigation', async ({ page }) => {
    await seedIntegramSession(page)
    await page.setViewportSize({ width: 390, height: 740 })
    await page.goto('/my/')

    const sidebar = page.locator('#app-sidebar')
    await page.locator('.mobile-sidebar-toggle').click()
    await expect(sidebar).toHaveClass(/mobile-open/)
    await expect(page.locator('.sidebar-backdrop')).toBeVisible()

    await page.locator('[data-menu-id="info"]').click()
    await expect(page).toHaveURL(/\/my\/info$/)
    await expect(sidebar).not.toHaveClass(/mobile-open/)
  })
})
