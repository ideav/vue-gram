import { expect, test, type Page } from '@playwright/test'

const session = {
  version: 2,
  server: 'http://127.0.0.1:3000',
  currentDatabase: 'my',
  databases: {
    my: {
      token: 'auth-token',
      xsrfToken: 'xsrf-token',
      userId: '7',
      userName: 'anna',
      userRole: 'admin',
      ownedDatabases: []
    }
  }
}

const executors = [
  { k: '7', v: 'Анна' },
  { k: '8', v: 'Борис' }
]

const taskTypes = [
  { k: '41', v: 'Звонок' },
  { k: '42', v: 'Встреча' },
  { k: '44', v: 'Email' }
]

const statuses = [
  { k: '10', v: 'Новая' },
  { k: '12', v: 'В работе' },
  { k: '13', v: 'Выполнена' }
]

const tasks = [
  {
    'ЗадачаID': '9102',
    'Задача': 'Новогодний созвон',
    'Описание': 'Проверить календарь',
    'Клиент': 'Beta',
    'Исполнитель': 'Анна',
    'ИсполнительID': '7',
    'Статус': 'Новая',
    'Статус задачиID': '10',
    'Тип задачи': 'Звонок',
    'Тип задачиID': '41',
    'Срок': '01.01.2026 09:15:00',
    'Важно': 'X'
  },
  {
    'ЗадачаID': '9202',
    'Задача': 'Воскресный контроль',
    'Описание': 'Проверка недели',
    'Клиент': 'Beta',
    'Исполнитель': 'Борис',
    'ИсполнительID': '8',
    'Статус': 'В работе',
    'Статус задачиID': '12',
    'Тип задачи': 'Email',
    'Тип задачиID': '44',
    'Срок': '11.01.2026 19:45:00',
    'Важно': ''
  },
  {
    'ЗадачаID': '9301',
    'Задача': 'Дневной smoke',
    'Описание': 'Проверка дня',
    'Клиент': 'ACME',
    'Исполнитель': 'Анна',
    'ИсполнительID': '7',
    'Статус': 'Новая',
    'Статус задачиID': '10',
    'Тип задачи': 'Встреча',
    'Тип задачиID': '42',
    'Срок': '15.01.2026 12:00:00',
    'Важно': ''
  }
]

async function seedSession(page: Page) {
  await page.addInitScript((seededSession) => {
    const origin = window.location.origin
    const normalizedSession = { ...seededSession, server: origin }

    localStorage.setItem('integram_server', origin)
    localStorage.setItem('integram_session', JSON.stringify(normalizedSession))
    localStorage.setItem('token', 'auth-token')
    localStorage.setItem('_xsrf', 'xsrf-token')
    localStorage.setItem('user', 'anna')
    localStorage.setItem('id', '7')
    localStorage.setItem('db', 'my')
  }, session)
}

async function mockCalendarApi(page: Page) {
  await page.route('**/my/**', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const path = decodeURIComponent(url.pathname)

    if (path.endsWith('/xsrf')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ token: 'auth-token', _xsrf: 'xsrf-token', id: '7', user: 'anna', role: 'admin' })
      })
      return
    }

    if (path.includes('/report/5230')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(executors) })
      return
    }

    if (path.includes('/report/5241')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(taskTypes) })
      return
    }

    if (path.includes('/report/Все статусы задач')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(statuses) })
      return
    }

    if (path.includes('/report/4283')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(tasks) })
      return
    }

    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
  })
}

test.describe('Integram Vue calendar parity smoke', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page)
    await mockCalendarApi(page)
  })

  test('opens calendar, navigates month/week/day dates, and exposes legacy edit links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/my/calendar?date=2026-01-15')

    await expect(page.getByRole('heading', { name: /Календарь/ })).toBeVisible()
    await expect(page.getByTestId('calendar-title')).toContainText('январь 2026')

    const eventLink = page.getByTestId('calendar-event-link-9102').first()
    await expect(eventLink).toBeVisible()
    await expect(eventLink).toHaveAttribute('href', '/my/edit_obj/9102')

    if (process.env.CAPTURE_CALENDAR_SCREENSHOT === '1') {
      const cookieAccept = page.getByRole('button', { name: 'Принять' })
      if (await cookieAccept.count()) await cookieAccept.click()
      await page.screenshot({ path: 'docs/screenshots/integram-calendar.png', fullPage: true })
    }

    await page.getByRole('button', { name: 'Неделя' }).click()
    await expect(page.getByTestId('calendar-title')).toContainText('12.01.2026')
    await expect(page.getByTestId('calendar-event-link-9301')).toBeVisible()

    await page.getByRole('button', { name: 'Предыдущий период' }).click()
    await expect(page.getByTestId('calendar-title')).toContainText('05.01.2026')
    await expect(page.getByTestId('calendar-event-link-9202')).toBeVisible()

    await page.getByRole('button', { name: 'День' }).click()
    await expect(page.getByTestId('calendar-title')).toContainText('08.01.2026')

    await page.getByRole('button', { name: 'Следующий период' }).click()
    await expect(page.getByTestId('calendar-title')).toContainText('09.01.2026')

    await page.getByRole('button', { name: 'Месяц' }).click()
    await page.getByPlaceholder('Поиск по задачам...').fill('созвон')
    await expect(page.getByTestId('calendar-event-link-9102')).toBeVisible()
    await expect(page.getByTestId('calendar-event-link-9202')).toHaveCount(0)
  })
})
